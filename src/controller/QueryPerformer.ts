import Log from "../Util";
import {InsightError, NotFoundError} from "./IInsightFacade";
import MemoryManager from "./MemoryManager";
import ASTNode from "./ASTNode";

export default class QueryPerformer {
    private node = new ASTNode();
    constructor() {
        Log.trace("QueryPerformer::init()");
    }

    /**
     * @param query
     * Promise resolves with result of query (an array of courses)
     *  A result should have a max size of 5,000. If this is exceeded, promise should reject with a ResultTooLargeError.
     */
    // todo change the test query to ResultTooLargeError!!
    public returnQueriedCourses(query: any): Promise<any[]> {
        const thisClass = this;
        return new Promise<any>((resolve, reject) => {
            const value = query.key(1);
            // query[value] will give ["COLUMNS, "ORDER"]
            const columns = query[value].key(0); // will give "COLUMNS"
            const columnsToDisplay = query[columns];
            if (query["WHERE"].hasOwnProperty) {
                // todo change "ANDfunc" to appropriate one. might need the funcDictionary
                thisClass.node.ANDfunc(null, query["WHERE"]).then((result: any) => {
                    // use indices in result to get the courses info
                });
            } else {
                // there's nothing in WHERE. return all results if it's not too large
            }
            return reject("not implemented");
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
