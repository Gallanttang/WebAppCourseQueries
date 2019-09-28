import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as jszip from "jszip";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

export default class InsightFacade implements IInsightFacade {
    private coursevalidator: any = {
        courses_dept: "Subject",
        courses_id: "Course",
        courses_avg: "Avg",
        courses_instructor: "Professor",
        courses_title: "Title",
        courses_pass: "Pass",
        courses_fail: "Fail",
        courses_audit: "Audit",
        courses_uuid: "id",
        courses_year: "Year"
    };

    private filters: any = {
        gt: "GT",
        lt: "LT",
        eq: "EQ",
        is: "IS",
        not: "NOT",
        and: "AND",
        or: "OR"
    };

    private internalDataStructure: any = {};
    private addedDatasets: string[] = [];
    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    /**
     * Add a dataset to UBCInsight.
     *
     * @param id  The id of the dataset being added. Follows the format /^[^_]+$/
     * @param content  The base64 content of the dataset. This content should be in the form of a serialized zip file.
     * @param kind  The kind of the dataset
     *
     * @return Promise <string[]>
     *
     * The promise should fulfill on a successful add, reject for any failures.
     * The promise should fulfill with a string array,
     * containing the ids of all currently added datasets upon a successful add.
     * The promise should reject with an InsightError describing the error.
     *
     * An id is invalid if it contains an underscore, or is only whitespace characters.
     * If id is the same as the id of an already added dataset, the dataset should be rejected and not saved.
     *
     * After receiving the dataset, it should be processed into a data structure of
     * your design. The processed data structure should be persisted to disk; your
     * system should be able to load this persisted value into memory for answering
     * queries.
     *
     * Ultimately, a dataset must be added or loaded from disk before queries can
     * be successfully answered.
     */

    // change to string x.toString("base64")
    // JSZip to unzip files
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        const promisedFiles: any = [];
        const thisClass = this;
        let validSections: any[] = [];
        Log.trace("In add dataset");
        return jszip.loadAsync(content, {base64: true}).then((result: jszip) => {
            // todo iterate through files you want to read, and then load the contents of each file.
            try {
                result.folder("courses").forEach(function (relativePath, file) {
                    promisedFiles.push(file.async("text"));
                });
            } catch (err) {
                return InsightError;
            }
        }).then(function () {
            // todo then convert the contents to string
            Log.trace("Processing promises");
            Promise.all(promisedFiles).then(function (results) {
                for (const result of results) {
                    let processed = thisClass.parseFile(result);
                    if (thisClass.parseFile(result) !== null) {
                        validSections.push(processed);
                    }
                }
            });
        }).then(function () {
            // todo process string content and save sections to data structure IF dataset is valid
            let validDataset = false;
            if (validSections.length !== 0) {
                for (const section of validSections) {
                    if (this.checkValidCourse(section)) {
                        validDataset = true;
                    }
                }
            }
            if (validDataset) {
                thisClass.addedDatasets.push(id);
                return Promise.resolve(thisClass.addedDatasets);
            } else {
                return Promise.reject(thisClass.addedDatasets);
            }
        });
    }

    public parseFile(text: any): any {
        let JSObj: any;
        try {
            JSObj = JSON.parse(text);
        } catch (err) {
            return Promise.reject();
        }
        return JSObj;
    }

    public checkValidCourse(object: any): boolean {
        let hasValidSection: boolean = false;
        if (!object.hasOwnProperty("result")) {
            return hasValidSection;
        } else if (object["result"].length === 0) {
            return hasValidSection;
        } else {
            for (const section in object["result"]) {
                if (this.isSectionValid(section)) {
                    hasValidSection = true;
                    this.addSection(section);
                }
            }
            return hasValidSection;
        }
    }
    private isSectionValid(section: any): boolean {
        let valid: boolean = true;
        for (const key in Object.keys(this.coursevalidator)) {
            if (!section.hasOwnProperty(this.coursevalidator[key])) {
                valid = false;
                return valid;
            }
        }
        return valid;
    }
    // Adds a section to the internal data structure
    private addSection(section: any) {
        const dept: string = section[this.coursevalidator["courses_dept"]];
        if (!this.internalDataStructure.hasOwnProperty(dept)) {
            this.internalDataStructure[dept] = {};
            for (const key in Object.keys(this.coursevalidator)) {
                this.internalDataStructure[dept][key] = [];
                this.internalDataStructure[dept][key].push(section[this.coursevalidator[key]]);
            }
        } else {
            for (const key in Object.keys(this.coursevalidator)) {
                this.internalDataStructure[dept][key].push(section[this.coursevalidator[key]]);
            }
        }
    }
    /**
     * Remove a dataset from UBCInsight.
     *
     * @param id  The id of the dataset to remove. Follows the format /^[^_]+$/
     *
     * @return Promise <string>
     *
     * The promise should fulfill upon a successful removal, reject on any error.
     * Attempting to remove a dataset that hasn't been added yet counts as an error.
     *
     * An id is invalid if it contains an underscore, or is only whitespace characters.
     *
     * The promise should fulfill the id of the dataset that was removed.
     * The promise should reject with a NotFoundError (if a valid id was not yet added)
     * or an InsightError (invalid id or any other source of failure) describing the error.
     *
     * This will delete both disk and memory caches for the dataset for the id meaning
     * that subsequent queries for that id should fail unless a new addDataset happens first.
     */
    public removeDataset(id: string): Promise<string> {
        return Promise.reject("Not implemented.");
    }
    /**
     * Perform a query on UBCInsight.
     *
     * @param query  The query to be performed.
     *
     * If a query is incorrectly formatted, references a dataset not added (in memory or on disk),
     * or references multiple datasets, it should be rejected.
     *
     * @return Promise <any[]>
     *
     * The promise should fulfill with an array of results.
     * The promise should reject with an InsightError describing the error.
     */
    public performQuery(query: any): Promise <any[]> {
        return Promise.reject("Not implemented.");
    }
    /**
     * List all currently added datasets, their types, and number of rows.
     *
     * @return Promise <InsightDataset[]>
     * The promise should fulfill an array of currently added InsightDatasets, and will only fulfill.
     */
    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.reject("Not implemented.");
    }
}
