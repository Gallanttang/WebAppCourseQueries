import {IInsightFacade, InsightError} from "./IInsightFacade";
import {IMemoryManager} from "./IMemoryManager";
import Log from "../Util";
import ValueGetter from "./RoomTDValueGetter";
import RoomBuildings from "./RoomBuildings";
import {Building} from "./IBuilding";
import QueryPerformer from "./QueryPerformer";
import MemoryManager from "./MemoryManager";
import QueryManager from "./QueryManager";

export default class RoomIndex {
    private ValueGetter: ValueGetter;
    private RoomBuildings: RoomBuildings;
    private columnValidator: any = {
        "views-field views-field-title": "rooms_fullname",
        "views-field views-field-field-building-code": "rooms_shortname",
        "views-field views-field-field-building-address": "rooms_address",
        "views-field views-field-nothing" : "rooms_path"
    };

    constructor() {
        Log.trace("RoomIndexImpl::init()");
        this.ValueGetter = new ValueGetter();
        this.RoomBuildings = new RoomBuildings();
    }

    // should return array of building objects
    // fn 1
    public buildingsToParse(indexAST: any): any[] {
        let result: any[];
        let thisClass = this;
        if (indexAST.nodeName === "tbody") {
            try {
                result = thisClass.getTableBuildings(indexAST);
            } catch (err) {
                Log.trace("error caught here" + err);
                // ordering didn't work, so table was invalid
                // continue onwards
                return [];
            }
        } else if (!indexAST.childNodes || indexAST.childNodes.length <= 0) {
            return [];
        } else {
            // recurse on each indexAST childNode
            for (let child of indexAST.childNodes) {
                result = thisClass.buildingsToParse(child);
                if (result.length > 0) {
                    return result;
                }
            }
        }
        return result;
    }

    public getTableBuildings( tbody: any): any[] {
        let thisClass = this;
        let result: any[] = [];
        let returnedResult: any;
        if (tbody.nodeName === "tr" && tbody.childNodes && tbody.childNodes.length > 0) {
            result.push(thisClass.getBuildingObject(tbody.childNodes));
            return result;
        } else if (!tbody.childNodes || tbody.childNodes.length <= 0) {
            return result;
        }
        if (tbody.childNodes && tbody.childNodes.length > 0) {
            // recurse on each indexAST childNode
            for (let child of tbody.childNodes) {
                returnedResult = thisClass.getTableBuildings(child);
                if (returnedResult.length > 0) {
                    result = result.concat(returnedResult);
                }
            }
        }
        return result;
    }

    // calls HtmlValueProcessor.getValue on each td of given tr.childNodes
    // Then converts all value results to an IBuilding object and returns
    // fn 4
    public getBuildingObject(tr: any): Building {
        const thisClass = this;
        let building: any = {
            rooms_fullname: "",
            rooms_shortname: "",
            rooms_address: "",
            rooms_path: ""
        };
        let value: string;
        let key: string;
        let tdArray: any[] = tr.filter(function (elem: any) {
            return (elem.nodeName === "td" && elem.childNodes && elem.childNodes.length > 0);
        });
        for (let td of tdArray) {
            if (td.attrs && td.attrs[0] && td.attrs[0]) {
                if (this.columnValidator.hasOwnProperty(td.attrs[0].value)) {
                    key = thisClass.columnValidator[td.attrs[0].value];
                    value = thisClass.ValueGetter.getValue(key, td);
                    building[key] = value;
                }
            }
        }
        return building;
    }
}
