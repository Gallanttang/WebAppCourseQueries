import * as fs from "fs";
import Log from "../Util";

export default class Node {
    public value: any;
    public children: any;
    constructor(value: any) {
        this.value = value;
        this.children = [];
    }

    /**
     * @param dataStructure
     * @param query
     *  Returns a promise of dictionary (result) of pairs <department: array of indices> of valid sections
     */
    public AND(dataStructure: any, query: any): Promise<any> {
        return new Promise<string[]>((resolve, reject) => {
            const childPromises: Array<Promise<number>> = [];
            let result: any = {};
            // query is going to be in form GT: {courses_avg: 98}
            const datasetName = query.key[0].split("_", 1)[0]; // this will give courses
            const columnName = query["GT"].split("_", 1)[1]; // this will give avg
            const condition = columnName[Object.keys(columnName)[0]]; // this will give 98
            // todo call appropriate child functions, might need to make a switch statement?
            Promise.all(childPromises).then((results) => {
                // todo concaternate results
            });
            return resolve(result);
        });
    }
    public OR(dataStructure: any): any {
        return null;
    }
    public NOT(dataStructure: any): any {
        return null;
    }
    public LT(dataStructure: any): any {
        return null;
    }
    public EQ(dataStructure: any): any {
        return null;
    }
    public GT(dataStructure: any, query: any): any {
        return null;
    }

    /**
     * @param dataStructure
     * @param query
     *  Returns a promise of dictionary (result) of pairs <department: array of indices> of valid sections
     */
    public IS(dataStructure: any, query: any): Promise<any> {
        return new Promise<string[]>((resolve, reject) => {
            let result: any = {};
            // query is going to be in format IS: { courses_instructor: "cox, barbara"}
            const columnName = query["IS"].split("_", 1)[1]; // this will give instructor
            const condition = columnName[Object.keys(columnName)[0]]; // this will give "cox, barbara"
            const datasetName = query.key[0].split("_", 1)[0]; // this will give courses
            let reg: any;
            if (condition.charAt(0) === "*") {
                reg = new RegExp("(.*)" + condition);
            } else if (condition.charAt(condition.length - 1) === "*") {
                reg = new RegExp(condition + "(.*)" );
            } else {
                reg = new RegExp(condition);
            }
            if (columnName === "dept") {
                dataStructure[columnName].forEach((value: any, index: any) => result.push(index));
            } else {
                for (const dept of dataStructure) {
                    const deptResult: any = {};
                    const columns = dataStructure[Object.keys(dataStructure)[0]];
                    const relevantColumn = columns[columnName]; // returns value (array) of relevant column
                    relevantColumn.forEach((value: any, index: any) => {
                        if (value === reg) {
                            deptResult.push(index);
                        }
                    });
                    result.push({dept : deptResult});
                }
                return resolve(result);
            }
        });
    }
}
