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
        return new Promise<any>((resolve, reject) => {
            if (parent === "WHERE") {
                this.checkIfMoreThanOneKey(filter, parent).then((result) => {
                    if (result)  {
                        return resolve(this.datasetToQuery);
                    }
                }).catch((err) => {
                    return err;
                });
            } else if (parent === "IS") {
                that.checkFilterSCOMPParent(filter).then((result) => {
                    if (result) {
                        return resolve(this.datasetToQuery);
                    }
                }).catch ((err) => {
                    return reject(err);
                });

            } else if (parent === "EQ" || parent === "GT" || parent === "LT") {
                that.checkFilterMCOMPParent(filter, parent).then((result) => {
                    return resolve(this.datasetToQuery);
                }).catch((err) => {
                    return reject(err);
                });
            } else if (parent === "OR" || parent === "AND") {
                if (Object.keys(filter).length < 1) {
                    return reject(new InsightError(parent + "expects at least one filter"));
                    // for (const key of Object.keys(filter)) {
                    //     that.checkFilter(filter[key], key).then((result) => {
                    //         if (!result) {
                    //             return reject(new InsightError());
                    //         }
                    //     }).catch((err: any) => {
                    //         return (err);
                    //     });
                    // }
                    // let ds: string = Object.keys(filter)[0].split("_", 1)[0];
                    // if (ds !== dataset && typeof filter[Object.keys(filter)[0]] === "object") {
                    //     return resolve(true);
                    // } else {
                    //     return reject(new InsightError(false));
                    // }
                } else {
                    //
                }
            } else {
                return reject(new InsightError(false));
            }
        });
    }

    private checkIfMoreThanOneKey(filter: any, parent: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (Object.keys(filter).length === 1) {
                this.checkFilter(filter[Object.keys(filter)[0]], Object.keys(filter)[0])
                    .then((result: any) => {
                        return result;
                    }).catch((err: any) => {
                    return reject(err);
                });
            } else {
                return reject(new InsightError("There is more than one filter in " + parent));
            }
        });
    }
    /*
    *  helper called by checkFilter, because checkFilter was getting too long
    *  should return true if filter is valid, otherwise return statement describing error
    */
    private checkFilterMCOMPParent(filter: any, parent: string): Promise<any> {
        let dataset: string = Object.keys(filter)[0].split("_", 1)[0];
        return new Promise<any>((resolve, reject) => {
            if (this.datasetToQuery === "") {
                this.datasetToQuery = dataset;
            }
            if (Object.keys(filter).length !== 1) {
                return reject(new InsightError(parent + " does not have only 1 key value pair"));

            }
            if (this.datasetToQuery !== dataset) {
                return reject(new InsightError(dataset + " not does not match " + this.datasetToQuery));
            }
            if (this.currentDS.includes(dataset)) {
                return reject(new InsightError(dataset + " in " + parent + " was not found"));
            }
            if (typeof filter[Object.keys(filter)[0]] === "number") {
                return reject(new InsightError(parent + " expected a number but got a "));
            }
            return resolve(true);
        });
    }
    /*
    *  helper called by checkFilter, because checkFilter was getting too long
    *  should return true if filter is valid, otherwise return statement describing error
    */
    private checkFilterSCOMPParent(filter: any): Promise<any> {
        const dataset = filter.key[0].split("_", 1)[0];
        return new Promise<any>((resolve, reject) => {
            if (this.datasetToQuery === "") {
                this.datasetToQuery = dataset;
            }
            if (Object.keys(filter).length !== 1) {
                return reject(new InsightError("IS filter expects 1 key, found " + Object.keys(filter).length));
            }
            if (this.currentDS.includes(dataset)) {
                return reject(new InsightError(dataset + " in IS was not found"));
            }
            if (this.datasetToQuery !== dataset) {
                return reject(new InsightError("Cannot query from more than one dataset"));
            }
            if (typeof filter[Object.keys(filter)[0]] !== "string") {
                return reject(new InsightError("IS expects a string, not " +
                    typeof filter[Object.keys(filter)[0]]));
            }
            return resolve(true);
        });
    }

    private checkKeys(key: string, valueType: string, expected: string, filter: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (this.coursevalidator.hasOwnProperty(key)) {
                if (this.coursevalidator.key === valueType) {
                    if (expected === valueType) {
                        return resolve(this.datasetToQuery);
                    }
                }
                return reject(new InsightError(filter + " expects " + expected +
                    " but is called on " + valueType + " instead"));
            }
            return reject(new InsightError("Column " + key + " not found"));
        });
    }
}
