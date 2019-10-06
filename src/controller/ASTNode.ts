import * as fs from "fs";
import Log from "../Util";
import {ResultTooLargeError} from "./IInsightFacade";

export default class ASTNode {
    constructor() {
        Log.trace("QueryPerformer::init()");
    }
    private funcDictionary: any = {
        AND: this.ANDfunc,
        OR: this.ORfunc,
        NOT: this.NOTfunc,
        LT: this.LTfunc,
        EQ: this.EQfunc,
        GT: this.GTfunc
    };
    /**
     * @param dataStructure
     * @param query
     *  Returns a promise of dictionary (result) of pairs <department: array of indices> of valid sections
     */
    public ANDfunc(dataStructure: any, query: any): Promise<any> {
        const that = this;
        const childPromises: any = [];
        return new Promise<string[]>((resolve) => {
            let result: any = {};
            // query is going to be in form OR[GT: {courses_avg: 98}, ...]
            const childQuery = query["AND"]; // this will give [GT: {courses_avg: 98}, ...]
            if (Array.isArray(childQuery)) {
                for (const val of childQuery) {
                    result.push(that.funcDictionary[val](dataStructure, val));
                }
            }
            Promise.all(childPromises).then((childResults) => {
                let tempResult = childResults[0]as Record<string, any>;
                for (const cr of childResults) {
                    let restrictedCR = cr as Record<string, any>;
                    if (childResults.indexOf(cr) > 0 ) {
                        let deptKeys = Object.keys(cr);
                        for (const key of deptKeys) {
                            if (tempResult.hasOwnProperty(key)) {
                                // only keep elements which are also found in the cr
                                tempResult[key] = tempResult[key].filter((f: any) => restrictedCR[key].includes(f));
                                // if any key becomes empty of all elements, delete it
                                if (!tempResult[key].hasOwnProperty) {
                                    tempResult.splice(tempResult[key].indexOf, 1);
                                }
                            }
                        }
                    }
                }
                result = tempResult;
            });
            return resolve(result);
        });
    }
    /**
     * @param dataStructure
     * @param query
     *  Returns a promise of dictionary (result) of pairs <department: array of indices> of valid sections
     */
    public ORfunc(dataStructure: any, query: any): any {
        const that = this;
        const childPromises: any = [];
        return new Promise<string[]>((resolve) => {
            let result: any = {};
            // query is going to be in form AND[GT: {courses_avg: 98}, ...]
            const childQuery = query["AND"]; // this will give [GT: {courses_avg: 98}, ...]
            if (Array.isArray(childQuery)) {
                for (const val of childQuery) {
                    result.push(that.funcDictionary[val](dataStructure, val));
                }
            }
            Promise.all(childPromises).then((childResults) => {
                let tempResult = childResults[0]as Record<string, any>;
                for (const cr of childResults) {
                    let restrictedCR = cr as Record<string, any>;
                    let index = childResults.indexOf(cr);
                    if (index > 0 ) {
                        let deptKeys = Object.keys(cr);
                        for (const key of deptKeys) {
                            if (tempResult.hasOwnProperty(key)) {
                                // concatenate
                                // not sure if this way of using as Record<string, any> is ok ?
                                tempResult[key].concat(restrictedCR[key]);
                            } else {
                                tempResult.push({ [key] : restrictedCR[key]});
                            }
                        }
                    }
                }
                result = tempResult;
            });
            return resolve(result);
        });
    }
    public NOTfunc(dataStructure: any, query: any): any {
        let that = this;
        let result: any = dataStructure;
        // query is going to be in form NOT{GT: {courses_avg: 98}}
        const childQuery = query["AND"]; // this will give GT
        that.funcDictionary[childQuery](dataStructure, childQuery).then((childResult: any) => {
            let restrictedCR = childResult as Record<string, any>;
            let deptKeys = Object.keys(childResult);
            for (const key of deptKeys) {
                // delete all elements which are returned by the childResult
                result[key] = result[key].filter((f: any) => restrictedCR[key].includes(f));
                // if any key becomes empty of all elements, delete it
                if (!result[key].hasOwnProperty) {
                    result.splice(result[key].indexOf, 1);
                }
            }
        });
        return result;
    }
    public LTfunc(dataStructure: any, query: any): any {
        return new Promise<string[]>((resolve) => {
            let result: any = {};
            // query is going to be in format EQ: { courses_avg: 99}
            const columnName = query["IS"].split("_", 1)[1]; // this will give avg
            const insideIS = query["IS"]; // will give "courses_avg"
            const condition = query[insideIS]; // will give 99
            if (columnName === "dept") {
                dataStructure[columnName].forEach((value: any, index: any) => result.push({[condition]: index}));
            } else {
                for (const dept of dataStructure) {
                    const deptResult: any = [];
                    const columns = dataStructure[Object.keys(dataStructure)[0]];
                    const relevantColumn = columns[columnName]; // returns value (array) of relevant column
                    relevantColumn.forEach((value: any, index: any) => {
                        if (value <= condition) {
                            deptResult.push(index);
                        }
                    });
                    result.push({ [dept] : deptResult});
                }
                return resolve(result);
            }
        });
    }
    public EQfunc(dataStructure: any, query: any): any {
        return new Promise<string[]>((resolve) => {
            let result: any = {};
            // query is going to be in format EQ: { courses_avg: 99}
            const columnName = query["IS"].split("_", 1)[1]; // this will give avg
            const insideIS = query["IS"]; // will give "courses_avg"
            const condition = query[insideIS]; // will give 99
            if (columnName === "dept") {
                dataStructure[columnName].forEach((value: any, index: any) => result.push({[condition]: index}));
            } else {
                for (const dept of dataStructure) {
                    const deptResult: any = [];
                    const columns = dataStructure[Object.keys(dataStructure)[0]];
                    const relevantColumn = columns[columnName]; // returns value (array) of relevant column
                    relevantColumn.forEach((value: any, index: any) => {
                        if (value === condition) {
                            deptResult.push(index);
                        }
                    });
                    result.push({ [dept] : deptResult});
                }
                return resolve(result);
            }
        });
    }
    public GTfunc(dataStructure: any, query: any): any {
        let result: any = {};
        // query is going to be in format GT: { courses_avg: 99}
        const columnName = query["IS"].split("_", 1)[1]; // this will give avg
        const insideIS = query["IS"]; // will give "courses_avg"
        const condition = query[insideIS]; // will give 99
        if (columnName === "dept") {
            dataStructure[columnName].forEach((value: any, index: any) => result.push({[condition]: index}));
        } else {
            for (const dept of dataStructure) {
                const deptResult: any = [];
                const columns = dataStructure[Object.keys(dataStructure)[0]];
                const relevantColumn = columns[columnName]; // returns value (array) of relevant column
                relevantColumn.forEach((value: any, index: any) => {
                    if (value >= condition) {
                        deptResult.push(index);
                    }
                });
                result[dept] = deptResult;
            }
            return result;
        }
    }

