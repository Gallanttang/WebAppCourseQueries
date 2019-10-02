import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import "./MemoryManager";
import * as jszip from "jszip";
import MemoryManager from "./MemoryManager";
import TreeNode from "./TreeNode";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private memMan = new MemoryManager();
    private coursevalidator: any = {
        courses_dept: "Subject", courses_id: "Course", courses_avg: "Avg", courses_instructor: "Professor",
        courses_title: "Title", courses_pass: "Pass", courses_fail: "Fail", courses_audit: "Audit",
        courses_uuid: "id", courses_year: "Year"
    };

    private filters: any = {
        gt: "GT", lt: "LT", eq: "EQ",
        is: "IS", not: "NOT", and: "AND", or: "OR"
    };

    private addedDatasets: string[] = [];
    private forListDS: any[] = [];

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    // change to string x.toString("base64")
    // JSZip to unzip files
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        const promisedFiles: any = [];
        const thisClass = this;
        let validSections: any[] = [];
        const idIsInvalid: boolean = !id || id.includes("_") || id.length === 0 || /^\s*$/.test(id) ||
            this.addedDatasets.some((s) => s === id);
        return new Promise<string[]>((resolve, reject) => {
            thisClass.memMan.alreadyInDisk(id).then((isInDisk) => {
                if (idIsInvalid || isInDisk) { return reject(new InsightError("Invalid id used")); } else {
                    let count: number = 0;
                    jszip.loadAsync(content, {base64: true}).then((result: jszip) => {
                        result.folder("courses").forEach(function (relativePath, file) {
                            promisedFiles.push(file.async("text"));
                        });
                        Promise.all(promisedFiles).then((results) => {
                            for (let result0 of results) {
                                let processed: any;
                                try { processed = this.memMan.parseFile(result0); } catch (err) { // ignore
                                } finally { if (processed !== null) { validSections.push(processed); }
                                }
                            }
                        }).then(function () {
                            let validDataset = false;
                            for (const section of validSections) {
                                let valid: number = thisClass.memMan.checkValidCourse(section);
                                if (valid !== 0) {
                                    validDataset = true;
                                    count += valid;
                                }
                            }
                            if (validDataset) {
                                thisClass.memMan.writeToMemory(id).then((successful) => {
                                    if (successful) {
                                        thisClass.addedDatasets.push(id);
                                        thisClass.forListDS.push({id: id, kind: kind, numRows: count});
                                        return resolve(thisClass.addedDatasets);
                                    } else {
                                        return reject(new InsightError("Could not write " + id + "to memory"));
                                    }
                                });
                            } else {
                                return reject(new InsightError("Could not add invalid dataset: " + id));
                            }
                        });
                    }).catch(() => {
                        return reject(new InsightError("Invalid file " + id + "cannot be added"));
                    });
                }
            });
        });
    }

    public removeDataset(id: string): Promise<string> {
        const thisClass = this;
        return new Promise<string>((resolve, reject) => {
            const index = thisClass.addedDatasets.indexOf(id);
            const validID: boolean = id && id.length >= 0 && !/^\s*$/.test(id) && !id.includes("_");
            if (!validID) {
                return reject(new InsightError("Invalid id used, nothing could be removed"));
            } else if (index === -1) {
                return reject(new NotFoundError("Dataset " + id + " was not found"));
            } else if (validID && index >= 0) {
                this.memMan.alreadyInDisk(id).then((isInDisk) => {
                    if (isInDisk) {
                        thisClass.memMan.deleteFromMemory(id).then((successful) => {
                            if (successful) {
                                thisClass.updateDataset(index, id);
                                resolve(id);
                            } else {
                                return reject(new InsightError
                                ("Dataset " + id + " could not be deleted from memory"));
                            }
                        });
                    } else {
                        thisClass.updateDataset(index, id);
                        return reject(NotFoundError);
                    }
                });
            }
        });
    }

    private updateDataset(index: number, id: string) {
        this.addedDatasets.splice(index, 1);
        for (const i in this.forListDS) {
            if (this.forListDS[Number(i)]["id"] === id) {
                this.forListDS.splice(Number(i), 1);
                break;
            }
        }
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
        let that = this;
        return new Promise<any[]>((resolve, reject) => {
            that.isQueryValid(query).then((result: any) => {
                // now do something with the returned AST
                return (reject("not implemented"));
            }).catch((err: any) => {
                return (reject(err));
            });
            // return (reject("not implemented"));
        });
    }

    /**
     * helper for PerformQuery
     * @return Promise<any>
     * the promise should fulfill with true if query is valid, InsightError if it isn't
     */
    public isQueryValid(query: any): Promise<any> {
        const that = this;
        return new Promise<any>((resolve, reject) => {
            if (query != null && typeof query === "object") {
                if (that.equals(Object.keys(query), [ "WHERE", "OPTIONS" ])) {
                    if (query.key(0).hasOwnProperty) {
                        // there's stuff in the "WHERE", NEED TO RECURSE
                        // todo need to write recursive function to check each filter in "WHERE"
                    } else {
                        // nothing in the "WHERE", all ok
                    }
                    if (query.key(1).hasOwnProperty) {
                        const value = query.key(1);
                        if (that.equals(query[value], ["COLUMNS", "ORDER"]) || that.equals(query[value], ["COLUMNS"])) {
                            // "OPTIONS" is formed correctly
                        } else {
                            return reject (new InsightError("malformed options structure"));
                        }
                    } else {
                        return reject (new InsightError("options is missing columns"));
                    }
                    // at this point we know the query's valid, return true
                    return resolve(true);
                } else {
                    return reject (new InsightError("malformed query body structure"));
                }
            } else {
                return reject(new InsightError("query cannot be null"));
            }
        });
    }
    public equals(keys: any, expected: any): boolean {
            if (keys.length !== expected.length) {
                return false;
            } else {
                // comparing each element of array
                for (let i = 0; i < keys.length; i++) {
                    if (keys[i] !== expected[i]) {
                        return false;
                    }
                }
                return true;
            }
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
