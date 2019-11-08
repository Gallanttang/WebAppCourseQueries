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
        "Audit": "courses_audit",
        "Average": "courses_avg",
        "Department": "courses_dept",
        "Fail": "courses_fail",
        "ID": "courses_id",
        "Instructor": "courses_instructor",
        "Pass": "courses_pass",
        "Title": "courses_title",
        "UUID": "courses_uuid",
        "Year": "courses_year",
        "Address": "rooms_address",
        "Full Name": "rooms_fullname",
        "Furniture": "rooms_furniture",
        "Link": "rooms_href",
        "Latitude": "rooms_lat",
        "Longitude": "rooms_lon",
        "Name": "rooms_name",
        "Number": "rooms_number",
        "Seats": "rooms_seats",
        "Short Name": "rooms_shortname",
        "Type": "rooms_type"
    };
    let coursesColumns = ["courses-columns-field-audit", "courses-columns-field-avg",
        "courses-columns-field-dept", "courses-columns-field-fail",
        "courses-columns-field-id", "courses-columns-field-instructor",
        "courses-columns-field-pass", "courses-columns-field-title",
        "courses-columns-field-uuid", "courses-columns-field-year"];
    let roomsColumns = ["rooms-columns-field-address", "rooms-columns-field-fullname",
        "rooms-columns-field-furniture", "rooms-columns-field-href", "rooms-columns-field-lat",
        "rooms-columns-field-lon", "rooms-columns-field-name", "rooms-columns-field-number",
        "rooms-columns-field-seats", "rooms-columns-field-shortname", "rooms-columns-field-type"];
    let coursesGroups = ["courses-groups-field-audit", "courses-groups-field-avg",
        "courses-groups-field-dept", "courses-groups-field-fail",
        "courses-groups-field-id", "courses-groups-field-instructor",
        "courses-groups-field-pass", "courses-groups-field-title",
        "courses-groups-field-uuid", "courses-groups-field-year"];
    let roomsGroups = ["rooms-groups-field-address", "rooms-groups-field-fullname",
        "rooms-groups-field-furniture", "rooms-groups-field-href", "rooms-groups-field-lat",
        "rooms-groups-field-lon", "rooms-groups-field-name", "rooms-groups-field-number",
        "rooms-groups-field-seats", "rooms-groups-field-shortname", "rooms-groups-field-type"];

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
                    condition[outerMostFilter]["AND"] = [];
                } else if (input.checked && converter.hasOwnProperty(input.id)){
                    outerMostFilter = converter[input.id];
                    condition[outerMostFilter] = [];
                }
            }
        }
        if (child.className === "conditions-container") {
            for (let cond of child.childNodes) {
                if (outerMostFilter === "NOT") {
                    condition[outerMostFilter]["AND"].push(this.getCond(cond));
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

    activePanel = document.getElementsByClassName("tab-panel active").item(0).getAttribute("data-type");
    let checkedColumns = [], columns = [], groups = [], checkedGroups = [];
    let orderBy;
    if (activePanel === "courses") {
        columns = coursesColumns;
        groups = coursesGroups;
        orderBy = document.getElementById("courses-order");
    } else if (activePanel === "rooms") {
        columns = roomsColumns;
        groups = roomsGroups;
        orderBy = document.getElementById("rooms-order");
    }

    for (let i in columns) {
        if (document.getElementById(columns[i]).checked) {
            let x = document.getElementById(columns[i]);
            checkedColumns.push(activePanel + "_" + x.value);
        }
    }
    // GROUPS
    for (let i in groups) {
        if (document.getElementById(groups[i]).checked) {
            let x = document.getElementById(groups[i]);
            checkedGroups.push(activePanel + "_" + x.value);
        }
    }

    // ORDER
    let orderFields = document.getElementsByClassName("tab-panel active");
    orderFields = orderFields.item(0).getElementsByClassName("form-group order");
    orderFields = orderFields.item(0).getElementsByClassName("control-group").item(0);
    orderFields = orderFields.getElementsByClassName("control order fields").item(0).getElementsByTagName("select").item(0);
    let checkedOrders = [];
    for (let i in orderFields) {
        if (orderFields[i].selected) {
            checkedOrders.push(converter[orderFields[i].label]);
        }
    }
    orderBy = orderBy.checked; // if true = descending
    if (orderBy) {
        orderBy = "DOWN";
    } else {
        orderBy = "UP"
    }

    query["OPTIONS"] = {COLUMNS: checkedColumns, ORDER: {dir: orderBy,keys: checkedOrders}};

    //TRANSFORMATIONS
    query["TRANSFORMATIONS"] = {GROUP: checkedGroups, APPLY: []};

    console.log(query);
    return query;
};
