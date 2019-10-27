import Log from "../Util";
import {ResultTooLargeError} from "./IInsightFacade";
import QueryFiltering from "./QueryFiltering";
import QueryTransforming from "./QueryTransforming";

export default class QueryPerformer {
    private filtering: QueryFiltering = new QueryFiltering();
    private transformer: QueryTransforming = new QueryTransforming();
    constructor() {
        Log.trace("QueryPerformer::init()");
    }

    /**
     * @param query
     * Promise resolves with result of query (an array of courses)
     *  A result should have a max size of 5,000. If this is exceeded, promise should reject with a ResultTooLargeError.
     */
    public returnQueriedCourses(dataStructure: any, query: any, numRows: number): any[] {
        let result: any[] = [];
        let that = this;
        const filter: any = query["WHERE"];
        for (let index: number = 0; index < numRows; index++) {
            let section: any = {};
            for (const column of Object.keys(dataStructure)) {
                if (Array.isArray(dataStructure[column])) {
                    section[column] = dataStructure[column][index];
                }
            }
            if (this.filtering.checkCond(section, filter)) {
                result.push(section);
            }
            if (result.length > 5000) {
                throw new ResultTooLargeError("Only queries with a maximum of 5000 results are supported.");
            }
        }
        if (result.length === 0) {
            return result;
        }
        if (query.hasOwnProperty("TRANSFORMATIONS")) {
            result = this.transformer.transform(query["TRANSFORMATIONS"], result);
        }
        result = this.selectColumns(result, query["OPTIONS"]["COLUMNS"]);
        // assume that result is only of the columns chosen
        if (query["OPTIONS"].hasOwnProperty("ORDER")) {
            let order: any = query["OPTIONS"]["ORDER"];
            // sort result given ORDER
            if (typeof order === "string") {
                // order should be "courses_avg" or something else
                // sort by given key to order (orderBy) in result
                result.sort((a, b) =>
                    (a[order] > b[order]) ? 1 :
                        (b[order] > a[order]) ? -1 : 0);
            } else {
                let dir: string = order["dir"];
                let keys: string[] = order["keys"];
                result.sort(function (a, b) {
                    if (dir === "DOWN") {
                        return (a[order[keys[0]]] < b[order[keys[0]]]) ? 1 :
                            (b[order[keys[0]]] < a[order[keys[0]]]) ? -1 : (that.advanceSort(a, b, keys, 0));
                    } else {
                        return (a[order[keys[0]]] > b[order[keys[0]]]) ? 1 :
                            (b[order[keys[0]]] > a[order[keys[0]]]) ? -1 : (that.advanceSort(b, a, keys, 0));
                    }
                });
            }
        }
        return result;
    }

    private advanceSort(a: any, b: any, keys: string[], index: number): number {
        let nextIndex: number = index + 1;
        if (a[keys[index]] < b[keys[index]]) {
            return 1;
        } else if (a[keys[index]] < b[keys[index]]) {
            return -1;
        } else if (nextIndex !== keys.length) {
            return this.advanceSort(a, b, keys, index);
        } else {
            return 0;
        }
    }

    private selectColumns(result: any[], options: string[]) {
        let returnValue: any[] = [];
        for (const index in result) {
            let section: any = {};
            for (const column of options) {
                if (result[index].hasOwnProperty(column)) {
                    section[column] = result[index][column];
                }
            }
            if (section.hasOwnProperty) {
                returnValue.push(section);
            }
        }
        return returnValue;
    }
}
