import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError
} from "./IInsightFacade";
import "./MemoryManager";
import * as jszip from "jszip";
import MemoryManager from "./MemoryManager";
import QueryPerformer from "./QueryPerformer";
import QueryManager from "./QueryManager";
import RoomBuildings from "./RoomBuildings";
import RoomIndex from "./RoomIndex";
import {IMemoryManager} from "./IMemoryManager";
import * as fs from "fs";
import {log} from "util";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private memMan: MemoryManager;
    private roomBuildings: RoomBuildings;
    private roomIndex: RoomIndex;
    private queryPerformer: QueryPerformer;
    private addedDatasets: string[] = [];
    private forListDS: any[] = [];
    private internalDataStructure: any = {};
    private queryMan: QueryManager;

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.queryPerformer = new QueryPerformer();
        this.roomIndex = new RoomIndex();
        this.memMan = new MemoryManager();
        this.queryMan = new QueryManager(this.forListDS);
        this.memMan.helpInitialize(this.addedDatasets, this.forListDS);
    }

    // todo forEach might not be covering the test cases for d1. look into it
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        const thisClass = this;
        if (this.idIsInvalid(id)) {
            return Promise.reject(new InsightError("Invalid id used"));
        }
        return new Promise<string[]>((resolve, reject) => {
            thisClass.memMan.alreadyInDisk(id).then((isInDisk) => {
                if (isInDisk) {
                    thisClass.memMan.helpInitialize(this.addedDatasets, this.forListDS);
                    return Promise.resolve(id);
                } else {
                    thisClass.loadToDisk(id, content, kind).then((result: string[]) => {
                        return resolve(result);
                    }).catch(() => {
                        return reject(new InsightError("Invalid file " + id + "cannot be added"));
                    });
                }
            });
        });
    }

    // helper for addDataset, recently refactored out
    public idIsInvalid(id: string): boolean {
        return (!id || id.includes("_") || id.length === 0 || /^.*\s+.*$/.test(id) ||
            this.addedDatasets.some((s) => s === id));
    }

    // helper for addDataset, recently refactored out
    public loadToDisk( id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        const promisedFiles: any = [];
        let sections: any[] = [];
        let thisClass = this;
        let count: number = 0;
        return new Promise<string[]>((resolve, reject) => {
            jszip.loadAsync(content, {base64: true}).then((result: jszip) => {
                if (kind === "rooms") {
                    thisClass.roomLoadToDisk(id, content, kind, result).then((roomResult: string[]) => {
                        return reject("not implemented");
                    }).catch(() => {
                        return reject("error in roomLoadToDisk");
                    });
                } else {
                    result.folder("courses").forEach(function (relativePath, file) {
                        promisedFiles.push(file.async("text"));
                    });
                    Promise.all(promisedFiles).then((results) => {
                        for (let result0 of results) {
                            thisClass.processFiles(result0, sections);
                        }
                    }).then(function () {
                        count = thisClass.memMan.checkValidSections(sections);
                        if (count > 0) {
                            thisClass.memMan.writeToMemory(id + "_" + kind + "_" + count).then((successful) => {
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
                }
            });
        });
    }

    // todo me rooms function _________________________________________________________________________________________
    public roomLoadToDisk( id: string, content: string, kind: InsightDatasetKind, result: jszip): Promise<string[]> {
        let buildingsToParse: any[];
        const promisedFiles: any = [];
        let sections: any[] = [];
        let thisClass = this;
        let parsedIndexFile: object;
        let count: number = 0;
        const parse5 = require("parse5");
        Log.trace("inside roomLoadToDisk");
        return new Promise<string[]>((resolve, reject) => {
            result.folder("rooms").file("index.htm").async("text").then((indexFile) => {
                parsedIndexFile = parse5.parse(indexFile);

                // TODO check if there is one html file

                // roomsToParse = thisClass.roomMemMan.roomsToParse(parsedIndexFile);
                // result.folder("rooms/campus/discover/buildings-and-classrooms")
                // .forEach(function (relativePath, file) {
                //     if (roomsToParse.includes(relativePath)) {
                //         promisedFiles.push(file.async("text"));
                //     }
                // });
                // buildingsToParse = thisClass.roomIndex.buildingsToParse(parsedIndexFile);
                result.folder("rooms/campus/discover/buildings-and-classrooms").forEach(function (relativePath, file) {
                    // todo should look through all keys of buildingsToParse and look for a match. idk if it will work
                    // if (buildingsToParse.includes(relativePath)) {
                        promisedFiles.push(file.async("text"));
                    // }
                });
                Log.trace("before promise.all");
                Promise.all(promisedFiles).then((results) => {
                    for (let result0 of results) {
                        // todo have to write this
                        sections = thisClass.roomBuildings.processFiles(result0);
                    }
                }).then(function () {
                    count = thisClass.roomBuildings.addValidSections(sections);
                    if (count > 0) {
                        // this part is the same as courses, can stay as memMan
                        thisClass.memMan.writeToMemory(id + "_" + kind + "_" + count).then((successful) => {
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
            });
            // todo am I done at this point? do aI need a catch block
            // return reject("not finished implementation");
        });
    }

    // helper for loadToDisk, which is a helper for addDataset
    // returns validSections as parsed JSON objects
    public processFiles(file: any, validSections: any[]) {
        let processed: any;
        try {
            processed = this.memMan.parseFile(file);
        } catch (err) { // ignore
        } finally {
            if (processed !== null) {
                validSections.push(processed);
            }
        }
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
                let dataset: any;
                for (let ds of this.forListDS) {
                    if (ds.id === id) {
                        dataset = ds;
                    }
                }
                this.memMan.alreadyInDisk(dataset.id + "_" + dataset.kind + "_" + dataset.numRows)
                    .then((isInDisk) => {
                        if (isInDisk) {
                            thisClass.memMan.deleteFromMemory(
                                dataset.id + "_" + dataset.kind + "_" + dataset.numRows)
                                .then((removed) => {
                                    if (removed) {
                                        thisClass.updateDataset(index, id);
                                        resolve(id);
                                    }
                                }).catch((err) => {
                                return new InsightError(err);
                            });
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
        let numRow: number;
        try {
            this.queryMan.checkQuery(query);
        } catch (err) {
            return Promise.reject(err);
        }
        for (const ds of this.forListDS) {
            if (this.queryMan.dsToQuery === ds["id"]) {
                numRow = ds["numRows"];
                try {
                    that.internalDataStructure = that.memMan.retrieveDataset(
                        this.queryMan.dsToQuery + "_" + ds["kind"] + "_" + ds["numRows"]);
                } catch (err) {
                    return Promise.reject(new InsightError(err));
                }
                break;
            }
        }
        let result: any[];
        try {
            result = this.queryPerformer.returnQueriedCourses(this.internalDataStructure, query, numRow);
        } catch (err) {
            return Promise.reject(err);
        }
        return Promise.resolve(result);
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return new Promise<InsightDataset[]>(((resolve) => {
            return resolve(this.forListDS);
        }));
    }
}
