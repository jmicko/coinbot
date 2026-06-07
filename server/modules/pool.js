// const pg = require('pg');
import pg from 'pg';
// const url = require('url');
import url from 'url';
import { recordDbQueryResult, trackDbQuery } from './dbMetrics.js';


let config = {};

if (process.env.DATABASE_URL) {
  // Heroku gives a url, not a connection object
  // https://github.com/brianc/node-pg-pool
  const params = url.parse(process.env.DATABASE_URL);
  const auth = params.auth.split(':');

  config = {
    user: auth[0],
    password: auth[1],
    host: params.hostname,
    port: params.port,
    database: params.pathname.split('/')[1],
    ssl: { rejectUnauthorized: false },
    max: 10, // max number of clients in the pool
    idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  };
} else {
  // alert if no env variables are set
  if (!process.env.PGHOST || !process.env.PGUSER || !process.env.PGPASSWORD || !process.env.PGPORT || !process.env.PGDATABASE) {
    console.log('No environment variables set for database connection. Using defaults, this may not work.');
  }
  config = {
    // will refer to defaults if no env variables are set
    host: process.env.PGHOST || 'localhost', // Server hosting the postgres database. Assuming locally hosted database if none specified.
    // next 2 lines can be removed if hosting as a user with access to postgres. Otherwise set up 
    // in .env file
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    port: process.env.PGPORT || 5432, // env var: PGPORT
    database: process.env.PGDATABASE || 'coinbot', // env var: PGDATABASE
    max: 10, // max number of clients in the pool
    idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  };
}

// this creates the pool that will be shared by all other modules
const pool = new pg.Pool(config);
const rawPoolConnect = pool.connect.bind(pool);

function isCallback(value) {
  return typeof value === 'function';
}

function trackDbQueryWithCallback(query, callback) {
  const start = performance.now();
  return (err, result) => {
    recordDbQueryResult(query, performance.now() - start, Boolean(err), result);
    callback(err, result);
  };
}

function wrapClient(client) {
  if (!client || client.__coinbotDbMetricsWrapped) {
    return client;
  }

  const rawClientQuery = client.query.bind(client);
  client.query = (...queryArgs) => {
    const callback = queryArgs.find(isCallback);
    if (callback) {
      const callbackIndex = queryArgs.indexOf(callback);
      const instrumentedArgs = [...queryArgs];
      instrumentedArgs[callbackIndex] = trackDbQueryWithCallback(queryArgs[0], callback);
      return rawClientQuery(...instrumentedArgs);
    }

    return trackDbQuery(queryArgs[0], () => rawClientQuery(...queryArgs));
  };

  Object.defineProperty(client, '__coinbotDbMetricsWrapped', {
    value: true,
    enumerable: false,
  });

  return client;
}

pool.connect = (...args) => {
  const callback = args.find(isCallback);
  if (callback) {
    return rawPoolConnect((err, client, done) => {
      callback(err, wrapClient(client), done);
    });
  }

  return rawPoolConnect(...args).then(wrapClient);
};

// the pool with emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err) => {
  console.log('Unexpected error on idle client', err);
  // process.exit(-1);
});

export { pool };
