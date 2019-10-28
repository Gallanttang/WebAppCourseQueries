// import Log from "../Util";
// import {InsightError} from "./IInsightFacade";
// import * as jszip from "jszip";
// import MemoryManager from "./MemoryManager";
// import * as fs from "fs";
//

// export default class addCourses {
//     private memMan: MemoryManager = new MemoryManager();
//
//     constructor() {
//         Log.trace("init:addCourses");
//     }
//
//     public add(id: string, content: string, addedDataset: any): Promise<string[]> {
//         const retrieve: any[] = [];
//         if (!id) {
//             throw new InsightError("Trying to add dataset using invalid ID " + id);
//         }
//         if (!/^([a-zA-Z]|[0-9])+$/.test(id)) {
//             throw new InsightError("Trying to add dataset using invalid ID " + id);
//         }
//         if (addedDataset.some((some: string) => some === id)) {
//             return Promise.reject(new InsightError("Dataset " + id + "already exists"));
//         }
//         const path = "./data/" + id + ".json";
//         let fileExists: boolean;
//         try {
//             fs.accessSync(path, fs.constants.F_OK);
//             fileExists = true;
//         } catch (err) {
//             fileExists = false;
//         }
//         if (!fileExists) {
//             this.addHelper(id, content);
//         }
//     }
//
//     private addHelper(id: string, content: string): string[] {
//
//         return [];
//     }
// }
