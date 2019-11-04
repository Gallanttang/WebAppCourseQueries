import {InsightError} from "./IInsightFacade";
import addDataset from "./AddDataset";
import Log from "../Util";
import * as jszip from "jszip";
import addRoomValueGetter from "./AddRoomValueGetter";
const p5 = require("parse5");
const http = require("http");

export default class AddRooms extends addDataset {
    private td: addRoomValueGetter = new addRoomValueGetter();
    private initV: any = {
        "views-field views-field-title": "rooms_fullname",
        "views-field views-field-field-building-code": "rooms_shortname",
        "views-field views-field-field-building-address": "rooms_address",
        "views-field views-field-nothing" : "rooms_path"
    };

    private midV: any = {
        "views-field views-field-field-room-number": "rooms_number",
        "views-field views-field-field-room-capacity" : "rooms_seats",
        "views-field views-field-field-room-furniture" : "rooms_furniture",
        "views-field views-field-field-room-type" : "rooms_type",
        "views-field views-field-nothing": "rooms_href"
    };

    private finalV: string[] = ["fullname", "shortname", "number", "name", "address",
        "lat", "lon", "seats", "type", "furniture", "href"];

    constructor(addedDataset: string[], forListDS: any[]) {
        super(addedDataset, forListDS);
        Log.trace("init:addRooms");
    }

    protected addHelper(id: string, content: string): Promise<string[]> {
        let count: number = 0;
        let index: any;
        let that = this;
        return new Promise<string[]>((resolve, reject) => {
            jszip.loadAsync(content, {base64: true}).then((roomsFolder: jszip) => {
                if (!roomsFolder) {
                    return reject(new InsightError("could not load content"));
                }
                let folder: jszip = roomsFolder.folder("rooms");
                folder.file("index.htm").async("text").then((res) => {
                    index = p5.parse(res);
                    try {
                        if (!index.hasOwnProperty) {
                            return reject(new InsightError("Invalid index"));
                        }
                        index.childNodes = index.childNodes.filter((node: any) => node.nodeName === "html");
                        let tbody: any = that.processIndex(index);
                        let buildings: any[] = [];
                        that.getTable(tbody, buildings);
                        if (buildings.length < 0) {
                            return reject(new InsightError("Invalid dataset, not entries found"));
                        }
                        that.processBuildings(buildings, folder, count, id).then((rv: string[]) => {
                            return resolve(rv);
                        }).catch((err) => {
                            return reject(new InsightError(err));
                        });
                    } catch (err) {
                        reject(new InsightError(err));
                    }
                }).catch((err) => {
                    throw new InsightError(err);
                });
            });
        });
    }

    private processIndex(index: any): any {
        if (index.nodeName === "tbody") {
            return index;
        } else if (!index.childNodes || index.childNodes.length < 1) {
            return;
        } else {
            return this.getTbodyHelper(index.childNodes);
        }
     }

     private getTbodyHelper(childNodes: any[]): any {
        for (let child of childNodes) {
            let returnValue: any = this.processIndex(child);
            if (returnValue) {
                return returnValue;
            }
        }
        return;
     }

    private getTable(tBody: any, result: any[]) {
        if (tBody.childNodes && tBody.childNodes.length > 0) {
            for (let child of tBody.childNodes) {
                if (child.nodeName === "tr") {
                    this.processBuildingTR(child, result);
                }
            }
        }
    }

    // one TR = one building/ room entry only
    private processBuildingTR(tr: any, result: any[]) {
        let building: any = {};
        let childNodes: any[] = tr.childNodes;
        // childNodes = childNodes.filter((child: any) =>
        //     child.nodeName === "td" && child.attrs && child.attrs.length > 0 && child.attrs[0].value &&
        //     typeof child.attrs[0].value === "string" && this.initV.hasOwnProperty(child.attrs[0].value));
        for (let child of childNodes) {
            if (child.nodeName === "td" && this.initV.hasOwnProperty(child.attrs[0].value)) {
                let key: string = this.initV[child.attrs[0].value];
                building[key] = this.td.getValue(key, child);
            }
        }
        result.push(building);
    }

