import {IInsightFacade, InsightError} from "./IInsightFacade";
import {IMemoryManager} from "./IMemoryManager";
import Log from "../Util";

export default class RoomIndex {
    private columnValidator: any = {
        "views-field views-field-title": "rooms_fullname",
        "views-field views-field-field-building-code": "rooms_shortname",
        "views-field views-field-field-building-address": "rooms_address"
    };

    // returns all rooms to parse found in index.htm
    // fn 1
    public buildingsToParse(indexAST: any): any {
        let result: any = {};
        let thisClass = this;
        if (indexAST.nodeName === "thead") {
            try {
                let ordering: string[] = thisClass.getTableOrdering(indexAST);
                if (ordering.length > 0) {
                    result = thisClass.getTableBuildings(ordering, indexAST.parent);
                }
            } catch (err) {
                // ordering didn't work, so table was invalid
                // continue onwards
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

    // Given thead, returns any{key: value} where key = shortname
    // and value is: index = col#, value = key at that table col#
    // fn 2
    public getTableOrdering(thead: any): string[] {
        const thisClass = this;
        let result: string[] = [];
        if (thead.childNodes && thead.childNodes.length > 0) {
            for (let tr of thead.childNodes) {
                let res = thisClass.getTableOrderingRecursion(tr);
                if (res.length > 0) {
                    result.push(thisClass.getTableOrderingRecursion(tr));
                }
            }
            return result;
        } else {
            return [];
        }
    }

    public getTableOrderingRecursion(table: any): string {
        let thisClass = this;
        let result: string = "";
        let columnValue: string;
        if (table.nodeName === "th" && table.attrs && table.attrs.length > 0) {
            columnValue = table.attrs[0].value;
            if (this.columnValidator.hasOwnProperty(columnValue)) {
                // todo it breaks at this point rip
                let fixedColumnValue = thisClass.columnValidator[columnValue];
                return(fixedColumnValue);
            }
        } else if (!table.childNodes || table.childNodes.length <= 0) {
            return "";
        }
        if (table.childNodes && table.childNodes.length > 0) {
            // recurse on each indexAST childNode
            for (let child of table.childNodes) {
                result = thisClass.getTableOrderingRecursion(child);
                if (result.length > 0) {
                    return result;
                }
            }
        }
        return result;
    }

    // Given table, gets each tr from tbody and calls fn 4 on each tr
    // Then pushes all fn 4 results into the any[] and returns
    // fn 3
    public getTableBuildings(ordering: string[], tbody: any): any {
        return null;
    }

    // calls HtmlValueProcessor.getValue on each td of given tr
    // Then pushes all value results to string[] and returns
    // fn 4
    public getValue(ordering: string[], tr: any): string[] {
        return null;
    }
}
