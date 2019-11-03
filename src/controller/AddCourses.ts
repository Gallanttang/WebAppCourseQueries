import Log from "../Util";
import {InsightError} from "./IInsightFacade";
import * as jszip from "jszip";
import AddDataset from "./AddDataset";


export default class AddCourses extends AddDataset {
    private coursevalidator: any = {
        courses_dept: "Subject", courses_id: "Course", courses_avg: "Avg", courses_instructor: "Professor",
        courses_title: "Title", courses_pass: "Pass", courses_fail: "Fail", courses_audit: "Audit",
        courses_uuid: "id", courses_year: "Year"
    };

    constructor(addedDataset: string[], forListDS: any[]) {
        super(addedDataset, forListDS);
        Log.trace("init:addCourses");
    }

    protected addHelper(id: string, content: string): Promise<string[]> {
        let count: number = 0;
        let validSection: any[] = [];
        let promises: any[] = [];
        let that = this;
        return new Promise((resolve, reject) => {
            jszip.loadAsync(content, {base64: true}).then((result: jszip) => {
                if (!result) {
                    return reject(new InsightError("could not load content"));
                }
                try {
                    result.folder("courses").forEach(function (relativePath, file) {
                        promises.push(file.async("text"));
                    });
                } catch (err) {
                    return reject(new InsightError(err));
                }
            }).then(function () {
                Promise.all(promises).then(function (results: any) {
                    for (let result of results) {
                        that.processFiles(result, validSection);
                    }
                    count = that.checkValidSections(validSection, id);
                    if (count < 1) {
                        return reject(new InsightError("Could not write internal data structure to file"));
                    } else if (that.writeToMemory(id + "_courses_" + count)) {
                        that.addedDatasets.push(id);
                        that.forListDS.push({id: id, kind: "courses", numRows: count});
                        return resolve(that.addedDatasets);
                    }
                });
            }).catch((err: any) => {
                return reject(new InsightError(err));
            });
        });
    }

    private processFiles(file: any, validSections: any[]) {
        try {
            let processed: any = JSON.parse(file);
            if (processed !== null) {
                validSections.push(processed);
            }
        } catch (err) { // ignore
        }
    }

    public checkValidSections(validSections: any[], id: string): number {
        let numValidSection: number = 0;
        for (const sections of validSections) {
            if (sections["result"] === null) {
                continue;
            }
            if (!Array.isArray(sections["result"])) {
                continue;
            }
            for (const section of sections["result"]) {
                if (this.isSectionValid(section)) {
                    this.addSection(section, id);
                    numValidSection += 1;
                }
            }
        }
        return numValidSection;
    }

    public isSectionValid(section: any): boolean {
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
    private addSection(section: any, id: string) {
        if (section.hasOwnProperty("Section")) {
            for (const rawKey of Object.keys(this.coursevalidator)) {
                let key: string = id.concat("_", rawKey.split("_")[1]);
                if (!this.internalDataStructure.hasOwnProperty(rawKey)) {
                    this.internalDataStructure[key] = [];
                }
                if (rawKey === "courses_year") {
                    if (section["Section"] === "overall") {
                        this.internalDataStructure[key].push(1900);
                    } else {
                        this.internalDataStructure[key].push(Number(section[this.coursevalidator[key]]));
                    }
                } else if (rawKey === "courses_uuid") {
                    this.internalDataStructure[key].push(String(section[this.coursevalidator[key]]));
                } else {
                    this.internalDataStructure[key].push(section[this.coursevalidator[key]]);
                }
            }
        }
    }
}
