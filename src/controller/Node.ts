import * as fs from "fs";
import Log from "../Util";

export default class Node {
    public value: any;
    public children: any;
    constructor(value: any) {
        this.value = value;
        this.children = [];
    }

    public AND(dataStructure: any): any {
        return null;
    }
    public OR(dataStructure: any): any {
        return null;
    }
    public NOT(dataStructure: any): any {
        return null;
    }
    public LT(dataStructure: any): any {
        return null;
    }
    public EQ(dataStructure: any): any {
        return null;
    }
    public GT(dataStructure: any): any {
        return null;
    }
    public IS(dataStructure: any): any {
        return null;
    }
}
