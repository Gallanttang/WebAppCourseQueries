/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */

CampusExplorer.buildQuery = function () {
    const converter = {
        "courses-conditiontype-all": "AND",
        "courses-conditiontype-any": "OR",
        "courses-conditiontype-none": "NOT",
        "rooms-conditiontype-all": "AND",
        "rooms-conditiontype-any": "OR",
        "rooms-conditiontype-none": "NOT",
    };

    let query = {};
    // the active query panel: courses or rooms
    let activePanel = document.getElementsByClassName("tab-panel active");
    // gets a string value of the type of query
    let type = activePanel.item(0).getAttribute("data-type");
    // this will contain all possible input buttons
    let conditionsPanel = activePanel.item(0).getElementsByClassName("form-group conditions").item(0).childNodes;

    let condition = {};
    query["WHERE"] = condition;
    let outerMostFilter;
    this.getCondHelper = function (cond) {
        let condition = {};
        let op = cond.getElementsByClassName("control operators").item(0).getElementsByTagName("SELECT").item(0).value;
        condition[op] = {};
        let field = cond.getElementsByClassName("control fields").item(0).getElementsByTagName("SELECT").item(0).value;
        field = type + "_"  + field;
        let term = cond.getElementsByClassName("control term").item(0).getElementsByTagName("INPUT").item(0).value;
        if (isNaN(Number(term))) {
            condition[op][field] = term;
        } else {
            condition[op][field] = Number(term);
        }
        return condition;
    };

    this.getCond = function (condition) {
        let cond = {};
        let not = condition.getElementsByClassName("control not").item(0).getElementsByTagName("input").item(0);
        if (not.checked) {
            cond["NOT"] = this.getCondHelper(condition);
        } else {
            cond = this.getCondHelper(condition);
        }
        return cond;
    };


    for(let child of conditionsPanel) {
        if (child.className === "control-group condition-type") {
            for (let input of child.getElementsByTagName("input")) {
                if (input.checked && converter[input.id] === "NOT") {
                    outerMostFilter = converter[input.id];
                    condition[outerMostFilter] = {};
                } else if (input.checked && converter.hasOwnProperty(input.id)){
                    outerMostFilter = converter[input.id];
                    condition[outerMostFilter] = [];
                }
            }
        }
        if (child.className === "conditions-container") {
            for (let cond of child.childNodes) {
                if (outerMostFilter === "NOT") {
                    let filter = this.getCond(cond);
                    condition[outerMostFilter][Object.keys(filter)[0]] = filter[Object.keys(filter)[0]];
                } else {
                    let c = this.getCond(cond);
                    condition[outerMostFilter].push(c);
                }
            }
        }
    }

    if (outerMostFilter !== "NOT") {
        if (condition[outerMostFilter].length === 1) {
            let onlyKey = Object.keys(condition[outerMostFilter][0])[0];
            let onlyCond = condition[outerMostFilter][0][onlyKey];
            delete condition[outerMostFilter];
            condition[onlyKey] = onlyCond;
        } else if (condition[outerMostFilter].length === 0) {
            delete condition[outerMostFilter];
        }
    } else if (!condition[outerMostFilter].hasOwnProperty) {
        delete condition[outerMostFilter];
    }

// COLUMNS
    let columnsPanel, groupsPanel, checkedGroups = [], columns = [];
    let orderBy;
    columnsPanel = activePanel.item(0).getElementsByClassName("form-group columns").item(0).children;
    for (let child of columnsPanel.item(1).children) {
        let checked = child.getElementsByTagName("input").item(0).checked;
        if (checked && child.className === "control field") {
            columns.push(type + "_" + child.getElementsByTagName("input").item(0).value);
        } else if (checked && child.className === "control transformation") {
            columns.push(child.getElementsByTagName("input").item(0).value);
        }
    }

// ORDER
    let orderFields = activePanel.item(0).getElementsByClassName("form-group order");
    orderFields = orderFields.item(0).getElementsByClassName("control-group").item(0);
    orderFields = orderFields.getElementsByClassName("control order fields").item(0).getElementsByTagName("select").item(0);
    let orders = [];
    for (let child of orderFields) {
        if (child.selected && child.className === "transformation") {
            orders.push(child.value);
        } else if (child.selected) {
            orders.push(type + "_" + child.value);
        }
    }

    orderBy = activePanel.item(0).getElementsByClassName("control descending").item(0);
    orderBy = orderBy.getElementsByTagName("input").item(0);
    orderBy = orderBy.checked; // if true = descending
    if (orderBy) {
        orderBy = "DOWN";
    } else {
        orderBy = "UP"
    }

    // GROUPS
    groupsPanel = activePanel.item(0).getElementsByClassName("form-group groups").item(0).children[1];
    for (let child of groupsPanel.children) {
        if (child.getElementsByTagName("input").item(0).checked) {
            checkedGroups.push(type + "_" + child.getElementsByTagName("input").item(0).value);
        }
    }
    //TRANSFORMATIONS
    let controlTerm, controlOperator, controlFields;
    let applyData = [];
    let transformationContainer = activePanel.item(0).getElementsByClassName("transformations-container").item(0).childNodes;
    for (let child of transformationContainer) {
        let getControlOperator, getControlFields;
        controlTerm = child.childNodes.item(1).childNodes.item(1).value;
        controlOperator = child.childNodes.item(3).children.item(0);
        for (let i of controlOperator) {
            if (i.selected) {
                getControlOperator = i.value;
            }
        }
        controlFields = child.childNodes.item(5).children.item(0);
        for (let i of controlFields) {
            if (i.selected) {
                getControlFields = type + "_" + i.value;
            }
        }
        let applyNode = {};
        applyNode[controlTerm] = {};
        applyNode[controlTerm][getControlOperator] = getControlFields;
        applyData.push(applyNode);
    }

    if (orderBy.length > 0 && orders.length > 0) {
        query["OPTIONS"] = {COLUMNS: columns, ORDER: {dir: orderBy,keys: orders}};
    } else {
        query["OPTIONS"] = {COLUMNS: columns};
    }
    let transformations;
    if (checkedGroups.length > 0 || applyData.length > 0) {
        transformations = {GROUP: checkedGroups, APPLY: applyData};
        query["TRANSFORMATIONS"] = transformations;
    }
    return query;
};
