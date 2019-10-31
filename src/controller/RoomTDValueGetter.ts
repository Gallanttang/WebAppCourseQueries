import {IInsightFacade, InsightError} from "./IInsightFacade";
import {IMemoryManager} from "./IMemoryManager";
import Log from "../Util";

export default class RoomTDValueGetter {

    constructor() {
        Log.trace("RoomTDValueGetter::init()");
    }

    public getValue(fieldType: any, td: any): any {
        if (fieldType === "rooms_shortname") {
            return this.getShortname(fieldType, td);
        }
        if (fieldType === "rooms_fullname") {
            return this.getFullname(fieldType, td);
        }
        if (fieldType === "rooms_address") {
            return this.getAddress(fieldType, td);
        }
        if (fieldType === "rooms_type") {
            return this.getType(fieldType, td);
        }
        if (fieldType === "rooms_number") {
            return this.getNumber(fieldType, td);
        }
        if (fieldType === "rooms_seats") {
            return this.getSeats(fieldType, td);
        }
        if (fieldType === "rooms_furniture") {
            return this.getFurniture(fieldType, td);
        }
        if (fieldType === "rooms_href") {
            return this.getHref(fieldType, td);
        }
        if (fieldType === "rooms_path") {
            return this.getHref(fieldType, td);
        }
    }

    // get value of form "ACU"
    public getShortname(fieldType: any, td: any): string {
        let reg: RegExp = new RegExp(/(?:[A-Z]{4}|[A-Z]{3})/);
        let value: string;
        try {
            value = td.childNodes[0].value;
            return value.match(reg)[0];
        } catch {
            return "";
        }
    }

    // get value of form "Acute Care Unit"
    public getFullname(fieldType: any, td: any): string {
        let value: string;
        try {
            value = td.childNodes[1].childNodes[0].value;
            return value.trim();
        } catch {
            return "";
        }
    }

    public getAddress(fieldType: any, td: any): string {
        let value: string;
        try {
            value = td.childNodes[0].value;
            value = value.trim();
            value = value.replace("\n", "");
            return value;
        } catch (err) {
            return "";
        }
    }

    public getHref(fieldType: any, td: any): string {
        let value: string;
        try {
            value = td.childNodes[1].attrs[0].value;
            value = value.trim();
            value = value.replace("./", "");
            return value;
        } catch (err) {
            return "";
        }
    }

    public getType(fieldType: any, td: any): string {
        let value: string;
        try {
            value = td.childNodes[0].value;
            value = value.replace("\n", "");
            value = value.trim();
            return value;
        } catch {
            return "";
        }
    }

    public getNumber(fieldType: any, td: any): string {
        let value: string;
        try {
            value = td.childNodes[1].childNodes[0].value;
            value = value.trim();
            return value;
        } catch {
            return "";
        }
    }

    public getSeats(fieldType: any, td: any): string {
        let value: string;
        try {
            value = td.childNodes[0].value;
            value = value.replace("\n", "");
            value = value.trim();
            return value;
        } catch {
            return "";
        }
    }

    public getFurniture(fieldType: any, td: any): string {
        let value: string;
        try {
            value = td.childNodes[0].value;
            value = value.replace("\n", "");
            value = value.trim();
            return value;
        } catch {
            return "";
        }
    }
}
