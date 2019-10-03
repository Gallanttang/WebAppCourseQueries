import * as fs from "fs";
import Log from "../Util";

export default class MemoryManager {
    private internalDataStructure: any = {};
    private coursevalidator: any = {
        courses_dept: "Subject", courses_id: "Course", courses_avg: "Avg", courses_instructor: "Professor",
        courses_title: "Title", courses_pass: "Pass", courses_fail: "Fail", courses_audit: "Audit",
        courses_uuid: "id", courses_year: "Year"
    };
    constructor() {
        Log.trace("MemoryManager::init()");
    }

    public helpInitialize(dataset: any, forListDS: any) {
        fs.readdirSync("./data/").forEach((file) => {
            let content: string[] = file.split("_", 3);
            dataset.push(content[0]);
            forListDS.push({id: content[0], kind: content[1], numRows: content[2]});
        });
    }

    public alreadyInDisk(id: string): Promise<boolean> {
        const path = "./data/" + id + ".json";
        return new Promise<boolean>((resolve) => {
            fs.access(path, fs.constants.F_OK, (err) => {
                if (err) {
                    return resolve(false);
                } else {
                    return resolve(true);
                }
            });
        });
    }

    public writeToMemory(id: string): Promise<boolean> {
        return new Promise<boolean>(((resolve) => {
            fs.writeFile( "./data/" + id + ".json",
                JSON.stringify(this.internalDataStructure),  (err) => {
                    if (err) {
                        return resolve(false);
                    } else {
                        this.internalDataStructure = {};
                        return resolve(true);
                    }
                });
        }));
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

    public deleteFromMemory(path: string): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            fs.unlink("./data/" + path + ".json", (err) => {
                if (err) {
                    return resolve(false);
                } else {
                    return resolve(true);
                }
            });
        });
    }
}
