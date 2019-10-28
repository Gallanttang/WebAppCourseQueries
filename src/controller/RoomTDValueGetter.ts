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
        // todo this one is a bit unconventional. I'm using it to get to buildings
        if (fieldType === "rooms_href") {
            return this.getHref(fieldType, td);
        }
    }

    public getShortname(fieldType: any, td: any): any {
        return null;
    }

    public getFullname(fieldType: any, td: any): any {
        return null;
    }

    public getAddress(fieldType: any, td: any): any {
        try {
            let result = td.childNodes[0].value;
        } catch (err) {
            return "";
        }
    }

    public getType(fieldType: any, td: any): any {
        return null;
        // use a chained if statement here
    }

    public getNumber(fieldType: any, td: any): any {
        return null;
    }

    public getSeats(fieldType: any, td: any): any {
        return null;
    }

    public getFurniture(fieldType: any, td: any): any {
        return null;
        // use a chained if statement here
    }

    public getHref(fieldType: any, td: any): any {
        return null;
        // use a chained if statement here
    }
}
