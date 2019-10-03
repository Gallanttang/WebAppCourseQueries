import * as fs from "fs";
import Log from "../Util";

export default class Node {
    public value: any;
    public children: any;
    constructor(value: any) {
        this.value = value;
        this.children = [];
    }

    public AND(dataStructure: any): any {
        return null;
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
    public GT(dataStructure: any): any {
        return null;
    }
    public IS(dataStructure: any, query: any): Promise<any> {
        return new Promise<string[]>((resolve, reject) => {
            let result: any = [];
            // todo oh fuck multiple indicies in different departments. must return key + index
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
                    const columns = dataStructure[Object.keys(dataStructure)[0]];
                    const relevantColumn = columns[columnName]; // returns value (array) of relevant column
                    relevantColumn.forEach((value: any, index: any) => {
                        if (value === reg) {
                            result.push(index);
                        }
                    });
                }
                return result;
            }
        });
    }
}
