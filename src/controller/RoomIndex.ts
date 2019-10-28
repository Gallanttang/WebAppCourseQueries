import {IInsightFacade, InsightError} from "./IInsightFacade";
import {IMemoryManager} from "./IMemoryManager";
import Log from "../Util";
import ValueGetter from "./RoomTDValueGetter";
import RoomBuildings from "./RoomBuildings";
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
    public buildingsToParse(indexAST: any): number {
        let result: number;
        let thisClass = this;
        if (indexAST.nodeName === "thead") {
            try {
                let ordering: string[] = thisClass.getTableOrdering(indexAST);
                if (ordering.includes("rooms_fullname") && ordering.includes("rooms_shortname")
                    && ordering.includes("rooms_address") && ordering.includes("rooms_path")) {
                    result = thisClass.getTableBuildings(ordering, indexAST.parent);
                }
            } catch (err) {
                // ordering didn't work, so table was invalid
                // continue onwards
            }
        } else if (!indexAST.childNodes || indexAST.childNodes.length <= 0) {
            return 0;
        } else {
            // recurse on each indexAST childNode
            for (let child of indexAST.childNodes) {
                result = thisClass.buildingsToParse(child);
                if (result > 0) {
                    return result;
                }
            }
        }
        return result;
    }

    // Given thead, returns any{key: value} where key = shortname
    // and value is: index = col#, value = key at that table col#
    // fn 2
    public getTableOrdering(thead: any): string[] {
        const thisClass = this;
        let result: string[] = [];
        let res: string;
        let trArray: any[];
        let tdArray: any[];
        if (thead.childNodes && thead.childNodes.length > 0) {
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
    // Then returns count of all valid rooms of buildings in the tbody
    // fn 3
    public getTableBuildings(ordering: string[], table: any): number {
        let thisClass = this;
        let result: number = 0;
        if (table.nodeName === "tr" && table.childNodes && table.childNodes.length > 0) {
            result += thisClass.getValues(ordering, table.childNodes);
        } else if (!table.childNodes || table.childNodes.length <= 0) {
            return result;
        }
        if (table.childNodes && table.childNodes.length > 0) {
            // recurse on each indexAST childNode
            for (let child of table.childNodes) {
                result = thisClass.getTableBuildings(ordering, child);
                if (result > 0) {
                    return result;
                }
            }
        }
        return result;
    }

    // calls HtmlValueProcessor.getValue on each td of given tr.childNodes
    // Then converts all value results to array of object {fieldType: value} and returns
    // the ORDER of the rownums array: fullname, shortname, address, path
    // fn 4
    public getValues(ordering: string[], table: any): number {
        const thisClass = this;
        let result: number = 0;
        let passToBuilding: any[] = [];
        let trArray: any[];
        let tdArray: any[];
        let rowNums: number[] = [ordering.indexOf("rooms_fullname"), ordering.indexOf("rooms_shortname"),
            ordering.indexOf("rooms_address")];
        let path: number = ordering.indexOf("rooms_path");
        let value: string;
        trArray = table.filter(function (elem: any) {
            return (elem.nodeName === "tr" && elem.childNodes && elem.childNodes.length > 0);
        });
        for (let tr of trArray) {
            tdArray = tr.childNodes.filter(function (elem: any) {
                return elem.nodeName === "td";
            });
            for (let row of rowNums) {
                if (tdArray[row]) {
                    value = thisClass.ValueGetter.getValue(thisClass.standardFieldsOrder[row], tdArray[row]);
                } else {
                    value = "";
                }
                passToBuilding.push(value);
            }
            value = thisClass.ValueGetter.getValue("rooms_path", path);
            result += thisClass.RoomBuildings.getValidRooms(passToBuilding, value);
        }
        return result;
    }
}
