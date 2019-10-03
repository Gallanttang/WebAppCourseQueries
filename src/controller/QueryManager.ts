import Log from "../Util";
import {InsightError, NotFoundError} from "./IInsightFacade";

export default class QueryManager {
    private datasetToQuery: string;
    private currentDS: string[];
    private coursevalidator: any = {
        courses_dept: "string", courses_id: "string", courses_avg: "number",
        courses_instructor: "string", courses_title: "string", courses_pass: "number",
        courses_fail: "number", courses_audit: "number", courses_uuid: "string", courses_year: "number"
    };
    constructor() {
        Log.trace("MemoryManager::init()");
        this.datasetToQuery = "";
    }

    /*
    *  helper for PerformQuery
    * @return Promise<any>
    * the promise should fulfill with true if query is valid, InsightError if it isn't
    */
    public isQueryValid(query: any, datasets: string[]): Promise<any> {
        const that = this;
        this.currentDS = datasets;
        return new Promise<any>((resolve, reject) => {
            if (query != null && typeof query === "object") {
                if (that.equals(Object.keys(query), ["WHERE", "OPTIONS"]) ||
                    that.equals(Object.keys(query), ["OPTIONS", "WHERE"])) {
                    if (query["WHERE"].hasOwnProperty) {
                        that.checkFilter(query["WHERE"], "WHERE").then((result: any) => {
                            if (!result) {
                                return (reject(new InsightError("invalid filter(s)")));
                            }
                        }).catch((err: any) => {
                            return (err);
                        });
                    }
                    if (query["OPTIONS"].hasOwnProperty) {
                        const value = query.key(1);
                        if (that.equals(query[value], ["COLUMNS", "ORDER"]) ||
                            that.equals(query[value], ["COLUMNS"])) {
                            // "OPTIONS" is formed correctly
                        } else {
                            return reject(new InsightError("malformed options structure"));
                        }
                    } else {
                        return reject(new InsightError("options is missing columns"));
                    }
                    // at this point we know the query's valid, return true
                    return resolve(true);
                } else {
                    return reject(new InsightError("malformed query body structure"));
                }
            } else {
                return reject(new InsightError("query cannot be null"));
            }
        });
    }

    public equals(keys: any, expected: any): boolean {
        if (keys.length !== expected.length) {
            return false;
        } else {
            // comparing each element of array
            for (let i = 0; i < keys.length; i++) {
                if (keys[i] !== expected[i]) {
                    return false;
                }
            }
            return true;
        }
    }

    private checkFilter(filter: any, parent: string): Promise<any> {
        const that = this;
        const listOfKeys: any[] = Object.keys(filter);
        return new Promise<any>((resolve, reject) => {
            if (parent === "WHERE" || "NOT") {
                if (listOfKeys.length === 1) {
                    return this.checkFilter(filter.listOfKeys[0], listOfKeys[0]);
                } else {
                    return reject(new InsightError("Expected WHERE to have 1 key got " + listOfKeys.length));
                }
            } else if (parent === "IS") {
                return that.checkFilterSCOMPParent(filter);

            } else if (parent === "EQ" || parent === "GT" || parent === "LT") {
                return that.checkFilterMCOMPParent(filter);
            } else if (parent === "OR" || parent === "AND") {
                if (Object.keys(filter).length < 1) {
                    return reject(new InsightError(parent + "expects at least one filter"));
                } else {
                    return this.checkLogicComp(listOfKeys, filter);
                }
            } else {
                return reject(new InsightError("Invalid filter: " + Object.keys(filter)[0] + " in " + parent));
            }
        });
    }

    private checkLogicComp(listOfFilterKeys: any, logic: any): Promise<any> {
        let listOfPromises: any[] = [];
        return new Promise<any>((resolve, reject) => {
            for (const filter of listOfFilterKeys) {
                listOfPromises.push(this.checkFilter(logic.filter, filter));
            }
            return Promise.all(listOfPromises);
        });
    }
    /*
    *  helper called by checkFilter, because checkFilter was getting too long
    *  should return true if filter is valid, otherwise return statement describing error
    */
    private checkFilterMCOMPParent(filter: any): Promise<any> {
        let dataset: string = Object.keys(filter)[0].split("_", 1)[0];
        const listOfKeys: any[] = Object.keys(filter);
        if (this.datasetToQuery === "") {
            this.datasetToQuery = dataset;
        }
        return new Promise<any>((resolve, reject) => {
            if (listOfKeys.length !== 1) {
                return reject(new InsightError(parent + " expects 1 key found " + listOfKeys.length));
            }
            if (this.datasetToQuery !== dataset) {
                return reject(new InsightError("Attempts to query more than one dataset"));
            }
            if (this.currentDS.includes(dataset)) {
                return reject(new InsightError(dataset + " not contained"));
            }
            return this.checkKeys(listOfKeys[0], "number", filter);
        });
    }
    /*
    *  helper called by checkFilter, because checkFilter was getting too long
    *  should return true if filter is valid, otherwise return statement describing error
    */
    private checkFilterSCOMPParent(filter: any): Promise<any> {
        const dataset = filter.key[0].split("_", 1)[0];
        const listOfKeys: any[] = Object.keys(filter);
        if (this.datasetToQuery === "") {
            this.datasetToQuery = dataset;
        }
        return new Promise<any>((resolve, reject) => {
            if (listOfKeys.length !== 1) {
                return reject(new InsightError("IS filter expects 1 key, found " + listOfKeys.length));
            }
            if (this.currentDS.includes(dataset)) {
                return reject(new InsightError(dataset + " in IS was not found"));
            }
            if (this.datasetToQuery !== dataset) {
                return reject(new InsightError("Cannot query from more than one dataset"));
            }
            return this.checkKeys(listOfKeys[0], "string", filter);
        });
    }

    private checkKeys(key: string, expected: string, filter: any): Promise<any> {
        let valueType: string = typeof filter[Object.keys(filter)[0]];
        return new Promise<any>((resolve, reject) => {
            if (this.coursevalidator.hasOwnProperty(key)) {
                if (this.coursevalidator.key === valueType) {
                    if (expected === valueType) {
                        return resolve(this.datasetToQuery);
                    }
                } else {
                    return reject(new InsightError(filter + " expects " + expected +
                        " but is called on " + valueType + " instead"));
                }
            }
            return reject(new InsightError("Column " + key + " not found"));
        });
    }
}
