import Log from "../Util";
import {Decimal} from "decimal.js";

export default class QueryTransforming {
    constructor() {
        Log.trace("QueryTransforming::init()");
    }

    public transform(queryElement: any, result: any[]): any[] {
        let group: string[] = queryElement["GROUP"];
        let apply: any[] = queryElement["APPLY"];
        let returnValue: any[] = this.transformGroup(group, result);
        Log.trace("Finished Grouping");
        returnValue = this.transformApply(apply, returnValue, group);
        return returnValue;
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
        if (cond.length !== nextIndex) {
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

    private transformApply(apply: any[], groupings: any, groups: string[]): any[] {
        let that = this;
        let returnValue: any[] = [];
        let keys: string[] = Object.keys(groupings);
        for (let key of keys) {
            let temp: any = groupings[key];
            if (!Array.isArray(groupings[key])) {
                temp = that.transformApplyHelper(apply, temp, groups);
                temp.forEach((section: any) => returnValue.push(section));
            } else {
                for (const applyRule of apply) {
                    temp = this.apply(applyRule, temp, groups);
                    returnValue.push(temp);
                }
            }
        }
        return returnValue;
    }

    private transformApplyHelper(apply: any[], returnValue: any, groups: string[]): any[] {
        if (!Array.isArray(returnValue)) {
            return this.transformApply(apply, returnValue, groups);
        } else {
            for (const applyRule of apply) {
                returnValue = this.apply(applyRule, returnValue, groups);
                returnValue.push(returnValue);
            }
            return returnValue;
        }
    }

    private apply(apply: any, section: any[], group: string[]): any[] {
        let val: number;
        let applyKey: string = Object.keys(apply)[0];
        let applyToken: string = Object.keys(apply[applyKey])[0];
        let column: string = apply[applyKey][applyToken];
        if (applyToken === "MAX") {
            val = section.reduce((acc, curr) => acc > curr[column] ? acc : curr[column], 0);
        }
        if (applyToken === "AVG") {
            let sum: number = section.reduce((acc, curr) => Decimal.add(acc, curr[column]), new Decimal(0)).toNumber();
            val = Number((sum / section.length).toFixed(2));
        }
        if (applyToken === "MIN") {
            val = section.reduce((acc, curr) => acc < curr[column] ? acc : curr[column], Number.MAX_SAFE_INTEGER);
        }
        if (applyToken === "SUM") {
            let sum: number = section.reduce((acc, curr) => Decimal.add(acc, curr[column]), new Decimal(0)).toNumber();
            val = Number(sum.toFixed(2));
        }
        if (applyToken === "COUNT") {
            let unique: any = {};
            val = section.reduce(function (acc, curr) {
                if (unique.hasOwnProperty(curr[column])) {
                    return acc;
                } else {
                    unique[curr[column]] = 0;
                    return acc + 1;
                }
            }, 0);
        }
        let rt: any = {};
        for (let g of group) {
            rt[g] = section[0][g];
        }
        rt[applyKey] = val;
        return rt;
    }
}
