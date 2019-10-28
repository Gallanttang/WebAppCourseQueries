import {IInsightFacade, InsightError} from "./IInsightFacade";
import {IMemoryManager} from "./IMemoryManager";
import Log from "../Util";
const http = require("http");

export default class RoomBuildings {
    private roomsFullname: string = "";
    private roomsShortname: string = "";
    private roomsAddress: string = "";
    private internalDataStructure: any = {};
    private columnValidator: any = {
        // todo add columns
    };

    constructor() {
        Log.trace("RoomBuildings::init()");
    }

    public processFiles(buildingFile: any): any {
        return null;
    }

    // todo how should empty string be represented in internal data struct?
    // returns number of valid rooms for this particular building specified by path
    public getValidRooms(passToBuilding: string[], path: string): number {
        return null;
    }

    public validTableExists(): boolean {
        return null;
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
