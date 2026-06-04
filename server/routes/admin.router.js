import express from 'express';
import { rejectUnauthenticated, } from '../modules/authentication-middleware.js';
import { robot } from '../modules/robot.js';
import { databaseClient } from '../modules/databaseClient.js';
import { userStorage, messenger, botSettings } from '../modules/runtime/index.js';
import { devLog } from '../modules/utilities.js';

const router = express.Router();

/**
* GET all user information if user is authenticated and admin
*/
router.get('/users', rejectUnauthenticated, async (req, res) => {
  devLog('get all users route');
  const isAdmin = req.user.admin;
  if (!isAdmin) {
    res.sendStatus(403);
    return;
  }
  try {
    const userList = await databaseClient.getAllUserAndSettings();
    res.send(userList);
  } catch (err) {
    devLog('error sending list of users to admin', err);
    res.sendStatus(500)
  }
});


/**
* GET route to log status of a user's loop
*/
router.get('/debug/:user_id', rejectUnauthenticated, async (req, res) => {
  const userID = req.params.user_id;
  if (req.user.admin) {
    try {
      const userInfo = userStorage.getUser(userID)
      const userErrors = messenger[userID].getErrors();
      // devLog('debug - full storage', userInfo);
      // devLog('errors', userErrors);
      userInfo.userID !== null
        ? res.send(userInfo).status(200)
        : res.sendStatus(500);
    } catch (err) {
      devLog(err, 'problem debug route');
      res.sendStatus(500)
    }
  } else {
    devLog('error debug user route - not admin');
    res.sendStatus(403);
  }
});


/**
* POST route to reset the orders table
*/
router.post('/ordersReset', rejectUnauthenticated, async (req, res) => {
  res.sendStatus(500);
  return;
});

/**
* POST route to factory reset the bot
*/
router.post('/factoryReset', rejectUnauthenticated, async (req, res) => {
  res.sendStatus(500);
  return;
});

/**
* PUT route - Approve a single user. Only admin can do this
*/
router.put('/users', rejectUnauthenticated, async (req, res) => {
  try {
    const isAdmin = req.user.admin;
    if (isAdmin) {
      devLog('you are admin');
      const userToApprove = req.body.id;
      devLog('in approve user route', userToApprove);
      const user = await databaseClient.approveUser(userToApprove);
      userStorage.approve(userToApprove, true);
      res.sendStatus(200);
    } else {
      devLog('you are NOT admin');
      res.sendStatus(403);
    }
  } catch (err) {
    devLog(err, 'error in approve put route');
    res.sendStatus(500);
  }
});

/**
 * PUT route - changes chat permissions for a single user. Only admin can do this
 */
router.put('/users/chat', rejectUnauthenticated, async (req, res) => {
  try {
    devLog('in chat permission route');
    const isAdmin = req.user.admin;
    if (!isAdmin) {
      devLog('you are NOT admin');
      res.sendStatus(403);
      return;
    }
    const userToChange = req.body.id;
    const chatPermission = req.body.chatPermission;
    devLog('in chat permission route', userToChange, chatPermission);
    const user = await databaseClient.updateChatPermission(chatPermission, userToChange);

    await userStorage.refreshUser(userToChange);
    res.sendStatus(200);
  } catch (err) {
    devLog(err, 'error in chat permission put route');
    res.sendStatus(500);
  }
});



/**
 * PUT route updating bot speed
 */
router.put('/loop_speed', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  let loopSpeed = req.body.loopSpeed;
  if (!user.admin) {
    devLog('user is not admin!');
    res.sendStatus(403)
    return;
  }

  if (loopSpeed > 1000) {
    loopSpeed = 1000;
  } else if (loopSpeed < 1) {
    loopSpeed = 1;
  }

  // if (loopSpeed <= 1000 && loopSpeed >= 1) {
  if (!(loopSpeed <= 1000) || !(loopSpeed >= 1)) {
    devLog(loopSpeed, 'invalid parameters');
    res.status(500).send('invalid parameters!')
    return;
  }
  try {
    devLog('loop speed route hit', loopSpeed);

    await databaseClient.updateLoopSpeed(loopSpeed);

    botSettings.change({ loop_speed: loopSpeed });

    devLog(botSettings, 'bot settings after change');

    res.sendStatus(200);
  } catch (err) {
    devLog('error with loop speed route', err);
    res.sendStatus(500);
  }
});


