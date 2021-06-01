"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");


/** Related functions for jobs. */

class Job {

    /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws BadRequestError if company already in database.
   * */
    static async create({ title, salary, equity, companyHandle }) {

        let job = await db.query(
            `insert into jobs
            (title, salary, equity, company_handle)
            values ($1,$2,$3,$4)
            returning 
            id, title, salary, equity, company_handle as "companyHandle"`,
            [title, salary, equity, companyHandle]
        )

        return job.rows[0]
    }

    /** Find all jobs.
    *
    * Returns [{ id, title, salary, equity, companyHandle }, ...]
    * */
    static async findAll( sortBy = 'title', ascending = true ) {

        if( ![
            "id", 
            "title", 
            "salary", 
            "equity", 
            "companyHandle"].includes(sortBy)
        ) {
            throw new BadRequestError( "Unknown sorting system" )
        }

        const sqlSearchLine = 
            `select 
                id, 
                title, 
                salary, 
                equity, 
                company_handle as "companyHandle"
            from jobs
            order by 
                ${ (sortBy == "companyHandle") ? "company_handle" : sortBy } 
                ${ ascending ? "asc" : "desc" }`
    
        let jobs = await db.query( sqlSearchLine )

        return jobs.rows

    }

    /** Given a job id, return data about job.
     *
     * Returns { id, title, salary, equity, companyHandle }
     *
     * Throws NotFoundError if not found.
     **/

    static async get(id) {

        const results = await db.query(
            `select 
                id, 
                title, 
                salary, 
                equity, 
                company_handle as "companyHandle"
            from jobs
            where id = $1`,
            [id]
        )

        const job = results.rows[0]

        if (!job) throw new NotFoundError(`No company: ${id}`)
        
        return job
    }
    
    // Search for a list of jobs where the given filters are met takes in an 
    // object with parameters.  Looks for title (will find case-insensitive, partial 
    // matches), minSalary, hasEquity 
    // Returns [{ id, title, salary, equity, companyHandle }, ...]

    static async find( { title, minSalary, hasEquity = 0, companyHandle } ) {

        let sqlComponents = []  // this is used to agregate all the SQL components
        let sqlInputs = [] // this is used to agregate all the inputs
        let i = 1

        if( title ) {
            sqlComponents.push( `lower(title) like lower($${ i++ })` )
            sqlInputs.push( '%' + title + '%' )
        }
        if( hasEquity ) {
            sqlComponents.push( `equity > 0` )
        }
        if( minSalary ) {
            sqlComponents.push( `salary >= $${ i++ }` )
            sqlInputs.push(minSalary)
        }
        if( companyHandle ) {
            sqlComponents.push( `company_handle = $${ i++ }` )
            sqlInputs.push(companyHandle)
        }

        const sqlSearchLine = 
            `select 
                id,
                title,
                salary,
                equity,
                company_handle as "companyHandle"
            from jobs
            where ${ sqlComponents.join(' and ') }`

        let jobs = await db.query( sqlSearchLine, sqlInputs )

        return jobs.rows
    }

     /** Update job data with `data`.
     *
     * This is a "partial update" --- it's fine if data doesn't contain all the
     * fields; this only changes provided ones.
     *
     * Data can include: { title, salary, equity, companyHandle }
     *
     * Returns { id, title, salary, equity, companyHandle }
     *
     * Throws NotFoundError if not found.
     */

    static async update(id, data) {
        
        const { setCols, values } = sqlForPartialUpdate(
            data,
            { companyHandle:"company_handle" }
        )

        const sqlSearchLine = 
            `update jobs
            set ${ setCols }
            where id = $${values.length + 1}
            returning
                id,
                title,
                equity,
                salary,
                company_handle as "companyHandle"`

        const result = await db.query(sqlSearchLine, [...values, id])

        const job = result.rows[0]

        if (!job) throw new NotFoundError(`No job: ${id}`)

        return job

    }

    /** Delete given job from database; returns undefined.
     *
     * Throws NotFoundError if company not found.
     **/

    static async remove(id) {
        const result = await db.query(
            `DELETE
             FROM jobs
             WHERE id = $1
             RETURNING id`,
            [id]
        );

        const job = result.rows[0];
    
        if (!job) throw new NotFoundError(`No job: ${id}`);
    }
}



module.exports = Job