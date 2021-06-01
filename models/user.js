"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");
const { sqlForPartialUpdate } = require("../helpers/sql");
const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ExpressError
} = require("../expressError");

const { BCRYPT_WORK_FACTOR } = require("../config.js");

/** Related functions for users. */

class User {
  /** authenticate user with username, password.
   *
   * Returns { username, first_name, last_name, email, is_admin }
   *
   * Throws UnauthorizedError is user not found or wrong password.
   **/

  static async authenticate(username, password) {
    // try to find the user first
    const result = await db.query(
          `SELECT username,
                  password,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
        [username],
    );

    const user = result.rows[0];

    if (user) {
      // compare hashed password to a new hash from password
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid === true) {
        delete user.password;
        return user;
      }
    }

    throw new UnauthorizedError("Invalid username/password");
  }

  /** Register user with data.
   *
   * Returns { username, firstName, lastName, email, isAdmin }
   *
   * Throws BadRequestError on duplicates.
   **/

  static async register(
      { username, password, firstName, lastName, email, isAdmin }) {
    const duplicateCheck = await db.query(
          `SELECT username
           FROM users
           WHERE username = $1`,
        [username],
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(`Duplicate username: ${username}`);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const result = await db.query(
          `INSERT INTO users
           (username,
            password,
            first_name,
            last_name,
            email,
            is_admin)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING username, first_name AS "firstName", last_name AS "lastName", email, is_admin AS "isAdmin"`,
        [
          username,
          hashedPassword,
          firstName,
          lastName,
          email,
          isAdmin,
        ],
    );

    const user = result.rows[0];

    return user;
  }

  /** Find all users.
   *
   * Returns [{ username, firstName, lastName, email, isAdmin, jobs }, ...]
   * where jobs is [jobId, ...]
   **/

  static async findAll() {
    const results = await db.query(
          `SELECT u.username,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin",
                  job_id AS "job"
           FROM users u
           LEFT JOIN applications a
           ON a.username = u.username
           ORDER BY username`
    );

    return results.rows.reduceRight((rows, row ) => {
      if( rows && rows[0] != row.username ) {
        rows.unshift( {
          username:row.username, 
          firstName:row.firstName, 
          lastName:row.lastName, 
          email:row.email, 
          isAdmin:row.isAdmin, 
          // jobs:[row.job]
        } )
      }
      else{
        rows[0].jobs.unshift( row.job )
      }
      return rows
    },[]);
  }

  /** Given a username, return data about user.
   *
   * Returns { username, firstName, lastName, isAdmin, jobs }
   *   where jobs is [ jobId , ..A
   *
   * Throws NotFoundError if user not found.
   **/

  static async get(username) {
    const userRes = await db.query(
          `SELECT u.username,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin",
                  job_id AS "jobId"
          FROM users u
          LEFT JOIN applications a
          ON a.username = u.username
          WHERE u.username = $1`,
        [username],
    );

    if (!userRes.rowCount) {
      throw new NotFoundError(`No user: ${username}`);
    }
    
    const user = userRes.rows[0];

    return {
      username:user.username,
      firstName:user.firstName,
      lastName:user.lastName,
      email:user.email,
      isAdmin:user.isAdmin,
      // jobs:userRes.rows.map( row => row.jobId )
    };
  }

  // Given a username and a jobId, applies user to a job
  // returns the username and jobId if successful, or throws 
  // an error if not

  static async apply( username, jobId ) {

    let usersAndJobs = await db.query(
      `select u.username, j.id 
      from applications a
      full outer join jobs j on a.job_id = j.id
      full outer join users u on u.username = a.username
      where 
        u.username = $1
        or
        j.id = $2`,
      [ username, jobId]
    )

    const userExists = usersAndJobs.rows.find( line =>{
      return ( line.username == username ) 
    })
    const jobExists = usersAndJobs.rows.find( line =>{
      return ( line.id == jobId )
    })
    const appliedAlready = usersAndJobs.rows.find( line =>{
      return (line.username == username) && (line.id == jobId)
    })

    if( !userExists ) throw new NotFoundError(`user: ${username} not found`)
    if( !jobExists ) throw new NotFoundError(`job ID: ${jobId} not found`)

    console.log(appliedAlready)
    if( !!appliedAlready ) {
      throw new ExpressError(
        `${username} has already applied to job:${jobId}`, 
        409
      )
    }

    let confirmation = await db.query(
      `insert into applications
        ( username, job_id )
      values ( $1, $2 )
      returning username, job_id as "jobId"`,
      [ username, jobId ]
    )

    console.log( confirmation.rows )

    return confirmation.rows[0]

  }

  /** Update user data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain
   * all the fields; this only changes provided ones.
   *
   * Data can include:
   *   { firstName, lastName, password, email, isAdmin }
   *
   * Returns { username, firstName, lastName, email, isAdmin }
   *
   * Throws NotFoundError if not found.
   *
   * WARNING: this function can set a new password or make a user an admin.
   * Callers of this function must be certain they have validated inputs to this
   * or a serious security risks are opened.
   */

  static async update(username, data) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
    }

    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          firstName: "first_name",
          lastName: "last_name",
          isAdmin: "is_admin",
        });
    const usernameVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE users 
                      SET ${setCols} 
                      WHERE username = ${usernameVarIdx} 
                      RETURNING username,
                                first_name AS "firstName",
                                last_name AS "lastName",
                                email,
                                is_admin AS "isAdmin"`;
    const result = await db.query(querySql, [...values, username]);
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);

    delete user.password;
    return user;
  }

  /** Delete given user from database; returns undefined. */

  static async remove(username) {
    let result = await db.query(
          `DELETE
           FROM users
           WHERE username = $1
           RETURNING username`,
        [username],
    );
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);
  }
}


module.exports = User;
