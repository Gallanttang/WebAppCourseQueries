import Log from "../Util";

export default class ASTNode {
    constructor() {
        Log.trace("QueryPerformer::init()");
    }

    /**
     * @param dataStructure
     * @param query
     *  Returns a promise of dictionary (result) of pairs <department: array of indices> of valid sections
     */
    public ANDfunc(dataStructure: any, query: any): number[] {
        const that = this;
        const filters: any[] = query["AND"]; // this will give [GT: {courses_avg: 98}, ...]
        let tempResult: any[];
        let result: any[] = [];
        // query is going to be in form OR[GT: {courses_avg: 98}, ...]
        for (const filter in filters) {
            if (Number(filter) === 0) {
                result = that.switcher(filters[filter], dataStructure);
            } else {
                tempResult = that.switcher(filters[filter], dataStructure);
                result = result.filter((f: any) => tempResult.includes(f));
            }
        }
        return result;
    }

    /**
     * @param dataStructure
     * @param query
     *  Returns a promise of dictionary (result) of pairs <department: array of indices> of valid sections
     */
    public ORfunc(dataStructure: any, query: any): number[] {
        let result: any[] = [];
        let results: any[] = [];
        // query is going to be in form AND[GT: {courses_avg: 98}, ...]
        const filters = query["OR"]; // this will give [GT: {courses_avg: 98}, ...]
        for (const filter in filters) {
            let tempResult = this.switcher(filters[filter], dataStructure);
            for (const res of tempResult) {
                if (!result.includes(res)) {
                    result.push(res);
                }
            }
        }
        return result.sort();
    }

    public NOTfunc(dataStructure: any, query: any): number[] {
        let that = this;
        let result: number[] = [];
        let toNegate: number[] = that.switcher(query["NOT"], dataStructure);
        for (let index: number = 0; index < dataStructure[Object.keys(dataStructure)[0]].length; index++) {
            if (!toNegate.includes(index)) {
                result.push(index);
            }
        }
        return result;
    }

    public LTfunc(dataStructure: any, query: any): number[] {
        let result: any[] = [];
        // query is going to be in format LT: { courses_avg: 99}
        const columnName = Object.keys(query["LT"])[0]; // this will give courses_avg
        const condition = query["LT"][columnName]; // will give 99
        for (const section in dataStructure[columnName]) {
            if (dataStructure.hasOwnProperty(columnName)) {
                if (dataStructure[columnName][section] - condition < 0) {
                    result.push(Number(section));
                }
            }
        }
        return result;
    }

    public EQfunc(dataStructure: any, query: any): number[] {
        let result: any[] = [];
        // query is going to be in format EQ: { courses_avg: 99}
        const columnName = Object.keys(query["EQ"])[0]; // this will give courses_avg
        const condition = query["EQ"][columnName]; // will give 99
        for (const section in dataStructure[columnName]) {
            if (dataStructure.hasOwnProperty(columnName)) {
                if (dataStructure[columnName][section] - condition === 0) {
                    result.push(Number(section));
                }
            }
        }
        return result;
    }

    public GTfunc(dataStructure: any, query: any): number[] {
        let result: any[] = [];
        // query is going to be in format GT: { courses_avg: 99}
        const columnName = Object.keys(query["GT"])[0]; // this will give avg
        const condition = query["GT"][columnName]; // will give 99
        for (const section in dataStructure[columnName]) {
            if (dataStructure.hasOwnProperty(columnName)) {
                if (dataStructure[columnName][section] - condition > 0) {
                    result.push(Number(section));
                }
            }
        }
        return result;
    }

    /**
     * @param dataStructure
     * @param query
     *  Returns a promise of dictionary of pairs <department: array of indices> of valid sections
     */
    public ISfunc(dataStructure: any, query: any): number[] {
        let result: any[] = [];
        // query is going to be in format IS: { courses_instructor: "cox, barbara"}
        const columnName: string = Object.keys(query["IS"])[0]; // this will give courses_instructor
        let condition: string = query["IS"][columnName]; // will give "cox, barbara"
        let reg: RegExp;
        if (condition[0] === "*" && condition[condition.length - 1] === "*") {
            condition = condition.slice(1, condition.length - 1);
            Log.trace(condition);
            reg = new RegExp("^.*(" + condition + "){1}.*$");
        } else if (condition[condition.length - 1] === "*") {
            condition = condition.slice(0, condition.length - 1);
            Log.trace(condition);
            reg = new RegExp("^(" + condition + "){1}.*$");
        } else if (condition[0] === "*") {
            condition = condition.slice(1, condition.length - 1);
            Log.trace(condition);
            reg = new RegExp("^.*(" + condition + "){1}$");
        } else {
            reg = new RegExp("^(" + condition + "){1}$");
        }
        if (dataStructure.hasOwnProperty(columnName)) {
            for (const section in dataStructure[columnName]) {
                if (reg.test(dataStructure[columnName][section])) {
                    result.push(Number(section));
                }
            }
            // result = dataStructure[columnName].map(function (f: string, index: number) {
            //     if (reg.test(f)) {
            //         return index;
            //     }
            // });
        }
        return result;
    }
    public switcher(query: any, dataStructure: any): number[] {
        let result: any;
        let filter: string = Object.keys(query)[0];
        switch (filter) {
            case "AND":
                result = this.ANDfunc(dataStructure, query);
                break;
            case "OR":
                result = this.ORfunc(dataStructure, query);
                break;
            case "NOT":
                result = this.NOTfunc(dataStructure, query);
                break;
            case "LT":
                result = this.LTfunc(dataStructure, query);
                break;
            case "EQ":
                result = this.EQfunc(dataStructure, query);
                break;
            case "GT":
                result = this.GTfunc(dataStructure, query);
                break;
            case "IS":
                result = this.ISfunc(dataStructure, query);
                break;
        }
        return result;
    }
}
