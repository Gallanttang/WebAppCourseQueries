import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError
} from "./IInsightFacade";
import "./MemoryManager";
import MemoryManager from "./MemoryManager";
import QueryPerformer from "./QueryPerformer";
import QueryManager from "./QueryManager";
import addCourses from "./AddCourses";
import addRooms from "./AddRooms";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private memMan: MemoryManager;
    private addedDatasets: string[] = [];
    private forListDS: any[] = [];
    private internalDataStructure: any = {};
    private queryMan: QueryManager;
    private addCourse: addCourses;
    private addRoom: addRooms;

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.memMan = new MemoryManager();
        this.queryMan = new QueryManager(this.forListDS);
        this.memMan.helpInitialize(this.addedDatasets, this.forListDS);
        this.addCourse = new addCourses(this.addedDatasets, this.forListDS);
        this.addRoom = new addRooms(this.addedDatasets, this.forListDS);
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            if (kind === "courses") {
                this.addCourse.add(id, content).then((result: string[]) => {
                    return resolve(result);
                }).catch((err) => {
                    return reject(err);
                });
            } else if (kind === "rooms") {
                this.addRoom.add(id, content).then((result: string[]) => {
                    return resolve(result);
                }).catch((err) => {
                    return reject(err);
                });
            } else {
                return reject(new InsightError("Trying to add invalid dataset kind"));
            }
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
        let queryPerformer = new QueryPerformer();
        try {
            result = queryPerformer.returnQueriedCourses(this.internalDataStructure, query, numRow);
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
