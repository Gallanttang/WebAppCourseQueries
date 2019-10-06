import Log from "../Util";
import {InsightError, NotFoundError, ResultTooLargeError} from "./IInsightFacade";
import MemoryManager from "./MemoryManager";
import ASTNode from "./ASTNode";

export default class QueryPerformer {
    private astNode: ASTNode = new ASTNode();
    constructor() {
        Log.trace("QueryPerformer::init()");
    }

    /**
     * @param query
     * Promise resolves with result of query (an array of courses)
     *  A result should have a max size of 5,000. If this is exceeded, promise should reject with a ResultTooLargeError.
     */
    // todo change the test query to ResultTooLargeError!!
    public returnQueriedCourses(dataStructure: any, query: any): Promise<any[]> {
        let result: any;
        let that = this;
        return new Promise<any>((resolve) => {
            const value = query["WHERE"];
            // query[value] will give ["COLUMNS, "ORDER"]
            const columns = query["COLUMNS"]; // will give "COLUMNS"
            const columnsToDisplay = query[columns];
            if (value.hasOwnProperty) {
                const firstArgument: string = Object.keys(value)[0];
                Log.trace(firstArgument);
                switch (firstArgument) {
                    case "AND":
                        result = that.astNode.ANDfunc(dataStructure, value);
                        break;
                    case "OR":
                        result = that.astNode.orFunc(dataStructure, value);
                        break;
                    case "NOT":
                        result = that.astNode.NOTfunc(dataStructure, value);
                        break;
                    case "LT":
                        result = that.astNode.LTfunc(dataStructure, value);
                        break;
                    case "EQ":
                        result = that.astNode.EQfunc(dataStructure, value);
                        break;
                    case "GT":
                        result = that.astNode.GTfunc(dataStructure, value);
                        break;
                    case "IS":
                        result = that.astNode.ISfunc(dataStructure, value);
                        break;
                }
                return result;
            } else { result = dataStructure; }
            // else {
            //     // there's nothing in WHERE. return all results if it's not too large
            //     if (Object.keys(query["WHERE"]).length === 0) {
            //       return reject("The result is too big. Only queries with a maximum of 5000 results are supported.");
            //     }
            // }
            // assume that result is only of the columns chosen

            // sort result given ORDER
            const orderBy: any = query["ORDER"]; // should give "courses_avg" or something else
            // sort by given key to order (orderBy) in result
            result.sort(that.compareValues(orderBy));
            return resolve(result);
        });
    }
    public compareValues(key: any): any {
        return function (a: any, b: any) {
            if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
                // key does not exist in object
                return 0;
            }
            const varA = (typeof a[key] === "string") ?
                a[key].toUpperCase() : a[key];
            const varB = (typeof b[key] === "string") ?
                b[key].toLowerCase() : b[key];
            let comparison = 0;
            if (varA > varB) {
                comparison = 1;
            } else if (varA < varB) {
                comparison = -1;
            }
            return comparison;
        };
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
}
