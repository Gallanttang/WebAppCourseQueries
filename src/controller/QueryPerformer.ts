import Log from "../Util";
import ASTNode from "./ASTNode";
import {ResultTooLargeError} from "./IInsightFacade";
import Filtering from "./Filtering";

export default class QueryPerformer {
    private filtering: Filtering = new Filtering();
    constructor() {
        Log.trace("QueryPerformer::init()");
    }

    /**
     * @param query
     * Promise resolves with result of query (an array of courses)
     *  A result should have a max size of 5,000. If this is exceeded, promise should reject with a ResultTooLargeError.
     */
    public returnQueriedCourses(dataStructure: any, query: any): any[] {
        let result: any[] = [];
        const value: any = query["WHERE"];
        for (let index: number = 0; index < dataStructure[Object.keys(dataStructure)[0]].length; index++) {
            let section: any = {};
            for (const column of Object.keys(dataStructure)) {
                if (Array.isArray(dataStructure[column])) {
                    section[column] = dataStructure[column][index];
                }
            }
            if (Object.keys(value).length === 1) {
                if (this.filtering.checkCond(section, value)) {
                    result.push(section);
                }
            } else {
                result.push(section);
            }
        }
        if (result.length > 5000) {
           throw new ResultTooLargeError("The result is too big." +
                " Only queries with a maximum of 5000 results are supported.");
        }
        if (result.length === 0) {
            return result;
        }
        result = this.selectColumns(result, query["OPTIONS"]["COLUMNS"]);
        // assume that result is only of the columns chosen
        if (query["OPTIONS"].hasOwnProperty("ORDER")) {
            // sort result given ORDER
            const orderBy: string = query["OPTIONS"]["ORDER"]; // should give "courses_avg" or something else
            // sort by given key to order (orderBy) in result
            result.sort((a, b) =>
                (a[orderBy] > b[orderBy]) ? 1 :
                    (b[orderBy] > a[orderBy]) ? -1 : 0
            );
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
