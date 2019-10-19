import {InsightError} from "./IInsightFacade";
import Log from "../Util";

export default class QueryManager {
    private coursevalidator: any = {
        dept: "string", id: "string", avg: "number",
        instructor: "string", title: "string", pass: "number",
        fail: "number", audit: "number", uuid: "string", year: "number"
    };

    private roomsvalidator: any = {
        fullname: "string", shortname: "string", number: "string", address: "string", lat: "number",
        lon: "number", seats: "number", type: "string", furniture: "string", href: "string"
    };

    private readonly currentDS: any[];
    public dsToQuery: string = "";
    public type: string = "";
    private idCheck: RegExp = /^([a-z]|[A-Z][0-9])+([_])([a-z]|[A-Z][0-9])+$/;
    private applyCheck: RegExp = /^([a-z]|[A-Z][0-9])+$/;

    constructor (currDataset: any[]) {
        this.currentDS = currDataset;
    }

    private getKeys(element: any): string[] {
        try {
            return Object.keys(element);
        } catch (err) {
            throw new InsightError(err);
        }
    }

    public checkQuery(query: any) {
        if (!query && typeof query !== "object") {
            throw new InsightError("Query is invalid");
        }
        let keys: string[];
        try {
            keys = this.getKeys(query);
        } catch (err) {
            throw err;
        }
        if (keys.length >= 2) {
            if (!keys.includes("WHERE") || !keys.includes("OPTIONS")) {
                throw new InsightError("Body invalid, contains " + keys);
            }
            try {
                if (Object.keys(query["WHERE"]).length > 0) {
                    this.checkFilter(query["WHERE"]);
                }
                this.checkOptions(query["OPTIONS"]);
            } catch (err) {
                throw err;
            }
            if (keys.length > 3 || (keys.length === 3 && !keys.includes("TRANSFORMATIONS"))) {
                throw new InsightError("Malformed Query " + query);
            } else if (keys.length === 3) {
                try {
                    this.checkTransformations(query["TRANSFORMATIONS"]);
                } catch (err) {
                    throw (err);
                }
            }
        } else {
            throw new InsightError("Malformed Query " + query);
        }
    }

    private checkFilter (filter: any) {
        let keys: string[] = this.getKeys(filter);
        if (keys.length > 1) {
            throw new InsightError("Invalid Filter, contains more than 1 filter");
        }
        if (keys[0] === "IS") {
            this.checkSCOMP(filter[keys[0]]);
        } else if (keys[0] === "EQ" || keys[0] === "GT" || keys[0] === "LT") {
            this.checkMCOMP(filter[keys[0]], keys[0]);
        } else if (keys[0] === "OR" || keys[0] === "AND") {
            this.checkLCOMP(filter[keys[0]]);
        } else if (keys[0] === "NOT") {
            this.checkFilter(filter[keys[0]]);
        } else {
            throw new InsightError("Invalid filter key " + keys[0]);
        }
    }

    private checkSCOMP(scomp: any) {
        let keys: string[] = this.getKeys(scomp);
        if (keys.length !== 1) {
            throw new InsightError("IS expects 1 key, received " + keys.length);
        }
        try {
            this.checkDataset(keys[0]);
            this.checkKey(scomp, keys[0], "IS", "string");
        } catch (err) {
            throw err;
        }
        if (!/^[*]?([a-z]|[A-Z][0-9]|[,]|[_]|\s)*[*]?$/.test(scomp[keys[0]])) {
            throw new InsightError("IS filter has an invalid entry: " + scomp[keys[0]]);
        }
    }

    private checkMCOMP(mcomp: any, parent: string) {
        let keys: string[] = this.getKeys(mcomp);
        if (keys.length !== 1) {
            throw new InsightError(parent + " expects 1 key got " + keys.length);
        }
        try {
            this.checkDataset(keys[0]);
            this.checkKey(mcomp, keys[0], keys[0], "number");
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
                this.checkFilter(filter);
            } catch (err) {
                throw new InsightError("LCOMP contains an invalid filter: " + err);
            }
        }
    }

    private checkOptions(options: any) {
        let keys: string[] = this.getKeys(options);
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
            this.checkColumns(options["COLUMNS"]);
            if (options.hasOwnProperty("ORDER")) {
                this.checkOrder(options["ORDER"], options["COLUMNS"]);
            }
        } catch (err) {
            throw new InsightError(err);
        }
    }

    private checkColumns(columns: string[]) {
        if (!Array.isArray(columns) || columns.length === 0) {
            throw new InsightError("Column expects a non-empty array");
        }
        Log.trace(columns);
        for (const col of columns) {
            try {
                this.checkApplyOrID(col);
            } catch (err) {
                throw err;
            }
            if (this.idCheck.test(col)) {
                this.checkDataset(col);
            }
            let field: string;
            try {
                field = col.split("_")[1];
            } catch (err) {
                throw new InsightError(err);
            }
            if (!this.coursevalidator.hasOwnProperty(field)) {
                throw new InsightError("COLUMN contains invalid key " + col);
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
            let keys: string[] = Object.keys(order);
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

    private checkTransformations(trans: any) {
        // todo
    }

    private checkApplyOrID(key: string) {
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

    private checkDataset(key: string) {
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

    private checkKey(filter: any, key: string, parent: string, expected: string) {
        let field: string;
        try {
            field = key.split("_")[1];
        } catch (err) {
            throw new InsightError(err);
        }
        if (!Object.keys(this.coursevalidator).includes(field)) {
            throw new InsightError("The queried column " + key + "does not exist");
        } else if (this.coursevalidator[field] !== typeof filter[key] || typeof filter[key] !== expected) {
            throw new InsightError(parent + " expects a " + expected + " in the filter, got " + filter[key]);
        }
    }
}
