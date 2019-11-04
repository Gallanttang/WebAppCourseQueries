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
        "rooms-conditiontype-none": "NOT"
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
        condition[op][field] = term;
        return condition;
    }

    this.getCond = function (condition) {
        let cond = {};
        let not = condition.getElementsByClassName("control not").item(0).getElementsByTagName("input").item(0);
        if (not.checked) {
            cond["NOT"] = this.getCondHelper(condition);
        } else {
            cond = this.getCondHelper(condition);
        }
        return cond;
    }


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
                    let c = this.getCond(cond);
                    condition[outerMostFilter][Object.keys(c)[0]] = c[Object.keys(c)[0]];
                } else {
                    let c = this.getCond(cond);
                    condition[outerMostFilter].push(c);
                }
            }
         }
    }
    if (outerMostFilter !== "NOT") {
        if (condition[outerMostFilter].length === 0) {
            delete condition[outerMostFilter];
        }
    } else if (!condition[outerMostFilter].hasOwnProperty) {
        delete condition[outerMostFilter];
    }
    console.log(query);
    return query;
};
