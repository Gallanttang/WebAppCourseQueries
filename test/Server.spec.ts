import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");
import chaiHttp = require("chai-http");
import Response = ChaiHttp.Response;
import {expect} from "chai";
import Log from "../src/Util";
import * as fs from "fs-extra";
import {InsightDataset, InsightDatasetKind} from "../src/controller/IInsightFacade";

// describe("Facade D3", function () {
//
//     let server: Server = null;
//     const cacheDir = __dirname + "/../data";
//     let datasets: { [id: string]: Buffer } = {};
//     const datasetsToLoad: { [id: string]: string } = {
//         courses: "./test/data/courses.zip",
//         rooms: "./test/data/rooms.zip",
//         invalid: "./test/data/invalid.zip",
//         invalid0: "./test/data/invalid0.json",
//         course: "./test/data/courses2.zip",
//         empty: "./test/data/empty.zip"
//     };
//
//     chai.use(chaiHttp);
//
//     before(function () {
//         server = new Server(4321);
//         try {
//             Log.trace("starting server");
//             server.start();
//         } catch (err) {
//             Log.error(err);
//         }
//         Log.test(`Before all`);
//         for (const id of Object.keys(datasetsToLoad)) {
//             datasets[id] = fs.readFileSync(datasetsToLoad[id]);
//         }
//     });
//
//     after(function () {
//         server.stop();
//     });
//
//     beforeEach(function () {
//         Log.test(`BeforeTest: ${this.currentTest.title}`);
//         try {
//             fs.removeSync(cacheDir);
//             fs.mkdirSync(cacheDir);
//         } catch (err) {
//             Log.error(err);
//         }
//     });
//
//     afterEach(function () {
//         Log.test(`After: ${this.test.parent.title}`);
//     });
//
//     it ("GET test for listing zero datasets", function () {
//         try {
//             return chai.request("http://localhost:4321")
//                 .get("/datasets")
//                 .then(function (res: Response) {
//                     Log.test(res.status);
//                     expect(res.status).to.be.equal(200);
//                     expect(res.body.result).to.deep.equals([]);
//                 })
//                 .catch(function (err) {
//                     Log.error(err);
//                     expect.fail(err);
//                 });
//         } catch (err) {
//             Log.error("could not return from chai request" + err);
//         }
//     });
//
//     // Sample on how to format PUT requests
//     // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
//     it("PUT test for valid c1 courses dataset", function () {
//         try {
//             return chai.request("http://localhost:4321")
//                 .put("/dataset/c1/courses")
//                 .send(datasets["courses"])
//                 .set("Content-Type", "application/x-zip-compressed")
//                 .then(function (res: Response) {
//                     // some logging here please!
//                     Log.test(res.status);
//                     expect(res.status).to.be.equal(200);
//                     expect(res.body).to.deep.equals({ result: ["c1"] });
//                 })
//                 .catch(function (err) {
//                     Log.error("error:" + err);
//                     expect.fail(err);
//                 });
//         } catch (err) {
//             Log.error("could not return from chai request" + err);
//         }
//     });
//
//     it ("GET test for listing one c1 dataset", function () {
//         const ds: InsightDataset = {id: "c1", kind: InsightDatasetKind.Courses, numRows: 64612};
//         let expected: InsightDataset[] = [ds];
//         try {
//             return chai.request("http://localhost:4321")
//                 .get("/datasets")
//                 .then(function (res: Response) {
//                     Log.test(res.status);
//                     expect(res.status).to.be.equal(200);
//                     expect(res.body.result).to.be.deep.equal(expected);
//                 })
//                 .catch(function (err) {
//                     Log.error(err);
//                     expect.fail(err);
//                 });
//         } catch (err) {
//             Log.error("could not return from chai request" + err);
//         }
//     });
//
//     it("PUT test for valid r1 rooms dataset", function () {
//         try {
//             return chai.request("http://localhost:4321")
//                 .put("/dataset/r1/rooms")
//                 .send(datasets["rooms"])
//                 .set("Content-Type", "application/x-zip-compressed")
//                 .then(function (res: Response) {
//                     Log.test(res.status);
//                     expect(res.status).to.be.equal(200);
//                 })
//                 .catch(function (err) {
//                     Log.error(err);
//                     expect.fail(err);
//                 });
//         } catch (err) {
//             Log.error("could not return from chai request" + err);
//         }
//     });
//
//     it("PUT test for invalid repeat r1 rooms dataset", function () {
//         try {
//             return chai.request("http://localhost:4321")
//                 .put("/dataset/r1/rooms")
//                 .send(datasets["rooms"])
//                 .set("Content-Type", "application/x-zip-compressed")
//                 .then(function (res: Response) {
//                     Log.test(res.status);
//                     expect.fail(res);
//                 })
//                 .catch(function (err) {
//                     Log.error("error:" + err);
//                     expect(err.status).to.be.equal(400);
//                 });
//         } catch (err) {
//             Log.error("could not return from chai request" + err);
//         }
//     });
//
//     it ("GET test for listing two datasets", function () {
//         const ds: InsightDataset = {id: "courses", kind: InsightDatasetKind.Courses, numRows: 64612};
//         let expected: InsightDataset[] = [ds];
//         try {
//             return chai.request("http://localhost:4321")
//                 .get("/datasets")
//                 .then(function (res: Response) {
//                     Log.test(res.status);
//                     expect(res.status).to.be.equal(200);
//                     expect(res.body.result.length).to.equal(2);
//                 })
//                 .catch(function (err) {
//                     Log.error(err);
//                     expect.fail(err);
//                 });
//         } catch (err) {
//             Log.error("could not return from chai request" + err);
//         }
//     });
//
//     // it("DELETE test for valid c1 courses dataset", function () {
//     //     try {
//     //         return chai.request("http://localhost:4321")
//     //             .del("/datasets/c1")
//     //             // .send(datasets["courses"])
//     //             // .set("Content-Type", "application/x-zip-compressed")
//     //             .then(function (res: Response) {
//     //                 Log.test(res.status);
//     //                 expect(res.status).to.be.equal(200);
//     //             })
//     //             .catch(function (err) {
//     //                 Log.error(err);
//     //                 expect.fail(err);
//     //             });
//     //     } catch (err) {
//     //         Log.error("could not return from chai request" + err);
//     //     }
//     // });
//
//     // it("DELETE test for valid r1 rooms dataset", function () {
//     //     try {
//     //         return chai.request("http://localhost:4321")
//     //             .del("/datasets/r1")
//     //             // .send(datasets["rooms"])
//     //             // .set("Content-Type", "application/x-zip-compressed")
//     //             .then(function (res: Response) {
//     //                 Log.test(res.status);
//     //                 expect(res.status).to.be.equal(200);
//     //             })
//     //             .catch(function (err) {
//     //                 Log.error("error:" + err);
//     //                 expect.fail(err);
//     //             });
//     //     } catch (err) {
//     //         Log.error("could not return from chai request" + err);
//     //     }
//     // });
//
//     it("DELETE test for invalid notfound courses c100 dataset", function () {
//         try {
//             return chai.request("http://localhost:4321")
//                 .del("/dataset/c100")
//                 // .send(datasets["courses"])
//                 // .set("Content-Type", "application/x-zip-compressed")
//                 .then(function (res: Response) {
//                     Log.test(res.status);
//                     expect.fail(res);
//                 })
//                 .catch(function (err) {
//                     Log.error(err.message);
//                     expect(err.status).to.be.equal(404);
//                 });
//         } catch (err) {
//             Log.error("could not return from chai request" + err.message);
//         }
//     });
//
//     // it("PUT test for invalid dataset", function () {
//     //     try {
//     //         return chai.request("http://localhost:4321")
//     //             .put("/dataset/invalid/courses")
//     //             .send(datasets["invalid"])
//     //             .set("Content-Type", "application/x-zip-compressed")
//     //             .then(function (res: Response) {
//     //                 Log.test(res.status);
//     //                 expect.fail(res);
//     //             })
//     //             .catch(function (err) {
//     //                 Log.error(err);
//     //                 expect(err.status).to.be.equal(400);
//     //             });
//     //     } catch (err) {
//     //         Log.error(err);
//     //     }
//     // });
//
//     // it("PUT test for invalid0 dataset", function () {
//     //     try {
//     //         return chai.request("http://localhost:4321")
//     //             .put("/dataset/invalid0/courses")
//     //             .send(datasets["invalid0"])
//     //             .set("Content-Type", "application/x-zip-compressed")
//     //             .then(function (res: Response) {
//     //                 Log.test(res.status);
//     //                 expect.fail(res);
//     //             })
//     //             .catch(function (err) {
//     //                 Log.error(err);
//     //                 expect(err.status).to.be.equal(400);
//     //             });
//     //     } catch (err) {
//     //         Log.error(err);
//     //     }
//     // });
//
//     // it("PUT test for invalid empty dataset", function () {
//     //     try {
//     //         return chai.request("http://localhost:4321")
//     //             .put("/dataset/c4/courses")
//     //             .send(datasets["empty"])
//     //             .set("Content-Type", "application/x-zip-compressed")
//     //             .then(function (res: Response) {
//     //                 Log.test(res.status);
//     //                 expect.fail(res);
//     //             })
//     //             .catch(function (err) {
//     //                 Log.error("error:" + err);
//     //                 expect(err.status).to.be.equal(400);
//     //             });
//     //     } catch (err) {
//     //         Log.error(err);
//     //     }
//     // });
//
//     // it("PUT test for invalid whitespace name dataset", function () {
//     //     try {
//     //         return chai.request("http://localhost:4321")
//     //             .put("/dataset/   /courses")
//     //             .send(datasets["courses"])
//     //             .set("Content-Type", "application/x-zip-compressed")
//     //             .then(function (res: Response) {
//     //                 Log.test(res.status);
//     //                 expect.fail(res);
//     //             })
//     //             .catch(function (err) {
//     //                 Log.error(err);
//     //                 expect(err.status).to.be.equal(400);
//     //             });
//     //     } catch (err) {
//     //         Log.error(err);
//     //     }
//     // });
//
//     // it("PUT test for invalid underscore name dataset", function () {
//     //     try {
//     //         return chai.request("http://localhost:4321")
//     //             .put("/dataset/courses_/courses")
//     //             .send(datasets["courses"])
//     //             .set("Content-Type", "application/x-zip-compressed")
//     //             .then(function (res: Response) {
//     //                 Log.test(res.status);
//     //                 expect.fail(res);
//     //             })
//     //             .catch(function (err) {
//     //                 Log.error(err);
//     //                 expect(err.status).to.be.equal(400);
//     //             });
//     //     } catch (err) {
//     //         Log.error(err);
//     //     }
//     // });
//
//     it("DELETE test for invalid whitespace name dataset", function () {
//         try {
//             return chai.request("http://localhost:4321")
//                 .del("/dataset/   ")
//                 .then(function (res: Response) {
//                     Log.test(res.status);
//                     expect.fail(res);
//                 })
//                 .catch(function (err) {
//                     Log.error(err.message);
//                     expect(err.status).to.be.equal(400);
//                 });
//         } catch (err) {
//             Log.error("could not return from chai request" + err);
//         }
//     });
//
//     // it("DELETE test for invalid underscore name dataset", function () {
//     //     try {
//     //         return chai.request("http://localhost:4321")
//     //             .del("/dataset/c1_")
//     //             // .send(datasets["courses"])
//     //             // .set("Content-Type", "application/x-zip-compressed")
//     //             .then(function (res: Response) {
//     //                 Log.test(res.status);
//     //                 expect.fail(res);
//     //             })
//     //             .catch(function (err) {
//     //                 Log.error(err);
//     //                 expect(err.status).to.be.equal(400);
//     //             });
//     //     } catch (err) {
//     //         Log.error("could not return from chai request" + err);
//     //     }
//     // });
//
//     it("PUT then DELETE test for valid rooms dataset", function () {
//         try {
//             return chai.request("http://localhost:4321")
//                 .put("/dataset/c4/courses")
//                 .send(datasets["courses"])
//                 .set("Content-Type", "application/x-zip-compressed")
//                 .then(function (res: Response) {
//                     Log.test(res.status);
//                     expect(res.status).to.be.equal(200);
//                     // expect(res.body).to.deep.equals({ result: ["c4"] });
//                     return chai.request("http://localhost:4321")
//                         .del("/dataset/c4")
//                         .then(function (res2: Response) {
//                             Log.test(res2.status);
//                             expect(res2.status).to.be.equal(200);
//                         })
//                         .catch(function (err) {
//                             Log.error(err);
//                             expect.fail(err);
//                         });
//                 })
//                 .catch(function (err) {
//                     Log.error("error:" + err);
//                     expect.fail(err);
//                 });
//         } catch (err) {
//             Log.error("could not return from chai request" + err);
//         }
//     });
// });
