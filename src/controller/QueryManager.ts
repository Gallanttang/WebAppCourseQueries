import Log from "../Util";
import {InsightError} from "./IInsightFacade";

export default class QueryManager {
    private datasetToQuery: string;
    constructor() {
        Log.trace("MemoryManager::init()");
        this.datasetToQuery = "";
    }

    /*
    *  helper for PerformQuery
    * @return Promise<any>
    * the promise should fulfill with true if query is valid, InsightError if it isn't
    */

    public isQueryValid(query: any, datasets: any): Promise<any> {
        const that = this;
        return new Promise<any>((resolve, reject) => {
            if (query != null && typeof query === "object") {
                if (that.equals(Object.keys(query), ["WHERE", "OPTIONS"]) ||
                    that.equals(Object.keys(query), ["OPTIONS", "WHERE"])) {
                    if (query["WHERE"].hasOwnProperty) {
                        that.checkFilter(query["WHERE"], "WHERE", datasets).then((result: any) => {
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

    private checkFilter(filter: any, parent: string, datasets: any): Promise<any> {
        const that = this;
        return new Promise<any>((resolve, reject) => {
            if (parent === "WHERE") {
                if (Object.keys(filter).length === 1) {
                    const childFilter: any = filter[Object.keys(filter)[0]];
                    that.checkFilter(childFilter, Object.keys(filter)[0], datasets).then((result: any) => {
                        return result;
                    }).catch((err: any) => {
                        return (err);
                    });
                } else {
                    return reject(new InsightError("There is more than one filter in WHERE"));
                }
            } else if (parent === "IS") {
                if (that.checkFilterSCOMPParent(filter, datasets) === true) {
                    return resolve(true);
                }
                return reject(false);
            } else if (parent === "EQ" || parent === "GT" || parent === "LT") {
                let isFilterValid: any = that.checkFilterMCOMPParent(filter, parent, datasets);
                if (isFilterValid === true) {
                    return resolve(true);
                }
                return reject(isFilterValid);
            } else if (parent === "NOT" || parent === "OR" || parent === "AND") {
                if (Object.keys(filter).length >= 1) {
                    for (const key of Object.keys(filter)) {
                        that.checkFilter(filter[key], key, datasets).then((result: any) => {
                            if (!result) {
                                return reject(new InsightError(false));
                            }
                        }).catch((err: any) => {
                            return (err);
                        });
                    }
                    let dataset: string = Object.keys(filter)[0].split("_", 1)[0];
                    if (!datasets.includes(dataset) && typeof filter[Object.keys(filter)[0]] === "object") {
                        return resolve(true);
                    } else {
                        return reject(new InsightError(false));
                    }
                } else {
                    return reject(new InsightError(false));
                }
            } else {
                return reject(new InsightError(false));
            }
        });
    }
    /*
    *  helper called by checkFilter, because checkFilter was getting too long
    *  should return true if filter is valid, otherwise return statement describing error
    */
    private checkFilterMCOMPParent(filter: any, parent: string, datasets: any): any {
        if (Object.keys(filter).length === 1) {
            let dataset: string = Object.keys(filter)[0].split("_", 1)[0];
            if (this.datasetToQuery === "") {
                this.datasetToQuery = dataset;
            } else if (this.datasetToQuery !== dataset) {
                return (dataset + " not does not match " + this.datasetToQuery);
            }
            if (!datasets.includes(dataset) && typeof filter[Object.keys(filter)[0]] === "number") {
                return true;
            }
        } else {
            return (parent + " does not have only 1 key value pair");
        }
    }
    /*
    *  helper called by checkFilter, because checkFilter was getting too long
    *  should return true if filter is valid, otherwise return statement describing error
    */
    private checkFilterSCOMPParent(filter: any, datasets: any): boolean {
        const dataset = filter.key[0].split("_", 1)[0];
        return (!datasets.includes(dataset) && Object.keys(filter).length === 1 &&
            typeof filter[Object.keys(filter)[0]] === "string");
    }
}
