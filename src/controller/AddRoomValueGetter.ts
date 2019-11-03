import Log from "../Util";

export default class AddRoomValueGetter {

    constructor() {
        Log.trace("AddRoomValueGetter::init()");
    }

    public getValue(fieldType: any, td: any): any {
        if (fieldType === "rooms_shortname") {
            return this.getShortname(td);
        }
        if (fieldType === "rooms_fullname") {
            return this.getFullname(td);
        }
        if (fieldType === "rooms_address") {
            return this.getAddress(td);
        }
        if (fieldType === "rooms_type") {
            return this.getType(td);
        }
        if (fieldType === "rooms_number") {
            return this.getNumber(td);
        }
        if (fieldType === "rooms_seats") {
            return this.getSeats(td);
        }
        if (fieldType === "rooms_furniture") {
            return this.getFurniture(td);
        }
        if (fieldType === "rooms_href") {
            return this.getHref(td);
        }
        if (fieldType === "rooms_path") {
            return this.getPath(td);
        }
    }

    // get value of form "ACU"
    private getShortname(td: any): string {
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
    private getFullname(td: any): string {
        let value: string;
        try {
            value = td.childNodes[1].childNodes[0].value;
            return value.trim();
        } catch {
            return "";
        }
    }

    private getAddress(td: any): string {
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

    private getHref(td: any): string {
        let value: string;
        try {
            value = td.childNodes[1].attrs[0].value;
            value = value.trim();
            return value;
        } catch (err) {
            return "";
        }
    }

    private getPath(td: any): string {
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

    private getType(td: any): string {
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

    private getNumber(td: any): string {
        let value: string;
        try {
            value = td.childNodes[1].childNodes[0].value;
            value = value.trim();
            return value;
        } catch {
            return "";
        }
    }

    public getSeats(td: any): number {
        let value: string;
        try {
            value = td.childNodes[0].value;
            value = value.replace("\n", "");
            value = value.trim();
            let rv = parseInt(value, 10);
            return rv;
        } catch {
            return null;
        }
    }

    private getFurniture(td: any): string {
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
