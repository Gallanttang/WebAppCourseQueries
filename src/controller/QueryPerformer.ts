import Log from "../Util";
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
    public returnQueriedCourses(dataStructure: any, query: any, numRows: number): any[] {
        let result: any[] = [];
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
