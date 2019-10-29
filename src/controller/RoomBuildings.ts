import {IInsightFacade, InsightError} from "./IInsightFacade";
import {IMemoryManager} from "./IMemoryManager";
import Log from "../Util";
import ValueGetter from "./RoomTDValueGetter";
import {Building} from "./IBuilding";
const http = require("http");

export default class RoomBuildings {
    private dataFromIndex: any;
    private ValueGetter: ValueGetter;
    private internalDataStructure: any = {};
    private columnValidator: any = {
        "views-field views-field-field-room-number": "rooms_number",
        "views-field views-field-field-room-capacity" : "rooms_capacity",
        "views-field views-field-field-room-furniture" : "rooms_furniture",
        "views-field views-field-field-room-type" : "rooms_type",
        "views-field views-field-nothing" : "rooms_href"
    };

    private ast: any;

    private lat: number;
    private lon: number;

    constructor() {
        Log.trace("RoomBuildings::init()");
    }

    // adds valid rooms, if any, to internal struct.
    // doesn't really return anything
    public processBuilding(buildingAndFile: any): any {
        const thisClass = this;
        thisClass.dataFromIndex = buildingAndFile[0];
        thisClass.ast = buildingAndFile[1];
        return new Promise<any> ((reject, resolve) => {
            thisClass.getLatLon(thisClass.dataFromIndex["room_address"]).then((result: any) => {
                thisClass.lat = result["lat"];
                thisClass.lon = result["lon"];
                return resolve;
            }).then (() => {
                thisClass.getTableData(thisClass.ast);
            }).catch ((err) => {
                return reject("not a valid building");
            });
        });
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
                if (result) {
                    return result;
                }
            }
        }
        return result;
    }

    public getRoomsCount(): number {
        return null;
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
        let count: number = 0;
        let value: any;
        let key: string;
        let tdArray: any[] = tr.filter(function (elem: any) {
            return (elem.nodeName === "td" && elem.childNodes && elem.childNodes.length > 0);
        });
        for (let td of tdArray) {
            if (td.attrs && td.attrs[0] && td.attrs[0]) {
                if (this.columnValidator.hasOwnProperty(td.attrs[0].value)) {
                    count++;
                    key = thisClass.columnValidator[td.attrs[0].value];
                    value = thisClass.ValueGetter.getValue(key, td);
                    // todo if key is number, convert to number and also make name with it
                    if (key === "rooms_number") {
                        value = parseInt(value, 10);
                    }
                    if (thisClass.internalDataStructure.hasOwnProperty(key)) {
                        thisClass.internalDataStructure[key].push(value);
                    } else {
                        thisClass.internalDataStructure[key] = [];
                    }
                    thisClass.saveOtherValues();
                }
            }
        }
        return (count > 0);
    }

    public saveOtherValues(): any {
        if (this.internalDataStructure.hasOwnProperty("rooms_lat")) {
            this.internalDataStructure["rooms_lat"].push(this.lat);
        } else {
            this.internalDataStructure["rooms_lat"] = [];
        }
        if (this.internalDataStructure.hasOwnProperty("rooms_lon")) {
            this.internalDataStructure["rooms_lon"].push(this.lon);
        } else {
            this.internalDataStructure["rooms_lon"] = [];
        }
        for (let property of this.dataFromIndex) {
            if (property !== "rooms_path") {
                if (this.internalDataStructure.hasOwnProperty(property)) {
                    this.internalDataStructure[property].push(this.dataFromIndex[property]);
                } else {
                    this.internalDataStructure[property] = [];
                }
            }
        }
    }

    // inspired by: https://www.twilio.com/blog/2017/08/http-requests-in-node-js.html
    public getLatLon(address: string): Promise<any> {
        return new Promise(function (fulfill, reject) {
            let URLaddress = address.replace(" ", "%20");
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

    public addValidSections(section: any): any {
        return null;
    }
}
