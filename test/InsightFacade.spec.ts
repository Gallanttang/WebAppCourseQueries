import {expect} from "chai";
import * as fs from "fs-extra";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";
import Scheduler from "../src/scheduler/Scheduler";
import {IScheduler} from "../src/scheduler/IScheduler";
// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string;  // This is injected when reading the file
}

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */

describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any data sets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    // noinspection DuplicatedCode
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        rooms: "./test/data/rooms.zip",
        invalid: "./test/data/invalid.zip",
        invalid0: "./test/data/invalid0.json",
        course: "./test/data/courses2.zip",
        empty: "./test/data/empty.zip"
    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in
        // the datasets to load object into the datasets object
        Log.test(`Before all`);
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
    });

    beforeEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs before each test, which should make each test independent from the previous one
        Log.test(`BeforeTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // This is a unit test. You should create more like this!
    it("Should add a valid course dataset", async () => {
        const id: string = "courses";
        const id0: string = "courses0";
        const expected: string[] = [id];
        const expected0: string[] = [id, id0];
        let result: string[];
        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            expect(result).to.deep.equal(expected);
            result = await insightFacade.addDataset(id0, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            expect.fail(err, expected, "failed to add valid course dataset");
        } finally {
            expect(result).to.deep.equal(expected0);
        }
    });

    it("Should add a valid rooms dataset", async () => {
        const id: string = "rooms";
        const expected: string[] = [id];
        let result: string[];
        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            expect.fail(err, expected, "failed to add valid rooms dataset");
        } finally {
            expect(result).to.deep.equal(expected);
        }
    });

    it("Should be impossible to add an existing valid courses dataset", async () => {
        const id: string = "courses";
        let result: string[];
        let result0: string[];
        const expected: string[] = [id];
        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            expect.fail(err, expected, "failed to add valid course dataset");
        } finally {
            expect(result).to.deep.equal(expected);
            try {
                result0 = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            } catch (err) {
                expect(err).to.be.instanceOf(InsightError);
            }
        }
    });

    it("Should be impossible to add an existing valid rooms dataset", async () => {
        const id: string = "rooms";
        let result: string[];
        let result0: string[];
        const expected: string[] = [id];
        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            expect.fail(err, expected, "failed to add valid rooms dataset");
        } finally {
            expect(result).to.deep.equal(expected);
            try {
                result0 = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
            } catch (err) {
                expect(err).to.be.instanceOf(InsightError);
            }
        }
    });

    it("Should be impossible to add a non-existent dataset", async () => {
        const id: string = "dne";
        const expected: string[] = [];
        insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result) => {
            expect.fail(result, InsightError, "Managed to add a non-existing dataset");
        }).catch((err) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should be impossible to add a dataset with only whitespace", async () => {
        const id: string = "   ";
        const expected: string[] = [];
        insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result) => {
            expect.fail(result, InsightError, "Managed to add a dataset that is just whitespace");
        }).catch((err) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should be impossible to add a json", async () => {
        const id: string = "invalid0";
        const expected: string[] = [];
        insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result) => {
            expect.fail(result, InsightError, "Managed to add a dataset that is a json, not a zip");
        }).catch((err) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should be impossible to add an invalid dataset", async () => {
        const id: string = "invalid";
        const expected: string[] = [];
        insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result) => {
            expect.fail(result, InsightError, "Managed to add a dataset that is invalid");
        }).catch((err) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should be impossible to add an empty dataset", async () => {
        const id: string = "empty";
        const expected: string[] = [];
        insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result) => {
            expect.fail(result, InsightError, "Managed to add a dataset that is empty");
        }).catch((err) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should be impossible to add dataset with underscore", async () => {
        const id: string = "courses_";
        const expected: string[] = [];
        insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result) => {
            expect.fail(result, InsightError, "Managed to add a dataset with underscore in name");
        }).catch((err) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should remove a valid, existing courses dataset", async () => {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then(async (returned) => {
            expect(returned).to.be.deep.equal(expected);
            return insightFacade.removeDataset(id);
        }).then(async (result) => {
            expect(result).to.deep.equal(id);
        }).catch((err) => {
            expect.fail(err, id, err);
        });
    });

    it("Should remove a valid, existing rooms dataset", async () => {
        const id: string = "rooms";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then(async (returned) => {
            expect(returned).to.be.deep.equal(expected);
            return insightFacade.removeDataset(id);
        }).then(async (result) => {
            expect(result).to.deep.equal(id);
        }).catch((err) => {
            expect.fail(err, id, err);
        });
    });

    it("Should be impossible to remove a non-existing dataset", async () => {
        const id: string = "dne";
        let result: string;
        try {
            result = await insightFacade.removeDataset(id);
        } catch (err) {
            expect(err).to.be.instanceOf(NotFoundError);
        }
    });

    it("Should be impossible to remove a dataset with invalid input", async () => {
        const id: string = "  ";
        let result: string;
        try {
            result = await insightFacade.removeDataset(id);
        } catch (err) {
            expect(err).to.be.instanceOf(InsightError);
        }
    });
});

describe("InsightFacade listDataset", () => {
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        rooms: "./test/data/rooms.zip"
    };
    let insightFacade: InsightFacade;
    let datasets: { [id: string]: string } = {};
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in
        // the datasets to load object into the datasets object
        Log.test(`Before all`);
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
    });

    beforeEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs before each test, which should make each test independent from the previous one
        Log.test(`BeforeTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    it("Should list a valid dataset", async () => {
        const id: string = "courses";
        const expected: string[] = [id];
        const ds: InsightDataset = {id: "courses", kind: InsightDatasetKind.Courses, numRows: 64612};
        let expected0: InsightDataset[] = [ds];
        let result: InsightDataset[];
        let result0: string[];
        try {
            result0 = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            expect.fail(err, expected0, "Could not add dataset for listing");
        } finally {
            expect(result0).to.be.deep.equal(expected);
            try {
                result = await insightFacade.listDatasets();
            } catch (err) {
                expect.fail(err, expected0, "Could not list dataset");
            } finally {
                expect(result).to.be.deep.equal(expected0);
            }
        }
    });

    it("Should not list an non-existent dataset", async () => {
        const id: string = "dne";
        let expected0: InsightDataset[] = [];
        let result0: InsightDataset[];
        try {
            result0 = await insightFacade.listDatasets();
        } catch (err) {
            expect.fail();
        } finally {
            expect(result0).to.deep.equal(expected0);
        }
    });

    it("should add a valid rooms dataset", async () => {
        const id: string = "rooms";
        const expected: string[] = [id];
        let result: string[];
        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            expect.fail(err, expected, "failed to add valid course dataset");
        } finally {
            expect(result).to.deep.equal(expected);
        }
    });
});

describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: any } = {
        courses: {id: "courses", path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
        rooms: {id: "rooms", path: "./test/data/rooms.zip", kind: InsightDatasetKind.Rooms}
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries("test/queries");
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        insightFacade = new InsightFacade();
        for (const key of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[key];
            const data = fs.readFileSync(ds["path"]).toString("base64");
            loadDatasetPromises.push(insightFacade.addDataset(ds.id, data, ds.kind));
        }
        return Promise.all(loadDatasetPromises).catch((err) => {
            /* *IMPORTANT NOTE: This catch is to let this run even without the implemented addDataset,
             * for the purposes of seeing all your tests run.
             * For D1, remove this catch block (but keep the Promise.all)
             */
            return Promise.resolve("HACK TO LET QUERIES RUN");
        });
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function (done) {
                    insightFacade.performQuery(test.query).then((result) => {
                        TestUtil.checkQueryResult(test, result, done);
                    }).catch((err) => {
                        TestUtil.checkQueryResult(test, err, done);
                    });
                });
            }
        });
    });
});

describe("InsightFacade Schedule", function () {
    // This is a unit test. You should create more like this!
    let testQueries: any[] = [];
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries("test/scheduleTests");
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }
    });
    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    it("Should schedule test queries", function () {
        describe("Dynamic InsightFacade schedule tests", function () {
            for (const test of testQueries) {
                let sections = test.section;
                Log.trace(sections.length);
                let rooms = test.room;
                let scheduler: Scheduler = new Scheduler();
                let rt: any[] = [];
                rt = scheduler.schedule(sections, rooms);
                Log.trace(rt.length);
            }
        });
    });
});
