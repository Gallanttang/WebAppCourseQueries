import Log from "../Util";
import {Decimal} from "decimal.js";

export default class QueryFiltering {
    constructor() {
        Log.trace("filtering::init()");
    }

    public checkCond (element: any, query: any): boolean {
        if (Object.keys(query).length === 0) {
            return true;
        }
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
        let condition: Decimal = new Decimal(query[Object.keys(query)[0]]);
        let checking: Decimal = new Decimal(element[Object.keys(query)[0]]);
        if (filterType === "LT") {
            return checking.lessThan(condition);
        } else if (filterType === "GT") {
            return checking.greaterThan(condition);
        } else {
            return checking.equals(condition);
        }
    }

    private performSCOMP (element: any, query: any): boolean {
        let queriedColumn: string = Object.keys(query)[0];
        let condition: string = query[queriedColumn];
        let toCheck: string = element[queriedColumn];
        let reg: RegExp;
        if (condition[0] === "*" && condition[condition.length - 1] === "*") {
            condition = condition.slice(1, condition.length - 1);
            if (condition.length > 0) {
                reg = new RegExp("^.*(" + condition + ").*$");
            } else {
                reg = /^.*$/;
            }
        } else if (condition[0] === "*") {
            condition = condition.slice(1, condition.length);
            if (condition.length > 0) {
                reg = new RegExp("^.*(" + condition + ")$");
            } else {
                reg = new RegExp("^.*$");
            }
        } else if (condition[condition.length - 1] === "*") {
            condition = condition.slice(0, condition.length - 1);
            if (condition.length > 0) {
                reg = new RegExp("^(" + condition + ").*$");
            } else {
                reg = /^.*$/;
            }
        } else {
            reg = new RegExp("^(" + condition + ")$");
        }
        return reg.test(toCheck);
    }

    private performNCOMP (element: any, query: any): boolean {
        return !this.checkCond(element, query);
    }

    private performLCOMP(filterType: string, element: any, query: any[]): boolean {
        let currResult: boolean;
        for (const filter of query) {
            currResult = this.checkCond(element, filter);
            if (filterType === "AND" && !currResult) {
                return false;
            }
            if (filterType === "OR" && currResult) {
                return true;
            }
        }
        return currResult;
    }
}
