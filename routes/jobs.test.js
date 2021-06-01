"use strict";

const request = require("supertest");

const db = require("../db.js");
const app = require("../app");
const Job = require("../models/job");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {

  test("works for user", async function() {
    const resp = 
              await request(app)
                      .post("/jobs")
                      .send({ 
                        title:"j44", 
                        salary:100, 
                        equity:0, 
                        companyHandle:'c1' 
                      })
                      .set("authorization", `Bearer ${u1Token}`)
      
    expect(resp.body).toEqual({
      job:{ 
        id:4,
        title:"j44", 
        salary:100, 
        equity:"0", 
        companyHandle:'c1' 
      }
    })
  })

  test("unauth for anon", async function () {
    const resp = 
              await request(app)
                      .post("/jobs")
                      .send({ 
                        title:"j44", 
                        salary:100, 
                        equity:0, 
                        companyHandle:'c1' 
                      })
    expect(resp.statusCode).toEqual(401);
  })
})

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("works", async function () {
    const resp = await request(app).get("/jobs")  
    expect(resp.statusCode).toEqual(200)  
    expect(resp.body.jobs.length).toEqual(3)
  })
})

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works", async function () {
    const resp = await request(app).get("/jobs/1")
    expect(resp.statusCode).toEqual(200)
    expect(resp.body).toEqual({
      job:{
        id:1,
        title:"j1",
        salary:1,
        equity:"0",
        companyHandle:"c1"      
      }
    })
  })
  test("error when looking for a job that doesn't exist", async function () {
    const resp = await request(app).get("/jobs/100")
    expect(resp.statusCode).toEqual(404)
  })
})

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works for admin", async function () {
    const resp = 
              await request(app)
                      .patch("/jobs/1")
                      .send({ salary:100 })
                      .set("authorization", `Bearer ${u1Token}`)
      
    expect(resp.body).toEqual({
      job:{
        id:1,
        title:"j1", 
        salary:100, 
        equity:"0", 
        companyHandle:'c1' 
      } 
    })    
  })
  test("unauth for anon", async function () {
    const resp = 
              await request(app)
                      .patch("/jobs/1")
                      .send({ salary:100 })
    expect(resp.statusCode).toEqual(401);
  })
  test("404 if job not found", async function () {
    const resp = 
              await request(app)
                      .patch("/jobs/100")
                      .send({ salary:100 })
                      .set("authorization", `Bearer ${u1Token}`)
    expect(resp.statusCode).toEqual(404)
  })
})

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admin", async function () {
    const resp = 
              await request(app)
                      .delete("/jobs/1")
                      .set("authorization", `Bearer ${u1Token}`)
      
    expect(resp.body).toEqual({ deleted:"1" })    
  })
  test("unauth for anon", async function () {
    const resp = 
              await request(app)
                      .delete("/jobs/1")
    expect(resp.statusCode).toEqual(401);
  })
  test("404 if job not found", async function () {
    const resp = 
              await request(app)
                      .delete("/jobs/100")
                      .set("authorization", `Bearer ${u1Token}`)
    expect(resp.statusCode).toEqual(404)
  })
})

