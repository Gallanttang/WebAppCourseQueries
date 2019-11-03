import * as fs from "fs";
import Log from "../Util";
import {InsightError} from "./IInsightFacade";

export default class MemoryManager {

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
