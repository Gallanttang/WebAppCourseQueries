import Validator from "./Validator";
import {InsightError} from "./IInsightFacade";

export default class ValidatorTransformation extends Validator {
    private columnsValidator: any = {};
    private applyValidator: string[] = ["MAX", "MIN", "AVG", "SUM", "COUNT"];
    private containedApplyKeys: any = {};
    constructor(currDataset: any[], groupBy: string[]) {
        super(currDataset);
        for (let group of groupBy) {
            if (!this.columnsValidator.hasOwnProperty(group)) {
                this.columnsValidator[group] = false;
            }
        }
    }

    public checkValid(trans: any) {
        let keys: string[] = super.getKeys(trans);
        if (keys.length !== 2) {
            throw new InsightError("Invalid Transformation, expect group and apply, got " + keys);
        }
        if (!keys.includes("APPLY")) {
            throw new InsightError("Invalid Transformation, missing apply key");
        }
        if (!keys.includes("GROUP")) {
            throw new InsightError("Invalid Transformation, missing group key");
        }
        if (!Array.isArray(trans["GROUP"]) || trans["GROUP"].length < 1) {
            throw new InsightError("Invalid TRANSFORMATIONS GROUP must be a non-empty array");
        }
        if (!Array.isArray(trans["APPLY"]) || trans["APPLY"].length < 1) {
            throw new InsightError("Invalid TRANSFORMATIONS APPLY must be a non-empty array");
        }
        try {
            this.checkGroup(trans["GROUP"]);
            this.checkApply(trans["APPLY"]);
        } catch (err) {
            throw err;
        }
        for (let contained of Object.keys(this.columnsValidator)) {
            if (!this.columnsValidator[contained]) {
                throw new InsightError("Keys in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS is present");
            }
        }
    }

    private checkGroup(group: string[]) {
        for (let grouping of group) {
            if (typeof grouping !== "string") {
                throw new InsightError("Invalid Key in GROUP " + grouping);
            }
            try {
                this.checkDataset(grouping);
            } catch (err) {
                throw new InsightError("Invalid Key " + grouping + " in Group");
            }
            if (this.columnsValidator.hasOwnProperty(grouping)) {
                this.columnsValidator[grouping] = true;
            }
        }
    }

    private checkApply(apply: any[]) {
        for (let applyRule of apply) {
            if (!applyRule.hasOwnProperty) {
                throw new InsightError("Invalid apply rule in transformations " + applyRule);
            }
            let applyKeys: string[] = super.getKeys(applyRule);
            if (applyKeys.length !== 1) {
                throw new InsightError("Invalid applyKey in transformation, expects 1 key got" + applyKeys.length);
            }
            if (!this.applyCheck.test(applyKeys[0])) {
                throw new InsightError("Invalid Apply Key in transformations");
            }
            if (this.columnsValidator.hasOwnProperty(applyKeys[0])) {
                this.columnsValidator[applyKeys[0]] = true;
            }
            try {
                this.checkApplyRule(applyRule[applyKeys[0]]);
            } catch (err) {
                throw err;
            }
            if (!this.containedApplyKeys.hasOwnProperty(applyKeys[0])) {
                this.containedApplyKeys[applyKeys[0]] = 1;
            } else {
                throw new InsightError("Duplicate APPLY key " + applyKeys[0]);
            }
        }
    }

    private checkApplyRule(applyKey: any) {
        let applyToken: string[];
        try {
            applyToken = super.getKeys(applyKey);
        } catch (err) {
            throw new InsightError(err);
        }
        let column: string = applyKey[applyToken[0]];
        if (applyToken.length !== 1) {
            throw new InsightError("Invalid applyKey in transformation, expects 1 key got" + applyToken.length);
        }
        if (!this.applyValidator.includes(applyToken[0])) {
            throw new InsightError("Invalid applyKey in transformation " + applyToken[0]);
        }
        try {
            this.checkApplyOrID(column);
        } catch (err) {
            throw new InsightError("Invalid key in apply " + column);
        }
        let key: string;
        try {
            key = column.split("_")[1];
        } catch (err) {
            throw new InsightError(err);
        }
        let type: string;
        if (this.coursevalidator.hasOwnProperty(key)) {
            type = this.coursevalidator[key];
        } else {
            type = this.roomsvalidator[key];
        }
        if (applyToken[0] === "MAX" || applyToken[0] === "MIN" || applyToken[0] === "AVG" || applyToken[0] === "SUM") {
            if (type !== "number") {
                throw new InsightError("Expected field on " + column + " to be type of number, got a " + type);
            }
        } else if (applyToken[0] === "COUNT") {
            if (type !== "number" && type !== "string") {
                throw new InsightError("Expected field on count to be type of number or string, got a " + type);
            }
        } else {
            throw new InsightError("Invalid apply token in TRANSFORMATION " + applyToken[0]);
        }
    }
}
