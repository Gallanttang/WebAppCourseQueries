import * as fs from "fs";
import Log from "../Util";

export default class TreeNode {
    public value: any;
    public children: any;
    constructor(value: any) {
        this.value = value;
        this.children = [];
    }
}
