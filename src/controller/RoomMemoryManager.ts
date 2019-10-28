import {IInsightFacade, InsightError} from "./IInsightFacade";
import {IMemoryManager} from "./IMemoryManager";
import Log from "../Util";

export default class RoomMemoryManager {
    // todo recursively look through all nodes until I find one with the nodeName 'tbody'
    public roomsToParse(indexAST: any): string[] {
        let result: string[] = [];
        let thisClass = this;
        // base case ish: found table
        if (indexAST.nodeName === "tbody") {
            Log.trace("yay I reached the table");
            return thisClass.roomsFromTable(indexAST);
        } else if (!indexAST.childNodes || indexAST.childNodes.length <= 0) {
            // / base case: no children. return empty array
            return [];
        } else {
            // recurse on each indexAST childNode
            for (let child of indexAST.childNodes) {
                result = thisClass.roomsToParse(child);
                if (result.length > 0) {
                    return result;
                }
            }
        }
        return result;
    }

    // look in each child node -> each tr (table row)-> childnodes ->
    //  check if there's a node from childnodes with
    // (nodeName = '#text', value = '/n ACU') or whatever relevant building code (3-4 characters all uppercase)
    // If so, push that to the array and go to a different table row
    // helper for roomsToParse. Returns string[] of valid rooms from given table, OR empty []
    public roomsFromTable(table: any): string[] {
        let thisClass = this;
        let result: string[] = [];
        Log.trace("inside roomsFromTable");
        if (table.childNodes && table.childNodes.length > 0) {
            for (let child of table.childNodes) {
                if (child.nodeName === "tr" && child.childNodes && table.childNodes.length > 0) {
                    for (let potentialRoom of child.childNodes) {
                        result.concat(thisClass.roomsFromTableRecursion(potentialRoom));
                    }
                }
            }
        } else {
            return result;
        }
        return result;
    }

    // Given a childNode from tr, recursively check if there's some node such that:
    // (nodeName = '#text', value = '/n ACU') or whatever relevant building code (3-4 characters all uppercase)
    // returns that building code as a string
    public roomsFromTableRecursion(table: any): string[] {
        let thisClass = this;
        let result: string[] = [];
        let reg: RegExp = new RegExp(/\/n\s*(?:[A-Z]{4}|[A-Z]{3})\s*/);
        // base case: reached #text
        // only return result if it actually is a building code
        if (table.nodeName === "#text") {
            Log.trace("table.value:" + table.value);
            // todo I misunderstood the spec
            //  todo "You should only parse buildings that are linked to from the index.htm file'
            // todo I shouldn't have looked in value at all
            if (reg.test(table.value)) {
                let buildingName: string = table.value.slice(4, -1);
                // todo for some reason table.value 's type is a number???
                // todo even though it doesn't show up that way in the AST playground online
                result.push(buildingName);
                return result;
            }
        } else if (!table.childNodes || table.childNodes.length <= 0) {
            // base case: not #text and no children
            // return empty array
            return [];
        } else {
            // recursive case: keep looking in childNodes
            for (let child of table.childNodes) {
                result = thisClass.roomsFromTableRecursion(child);
                if (result.length > 0) {
                    return result;
                }
            }
        }
        return result;
    }
}
