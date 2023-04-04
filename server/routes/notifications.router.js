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
import { databaseClient } from '../modules/databaseClient.js';
import { userStorage, messenger } from '../modules/cache.js';
import { devLog } from '../modules/utilities.js';
import { instantSchedule } from '../modules/push.js';
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
router.post('/subscribe', rejectUnauthenticated, async (req, res) => {
  devLog('POST SUBSCRIBE ROUTE====================');
  const subscription = req.body.subscription;
  const notificationSettings = req.body.notificationSettings;




  const user_id = req.user.id;
  devLog('subscription', subscription);
  devLog('user_id', user_id);
  try {
    const result = await databaseClient.addSubscription({ subscription, notificationSettings, user_id });
    devLog(result.rows, 'result');
    const newSub = result.rows[0];


    // get timeouts from userStorage for this subscription and clear them
    const timeouts = userStorage[user_id].getTimeoutForSub(subscription);
    console.log('timeouts', timeouts);
    timeouts?.forEach(timeout => {
      console.log('clearing timeout', timeout);
      clearTimeout(timeout.timeout);
    });

    instantSchedule(newSub, user_id)


    res.sendStatus(200);
  } catch (err) {
    devLog('error adding subscription', err);
    res.sendStatus(500);
  }
  // res.sendStatus(200);
  devLog(notificationSettings, 'notificationSettings');

  if (notificationSettings.dailyNotifications) {
    // convert notificationSettings.dailyNotificationsTime to am/pm format in users timezone
    // dailyNotificationsTime is a utc date string
    // notificationSettings.timezone is the users timezone
    const time = new Date(notificationSettings.dailyNotificationsTime);
    const userTime = time.toLocaleTimeString('en-US', {
      timeZone: notificationSettings.timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
    devLog(userTime, 'userTime');


    // send a test notification to the user
    setTimeout(async () => {
      devLog('sending test notification');
      await webPush.sendNotification(subscription, JSON.stringify({
        type: 'update',
        title: 'Confirmation',
        body: `Daily notifications will be sent at ${userTime}`,
      }));
    }, 1000);
  }

});



export default router;
