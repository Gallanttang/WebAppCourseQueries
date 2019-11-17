/**
 * Created by rtholmes on 2016-06-19.
 */

import fs = require("fs");
import restify = require("restify");
import Log from "../Util";
import InsightFacade from "../controller/InsightFacade";
import {InsightError, NotFoundError} from "../controller/IInsightFacade";

/**
 * This configures the REST endpoints for the server.
 */
export default class Server {

    private port: number;
    private rest: restify.Server;
    private static insightFacade: any;

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        const that = this;
        return new Promise(function (fulfill, reject) {
            try {
                Log.info("Server::start() - start");
                Server.insightFacade = new InsightFacade();
                that.rest = restify.createServer({
                    name: "insightUBC",
                });
                that.rest.use(restify.bodyParser({mapFiles: true, mapParams: true}));
                that.rest.use(
                    function crossOrigin(req, res, next) {
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        return next();
                    });

                // This is an example endpoint that you can invoke by accessing this URL in your browser:
                // http://localhost:4321/echo/hello
                that.rest.get("/echo/:msg", Server.echo);
                that.rest.put("/dataset/:id/:kind", Server.put);
                that.rest.del("/dataset/:id/", Server.delete);
                that.rest.post("/query", Server.post);
                that.rest.get("/datasets", Server.get);
                // This must be the last endpoint!
                that.rest.get("/.*", Server.getStatic);
                that.rest.listen(that.port, function () {
                    Log.info("Server::start() - restify listening: " + that.rest.url);
                    fulfill(true);
                });

                that.rest.on("error", function (err: string) {
                    // catches errors in restify start; unusual syntax due to internal
                    // node not using normal exceptions here
                    Log.info("Server::start() - restify ERROR: " + err);
                    reject(err);
                });

            } catch (err) {
                Log.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }

    /**
     * Sends a zip file as a 'raw' buffer to the server, to be parsed and used for future queries
     * response code 200 when InsightFacade.addDataset() resolves
     * response code 400 when InsightFacade.addDataset() rejects
     */
    public static put(req: restify.Request, res: restify.Response, next: restify.Next): Promise<any> {
        try {
            let encodedData = req.body.toString("base64");
            Server.insightFacade.addDataset(req.params.id, encodedData, req.params.kind).then(function (response: any) {
                    res.json(200, {result: response});
                    Log.info("Server::addDataset - responding 200");
                    return next();
                }).catch((err: any) => {
                res.json(400, {error: err.message});
                Log.error("Server::addDataset - responding 400");
                return next();
            });
        } catch (err) {
            Log.error("Server::addDataset - UNEXPECTED ERROR responding 400 " + err.message);
            res.json(400, {error: err.message});
            return next();
        }
    }

    /**
     * Calls server to delete (both disk and memory) for the dataset with the input id
     * code 200 when InsightFacade.removeDataset() resolves
     * code 400 when InsightFacade.removeDataset() rejects with InsightError
     * code 404 when InsightFacade.removeDataset() rejects with NotFoundError
     */
    public static delete(req: restify.Request, res: restify.Response, next: restify.Next): Promise<any> {
        try {
            Server.insightFacade.removeDataset(req.params.id)
                .then(function (response: any) {
                    Log.info("Server::deleteDataset - responding 200");
                    res.json(200, {result: response});
                    return next();
                }).catch(function (err: any) {
                if (err instanceof InsightError) {
                    Log.info("Server::removeDataset - responding 400");
                    res.json(400, {error: err.message});
                } else if (err instanceof NotFoundError) {
                    Log.info("Server::removeDataset - responding 404");
                    res.json(404, {error: err.message});
                } else { // some other error
                    Log.info("Server::removeDataset UNEXPECTED ERROR - responding 400" + err.message);
                    res.json(400, {error: err.message});
                }
                return next();
            });
        } catch (err) {
            Log.info("Server::removeDataset UNEXPECTED ERROR - responding 400" + err.message);
            res.json(400, {error: err.message});
            return next();
        }
    }

    /**
     * Sends the query, in JSON format, to the application
     * resolves with code 200 when InsightFacade.performQuery() resolves
     * rejects with code 400 when InsightFacade.performQuery() rejects
     */
    public static post(req: restify.Request, res: restify.Response, next: restify.Next): Promise<any> {
        try {
            Server.insightFacade.performQuery(req.body).then(function (response: any) {
                    Log.info("Server::performQuery - responding 200");
                    res.json(200, {result: response});
                    return next();
                }).catch((err: any) => {
                Log.error("Server::performQuery - responding 400");
                res.json(400, {error: err.message});
                return next();
            });
        } catch (err) {
            Log.error("Server::performQuery - UNEXPECTED ERROR responding 400" + err.message);
            res.json(400, {error: err.message});
            return next();
        }
    }

    /**
     * Returns a list of datasets that were added
     * code 200 when InsightFacade.listDatasets() resolves
     */
    public static get(req: restify.Request, res: restify.Response, next: restify.Next): Promise<any> {
        try {
            Server.insightFacade.listDatasets().then( function (response: any) {
                    Log.info("Server::listDataset - responding 200");
                    res.json(200, {result: response});
                    return next();
                }).catch((err: any) => {
                // this should never happen because listDatasets should always resolve
                Log.error("Server::listDataset - ERROR responding 200: " + err.message);
                res.json(200, {result: err.message});
                return next();
            });
        } catch (err) {
            Log.error("Server::listDataset - ERROR responding 200: " + err.message);
            res.json(200, {result: err.message});
            return next();
        }
    }

    // __________________Example Echo Code_______________________________________________________________________
    // The next two methods handle the echo service.
    // These are almost certainly not the best place to put these, but are here for your reference.
    // By updating the Server.echo function pointer above, these methods can be easily moved.
    private static echo(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::echo(..) - params: " + JSON.stringify(req.params));
        try {
            const response = Server.performEcho(req.params.msg);
            Log.info("Server::echo(..) - responding " + 200);
            res.json(200, {result: response});
        } catch (err) {
            Log.error("Server::echo(..) - responding 400");
            res.json(400, {error: err});
        }
        return next();
    }

    private static performEcho(msg: string): string {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        } else {
            return "Message not provided";
        }
    }

    private static getStatic(req: restify.Request, res: restify.Response, next: restify.Next) {
        const publicDir = "frontend/public/";
        Log.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err: Error, file: Buffer) {
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }

}
