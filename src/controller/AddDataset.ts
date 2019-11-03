import {InsightError} from "./IInsightFacade";
import Log from "../Util";
import * as fs from "fs";

export default abstract class AddDataset {
    protected internalDataStructure: any = {};
    public forListDS: any[] = [];
    public addedDatasets: string[];

    protected constructor(addedDataset: string[], forListDS: any[]) {
        this.addedDatasets = addedDataset;
        this.forListDS = forListDS;
        Log.trace("init:addDataset");
    }

    public add(id: string, content: string): Promise<string[]> {
        if (!id) {
            throw new InsightError("Trying to add dataset using invalid ID " + id);
        }
        if (!/^([a-zA-Z]|[0-9])+$/.test(id)) {
            throw new InsightError("Trying to add dataset using invalid ID " + id);
        }
        if (this.addedDatasets.some((some: string) => some === id)) {
            return Promise.reject(new InsightError("Dataset " + id + "already exists"));
        }
        return new Promise<string[]>((resolve, reject) => {
            this.addHelper(id, content).then((result) => {
                return resolve(result);
            }).catch((err) => {
                return reject(err);
            });
        });
    }

    protected abstract addHelper(id: string, content: string): Promise<string[]>;

    protected writeToMemory(id: string): boolean {
        try {
            fs.writeFileSync("./data/" + id + ".json", JSON.stringify(this.internalDataStructure));
            fs.accessSync("./data/" + id + ".json", fs.constants.F_OK);
            this.internalDataStructure = {};
            return true;
        } catch (err) {
            return false;
        }
    }
}