    /**
     * @param dataStructure
     * @param query
     *  Returns a promise of dictionary of pairs <department: array of indices> of valid sections
     */
    public ISfunc(dataStructure: any, query: any): any {
        let result: any = {};
        // query is going to be in format IS: { courses_instructor: "cox, barbara"}
        const columnName = query["IS"].split("_", 1)[1]; // this will give instructor
        const insideIS = query["IS"]; // will give courses_instructor
        const datasetName = query.key[0].split("_", 1)[0]; // this will give courses
        const condition = query[insideIS]; // will give "cox, barbara"
        let reg: RegExp;
        if (condition.charAt(0) === "*" && condition.charAt(condition.length - 1) === "*") {
            reg = new RegExp("(.*)" + condition + "(.*)");
        } else if (condition.charAt(condition.length - 1) === "*") {
            reg = new RegExp(condition + "(.*)");
        } else if (condition.charAt(0) === "*") {
            reg = new RegExp("(.*)" + condition);
        } else {
            reg = new RegExp(condition);
        }
        if (columnName === "dept") {
            dataStructure[columnName].forEach((value: any, index: any) => result.push({[condition]: index}));
        } else {
            for (const dept of dataStructure) {
                const deptResult: any = [];
                const columns = dataStructure[Object.keys(dataStructure)[0]];
                const relevantColumn = columns[columnName]; // returns value (array) of relevant column
                relevantColumn.forEach((value: any, index: any) => {
                    if (value === reg) {
                        deptResult.push(index);
                    }
                });
                result[dept] = deptResult;
            }
            return result;
        }
    }
}
