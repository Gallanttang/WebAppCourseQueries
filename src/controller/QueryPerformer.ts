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
                        result = that.astNode.ANDfunc(dataStructure[firstArgument], value);
                        break;
                    case "OR":
                        Log.trace(value);
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
            return resolve(result);
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
}
