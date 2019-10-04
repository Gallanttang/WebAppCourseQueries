import Log from "../Util";
import {InsightError, NotFoundError} from "./IInsightFacade";
import {stringify} from "querystring";

export default class QueryManager {
    private currentDS: string[] = [];
    private coursevalidator: any = {
        courses_dept: "string", courses_id: "string", courses_avg: "number",
        courses_instructor: "string", courses_title: "string", courses_pass: "number",
        courses_fail: "number", courses_audit: "number", courses_uuid: "string", courses_year: "number"
    };

    constructor(ds: string[]) {
        Log.trace("MemoryManager::init()");
        this.currentDS = ds;
    }

    /*
    *  helper for PerformQuery
    * @return Promise<any>
    * the promise should fulfill with true if query is valid, InsightError if it isn't
    */
    public isQueryValid(query: any): string {
        let datasetToQuery: string = "";
        if (query && typeof query === "object") {
            if (this.equals(Object.keys(query), ["WHERE", "OPTIONS"]) ||
                this.equals(Object.keys(query), ["OPTIONS", "WHERE"])) {
                if (query["WHERE"].hasOwnProperty) {
                    let whereValid: boolean;
                    const listOfKeys: string[] = Object.keys(query["WHERE"]);
                    if (listOfKeys.length === 1) {
                        let result: boolean;
                        try { result = this.checkWHERE(query["WHERE"][listOfKeys[0]], listOfKeys[0], datasetToQuery);
                        } catch (err) { throw err; }
                        whereValid = result;
                    } else {
                        throw new InsightError("Expected WHERE to have 1 key got " + listOfKeys.length);
                    }
                    if (whereValid) {
                        if (query["OPTIONS"].hasOwnProperty) {
                            const value = Object.keys(query["OPTIONS"]);
                            let optionsValid: boolean;
                            if (value.includes("COLUMNS")) {
                                try {
                                    optionsValid =
                                        this.checkOPTIONS(query["OPTIONS"], "OPTIONS", datasetToQuery);
                                } catch (err) {
                                    throw err; }
                                if (optionsValid) {
                                    return datasetToQuery;
                                }
                            } else {
                                throw new InsightError("malformed options structure");
                            }
                        } else {
                            throw new InsightError("options is missing columns");
                        }
                    } else {
                        throw new InsightError("WHERE is invalid");
                    }
                }
            } else {
                throw new InsightError("malformed query body structure");
            }
        } else {
            throw new InsightError("query cannot be null");
        }
    }
    public equals(keys: any, expected: any): boolean {
        if (keys.length !== expected.length) {
            return false;
        } else {
            for (let i = 0; i < keys.length; i++) {
                if (keys[i] !== expected[i]) {
                    return false;
                }
            }
            return true;
        }
    }
    private checkWHERE(filter: any, parent: string, datasetToQuery: string): boolean {
        if (parent === "OR" || parent === "AND") {
            let logicValid: boolean;
            try { logicValid = this.checkLogicComp(filter, parent, datasetToQuery);
            } catch (err) { throw err; }
            return logicValid;
        }
        const that = this;
        let listOfKeys: string[];
        try { listOfKeys = Object.keys(filter); } catch (err) {
            throw new InsightError(parent + " expects an object, got " + typeof filter + " instead");
        }
        if (listOfKeys.length !== 1) {
            throw new InsightError(parent + " expects 1 key, received " + listOfKeys.length);
        }
        if (parent === "NOT") {
            this.checkWHERE(filter[listOfKeys[0]], listOfKeys[0], datasetToQuery);
        } else if (parent === "IS") {
            let sCompValid: boolean;
            try { sCompValid = that.checkFilterSCOMPParent(filter, datasetToQuery); } catch (err) { throw err; }
            return sCompValid;
        } else if (parent === "EQ" || parent === "GT" || parent === "LT") {
            let mCompValid: boolean;
            try {
                mCompValid = that.checkFilterMCOMPParent(filter, parent, datasetToQuery);
            } catch (err) { throw err; }
            return mCompValid;
        } else if (parent === "NOT") {
            let notIsValid: boolean;
            try { notIsValid = this.checkWHERE(filter[listOfKeys[0]], listOfKeys[0], datasetToQuery);
            } catch (err) { throw err; }
            return notIsValid;
        } else {
            throw new InsightError("Invalid filter: " + listOfKeys[0] + " in " + parent);
        }
    }
    private checkLogicComp(listOfFilters: any, parent: string, datasetToQuery: string): boolean {
        if (!Array.isArray(listOfFilters)) {
            throw new InsightError(parent + " expects an array");
        } else if (listOfFilters.length < 1) {
            throw new InsightError(parent + "expects at least one filter");
        } else {
            for (const filter of listOfFilters) {
                let listOfKeys: string[];
                try { listOfKeys = Object.keys(filter); } catch (err) {
                    throw new InsightError(parent + " expects filters, got " + filter + " instead");
                }
                if (listOfKeys.length !== 1) {
                    throw new InsightError( "Filters expects 1 key, received " + listOfKeys.length);
                }
                if (!this.checkWHERE(filter[listOfKeys[0]], listOfKeys[0], datasetToQuery)) {
                    return false;
                }
            }
            return true;
        }
    }
    /*
    *  helper called by checkWHERE, because checkWHERE was getting too long
    *  should return true if filter is valid, otherwise return statement describing error
    */
    private checkFilterMCOMPParent(filter: any, parent: string, datasetToQuery: string): boolean {
        if (Object.keys(filter).length !== 1) {
            throw new InsightError(parent + " expects 1 key got " + Object.keys(filter).length);
        }
        let dataset: string;
        try {
            if (datasetToQuery === "") {
                datasetToQuery = Object.keys(filter)[0].split("_", 1)[0];
            }
            dataset = Object.keys(filter)[0].split("_", 1)[0];
            Log.trace(dataset);
        } catch (err) {
            throw new InsightError(parent + " contains invalid value " + Object.keys(filter)[0]);
        }
        const listOfKeys: string[] = Object.keys(filter);
        if (listOfKeys.length !== 1) {
            throw new InsightError(parent + " expects 1 key found " + listOfKeys.length);
        }
        if (datasetToQuery !== dataset) {
            Log.trace(dataset + datasetToQuery + " in mcomp");
            throw new InsightError("Attempts to query more than one dataset");
        }
        Log.trace(this.currentDS);
        if (this.currentDS.includes(dataset)) {
             throw new InsightError(dataset + " not contained");
        }
        let rt: boolean;
        try { rt = this.checkKeys(listOfKeys[0], "number", filter); } catch (err) { throw err; }
        return rt;
    }
    /*
    *  helper called by checkWHERE, because checkWHERE was getting too long
    *  should return true if filter is valid, otherwise return statement describing error
    */
    private checkFilterSCOMPParent(filter: any , datasetToQuery: string): boolean {
        if (Object.keys(filter).length === 1) {
            let isCond: string;
            try {
                if (datasetToQuery === "") {
                    datasetToQuery = Object.keys(filter)[0].split("_", 1)[0];
                }
                isCond = Object.keys(filter)[0].split("_", 1)[0];
            } catch (err) {
                throw new InsightError(parent + " contains invalid value " + Object.keys(filter)[0]);
            }
            const listOfKeys: string[] = Object.keys(filter);
            if (datasetToQuery !== isCond) {
                Log.trace(isCond + datasetToQuery + " in scomp");
                throw new InsightError("Attempts to query more than one dataset");
            }
            if (listOfKeys.length !== 1) {
                throw new InsightError("IS filter expects 1 key, found " + listOfKeys.length);
            }
            Log.trace(this.currentDS);
            if (this.currentDS.includes(isCond)) {
                throw new InsightError(isCond + " in IS was not found");
            }
            let rt: boolean;
            try { rt = this.checkKeys(listOfKeys[0], "string", filter); } catch (err) { throw err; }
            return rt;
        } else { throw new InsightError("IS expects 1 key got " + Object.keys(filter).length); }
    }

