import { databaseClient } from '../modules/databaseClient.js';
import webPush from 'web-push';
import { devLog } from './utilities.js';

// every hour on the hour, send push notifications to all users

resetAtMidnight();

// https://stackoverflow.com/questions/26306090/running-a-function-everyday-midnight
// using this bit of code instead of cron job package
function resetAtMidnight() {
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // the next day, ...
    0, 0, 0 // ...at 00:00:00 hours
  );
  const msToMidnight = night.getTime() - now.getTime();

  devLog('msToMidnight', msToMidnight);

  setTimeout(function () {
    runScheduled(); // <-- This is the function being called at midnight.
    resetAtMidnight(); // Then, reset again next midnight.
    }, msToMidnight);
  // }, 5000);
}

async function runScheduled() {
  devLog('running scheduled push notifications');
  // get all subscriptions
  const subscriptions = await databaseClient.getAllSubscriptions();
  // send push notifications to each subscription
  for (let i = 0; i < subscriptions.length; i++) {
    const subscription = subscriptions[i];
    await webPush.sendNotification(subscription, JSON.stringify({ type: 'test', title: 'Hello', body: 'This is a test' }));
  }
}

