import {IInsightFacade, InsightError} from "./IInsightFacade";
import {IMemoryManager} from "./IMemoryManager";
import Log from "../Util";
import ValueGetter from "./RoomTDValueGetter";
import {Building} from "./IBuilding";
const http = require("http");

export default class RoomBuildings {
    private ValueGetter: ValueGetter;
    private buildings: any[] = [];
    private internalDataStructure: any = {};
    private columnValidator: any = {
        "views-field views-field-field-room-number": "rooms_number",
        "views-field views-field-field-room-capacity" : "rooms_seats",
        "views-field views-field-field-room-furniture" : "rooms_furniture",
        "views-field views-field-field-room-type" : "rooms_type",
        "views-field views-field-nothing" : "rooms_href"
    };

    constructor() {
        Log.trace("RoomBuildings::init()");
    }

    // adds valid rooms, if any, to internal struct.
    // doesn't really return anything
    public processBuilding(building: any): any {
        // const thisClass = this;
        // thisClass.dataFromIndex = buildingAndFile[0];
        // thisClass.ast = buildingAndFile[1];
        // return new Promise<any> ((reject, resolve) => {
        //     thisClass.getLatLon(thisClass.dataFromIndex["rooms_address"]).then((result: any) => {
        //         thisClass.lat = result["lat"];
        //         thisClass.lon = result["lon"];
        //         // thisClass.getTableData(thisClass.ast);
        //         Log.trace(thisClass.internalDataStructure);
        //         return resolve();
        //     }).catch ((err) => {
        //         // todo maybe I have to return resolve here ...
        //         return reject("not a valid building");
        //     });
        // });
        const thisClass = this;
        return new Promise<any> ((reject, resolve) => {
            thisClass.getLatLon(building["rooms_address"]).then((result: any) => {
                building["rooms_lat"] = result["lat"];
                building["rooms_lon"] = result["lon"];
                thisClass.buildings.push(building);
                return resolve();
            }).catch ((err) => {
                // todo maybe I have to return resolve here ...
                return resolve("not a valid building");
            });
        });
    }

    public storeBuildings(): boolean {
        let thisClass = this;
        let result = false;
        for (let building of thisClass.buildings) {
            let r = thisClass.getTableData(building["rooms_ast"]);
            if (r) {
                thisClass.storeRoomName(building);
                thisClass.storeOtherValues(building);
                result = true;
            }
        }
        return result;
    }

    // for each appropriate key of building, save to internal data struct
    public storeOtherValues(building: any) {
        let thisClass = this;
        for (let key in building) {
            if (building.hasOwnProperty(key) && key !== "rooms_ast" && key !== "rooms_path") {
                let value = building[key];
                if (thisClass.internalDataStructure.hasOwnProperty(key)) {
                    thisClass.internalDataStructure[key].push(value);
                } else {
                    thisClass.internalDataStructure[key] = [];
                }
            }
        }
    }

    // todo get the room name using last elem of appropriate data struct array & building shortname
    public storeRoomName(building: any) {
        let num = this.internalDataStructure[this.internalDataStructure.length - 1];
        let shortname = building["rooms_shortname"];
        let name = shortname.concat("_" + num);
        if (this.internalDataStructure.hasOwnProperty("rooms_name")) {
            this.internalDataStructure["rooms_name"].push(name);
        } else {
            this.internalDataStructure["rooms_name"] = [];
        }
    }

    public getTableData(ast: any): boolean {
        let result: boolean = false;
        let thisClass = this;
        if (ast.nodeName === "tbody") {
            try {
                return (thisClass.getTBodyData(ast));
            } catch (err) {
                Log.trace("error caught here" + err);
                // ordering didn't work, so table was invalid
                // continue onwards
                return false;
            }
        } else if (!ast.childNodes || ast.childNodes.length <= 0) {
            return false;
        } else {
            // recurse on each indexAST childNode
            for (let child of ast.childNodes) {
                result = thisClass.getTableData(ast.childNodes);
                if (result) {
                    return result;
                }
            }
        }
        return result;
    }

