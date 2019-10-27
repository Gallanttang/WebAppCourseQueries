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

    private transformApply(apply: any[], groupings: any, group: string[]): any[] {
        let that = this;
        let returnValue: any[] = [];
        let keys: string[] = Object.keys(groupings);
        for (let key of keys) {
            let temp: any = groupings[key];
            if (!Array.isArray(groupings[key])) {
                temp = that.transformApplyHelper(temp);
            }
            for (const applyRule of apply) {
                let applyKey: string = Object.keys(applyRule)[0];
                let applyToken: string = Object.keys(applyRule[applyKey])[0];
                temp = this.apply(applyToken, temp, applyRule[applyKey][applyToken], applyKey, group);
                returnValue.push(temp);
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

    private apply(applyToken: string, section: any[], column: string, applyKey: string, group: string[]): any[] {
        let val: Decimal;
        if (applyToken === "MAX") {
            val = new Decimal(section.reduce((acc, curr) => Decimal.max(acc, curr[column]), 0));
        }
        if (applyToken === "AVG") {
            val = new Decimal(section.reduce((acc, curr) => Decimal.add(acc, curr[column]), 0))
                .dividedBy(section.length);
        }
        if (applyToken === "MIN") {
            val = new Decimal(section.reduce((acc, curr) => Decimal.min(acc, curr[column]), 0));
        }
        if (applyToken === "SUM") {
            val = new Decimal(section.reduce((acc, curr) => Decimal.add(acc, curr[column]), 0));
        }
        if (applyToken === "COUNT") {
            val = new Decimal(section.length);
        }
        let rt: any = {};
        for (let g of group) {
            rt[g] = section[0][g];
        }
        rt[applyKey] = val.toNumber();
        return rt;
    }
}
