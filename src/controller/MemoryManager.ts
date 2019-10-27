import * as fs from "fs";
import Log from "../Util";
import {InsightError} from "./IInsightFacade";
import {IMemoryManager} from "./IMemoryManager";

export default class MemoryManager implements IMemoryManager {
    private internalDataStructure: any = {};
    private coursevalidator: any = {
        courses_dept: "Subject", courses_id: "Course", courses_avg: "Avg", courses_instructor: "Professor",
        courses_title: "Title", courses_pass: "Pass", courses_fail: "Fail", courses_audit: "Audit",
        courses_uuid: "id", courses_year: "Year"
    };

    constructor() {
        Log.trace("MemoryManager::init()");
    }

    // called when the dataset is already in disk
    // gets dataset name & kind & numRows from the file name and pushes appropriately
    public helpInitialize(dataset: any, forListDS: any) {
        fs.readdirSync("./data/").forEach((file) => {
            let content: string[] = file.split("_", 3);
            let numRow: string = content[2].split(".", 1)[0];
            dataset.push(content[0]);
            forListDS.push({id: content[0], kind: content[1], numRows: numRow});
        });
    }

    // checks if the dataset is already in disk
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
            fs.writeFileSync("./data/" + id + ".json", JSON.stringify(this.internalDataStructure));
            fs.access("./data/" + id + ".json", fs.constants.F_OK, (err) => {
                if (err) {
                    return resolve(false);
                } else {
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

    public checkValidSections(validSections: any[]): number {
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
                    this.addSection(section);
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
    private addSection(section: any) {
        if (section.hasOwnProperty("Section")) {
            if (section["Section"] === "overall") {
                for (const key of Object.keys(this.coursevalidator)) {
                    this.addHelperSectionEqualsOverall(section, key);
                }
            } else {
                for (const key of Object.keys(this.coursevalidator)) {
                    this.addHelperSectionNotEqualsOverall(section, key);
                }
            }
        }
    }

    public addHelperSectionEqualsOverall(section: any, key: any) {
        if (!this.internalDataStructure.hasOwnProperty(key)) {
            this.internalDataStructure[key] = [];
        }
        if (key === "courses_year") {
            this.internalDataStructure[key].push(1900);
        } else {
            this.addHelperSection(section, key);
        }
    }

    public addHelperSectionNotEqualsOverall(section: any, key: any) {
        if (!this.internalDataStructure.hasOwnProperty(key)) {
            this.internalDataStructure[key] = [];
        }
        if (key === "courses_year") {
            this.internalDataStructure[key].push(Number(section[this.coursevalidator[key]]));
        } else {
            this.addHelperSection(section, key);
        }
    }

    private addHelperSection(section: any, key: any) {
        if (key === "courses_uuid") {
            this.internalDataStructure[key].push(String(section[this.coursevalidator[key]]));
        } else {
            this.internalDataStructure[key].push(section[this.coursevalidator[key]]);
        }
    }

    public deleteFromMemory(path: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            fs.unlink("./data/" + path + ".json", (err) => {
                if (err) {
                    return reject(new InsightError("Could not delete " + path));
                }
                return resolve(true);
            });
        });
    }

    public retrieveDataset(path: string): any {
        try {
            let path0: string = "./data/" + path + ".json";
            return JSON.parse(fs.readFileSync(path0, {encoding: "utf8"}));
        } catch (err) {
            throw err;
        }
    }
}
