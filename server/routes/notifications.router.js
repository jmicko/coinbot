// const express = require('express');
import express from 'express';
// const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
import { rejectUnauthenticated, } from '../modules/authentication-middleware.js';
// const { userCount } = require('../modules/userCount-middleware');
import { userCount } from '../modules/userCount-middleware.js';
// const encryptLib = require('../modules/encryption');
import encryptLib from '../modules/encryption.js';
// const pool = require('../modules/pool');
import { pool } from '../modules/pool.js';
// const userStrategy = require('../strategies/user.strategy');
import userStrategy from '../strategies/user.strategy.js';
// const robot = require('../modules/robot');
import { robot } from '../modules/robot.js';
// const databaseClient = require('../modules/databaseClient');
import { databaseClient } from '../modules/databaseClient.js';
// const { cache, userStorage, messenger } = require('../modules/cache');
import { cache, userStorage, messenger } from '../modules/cache.js';
import { devLog } from '../modules/utilities.js';
// import the web-push library
import webPush from 'web-push';

const router = express.Router();

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.DOMAIN_NAME) {
  console.log(
    "You must set the VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY " +
    "environment variables. You can use the following ones:"
  );
  console.log(webPush.generateVAPIDKeys());
  // return;
} else {
  devLog('VAPID keys are set');
  webPush.setVapidDetails(
    process.env.DOMAIN_NAME,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// route to get the public key from the server
router.get('/public-key', async (req, res) => {
  devLog('get public key route====================', process.env.VAPID_PUBLIC_KEY);
  res.send(process.env.VAPID_PUBLIC_KEY);
});

// route to store the subscription on the server
router.post('/subscribe', async (req, res) => {
  devLog('POST SUBSCRIBE ROUTE====================');
  const subscription = req.body;
  const user_id = req.user.id;
  devLog('subscription', subscription);
  devLog('user_id', user_id);
  // try {
  //   const result = await databaseClient.addSubscription(subscription, user_id);
  //   devLog('result', result);
  //   res.sendStatus(200);
  // } catch (err) {
  //   devLog('error adding subscription', err);
  //   res.sendStatus(500);
  // }
  res.sendStatus(200);

  // // after 5 seconds, send a test notification to the user
  // setInterval(async () => {
  //   devLog('sending test notification');
  //   await webPush.sendNotification(subscription, JSON.stringify({
  //     title: 'Test Notification',
  //     body: 'This is a test notification and should not show',
  //   }));


  // }, 5000);

});



export default router;
