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
        if (query.hasOwnProperty("TRANSFORMATION")) {
            result = this.transform(query["TRANSFORMATION"], result);
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

    private transform(queryElement: any, result: any[]): any[] {
        let group: string[] = queryElement["GROUP"];
        let apply: any[] = queryElement["APPLY"];
        let returnValue: any[] = this.transformGroup(group, result);
        returnValue = this.transformApply(apply, returnValue);
        return returnValue;
    }

    private transformApply(apply: any[], result: any): any[] {
        let that = this;
        let returnValue: any[] = [];
        let keys: string[] = Object.keys(result);
        for (let key of keys) {
            let temp: any = result[key];
            if (!Array.isArray(result[key])) {
                temp = that.transformApplyHelper(temp);
            }
            for (const applyRule of apply) {
                let applyKey: string = Object.keys(applyRule)[0];
                let applyToken: string = Object.keys(applyRule[applyKey])[0];
                returnValue.push(this.apply(applyToken, temp, applyRule[applyKey][applyToken]));
            }
        }
        return returnValue;
    }

    private transformApplyHelper(returnValue: any): any[] {
        if (!Array.isArray(returnValue)) {
            let keys: string = Object.keys(returnValue)[0];
            return this.transformApplyHelper(returnValue[keys[0]]);
        } else {
            return returnValue;
        }
    }

    private transformGroup(group: string[], result: any[]): any[] {
        let returnValue: any = {};
        for (let section of result) {
            returnValue = this.transformGroupHelper(returnValue, section, group, 0);
        }
        return returnValue;
    }

    private transformGroupHelper(returnValue: any, section: any, cond: string[], index: number): any[] {
        let nextIndex: number = index + 1;
        let group: string = section[cond[index]];
        if (cond.length - 1 !== index) {
            if (returnValue.hasOwnProperty(group)) {
                returnValue[group] = this.transformGroupHelper(returnValue[group], section, cond, nextIndex);
            } else {
                returnValue[group] = {};
                returnValue[group] = this.transformGroupHelper(returnValue[group], section, cond, nextIndex);
            }
        } else if (returnValue.hasOwnProperty(group)) {
            returnValue[group].push(section);
        } else {
            returnValue[group] = [];
            returnValue[group].push(section);
        }
        return returnValue;
    }

    private apply(applyToken: string, section: any[], applyKey: string) {
        if (applyToken === "MAX") {
            section.reduce(function (acc, curr) {
                if (curr[applyKey] > acc) {
                    return curr[applyKey];
                } else {
                    return acc;
                }
            }, 0);
        }
    }
}
