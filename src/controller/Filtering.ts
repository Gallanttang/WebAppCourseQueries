import Log from "../Util";

export default class Filtering {
    constructor() {
        Log.trace("filtering::init()");
    }

    public checkCond (element: any, query: any): boolean {
        let filterType: string = Object.keys(query)[0];
        if (filterType === "OR" || filterType === "AND") {
            return this.performLCOMP(filterType, element, query[filterType]);
        }
        if (filterType === "LT" || filterType === "GT" || filterType === "EQ") {
            return this.performMCOMP(filterType, element, query[filterType]);
        }
        if (filterType === "NOT") {
            return this.performNCOMP(element, query[filterType]);
        }
        if (filterType === "IS") {
            return this.performSCOMP(element, query[filterType]);
        }
    }

    private performMCOMP (filterType: string, element: any, query: any): boolean {
        let queriedColumn: string = Object.keys(query)[0];
        let checking: number = element[queriedColumn];
        if (filterType === "LT") {
            return checking - query[queriedColumn] < 0;
        }
        if (filterType === "GT") {
            return checking - query[queriedColumn] > 0;
        }
        if (filterType === "EQ") {
            return checking - query[queriedColumn] === 0;
        }
        return false;
    }

    private performSCOMP (element: any, query: any): boolean {
        let queriedColumn: string = Object.keys(query)[0];
        let condition: string = query[queriedColumn];
        let toCheck: string = element[queriedColumn];
        condition = condition.toLowerCase();
        toCheck = toCheck.toLowerCase();
        let reg: RegExp;
        if (condition[0] === "*" && condition[condition.length - 1] === "*") {
            condition = condition.slice(1, condition.length - 1);
            if (condition.length > 0) {
                reg = new RegExp("^.*(" + condition + "){1}.*$");
            } else {
                reg = /^.*$/;
            }
        } else if (condition[0] === "*") {
            condition = condition.slice(1, condition.length);
            if (condition.length > 0) {
                reg = new RegExp("^.*(" + condition + "){1}$");
            } else {
                reg = new RegExp("^.*$");
            }
        } else if (condition[condition.length - 1] === "*") {
            condition = condition.slice(0, condition.length - 1);
            if (condition.length > 0) {
                reg = new RegExp("^(" + condition + "){1}.*$");
            } else {
                reg = /^.*$/;
            }
        } else {
            reg = new RegExp("^(" + condition + "){1}$");
        }
        return reg.test(toCheck);
    }

    private performNCOMP (element: any, query: any): boolean {
        return !this.checkCond(element, query);
    }

    private performLCOMP(filterType: string, element: any, query: any[]): boolean {
        let currResult: boolean = true;
        for (const filter of query) {
            currResult = this.checkCond(element, filter);
            if (filterType === "AND") {
                if (!currResult) {
                    return false;
                }
            }
            if (filterType === "OR") {
                if (currResult) {
                    return true;
                }
            }
        }
        return currResult;
    }
}
