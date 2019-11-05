import {InsightError} from "./IInsightFacade";
import ValidatorWhere from "./ValidatorWhere";
import ValidatorOptions from "./ValidatorOptions";
import ValidatorTransformation from "./ValidatorTransformation";


export default class QueryManager {
    private readonly currentDS: any[];
    public dsToQuery: string = "";
    public type: string = "";

    constructor (currDataset: any[]) {
        this.currentDS = currDataset;
    }

    public checkQuery(query: any) {
        if (!query && typeof query !== "object") {
            throw new InsightError("Query is invalid");
        }
        let keys: string[];
        try {
            keys = Object.keys(query);
        } catch (err) {
            throw err;
        }
        if (keys.length >= 2) {
            if (!keys.includes("WHERE") || !keys.includes("OPTIONS")) {
                throw new InsightError("Body invalid, contains " + keys);
            }
            let whereValidator: ValidatorWhere = new ValidatorWhere(this.currentDS);
            let optionsValidator: ValidatorOptions = new ValidatorOptions(this.currentDS);
            try {
                if (Object.keys(query["WHERE"]).length > 0) {
                    whereValidator.checkValid(query["WHERE"]);
                }
                optionsValidator.dsToQuery = whereValidator.dsToQuery;
                optionsValidator.checkValid(query["OPTIONS"]);
                this.dsToQuery = optionsValidator.dsToQuery;
            } catch (err) {
                throw err;
            }
            if ((keys.length >= 3 && !keys.includes("TRANSFORMATIONS"))) {
                throw new InsightError("Malformed Query " + query);
            } else if (keys.length === 3) {
                let tValidator: ValidatorTransformation =
                    new ValidatorTransformation(this.currentDS, optionsValidator.containedColumns);
                tValidator.dsToQuery = optionsValidator.dsToQuery;
                try {
                    tValidator.checkValid(query["TRANSFORMATIONS"]);
                } catch (err) {
                    throw (err);
                }
            }
        } else {
            throw new InsightError("Malformed Query " + query);
        }
    }
}
