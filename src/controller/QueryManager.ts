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
                        // there's stuff in the "WHERE", NEED TO RECURSE
                        // if (!this.checkFilter(query["WHERE"], "WHERE", datasets)) {
                        //     return false;
                        // }
                        that.checkFilter(query["WHERE"], "WHERE", datasets).then((result: any) => {
                            if (!result) {
                                return (reject(new InsightError("invalid filter(s)")));
                            }
                        }).catch((err: any) => {
                            return (reject(new InsightError(err)));
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
        return new Promise<any>((resolve, reject) => {
            if (parent === "WHERE") {
                if (Object.keys(filter).length === 1) {
                    return this.checkFilter(filter[Object.keys(filter)[0]], Object.keys(filter)[0], datasets);
                } else {
                    return reject(new InsightError("There is more than one filter in WHERE"));
                }
            } else if (parent === "IS") {
                const dataset = filter.key[0].split("_", 1)[0];
                if (!(!datasets.includes(dataset) && Object.keys(filter).length === 1 &&
                    typeof filter[Object.keys(filter)[0]] === "string")) {
                    return reject(new InsightError(""));
                }
            } else if (parent === "EQ" || parent === "GT" || parent === "LT") {
                if (Object.keys(filter).length === 1) {
                    let dataset: string = Object.keys(filter)[0].split("_", 1)[0];
                    if (this.datasetToQuery === "") {
                        this.datasetToQuery = dataset;
                    } else if (this.datasetToQuery !== dataset) {
                        return reject(new InsightError(dataset + " not does not match " + this.datasetToQuery));
                    }
                    if (!datasets.includes(dataset) && typeof filter[Object.keys(filter)[0]] === "number") {
                        return resolve(true);
                    }
                } else {
                    return reject(new InsightError(parent + " does not have only 1 key value pair"));
                }
            } else if (parent === "NOT" || parent === "OR" || parent === "AND") {
                if (Object.keys(filter).length >= 1) {
                    for (const key of Object.keys(filter)) {
                        if (!this.checkFilter(filter[key], key, datasets)) {
                            return reject(new InsightError(false));
                        }
                    }
                    let dataset: string = Object.keys(filter)[0].split("_", 1)[0];
                    return !datasets.includes(dataset) && typeof filter[Object.keys(filter)[0]] === "object";
                } else {
                    return reject(new InsightError(false));
                }
            } else {
                return reject(new InsightError(false));
            }
        });
    }
}
