import Log from "../Util";
import {InsightError, NotFoundError, ResultTooLargeError} from "./IInsightFacade";
import MemoryManager from "./MemoryManager";
import ASTNode from "./ASTNode";

export default class QueryPerformer {
    private node: ASTNode;
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
        const thisClass = this;
        let result: any;
        return new Promise<any>((resolve, reject) => {
            const value = query.key(1);
            // query[value] will give ["COLUMNS, "ORDER"]
            const columns = query[value].key(0); // will give "COLUMNS"
            const columnsToDisplay = query[columns];
            if (query["WHERE"].hasOwnProperty) {
                const wherequery = query["WHERE"];
                const firstArgument = Object.keys(wherequery)[0];
                switch (firstArgument) {
                    case "AND":
                        result = this.node.ANDfunc(dataStructure, wherequery);
                        break;
                    case "OR":
                        result = this.node.ORfunc(dataStructure, wherequery);
                        break;
                    case "NOT":
                        result = this.node.NOTfunc(dataStructure, wherequery);
                        break;
                    case "LT":
                        result = this.node.LTfunc(dataStructure, wherequery);
                        break;
                    case "EQ":
                        result = this.node.EQfunc(dataStructure, wherequery);
                        break;
                    case "GT":
                        result = this.node.GTfunc(dataStructure, wherequery);
                        break;
                }
            } else {
                // there's nothing in WHERE. return all results if it's not too large
                if (Object.keys(query["WHERE"]).length === 0) {
                    return reject("The result is too big. Only queries with a maximum of 5000 results are supported.");
                }
            }
            let numRows = Object.keys(result).length;
            if (numRows >= 5000) {
                throw new ResultTooLargeError("The result is too big. Only queries with " +
                    "a maximum of 5000 results are supported.");
            }
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
