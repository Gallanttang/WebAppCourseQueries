import {Decimal} from "decimal.js";

export default class QueryTransforming {
    constructor() {
        //
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
                this.apply(apply, temp, groups).forEach((section: any) => returnValue.push(section));
            }
        }
        return returnValue;
    }

    private transformApplyHelper(apply: any[], group: any, groups: string[]): any[] {
        if (!Array.isArray(group)) {
            return this.transformApply(apply, group, groups);
        } else {
            return this.apply(apply, group, groups);
        }
    }

    private apply(applies: any[], sec: any[], groups: string[]): any[] {
        let rt: any = {};
        let group: string[] = groups;
        let val: number = 0;
        for (let g of group) {
            rt[g] = sec[0][g];
        }
        for (const apply of applies) {
            let section: any[] = sec;
            let applyKey: string = Object.keys(apply)[0];
            let applyToken: string = Object.keys(apply[applyKey])[0];
            let column: string = apply[applyKey][applyToken];
            if (applyToken === "MAX") {
                val = section.reduce((acc, curr) => acc > curr[column] ? acc : curr[column], 0);
            }
            if (applyToken === "AVG") {
                let sum: number = section.reduce((acc, curr) =>
                    Decimal.add(acc, curr[column]), new Decimal(0)).toNumber();
                val = Number((sum / section.length).toFixed(2));
            }
            if (applyToken === "MIN") {
                val = section.reduce((acc, curr) =>
                    acc < curr[column] ? acc : curr[column], Number.MAX_SAFE_INTEGER);
            }
            if (applyToken === "SUM") {
                let sum: number = section.reduce((acc, curr) =>
                    Decimal.add(acc, curr[column]), new Decimal(0)).toNumber();
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
            group.push(applyKey);
            rt[applyKey] = val;
        }
        return [rt];
    }
}
