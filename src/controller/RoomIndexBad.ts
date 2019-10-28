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

    private standardFieldsOrder: string[] = ["rooms_fullname", "rooms_shortname", "rooms_address"];

    constructor() {
        Log.trace("RoomIndexImpl::init()");
        this.ValueGetter = new ValueGetter();
        this.RoomBuildings = new RoomBuildings();
    }

    // should return count of overall # of valid sections
    // fn 1
    public buildingsToParse(indexAST: any): any[] {
        let result: any[];
        let thisClass = this;
        if (indexAST.nodeName === "table") {
            try {
                let ordering: string[] = thisClass.getTableOrdering(indexAST);
                if (ordering.includes("rooms_fullname") && ordering.includes("rooms_shortname")
                    && ordering.includes("rooms_address") && ordering.includes("rooms_path")) {
                    result = thisClass.getTableBuildings(ordering, indexAST);
                }
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
                    Log.trace(result);
                    return result;
                }
            }
        }
        return result;
    }

    // Given thead, returns any{key: value} where key = shortname
    // and value is: index = col#, value = key at that table col#
    // fn 2
    public getTableOrdering(table: any): string[] {
        const thisClass = this;
        let result: string[] = [];
        let res: string;
        let trArray: any[];
        let tdArray: any[];
        let thead: any = "";
        if (table.childNodes) {
            for (let tableChild of table.childNodes) {
                if (tableChild.nodeName === "thead") {
                    thead = tableChild;
                }
            }
        } else {
            return [];
        }
        if (thead && thead.childNodes && thead.childNodes.length > 0) {
            trArray = thead.childNodes.filter(function (elem: any) {
                return (elem.nodeName === "tr" && elem.childNodes && elem.childNodes.length > 0);
            });
            for (let tr of trArray) {
                tdArray = tr.childNodes.filter(function (elem: any) {
                    return (elem.nodeName === "th" && elem.childNodes && elem.childNodes.length > 0);
                });
                for (let td of tdArray) {
                    res = thisClass.getTableOrderingRecursion(td);
                    if (res) {
                        result.push(res);
                    }
                }
            }
            return result;
        } else {
            return [];
        }
    }

    // given td, returns string of td
    public getTableOrderingRecursion(table: any): string {
        let thisClass = this;
        let result: string = "";
        let returnedResult: any;
        let columnValue: string;
        let fixedColumnValue: string;
        if (table.nodeName === "th" && table.attrs && table.attrs.length > 0) {
            columnValue = table.attrs[0].value;
            if (this.columnValidator.hasOwnProperty(columnValue)) {
                fixedColumnValue = thisClass.columnValidator[columnValue];
                return fixedColumnValue;
            } else {
                return " ";
            }
        } else if (!table.childNodes || table.childNodes.length <= 0) {
            return null;
        } else {
            // recurse on each indexAST childNode
            for (let child of table.childNodes) {
                returnedResult = thisClass.getTableOrderingRecursion(child);
                if (returnedResult) {
                    return returnedResult;
                }
            }
        }
        return result;
    }

    // Given table, gets each tr from correct tbody and calls fn 4 on each tr
    // Then returns [] of all valid buildings in the tbody
    // fn 3
    public getTableBuildings(ordering: string[], table: any): any[] {
        let thisClass = this;
        let result: any[] = [];
        let returnedResult: any;
        let tbody: any = "";
        if (table.childNodes) {
            for (let tableChild of table.childNodes) {
                if (tableChild.nodeName === "tbody") {
                    tbody = tableChild;
                }
            }
        } else {
            return [];
        }
        if (tbody.nodeName === "tr" && tbody.childNodes && tbody.childNodes.length > 0) {
            result.push(thisClass.getBuildingObject(ordering, table.childNodes));
            return result;
        } else if (!tbody.childNodes || tbody.childNodes.length <= 0) {
            return result;
        }
        if (tbody.childNodes && tbody.childNodes.length > 0) {
            // recurse on each indexAST childNode
            for (let child of tbody.childNodes) {
                returnedResult = thisClass.getTableBuildings(ordering, child);
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
    public getBuildingObject(ordering: string[], table: any): Building {
        const thisClass = this;
        let building: any = {
            rooms_fullname: "",
            rooms_shortname: "",
            rooms_address: "",
            rooms_path: ""
        };
        let value: string;
        let tdArray: any[] = table.filter(function (elem: any) {
            return (elem.nodeName === "td" && elem.childNodes && elem.childNodes.length > 0);
        });
        for (let key of ordering) {
            let rowNum = ordering.indexOf(key);
            if (key !== " ") {
                if (tdArray && tdArray.length - 1 >= rowNum) {
                    value = thisClass.ValueGetter.getValue(key, tdArray[rowNum]);
                    building[key] = value;
                } else {
                    // else keep the array value as empty string
                }
            }
            // else it's not a key we care about. do nothing
        }
        return building;
    }
}
