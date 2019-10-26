import Validator from "./Validator";
import {InsightError} from "./IInsightFacade";

export default class ValidatorTransformation extends Validator {
    private readonly columnsValidator: string[];
    private containedColumns: string[] = [];
    private containedApply: string[] = [];
    private applyValidator: string[] = ["MAX", " MIN", "AVG", "SUM", "COUNT"];
    constructor(currDataset: any[], groupBy: string[]) {
        super(currDataset);
        this.columnsValidator = groupBy;
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
        try {
            this.checkGroup(trans["GROUP"]);
            this.checkApply(trans["APPLY"]);
        } catch (err) {
            throw err;
        }
        for (let contained of this.columnsValidator) {
            if (!this.containedColumns.includes(contained)) {
                throw new InsightError("Keys in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS is present");
            }
        }
    }

    private checkGroup(group: string[]) {
        for (let grouping of group) {
            if (this.columnsValidator.includes(grouping)) {
                this.containedColumns.push(grouping);
            } else {
                throw new InsightError("Keys in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS is present");
            }
        }
    }

    private checkApply(apply: any[]) {
        if (apply.length < 1) {
            throw new InsightError("Expects non-empty array for apply");
        }
        for (let applyRule of apply) {
            if (!applyRule.hasOwnProperty) {
                throw new InsightError("Invalid apply rule in transformations " + applyRule);
            }
            let applyKeys: string[] = super.getKeys(applyRule);
            if (applyKeys.length !== 1) {
                throw new InsightError("Invalid applyKey in transformation, expects 1 key got" + applyKeys.length);
            }
            if (!this.columnsValidator.includes(applyKeys[0])) {
                throw new InsightError("Keys in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS is present");
            }
            this.containedColumns.push(applyKeys[0]);
            try {
                this.checkApplyRule(applyRule[applyKeys[0]]);
            } catch (err) {
                throw err;
            }
            if (!this.containedApply.includes(applyKeys[0])) {
                this.containedApply.push(applyKeys[0]);
            } else {
                throw new InsightError("Apply contains duplicate keys");
            }
        }
    }

    private checkApplyRule(applyKey: any) {
        let applyToken: string[] = super.getKeys(applyKey);
        if (applyToken.length !== 1) {
            throw new InsightError("Invalid applyKey in transformation, expects 1 key got" + applyToken.length);
        }
        if (!this.applyValidator.includes(applyToken[0])) {
            throw new InsightError("Invalid applyKey in transformation " + applyToken[0]);
        }
        let type: string;
        if (this.checkSingleKey(applyKey[applyToken[0]])) {
            throw new InsightError("Invalid key in Transformation's " + applyToken[0]);
        }
        let key: string;
        try {
            key = applyKey[applyToken[0]].split("_")[1];
        } catch (err) {
            throw new InsightError(err);
        }
        let columns: boolean = this.coursevalidator.hasOwnProperty(key);
        if (columns) {
            type = this.coursevalidator[key];
        } else {
            type = this.roomsvalidator[key];
        }
        if (applyToken[0] === "MAX" || applyToken[0] === " MIN" || applyToken[0] === "AVG" || applyToken[0] === "SUM") {
            if (type !== "number") {
                throw new InsightError("Expected field on " + applyToken[0] + " to be type of number, got a " + type);
            }
        } else {
            if (type !== "number" && type !== "string") {
                throw new InsightError("Expected field on count to be type of number or string, got a " + type);
            }
        }
    }
}
