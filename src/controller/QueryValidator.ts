import Log from "../Util";
import {InsightError} from "./IInsightFacade";

export default class QueryValidator {
    private currentDS: string[] = [];
    private coursevalidator: any = {
        courses_dept: "string", courses_id: "string", courses_avg: "number",
        courses_instructor: "string", courses_title: "string", courses_pass: "number",
        courses_fail: "number", courses_audit: "number", courses_uuid: "string", courses_year: "number"
    };
    private dsToQuery: string = "";
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
                            if ( value.length > 2 || value.length < 1) {
                                throw new InsightError("OPTIONS expect 1/2 keys got " + value.length); }
                            if (value.includes("COLUMNS")) {
                                try {
                                    optionsValid =
                                        this.checkOPTIONS(query["OPTIONS"], "OPTIONS");
                                } catch (err) {
                                    throw err; }
                                if (optionsValid) {
                                    return this.dsToQuery;
                                }
                            } else {
                                throw new InsightError("malformed options structure");
                            }
                        } else {
                            throw new InsightError("options is missing columns");
                        }
                    } else {
                        if (query["OPTIONS"].hasOwnProperty) {
                            const value = Object.keys(query["OPTIONS"]);
                            let optionsValid: boolean;
                            if (value.length > 2 || value.length < 1) {
                                throw new InsightError("OPTIONS expect 1/2 keys got " + value.length);
                            }
                            if (value.includes("COLUMNS")) {
                                try {
                                    optionsValid =
                                        this.checkOPTIONS(query["OPTIONS"], "OPTIONS");
                                } catch (err) {
                                    throw err;
                                }
                                if (optionsValid) {
                                    return this.dsToQuery;
                                }
                            }
                        }
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
            let notIsValid: boolean;
            try { notIsValid = this.checkWHERE(filter[listOfKeys[0]], listOfKeys[0], datasetToQuery);
            } catch (err) { throw err; }
            return notIsValid;
        } else if (parent === "IS") {
            let sCompValid: boolean;
            try { sCompValid = that.checkFilterSCOMPParent(filter, datasetToQuery); } catch (err) { throw err; }
            return sCompValid;
        } else if (parent === "EQ" || parent === "GT" || parent === "LT") {
            let mCompValid: boolean;
            try { mCompValid = that.checkFilterMCOMPParent(filter, parent, datasetToQuery);
            } catch (err) { throw err; }
            return mCompValid;
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
                let validFilter: boolean;
                try { validFilter = this.checkWHERE(filter[listOfKeys[0]], listOfKeys[0], datasetToQuery);
                } catch (err) { throw err; }
                if (!validFilter) { throw new InsightError("Invalid query"); }
            }
            return true;
        }
    }
    private checkFilterMCOMPParent(filter: any, parent: string, datasetToQuery: string): boolean {
        let that = this;
        if (Object.keys(filter).length !== 1) {
            throw new InsightError(parent + " expects 1 key got " + Object.keys(filter).length);
        }
        let dataset: string;
        try {
            if (datasetToQuery === "") {
                datasetToQuery = Object.keys(filter)[0].split("_", 1)[0];
                that.dsToQuery = datasetToQuery;
            }
            dataset = Object.keys(filter)[0].split("_", 1)[0];
        } catch (err) {
            throw new InsightError(parent + " contains invalid value " + Object.keys(filter)[0]);
        }
        const listOfKeys: string[] = Object.keys(filter);
        if (listOfKeys.length !== 1) {
            throw new InsightError(parent + " expects 1 key found " + listOfKeys.length);
        }
        if (datasetToQuery !== dataset) {
            throw new InsightError("Attempts to query more than one dataset");
        }
        if (!this.currentDS.includes(dataset)) {
             throw new InsightError(dataset + " not contained");
        }
        let rt: boolean;
        try { rt = this.checkKeys(listOfKeys[0], "number", filter); } catch (err) { throw err; }
        return rt;
    }
    private checkFilterSCOMPParent(filter: any , datasetToQuery: string): boolean {
        let that = this;
        if (Object.keys(filter).length === 1) {
            let isCond: string;
            try {
                if (datasetToQuery === "") {
                    datasetToQuery = Object.keys(filter)[0].split("_", 1)[0];
                    that.dsToQuery = Object.keys(filter)[0].split("_", 1)[0];
                }
                isCond = Object.keys(filter)[0].split("_", 1)[0];
            } catch (err) {
                throw new InsightError(parent + " contains invalid value " + Object.keys(filter)[0]);
            }
            const listOfKeys: string[] = Object.keys(filter);
            if (datasetToQuery !== isCond) {
                throw new InsightError("Attempts to query more than one dataset");
            }
            if (listOfKeys.length !== 1) {
                throw new InsightError("IS filter expects 1 key, found " + listOfKeys.length);
            }
            if (!this.currentDS.includes(isCond)) {
                throw new InsightError(isCond + " in IS was not found");
            }
            const inputString = filter[Object.keys(filter)[0]];
            const regexForAsteriskCheck: RegExp = /^[*]?([a-z]|[A-Z][0-9]|[,]|[_]|\s)*[*]?$/;
            if (!regexForAsteriskCheck.test(inputString)) {
                throw new InsightError("Invalid input string in IS: " + inputString);
            } else {
                let rt: boolean;
                try { rt = this.checkKeys(listOfKeys[0], "string", filter); } catch (err) { throw err; }
                return rt;
            }
        } else { throw new InsightError("IS expects 1 key got " + Object.keys(filter).length); }
    }

    private checkKeys(key: string, expected: string, filter: any): boolean {
        let valueType: string = typeof filter[key];
        if (this.coursevalidator.hasOwnProperty(key)) {
            if (this.coursevalidator[key] === valueType) {
                return expected === valueType;
            } else {
                throw new InsightError(filter + " expects " + expected +
                    " but is called on " + valueType + " instead");
            }
        }
        throw new InsightError("Column " + key + " not found");
    }

    private checkOPTIONS(option: any, parent: string): boolean {
        const listOfKeys: string[] = Object.keys(option);
        if (parent === "OPTIONS") {
            if (listOfKeys.includes("COLUMNS")) {
                let validColumns: boolean;
                if (!Array.isArray(option["COLUMNS"])) { throw new InsightError("COLUMNS expects array");
                } else if (option["COLUMNS"].length === 0) { throw new InsightError("COLUMNS cannot be empty"); }
                try { validColumns = this.checkCOLUMNS(option["COLUMNS"]); } catch (err) { throw err; }
                if (validColumns) {
                    if (listOfKeys.includes("ORDER")) {
                        if (typeof option["ORDER"] !== "string") {
                            throw new InsightError("ORDER expects a string, got a " + typeof option["ORDER"]);
                        }
                        let validOrder: boolean;
                        try { validOrder = this.checkORDER(option["ORDER"], option["COLUMNS"]); } catch (err) {
                            throw err;
                        }
                        return validOrder;
                    } else {
                        return true;
                    }
                }
                return validColumns;
            } else {
                throw new InsightError("Expected OPTIONS to contain COLUMNS");
            }
        } else {
            throw new InsightError("Invalid filter: " + listOfKeys[0] + " in " + parent);
        }
    }

    private checkCOLUMNS(listOfKey: string[]): boolean {
        let that = this; let dataset: string;
        for (let selection of listOfKey) {
            let validSelection: boolean = false;
            for (let column of Object.keys(this.coursevalidator)) {
                try { dataset = selection.split("_", 1)[0];
                } catch (err) { throw new InsightError("COLUMNS has invalid key " + dataset); }
                if (that.dsToQuery !== dataset) {
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

    private checkORDER(key: string, columns: string[]): boolean {
        let validColumn: boolean = false;
        let that = this;
        let dataset: string = "";
        try { dataset = key.split("_", 1)[0]; } catch (err) {
            throw new InsightError("ORDER has invalid key " + dataset); }
        if (that.dsToQuery !== dataset) {
            throw new InsightError("Attempts to query more than one dataset");
        }
        if (!columns.includes(key)) { throw new InsightError("ORDER not in columns: " + key); }
        for (let column of Object.keys(this.coursevalidator)) {
            if (key === column) {validColumn = true; }
        }
        if (!validColumn) { throw new InsightError("ORDER contains non-existing column " + key); }
        return true;
    }
}