    // Given tbody, gets each trand calls fn 4 on each tr
    // As long as some row is "true", the table is valid. therefore return true
    // fn 3
    public getTBodyData(tbody: any): boolean {
        let thisClass = this;
        let result: boolean = false;
        let returnedResult: any;
        if (tbody.nodeName === "tr" && tbody.childNodes && tbody.childNodes.length > 0) {
            return (thisClass.getTRData(tbody.childNodes));
        } else if (!tbody.childNodes || tbody.childNodes.length <= 0) {
            return false;
        }
        if (tbody.childNodes && tbody.childNodes.length > 0) {
            // recurse on each indexAST childNode
            for (let child of tbody.childNodes) {
                returnedResult = thisClass.getTBodyData(child);
                if (returnedResult) {
                    return true;
                }
            }
        }
        return result;
    }

    // calls HtmlValueProcessor.getValue on each td of given tr.childNodes
    // Then converts all value results to an IBuilding object and returns
    // fn 4
    public getTRData(tr: any): boolean {
        const thisClass = this;
        let result = false;
        let value: any;
        let key: string;
        let tdArray: any[] = tr.filter(function (elem: any) {
            return (elem.nodeName === "td" && elem.childNodes && elem.childNodes.length > 0);
        });
        for (let td of tdArray) {
            if (td.attrs && td.attrs[0]) {
                if (this.columnValidator.hasOwnProperty(td.attrs[0].value)) {
                    result = true;
                    key = thisClass.columnValidator[td.attrs[0].value];
                    value = thisClass.ValueGetter.getValue(key, td);
                    if (thisClass.internalDataStructure.hasOwnProperty(key)) {
                        thisClass.internalDataStructure[key].push(value);
                    } else {
                        thisClass.internalDataStructure[key] = [];
                    }
                }
            }
        }
        return result;
    }

    // public getRoomsName(roomNum: number): void {
    //     // rooms_shortname+"_"+rooms_number
    //     let shortname = this.dataFromIndex["rooms_shortname"];
    //     let name: string = shortname.concat("_", roomNum);
    //     if (this.internalDataStructure.hasOwnProperty("rooms_name")) {
    //         this.internalDataStructure["rooms_name"].push(name);
    //     } else {
    //         this.internalDataStructure["rooms_name"] = [];
    //     }
    // }

    // public saveOtherValues(): any {
    //     if (this.internalDataStructure.hasOwnProperty("rooms_lat")) {
    //         this.internalDataStructure["rooms_lat"].push(this.lat);
    //     } else {
    //         this.internalDataStructure["rooms_lat"] = [];
    //     }
    //     if (this.internalDataStructure.hasOwnProperty("rooms_lon")) {
    //         this.internalDataStructure["rooms_lon"].push(this.lon);
    //     } else {
    //         this.internalDataStructure["rooms_lon"] = [];
    //     }
    //     for (let property of this.dataFromIndex) {
    //         if (property !== "rooms_path") {
    //             if (this.internalDataStructure.hasOwnProperty(property)) {
    //                 this.internalDataStructure[property].push(this.dataFromIndex[property]);
    //             } else {
    //                 this.internalDataStructure[property] = [];
    //             }
    //         }
    //     }
    // }

    // public hasValidRoom(): boolean {
    //     return (Object.keys(this.internalDataStructure).length >= 0);
    // }

    // inspired by: https://www.twilio.com/blog/2017/08/http-requests-in-node-js.html
    public getLatLon(address: string): Promise<any> {
        return new Promise( (fulfill, reject) => {
            let URLaddress = address.replace(new RegExp(/\s/, "g"), "%20");
            let url: string = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team234/" + URLaddress;
            let geo: any;
            try {
                http.get(url, (res: any) => {
                    const statusCode = res.statusCode;
                    const contentType = res.headers["content-type"];
                    if (statusCode !== 200) {
                        geo = {error: "failed response" + statusCode};
                        reject(404);
                    } else if (!/^application\/json/.test(contentType)) {
                        geo = {error: "failed response" + statusCode};
                        reject(404);
                    }
                    res.setEncoding("utf8");
                    let data: string = "";
                    res.on("data", (chunk: any) => data += chunk);
                    res.on("end", () => {
                        try {
                            geo = JSON.parse(data);
                            fulfill(geo);
                        } catch (e) {
                            geo = {error: "failed response"};
                            reject(404);
                        }
                    });
                }).on("error", (err: any) => {
                    geo = {error: "failed response" + err};
                    reject(404);
                });
            } catch (err) {
                throw new InsightError(404);
            }
        });
    }
}
