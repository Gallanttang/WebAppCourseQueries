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
        let val: Decimal;
        let that = this;
        let applyKey: string = Object.keys(apply)[0];
        let applyObj: any = apply[applyKey];
        let applyToken: string = Object.keys(applyObj)[0];
        let column: string = applyObj[applyToken];
        if (applyToken === "MAX") {
            val = new Decimal(section.reduce((acc, curr) =>
                that.applyHelper(applyToken, acc, curr, column, {}), 0));
        }
        if (applyToken === "AVG") {
            val = new Decimal(section.reduce((acc, curr) =>
                that.applyHelper(applyToken, acc, curr, column, {}), 0)).dividedBy(new Decimal(section.length));
        }
        if (applyToken === "MIN") {
            val = new Decimal(section.reduce((acc, curr) =>
                that.applyHelper(applyToken, acc, curr, column, {}), Number.MAX_SAFE_INTEGER));
        }
        if (applyToken === "SUM") {
            val = new Decimal(section.reduce((acc, curr) =>
                that.applyHelper(applyToken, acc, curr, column, {}), 0));
        }
        if (applyToken === "COUNT") {
            let unique: any = {};
            val = new Decimal(section.reduce((accumulator, curr) =>
                that.applyHelper(applyToken, accumulator, curr, column, unique), 0));
        }
        let rt: any = {};
        for (let g of group) {
            rt[g] = section[0][g];
        }
        rt[applyKey] = val.toNearest(0.01, Decimal.ROUND_HALF_CEIL).toNumber();
        return rt;
    }

    private applyHelper(applyToken: string, acc: Decimal, curr: any, column: string, unique: any): Decimal {
        if (curr[column] || curr[column] === "") {
            if (applyToken === "COUNT") {
                if (unique.hasOwnProperty(curr[column])) {
                    return acc;
                } else {
                    unique[curr[column]] = 0;
                    return Decimal.add(acc, 1);
                }
            }
            if (applyToken === "MIN") {
                return Decimal.min(acc, curr[column]);
            }
            if (applyToken === "MAX") {
                return Decimal.max(acc, curr[column]);
            }
            if (applyToken === "SUM" || applyToken === "AVG") {
                return Decimal.add(acc, curr[column]);
            }
        } else {
            return acc;
        }
    }
}
