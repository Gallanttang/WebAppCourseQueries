/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = function (query) {
    return new Promise(function (fulfill, reject) {
        try {
            let xhr = new XMLHttpRequest();
            let URL = "http://localhost:4321/";
            xhr.open("POST", URL, true);
            xhr.setRequestHeader("content-type", "application/json");
            xhr.addEventListener("load", () => {
                let response = xhr.responseText;
                console.log("...");
                console.log(response);
            });
            xhr.addEventListener("error", () => {
                console.log("some kind of error");
            });
            xhr.send(JSON.stringify(query));
        } catch {
            return reject("Ajax request unsuccessful");
        }
    });
};
