import { databaseClient } from '../modules/databaseClient.js';
import webPush from 'web-push';
import { devLog } from './utilities.js';
import { cbClients, userStorage, messenger } from '../modules/cache.js';

// every hour on the hour, send push notifications to all users

// resetAtMidnight({ notMidnight: true });

// https://stackoverflow.com/questions/26306090/running-a-function-everyday-midnight
// using this bit of code instead of cron job package
function resetAtMidnight({ notMidnight }) {
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // the next day, ...
    0, 0, 0 // ...at 00:00:00 hours
  );
  const msToMidnight = night.getTime() - now.getTime();
  try {

    // devLog('msToMidnight', msToMidnight, 'notMidnight', notMidnight);

    runScheduled({ notMidnight }); // <-- This is the function being called at midnight.
  } catch (err) {
    devLog('error in resetAtMidnight', err);
  } finally {
    setTimeout(function () {
      resetAtMidnight({ notMidnight: false }); // Then, reset again next midnight.
    }, msToMidnight);
    // }, 5000);
  }
}

// this function is called when the server starts and at midnight every day
// it should check for any notifications that still need to be sent for the day,
// and send them at their scheduled time
async function runScheduled({ notMidnight }) {
  try {
    // devLog('running scheduled push notifications');
    // get all subscriptions
    const subscriptions = await databaseClient.getAllSubscriptions();
    // send push notifications to each subscription at the scheduled time
    for (let i = 0; i < subscriptions.length; i++) {
      const subscription = subscriptions[i];
      const userID = subscription.user_id;
      // devLog('subscription', subscription, 'notMidnight', notMidnight);

      // if subscription.daily_notifications is false, skip this subscription
      if (!subscription.daily_notifications) {
        // devLog('daily notifications is false');
        continue;
      }

      if (notMidnight) {
        // if it is not midnight, that means the server just started, and we should check if we are past the scheduled time
        // if we are not, then we should still schedule it for the day
        // subscription.notification_time is in the format of 00:00:00
        instantSchedule(subscription, userID);


      } else {
        // if it is midnight, that means we should schedule it for the day
        // subscription.notification_time is in the format of 00:00:00
        const now = new Date();
        const midnightNow = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0, 0, 0
        );
        const scheduledTime = getDateFromTime(midnightNow, subscription);
        const msToSend = scheduledTime.getTime() - midnightNow.getTime();
        // devLog('msToSend', msToSend);

        // devLog('midnightNow', midnightNow, 'scheduledTime', scheduledTime);


        const scheduled = setTimeout(async () => {
          await sendPushNotification(subscription);
        }, msToSend);

        userStorage[userID].timeouts.push({
          type: 'notification',
          timeout: scheduled,
          subscription,
        })

      }

    }
  } catch (err) {
    devLog('error running scheduled push notifications', err);
  }
}

function instantSchedule(subscription, userID) {
  try {
    const now = new Date();
    const scheduledTime = getDateFromTime(now, subscription);
    // devLog('now', now, 'scheduledTime', scheduledTime);
    const msToSend = scheduledTime - now;
    if (msToSend >= 0) {
      // if it is not past the scheduled time, schedule it for the day
      // devLog('not past scheduled time');
      const scheduled = setTimeout(async () => {
        await sendPushNotification(subscription);
      }, scheduledTime - now);


      // devLog('scheduled', scheduled);
      userStorage[userID].timeouts.push({
        type: 'notification',
        timeout: scheduled,
        subscription,
      });
    }
  } catch (err) {
    // devLog('error instant scheduling', err);
  }
}

async function sendPushNotification(subscription) {
  try {
    // devLog('sending test notification');
    // devLog(subscription.user_id, 'subscription');
    const userID = subscription.user_id;
    // get 24 Hour profits for user
    const profits = await databaseClient.getProfitForDurationByAllProducts(userID, '24 Hour');
    // devLog('profits', profits);
    // include current time in the notification
    await webPush.sendNotification(subscription, JSON.stringify({
      type: 'update',
      title: 'Coinbot Daily Update',
      body: `24 Hour Profit: ${Number(profits)?.toFixed(2) || 0}`,
    }));
  } catch (err) {
    devLog('error sending notification', err);
  }
}

function getDateFromTime(now, subscription) {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    subscription.notification_time.getHours(),
    subscription.notification_time.getMinutes(),
    subscription.notification_time.getSeconds()
  );
}

export { resetAtMidnight, instantSchedule }