/**
 * PUT route updating fullSync
 */
router.put('/full_sync', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  let fullSync = Math.round(req.body.fullSync);

  if (fullSync < 1) {
    fullSync = 1;
  } else if (fullSync > 100) {
    fullSync = 100;
  }

  devLog('FULL SYNC', fullSync);

  if (user.admin && fullSync <= 100 && fullSync >= 1) {
    try {
      devLog('full_sync route hit', fullSync);

      // set the settings in the db first
      await databaseClient.updateFullSync(fullSync);
      // then update the process-local runtime snapshot
      botSettings.change({ full_sync: fullSync })

      devLog(botSettings, 'bot settings after change');

      res.sendStatus(200);
    } catch (err) {
      devLog('error with loop speed route', err);
      res.sendStatus(500);
    }
  } else {
    devLog('user is not admin!');
    res.sendStatus(403)
  }
});


/**
 * PUT route updating orders_to_sync
 */
router.put('/order_sync_quantity', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  let orders_to_sync = Math.round(req.body.syncQuantity);
  devLog('orders_to_sync route hit', orders_to_sync);

  if (orders_to_sync < 1) {
    orders_to_sync = 1;
  } else if (orders_to_sync > 200) {
    orders_to_sync = 200;
  }

  if (user.admin && orders_to_sync <= 200 && orders_to_sync >= 1) {
    try {
      // save to db
      await databaseClient.updateOrdersToSync(orders_to_sync);

      // update the process-local runtime snapshot
      botSettings.change({ orders_to_sync: orders_to_sync });

      res.sendStatus(200);
      // update orders on client for all users
      userStorage.getAllUsers().forEach(userID => {
        // update orders on client
        messenger[userID].newMessage({
          userUpdate: true
        })
      })
    } catch (err) {
      devLog('error with sync quantity route', err);
      res.sendStatus(500);
    }
  } else {
    if (!user.admin) {
      devLog('user is not admin!');
      res.sendStatus(403)
    } else {
      res.sendStatus(500)
    }
  }
});


/**
 * PUT route toggling maintenance mode
 */
router.put('/maintenance', rejectUnauthenticated, async (req, res) => {
  const user = req.user;
  console.log('maintenance route hit');
  if (user.admin) {
    try {
      await databaseClient.toggleMaintenance();
      robot.alertAllUsers('Toggling maintenance mode!');

      // refresh the process-local runtime snapshot
      await botSettings.refresh()

      res.sendStatus(200);
    } catch (err) {
      devLog(err, 'error with toggleMaintenance route');
      res.sendStatus(500);
    }
  } else {
    devLog('user is not admin!');
    res.sendStatus(403)
  }
});


/**
 * PUT route toggling registration
 */
router.put('/registration', rejectUnauthenticated, async (req, res) => {
  try {
    const isAdmin = req.user.admin;
    if (isAdmin) {
      devLog('you are admin');
      await databaseClient.toggleRegistration();
      await botSettings.refresh()
      res.sendStatus(200);
    } else {
      devLog('user is NOT admin');
      res.sendStatus(403);
    }
  } catch (err) {
    devLog(err, 'error with toggleRegistration route');
    res.sendStatus(500);

  }
});


/**
* DELETE route - Delete a single user. Only admin can do this
*/
router.delete('/users/:user_id', rejectUnauthenticated, async (req, res) => {
  const userToDelete = req.params.user_id;
  const userID = req.user.id;
  try {
    devLog('in delete user route');
    const isAdmin = req.user.admin;
    if (isAdmin) {
      devLog('you are admin');
      await databaseClient.deleteUser(userToDelete);
      res.sendStatus(200);
    } else {
      // const userToDelete = req.body.id;
      devLog('you are NOT admin');
      // check to make sure the user ID that was sent is the same as the user requesting the delete

      res.sendStatus(403); // forbidden
    }
  } catch (err) {
    devLog(err, 'error in delete user route');
    res.sendStatus(500);
  }
});

export default router;
