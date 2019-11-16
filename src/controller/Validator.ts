import {InsightError} from "./IInsightFacade";

export default abstract class Validator {
    protected coursevalidator: any = {
        dept: "string", id: "string", instructor: "string", title: "string", uuid: "string",
        pass: "number", fail: "number", audit: "number", avg: "number", year: "number"
    };

    protected roomsvalidator: any = {
        fullname: "string", shortname: "string", number: "string",
        name: "string", address: "string", lat: "number",
        lon: "number", seats: "number", type: "string",
        furniture: "string", href: "string"
    };

    private readonly currentDS: any[];
    public dsToQuery: string = "";
    public type: string = "";
    protected idCheck: RegExp = /^([a-zA-Z]|[0-9])+([_])([a-zA-Z]|[0-9])+$/;
    protected applyCheck: RegExp = /^([a-zA-Z]|[0-9])+$/;

    protected constructor (currDataset: any[]) {
        this.currentDS = currDataset;
    }

    public abstract checkValid (query: any): any;

    protected getKeys(keys: any): string[] {
        let returnValue: string[];
        try {
            returnValue = Object.keys(keys);
        } catch (err) {
            throw new InsightError("Invalid keys found " + keys);
        }
        return returnValue;
    }

    protected checkApplyOrID(key: string) {
        if (this.idCheck.test(key)) {
            try {
                this.checkDataset(key);
            } catch (err) {
                throw err;
            }
        } else if (!this.applyCheck.test(key)) {
            throw new InsightError("Invalid key" + key + " in OPTIONS");
        }
    }

    protected checkDataset(key: string) {
        let that = this;
        if (!this.idCheck.test(key)) {
            throw new InsightError("Invalid key selection: " + key);
        }
        let querying: string;
        let contains: boolean = false;
        try {
            querying = key.split("_", 1)[0];
        } catch (err) {
            throw new InsightError(err);
        }
        if (that.dsToQuery === "") {
            that.dsToQuery = querying;
        }
        for (const ds of that.currentDS) {
            if (ds["id"] === that.dsToQuery) {
                that.type = ds["kind"];
                contains = true;
                break;
            }
        }
        if (this.dsToQuery !== querying) {
            throw new InsightError("Attempting to query from more than one dataset");
        }
        if (!contains) {
            throw new InsightError("Dataset " + that.dsToQuery + " has not been added");
        }
    }

    protected checkKey(filter: any, key: string, parent: string, expected: string) {
        let field: string;
        try {
            if (this.type === "") {
                this.type = key.split("_")[0];
            }
            field = key.split("_")[1];
        } catch (err) {
            throw new InsightError(err);
        }
        if (!Object.keys(this.coursevalidator).includes(field) && !Object.keys(this.roomsvalidator).includes(field)) {
            throw new InsightError("The queried column " + key + " does not exist");
        } else {
            let invalidFilter: boolean = (
                this.coursevalidator[field] !== typeof filter[key] && this.roomsvalidator[field] !== typeof filter[key])
                || typeof filter[key] !== expected;
            if (invalidFilter) {
                throw new InsightError(parent + " expects a " + expected + " in the filter, got " + filter[key]);
            }
            if (Object.keys(this.coursevalidator).includes(field) && this.type === "") {
                this.type = "courses";
            } else {
                this.type = "room";
            }
        }
    }

    protected checkSingleKey(key: string): boolean {
        let col: string;
        try {
            col = key.split("_")[1];
        } catch (err) {
            throw new InsightError(err);
        }
        if (this.type === "courses") {
            return this.coursevalidator.hasOwnProperty(col);
        } else {
            return this.roomsvalidator.hasOwnProperty(col);
        }
    }
}