    private processBuildings(toProcess: any[], roomsFolder: jszip, count: number, id: string): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            let filtered: any[] = toProcess.filter((build) => build["rooms_path"]);
            let promises: any[] = [];
            if (toProcess.length < 1) {
                return reject(new InsightError("No valid buildings found"));
            }
            for (let b of filtered) {
                promises.push(this.getLatLon(b["rooms_address"], b));
            }
            let promisedRooms: any[] = [];
            Promise.all(promises).then((rv: any[]) => {
                for (let v of rv) {
                    if (v !== 404) {
                        promisedRooms.push(this.processRooms(v, roomsFolder, id));
                    }
                }
                Promise.all(promisedRooms).then((pr: number[]) => {
                    for (let r of pr) {
                        count += r;
                    }
                    if (count > 0 && this.writeToMemory(id + "_rooms_" + count)) {
                        this.forListDS.push({id: id, kind: "rooms", numRows: count});
                        this.addedDatasets.push(id);
                        return resolve(this.addedDatasets);
                    } else {
                        return reject(new InsightError("Empty dataset, not rooms found"));
                    }
                });
            }).catch((err) => {
                return reject(new InsightError(err));
            });
        });
    }

    private processRooms(building: any, zipped: jszip, id: string): Promise<number> {
        let that = this;
        return new Promise<number>((resolve) => {
            zipped.file(building["rooms_path"]).async("text").then(function (toParse) {
                let parsed = p5.parse(toParse);
                if (!parsed) {
                    return resolve(0);
                }
                let count: number = 0;
                let tbody: any = that.processIndex(parsed);
                if (tbody && tbody.hasOwnProperty("childNodes")) {
                    for (let child of tbody.childNodes) {
                        if (child.nodeName === "tr") {
                            count += that.processRoomsTR(child, building, id);
                        }
                    }
                    return resolve(count);
                } else {
                    return resolve(0);
                }
            }).catch((err) => {
                return resolve(0);
            });
        });
    }

    private processRoomsTR(tr: any, building: any, id: string): number {
        let room: any = {};
        for (let rawKey of Object.keys(this.initV)) {
            let key: string = id.concat("_", this.initV[rawKey].split("_")[1]);
            if (this.initV[key] !== "rooms_path") {
                room[key] = building[key];
            }
        }
        let childNodes: any[] = tr.childNodes.filter((node: any) => node.nodeName === "td");
        for (let child of childNodes) {
            if (child.nodeName === "td" && this.midV.hasOwnProperty(child.attrs[0].value)) {
                let key: string = id.concat("_", this.midV[child.attrs[0].value].split("_")[1]);
                let rawKey: string = this.midV[child.attrs[0].value];
                let value: any = this.td.getValue(rawKey, child);
                if (rawKey === "rooms_seats" && !value) {
                    room[key] = 0;
                } else if (rawKey === "rooms_number") {
                    room[key] = String(value);
                } else if (rawKey === "rooms_capacity") {
                    room[key] = Number(value);
                } else {
                    room[key] = value;
                }
            }
        }
        room[id + "_lat"] = building["rooms_lat"];
        room[id + "_lon"] = building["rooms_lon"];
        room[id + "_name"] = room[id + "_shortname"] + "_" + room[id + "_number"];
        for (let columns of this.finalV) {
            if (!room.hasOwnProperty(id + "_" + columns)) {
                return 0;
            }
        }
        this.storeToIDS(room);
        return 1;
    }

    private storeToIDS(room: any) {
        for (let key of Object.keys(room)) {
            if (!this.internalDataStructure.hasOwnProperty(key)) {
                this.internalDataStructure[key] = [];
                this.internalDataStructure[key].push(room[key]);
            } else {
                this.internalDataStructure[key].push(room[key]);
            }
        }
    }

    private getLatLon(address: string, building: any): Promise<any> {
        return new Promise(function (resolve) {
            let URLaddress = address.replace(" ", "%20");
            let url: string = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team234/" + URLaddress;
            let geo: any;
            try {
                http.get(url, (res: any) => {
                    const statusCode = res.statusCode;
                    const contentType = res.headers["content-type"];
                    if (statusCode !== 200) {
                        resolve(404);
                    } else if (!/^application\/json/.test(contentType)) {
                        resolve(404);
                    }
                    res.setEncoding("utf8");
                    let data: string = "";
                    res.on("data", (chunk: any) => data += chunk);
                    res.on("end", () => {
                        try {
                            geo = JSON.parse(data);
                            building["rooms_lat"] = geo["lat"];
                            building["rooms_lon"] = geo["lon"];
                            resolve(building);
                        } catch (e) {
                            geo = {error: "failed response"};
                            resolve(404);
                        }
                    });
                }).on("error", (err: any) => {
                    geo = {error: "failed response" + err};
                    resolve(404);
                });
            } catch (err) {
                return resolve(404);
            }
        });
    }
}
