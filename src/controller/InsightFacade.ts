import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import * as jszip from "jszip";
import * as fs from "fs";
import {arrayify} from "tslint/lib/utils";

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
    private forListDS: any[] = [];

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
        return new Promise<string[]>((resolve, reject) => {
            const noUnderscore: boolean = id.includes("_");
            const notJustWhiteSpace: boolean = (!id || id.length === 0 || /^\s*$/.test(id));
            const alreadyAdded: boolean = this.addedDatasets.some((s) => s === id);
            if (noUnderscore || notJustWhiteSpace || alreadyAdded || this.alreadyInDisk(id)) {
                Log.trace("about to reject");
                return reject(new InsightError("Invalid id used"));
            } else {
                Log.trace("reached else clause");
                let count: number = 0;
                jszip.loadAsync(content, {base64: true}).then((result: jszip) => {
                    result.folder("courses").forEach(function (relativePath, file) {
                        promisedFiles.push(file.async("text"));
                    });
                    Promise.all(promisedFiles).then((results) => {
                        for (let result0 of results) {
                            let processed: any;
                            try {
                                processed = thisClass.parseFile(result0);
                            } catch (err) { // ignore
                            } finally {
                                if (processed !== null) {
                                    validSections.push(processed);
                                }
                            }
                        }
                    }).then(function () {
                        let validDataset = false;
                        for (const section of validSections) {
                            let valid: number = thisClass.checkValidCourse(section);
                            if (valid !== 0) {
                                validDataset = true;
                                count += valid;
                            }
                        }
                        if (validDataset) {
                            if (thisClass.writeToMemory(id)) {
                                thisClass.addedDatasets.push(id);
                                thisClass.forListDS.push({id: id, kind: kind, numRows: count});
                                return resolve(thisClass.addedDatasets);
                            } else {
                                return reject(new InsightError("Could not write " + id + "to memory"));
                            }
                        } else { return reject(new InsightError("Could not add invalid dataset: " + id)); }
                    });
                }).catch(() => {
                    return reject(new InsightError("Invalid file " + id + "cannot be added"));
                });
            }
        });
    }

    public alreadyInDisk(id: string): Promise<boolean> {
        const path = __dirname + "/datasets/" + id + ".json";
        return new Promise<boolean>((resolve, reject) => {
            fs.access(path, fs.constants.F_OK, (err) => {
                if (err) {
                    Log.trace("error, therefore not in disk");
                    return resolve(false);
                    // if path is NOT accessible then it's NOT already in disk
                } else {
                    Log.trace("already in disk");
                    return resolve(true);
                }
            });
        });
    }

    public writeToMemory(id: string): boolean {
        fs.writeFile(__dirname + "/datasets/" + id + ".json",
            JSON.stringify(this.internalDataStructure),  (err) => {
                return false;
            });
        this.internalDataStructure = {};
        return true;
    }
    public parseFile(text: any): any {
        let JSObj: any;
        try {
            JSObj = JSON.parse(text);
        } catch (err) {
            return null;
        }
        return JSObj;
    }

    public checkValidCourse(object: any): number {
        let numValidSection: number = 0;
        if (object["result"] !== null) {
            // Log.trace("In Check Valid Course: check for sections " + typeof object["result"] + object["result"]);
            if (Array.isArray(object["result"])) {
                for (const section of object["result"]) {
                    if (this.isSectionValid(section)) {
                        this.addSection(section);
                        numValidSection += 1;
                    }
                }
            }
            return numValidSection;
        }
    }

    private isSectionValid(section: any): boolean {
        let valid: boolean = true;
        for (const key of Object.keys(this.coursevalidator)) {
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
            if (section["Section"] === "overall") {
                section["Year"] = "1900";
            }
            for (const key of Object.keys(this.coursevalidator)) {
                if (key !== "courses_dept") {
                    this.internalDataStructure[dept][key] = [];
                    this.internalDataStructure[dept][key].push(section[this.coursevalidator[key]]);
                }
            }
        } else {
            for (const key of Object.keys(this.coursevalidator)) {
                if (key !== "courses_dept") {
                    this.internalDataStructure[dept][key].push(section[this.coursevalidator[key]]);
                }
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
        const thisClass = this;
        return new Promise<string> ((resolve, reject) => {
            const index = thisClass.addedDatasets.indexOf(id);
            const noUnderscore: boolean = id.includes("_");
            const notWhiteSpace: boolean = (!id || id.length === 0 || /^\s*$/.test(id));
            if (noUnderscore || notWhiteSpace) {
                return reject(new InsightError("Invalid id used, nothing could be removed"));
            } else if (!(this.alreadyInDisk(id))) {
                // index === -1
                Log.trace ("for remove, about to throw not found error");
                return reject(new NotFoundError("Dataset " + id + " was not found"));
            } else {
                fs.unlink(__dirname + "/datasets/" + id + ".json", (err) => {
                    if (err) {
                        return reject(new InsightError("Dataset: " + id + " could not be removed"));
                    }
                    if (!(index === -1)) {
                        thisClass.addedDatasets.splice(index, 1);
                        for (const i in thisClass.forListDS) {
                            if (thisClass.forListDS[i]["id"] === id) {
                                thisClass.forListDS.splice(Number(i), 1);
                                break;
                            }
                        }
                    }
                    return resolve(id);
                });
            }
        });
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
    public performQuery(query: any): Promise<any[]> {
        return Promise.reject("Not implemented.");
    }

    /**
     * List all currently added datasets, their types, and number of rows.
     *
     * @return Promise <InsightDataset[]>
     * The promise should fulfill an array of currently added InsightDatasets, and will only fulfill.
     */
    public listDatasets(): Promise<InsightDataset[]> {
        return new Promise<InsightDataset[]>(((resolve) => {
            return resolve(this.forListDS);
        }));
    }
}
