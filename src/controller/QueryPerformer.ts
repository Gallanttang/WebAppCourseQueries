import Log from "../Util";
import {ResultTooLargeError} from "./IInsightFacade";
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
    public returnQueriedCourses(dataStructure: any, query: any): any[] {
        let result: any[] = [];
        let that = this;
        const value: any = query["WHERE"];
        if (value.hasOwnProperty) {
            result = that.astNode.switcher(value, dataStructure);
        } else {
            for (let index: number = 0; index < dataStructure[Object.keys(dataStructure)[0]].length; index++) {
                result.push(index);
            }
        }
        Log.trace(result.length);
        if (result.length >= 5000) {
            throw new
            ResultTooLargeError("The result is too big. Only queries with a maximum of 5000 results are supported.");
        }
        if (result.length === 0) {
            return result;
        }
        result = this.selectColumns(result, query["OPTIONS"]["COLUMNS"], dataStructure);
        // assume that result is only of the columns chosen
        if (query["OPTIONS"].hasOwnProperty("ORDER")) {
            // sort result given ORDER
            const orderBy: string = query["OPTIONS"]["ORDER"]; // should give "courses_avg" or something else
            // sort by given key to order (orderBy) in result
            result.sort(that.compareValues(orderBy));
        }
        return result;
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

    private selectColumns(result: any[], options: string[], dataStructure: any) {
        let returnValue: any[] = [];
        for (const index of result) {
            let section: any = {};
            for (const column of options) {
                if (dataStructure.hasOwnProperty(column)) {
                    section[column] = dataStructure[column][index];
                }
            }
            returnValue.push(section);
        }
        return returnValue;
    }
}
