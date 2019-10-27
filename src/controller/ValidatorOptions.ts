import Validator from "./Validator";
import {InsightError} from "./IInsightFacade";

export default class ValidatorOptions extends Validator {

    private containedColumns: string[] = [];
    constructor(currDataset: any[]) {
        super(currDataset);
    }

    public checkValid(query: any) {
        let keys: string[] = super.getKeys(query);
        if (!keys.includes("COLUMNS")) {
            throw new InsightError("MISSING COLUMNS");
        }
        if (keys.length === 2 && !keys.includes("ORDER")) {
            throw new InsightError("Invalid Keys in Options: " + keys);
        }
        if (keys.length > 2) {
            throw new InsightError("Invalid OPTIONS with keys: " + keys);
        }
        try {
            this.checkColumns(query["COLUMNS"]);
            if (keys.includes("ORDER")) {
                this.checkOrder(query["ORDER"], query["COLUMNS"]);
            }
        } catch (err) {
            throw new InsightError(err);
        }
    }

    private checkColumns(columns: string[]) {
        if (!Array.isArray(columns) || columns.length === 0) {
            throw new InsightError("Column expects a non-empty array");
        }
        for (const col of columns) {
            if (typeof col !== "string") {
                throw new InsightError("Invalid key in Columns, expects string got " + col);
            }
            try {
                this.checkApplyOrID(col);
            } catch (err) {
                throw err;
            }
            if (!this.applyCheck.test(col)) {
                this.checkDataset(col);
                if (!this.checkSingleKey(col)) {
                    throw new InsightError("COLUMN contains invalid key " + col);
                }
            }
            if (!this.containedColumns.includes(col)) {
                this.containedColumns.push(col);
            } else {
                throw new InsightError("Column contains duplicate key " + col);
            }
        }
    }

    private checkOrder(order: any, columns: string[]) {
        if (typeof order === "string") {
            try {
                this.checkApplyOrID(order);
            } catch (err) {
                throw err;
            }
            if (!columns.includes(order)) {
                throw new InsightError("Invalid ORDER, key " + order + "not in COLUMN");
            }
        } else if (typeof order === "object" && order !== null) {
            let keys: string[] = super.getKeys(order);
            if (!keys.includes("dir") || !keys.includes("keys") || keys.length !== 2) {
                throw new InsightError("Invalid ORDER");
            }
            if (order["dir"] !== "UP" && order["dir"] !== "DOWN") {
                throw new InsightError("Invalid ORDER: dir " + order["dir"]);
            }
            if (!Array.isArray(order["keys"])) {
                throw new InsightError("Invalid ORDER: keys");
            }
            for (const ordKey of order["keys"]) {
                try {
                    this.checkApplyOrID(ordKey);
                } catch (err) {
                    throw err;
                }
                if (!columns.includes(ordKey)) {
                    throw new InsightError("Invalid ORDER, key " + ordKey + "not in COLUMN");
                }
            }
        } else {
            throw new InsightError("Invalid ORDER:" + order);
        }
    }
}
