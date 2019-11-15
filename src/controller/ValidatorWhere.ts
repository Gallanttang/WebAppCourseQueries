import Validator from "./Validator";
import {InsightError} from "./IInsightFacade";

export default class ValidatorWhere extends Validator {

    constructor(currDataset: any[]) {
        super(currDataset);
    }

    public checkValid (filter: any) {
        let keys: string[] = super.getKeys(filter);
        if (keys.length > 1) {
            throw new InsightError("Invalid Filter, contains more than 1 filter");
        }
        if (keys.length === 0) {
            return;
        }
        if (keys[0] === "IS") {
            this.checkSCOMP(filter[keys[0]]);
        } else if (keys[0] === "EQ" || keys[0] === "GT" || keys[0] === "LT") {
            this.checkMCOMP(filter[keys[0]], keys[0]);
        } else if (keys[0] === "OR" || keys[0] === "AND") {
            this.checkLCOMP(filter[keys[0]]);
        } else if (keys[0] === "NOT") {
            if (Object.keys(filter[keys[0]]).length === 1) {
                this.checkValid(filter[keys[0]]);
            } else {
                throw new InsightError("Invalid NOT: empty filter");
            }
        } else {
            throw new InsightError("Invalid filter key " + keys[0]);
        }
    }

    private checkSCOMP(scomp: any) {
        let keys: string[] = super.getKeys(scomp);
        if (keys.length !== 1) {
            throw new InsightError("IS expects 1 key, received " + keys.length);
        }
        try {
            super.checkDataset(keys[0]);
            super.checkKey(scomp, keys[0], "IS", "string");
        } catch (err) {
            throw err;
        }
        if (!/^[*]?([a-zA-Z]|[0-9]|[,]|[_]|\s)*[*]?$/.test(scomp[keys[0]])) {
            throw new InsightError("IS filter has an invalid entry: " + scomp[keys[0]]);
        }
    }

    private checkMCOMP(mcomp: any, parent: string) {
        let keys: string[] = super.getKeys(mcomp);
        if (keys.length !== 1) {
            throw new InsightError(parent + " expects 1 key got " + keys.length);
        }
        try {
            super.checkDataset(keys[0]);
            super.checkKey(mcomp, keys[0], keys[0], "number");
        } catch (err) {
            throw err;
        }
    }

    private checkLCOMP(lcomp: any[]) {
        if (!Array.isArray(lcomp)) {
            throw new InsightError("LCOMP expects an array, got a " + typeof lcomp);
        } else if (lcomp.length < 1) {
            throw new InsightError("LCOMP array is empty");
        }
        for (let filter of lcomp) {
            try {
                this.checkValid(filter);
            } catch (err) {
                throw new InsightError("LCOMP contains an invalid filter: " + err);
            }
        }
    }
}
