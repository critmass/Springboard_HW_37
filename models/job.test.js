"use strict";

const {
  NotFoundError,
} = require("../expressError");
const db = require("../db.js");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
    const job = {
        title:"new", 
        salary:1, 
        equity:"0", 
        companyHandle:"c1"
    }
    test("works", async function () {
        const newJob = await Job.create(job)
        

        expect(newJob).toEqual({
            ...job,
            id:7
        })
        const found = await db.query(`
            SELECT * 
            FROM jobs 
            WHERE title = $1
        `,[job.title]);
        expect(found.rows.length).toEqual(1);
    })
})

/************************************** findAll */

describe("findAll", function () {
    test("works", async function () {
        let allJobs = await Job.findAll()
        expect(allJobs.length).toEqual(6)
        expect(allJobs).toEqual([
            {
                title:'j11',
                salary:11,
                equity:"0",
                id:1,
                companyHandle:'c1'
            },
            {
                title:'j12',
                salary:12,
                equity:"0",
                id:3,
                companyHandle:'c2'
            },
            {
                title:'j13',
                salary:13,
                equity:"0",
                id:5,
                companyHandle:'c3'
            },
            {
                title:'j21',
                salary:21,
                equity:"0",
                id:2,
                companyHandle:'c1'
            },
            {
                title:'j22',
                salary:22,
                equity:"0",
                id:4,
                companyHandle:'c2'
            },
            {
                title:'j23',
                salary:23,
                equity:"0",
                id:6,
                companyHandle:'c3'
            },
        ])
    })
})

/************************************** get */

describe("get", function () {
    test("works", async function () {
        const job = await Job.get(6)
        expect(job).toEqual({
            title:'j23',
            salary:23,
            equity:"0",
            id:6,
            companyHandle:'c3'
        })
    })
    test("not found if no such job", async function () {
        try {
            await Job.get(7);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    })
})

/************************************** find */

describe("find", function () {
    test("works: title contains j", async function () {
        let jobs = await Job.find({title:'j'})
        expect(jobs.length).toEqual(6)
        expect(jobs).toEqual([
            {
                title:'j11',
                salary:11,
                equity:"0",
                id:1,
                companyHandle:'c1'
            },
            {
                title:'j21',
                salary:21,
                equity:"0",
                id:2,
                companyHandle:'c1'
            },
            {
                title:'j12',
                salary:12,
                equity:"0",
                id:3,
                companyHandle:'c2'
            },
            {
                title:'j22',
                salary:22,
                equity:"0",
                id:4,
                companyHandle:'c2'
            },
            {
                title:'j13',
                salary:13,
                equity:"0",
                id:5,
                companyHandle:'c3'
            },
            {
                title:'j23',
                salary:23,
                equity:"0",
                id:6,
                companyHandle:'c3'
            },
        ])
    })
    test("works: title contains 1", async function () {
        let jobs = await Job.find({title:'1'})
        expect(jobs.length).toEqual(4)
        expect(jobs).toEqual([
            {
                title:'j11',
                salary:11,
                equity:"0",
                id:1,
                companyHandle:'c1'
            },
            {
                title:'j21',
                salary:21,
                equity:"0",
                id:2,
                companyHandle:'c1'
            },
            {
                title:'j12',
                salary:12,
                equity:"0",
                id:3,
                companyHandle:'c2'
            },
            {
                title:'j13',
                salary:13,
                equity:"0",
                id:5,
                companyHandle:'c3'
            },
        ])
    })
    test("works: company handle is c1", async function () {
        let jobs = await Job.find({companyHandle:"c1"})
        expect(jobs.length).toEqual(2)
        expect(jobs).toEqual([
            {
                title:'j11',
                salary:11,
                equity:"0",
                id:1,
                companyHandle:'c1'
            },
            {
                title:'j21',
                salary:21,
                equity:"0",
                id:2,
                companyHandle:'c1'
            },
        ])
    })
    test("works: minimum salary is 20", async function () {
        let jobs = await Job.find({minSalary:20})
        expect(jobs.length).toEqual(3)
        expect(jobs).toEqual([
            {
                title:'j21',
                salary:21,
                equity:"0",
                id:2,
                companyHandle:'c1'
            },
            {
                title:'j22',
                salary:22,
                equity:"0",
                id:4,
                companyHandle:'c2'
            },
            {
                title:'j23',
                salary:23,
                equity:"0",
                id:6,
                companyHandle:'c3'
            },
        ])
    })
})

/************************************** update */

describe("update", function () {
    test("works", async function () {
        let updatedJob = await Job.update(1, {salary:50})
        expect(updatedJob).toEqual({
            title:'j11',
            salary:50,
            equity:"0",
            id:1,
            companyHandle:'c1'
        })
    })
    test("not found if no such job", async function () {
        try {
            await Job.update(7, {salary:50});
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    })
})

/************************************** remove */

describe("remove", function () {
    test("works", async function () {
        await Job.remove(1);
        const res = await db.query(
            "SELECT * FROM jobs WHERE id=1");
        expect(res.rows.length).toEqual(0);
      });
    test("not found if no such job", async function () {
        try {
            await Job.remove(7);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    })
})