    private checkKeys(key: string, expected: string, filter: any): boolean {
        let valueType: string = typeof filter[key];
        if (this.coursevalidator.hasOwnProperty(key)) {
            if (this.coursevalidator.key === valueType) {
                return expected === valueType;
            } else {
                throw new InsightError(filter + " expects " + expected +
                    " but is called on " + valueType + " instead");
            }
        }
        throw new InsightError("Column " + key + " not found");
    }

    private checkOPTIONS(option: any, parent: string, datasetToQuery: string): boolean {
        const listOfKeys: string[] = Object.keys(option);
        if (parent === "OPTIONS") {
            if (listOfKeys.includes("COLUMNS")) {
                let validColumns: boolean;
                try { validColumns = this.checkCOLUMNS(option["COLUMNS"], datasetToQuery); } catch (err) {
                    throw err;
                }
                if (validColumns) {
                    if (listOfKeys.includes("ORDER")) {
                        if (typeof option["ORDER"] !== "string") {
                            throw new InsightError("ORDER expects a string, got a " + typeof option["ORDER"]);
                        }
                        let validOrder: boolean;
                        try { validOrder = this.checkORDER(option["ORDER"], datasetToQuery); } catch (err) {
                            throw err;
                        }
                        return validOrder;
                    } else {
                        return true;
                    }
                }
            } else {
                throw new InsightError("Expected OPTIONS to contain COLUMNS");
            }
        } else {
            throw new InsightError("Invalid filter: " + listOfKeys[0] + " in " + parent);
        }
    }

    private checkCOLUMNS(listOfKey: string[], datasetToQuery: string): boolean {
        for (let selection of listOfKey) {
            let validSelection: boolean = false;
            for (let column of Object.keys(this.coursevalidator)) {
                let dataset: string;
                try { dataset = selection[0].split("_", 1)[0];
                } catch (err) { throw new InsightError("COLUMNS has invalid key " + dataset); }
                if (datasetToQuery !== dataset) {
                    Log.trace(dataset + datasetToQuery + " in scomp");
                    throw new InsightError("Attempts to query more than one dataset");
                }
                if (selection === column) { validSelection = true; }
            }
            if (!validSelection) {
                throw new InsightError("COLUMN contains non-existing column " + selection);
            }
        }
        return true;
    }

    private checkORDER(key: string, datasetToQuery: string): boolean {
        let validColumn: boolean = false;
        for (let column of Object.keys(this.coursevalidator)) {
                let dataset: string;
                try { dataset = key[0].split("_", 1)[0];
                } catch (err) { throw new InsightError("ORDER has invalid key " + dataset); }
                if (datasetToQuery !== dataset) {
                    throw new InsightError("Attempts to query more than one dataset");
                }
                if (key === column) { validColumn = true; }
        }
        if (!validColumn) { throw new InsightError("ORDER contains non-existing column " + key); }
        return true;
    }

    public doQuery(query: any, dataset: any): Promise<any> {
        // todo perform the query
        return Promise.reject("Not implemented");
    }
}
