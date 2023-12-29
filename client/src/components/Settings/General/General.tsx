import { useMemo, useState } from 'react';
import './General.css'
import coinbotFilled from '../../../coinbotFilled.png';
import { no } from '../../../shared.js';
import { useUser } from '../../../hooks/useUser.js';
// import usePostFetch from '../../../hooks/usePostFetch.js';
import { EventType } from '../../../types/index.js';
import usePutFetch from '../../../hooks/usePutFetch.js';
const themes: { [key: string]: string } = { original: 'Original', darkTheme: 'Dark' };

function General(props: { tips: boolean }) {
  const { user, theme, refreshUser } = useUser();

  const pauseOptions = useMemo(() => ({
    url: '/api/settings/pause',
    from: 'pause in General.tsx',
    refreshCallback: refreshUser
  }), [refreshUser]);
  const { putData: pause } = usePutFetch(
    pauseOptions
    // {
    //   url: '/api/settings/pause',
    //   from: 'pause in General.tsx',
    //   refreshCallback: refreshUser
    // }
  );

  const killLockOptions = useMemo(() => ({
    url: '/api/settings/killLock',
    from: 'killLock in General.tsx',
    refreshCallback: refreshUser
  }), [refreshUser]);
  const { putData: killLock } = usePutFetch(
    killLockOptions
    // {
    //   url: '/api/settings/killLock',
    //   from: 'killLock in General.tsx',
    //   refreshCallback: refreshUser
    // }
  );

  // const { putData: setTheme } = usePutFetch({
  //   url: '/api/settings/theme',
  //   from: 'setTheme in General.tsx',
  //   refreshCallback: refreshUser
  // });
  const themeOptions = useMemo(() => ({
    url: '/api/settings/theme',
    from: 'setTheme in General.tsx',
    refreshCallback: refreshUser
  }), [refreshUser]);
  const { putData: setTheme } = usePutFetch(themeOptions);

  // const { putData: sendTradeLoadMax } = usePutFetch({
  //   url: '/api/settings/tradeLoadMax',
  //   from: 'sendTradeLoadMax in General.tsx',
  //   refreshCallback: refreshUser
  // });
  const tradeLoadMaxOptions = useMemo(() => ({
    url: '/api/settings/tradeLoadMax',
    from: 'sendTradeLoadMax in General.tsx',
    refreshCallback: refreshUser
  }), [refreshUser]);
  const { putData: sendTradeLoadMax } = usePutFetch(tradeLoadMaxOptions);

  // const { putData: updateProfitAccuracy } = usePutFetch({
  //   url: '/api/settings/profitAccuracy',
  //   from: 'updateProfitAccuracy in General.tsx',
  //   refreshCallback: refreshUser
  // });
  const profitAccuracyOptions = useMemo(() => ({
    url: '/api/settings/profitAccuracy',
    from: 'updateProfitAccuracy in General.tsx',
    refreshCallback: refreshUser
  }), [refreshUser]);
  const { putData: updateProfitAccuracy } = usePutFetch(profitAccuracyOptions);

  // const { putData: sendSyncQuantity } = usePutFetch({
  //   url: '/api/settings/syncQuantity',
  //   from: 'sendSyncQuantity in General.tsx',
  //   refreshCallback: refreshUser
  // });
  const syncQuantityOptions = useMemo(() => ({
    url: '/api/settings/syncQuantity',
    from: 'sendSyncQuantity in General.tsx',
    refreshCallback: refreshUser
  }), [refreshUser]);
  const { putData: sendSyncQuantity } = usePutFetch(syncQuantityOptions);


  const [max_trade_load, setMaxTradeLoad] = useState(user.max_trade_load);
  const [profit_accuracy, setProfit_accuracy] = useState(user.profit_accuracy);
  const [sync_quantity, setSync_quantity] = useState(user.sync_quantity);
  const [notificationSettings, setNotificationSettings] = useState({
    dailyNotifications: true,
    dailyNotificationsTime: '12:00',
    // get current timezone of user
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  function handleNotificationSettingsChange(event: React.ChangeEvent<HTMLInputElement>) {
    event.preventDefault();
    const { name, value } = event.target;
    setNotificationSettings({ ...notificationSettings, [name]: value });
  }


  function randomNotification() {

    console.log('displaying random notification');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.active?.postMessage(JSON.stringify({
          type: 'show-notification',
          title: 'Notifications are working!',
          body: 'You can disable these at any time in your browser settings, or by clicking the lock icon in the address bar.',
          icon: coinbotFilled,
        }));
      });
    }
  }


  function notificationHandler(e: EventType) {
    no(e);
    console.log('notification handler');
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notification");
    } else if (Notification.permission === "granted") {
      console.log('Notification permission already granted');
      randomNotification();
      getSubscription();

    } else if (Notification.permission !== "denied") {
      console.log('Notification permission not granted, requesting permission');
      Notification.requestPermission().then(function (permission) {
        console.log('Notification permission:', permission);
        if (permission === "granted") {
          console.log('Notification permission granted!');
          // randomNotification();


        }
      });
    } else {
      console.log('Notification permission denied');
    }
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }


  // get the subscription object
  const getSubscription = async () => {
    console.log("getting subscription");
    const registration = await navigator.serviceWorker.ready;
    console.log(registration.pushManager, "registration ready")
    const sub = await registration.pushManager.getSubscription();
    // console.log(sub, "sub");
    if (sub) {
      console.log(sub, "sub");
      await subscribe();
      return sub;
    } else {
      console.log("no subscription");
      return await subscribe();
    }
  };

  // subscribe to push notifications
  const subscribe = async () => {
    console.log("subscribing");
    const sw = await navigator.serviceWorker.ready;
    console.log(sw, "registration");
    // get the public key from the server
    const response = await fetch("/api/notifications/public-key");
    const publicKey = await response.text();
    const convertedVapidKey = urlBase64ToUint8Array(publicKey);
    // const convertedVapidKey = publicKey;
    console.log("public key converted>>>>>>>>");


    const subscription = await sw.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });
    console.log(subscription, "subscription");

    // create a date from the time string
    const date = new Date();
    const time = notificationSettings.dailyNotificationsTime.split(':');
    date.setHours(Number(time[0]));
    date.setMinutes(Number(time[1]));
    date.setSeconds(0);
    date.setMilliseconds(0);



    // send the subscription object to the server
    console.log("sending subscription to server");
    await fetch("/api/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify({
        subscription: subscription,
        notificationSettings: { ...notificationSettings, dailyNotificationsTime: date },
      }),
      headers: {
        "content-type": "application/json",
      },
    });
  };



  return (
    <div className="General settings-panel scrollable">
      <div className={`divider ${theme}`} />

      {/* THEME */}
      <h4>Theme</h4>
      {Object.keys(themes).map((theme) => {
        return (
          <button key={theme} className={`btn-blue medium ${theme}`} onClick={() => { setTheme({ theme: theme }) }}>
            {themes[theme]}
          </button>
        )
      })}
      <div className={`divider ${theme}`} />

      {/* PAUSE */}
      <h4>Pause</h4>
      {props.tips && <p>
        Pauses the bot. Trades will stay in place, but the bot will not check on them or flip them. If they are cancelled on Coinbase, the bot will not notice until it is unpaused.
        Be careful not to trade funds away manually while the bot is paused, or there might be an insufficient funds error.
      </p>}
      {/* {user.paused
        ? <button className={`btn-blue medium ${user.theme}`} onClick={pause}>Unpause</button>
        : <button className={`btn-blue medium ${user.theme}`} onClick={pause}>Pause</button>
      } */}
      <button
        className={`btn-blue medium ${user.theme}`}
        onClick={() => { pause() }}>
        {user.paused ? 'Unpause' : 'Pause'}
      </button>
      <div className={`divider ${theme}`} />

      {/* NOTIFICATIONS */}
      <h4>Notifications</h4>
      {/* {JSON.stringify(notificationSettings)} */}
      <p>
        Enable browser notifications.
        This is on a per browser/device basis, so you will need to enable notifications in each browser on each device that you want to receive notifications on.
        Best not to do this on a shared or public device.
      </p>
      <p>
        <span className='red'>!</span> <i>Note that if you enable notifications and then block notifications in your browser,
          you will NOT be able to enable notifications in the future
          without manually changing your browser settings.</i>
      </p>

      {/* button to request notification permission */}
      {/* <button className={`btn-blue medium ${user.theme}`} onClick={notificationHandler}>Enable Notifications</button> */}
      {/* form to handle notification settings */}
      {/* {JSON.stringify(notificationSettings)} */}
      {/* should have checkbox for daily notifications, and clock to set time of daily notifications. Values should match notificationSettings state */}
      <form className="notification-settings" onSubmit={notificationHandler}>
        <div className="notification-setting">
          <input
            type="checkbox"
            name="dailyNotifications"
            id="dailyNotifications"
            checked={notificationSettings.dailyNotifications}
            onChange={() => setNotificationSettings({ ...notificationSettings, dailyNotifications: !notificationSettings.dailyNotifications })}
          />
          <label htmlFor="dailyNotifications"> Daily Notifications</label>
        </div>
        <div className="notification-setting">
          <label htmlFor="dailyNotificationsTime">Daily Notifications Time </label>
          <input
            type="time"
            name="dailyNotificationsTime"
            id="dailyNotificationsTime"
            value={notificationSettings.dailyNotificationsTime}
            onChange={handleNotificationSettingsChange}
          />
        </div>
        <br />
        <div className="notification-setting">
          {/* submit */}
          <input
            className={`btn-blue medium ${user.theme}`}
            id='submit-notifications'
            type="submit"
            value={"Save"}
          />
        </div>
      </form>

      <div className={`divider ${theme}`} />

      {/* KILL PREVENTION */}
      <h4>Kill Prevention</h4>
      {props.tips && <p>
        Removes the kill button from the trade pairs.
        This helps prevent accidental deletion of trades.
        Highly recommended to leave this on.
      </p>}
      <button className={`btn-blue medium ${user.theme}`} onClick={() => { killLock() }}>{user.kill_locked ? 'Unlock' : 'Lock'}</button>
      {/* <button className={`btn-blue medium ${user.theme}`} onClick={killLock}>Lock</button> */}
      <div className={`divider ${theme}`} />

      {/* MAX TRADES ON SCREEN */}
      <h4>Max Trades on Screen</h4>
      {props.tips && <div>
        <p>
          Limit the number of trades to load per side (buy/sell).
          This can make load times shorter and limit the amount of scrolling
          needed to get to the split.
        </p>
        <p>
          Since it is PER SIDE, setting the value to 10 for example
          would potentially load up to 20 trades total.
        </p>
        <p>
          There is a soft limit of 10,000 open trades per user,
          so there is no reason to set the value higher than that.
        </p>
      </div>}
      <p>Current max trades to load per side: {Number(user.max_trade_load)}</p>
      <div className='left-border'>
        <label htmlFor="reinvest_ratio">
          Set Max:
        </label>
        <input
          type="number"
          name="reinvest_ratio"
          id='reinvest_ratio'
          value={max_trade_load}
          required
          onChange={(event) => setMaxTradeLoad(Number(event.target.value))}
        />
        <br />
        <button
          className={`btn-blue btn-reinvest medium ${user.theme}`}
          onClick={() => { sendTradeLoadMax({ max_trade_load }) }}
        >
          Save Max
        </button>
      </div>
      <div className={`divider ${theme}`} />

      {/* SYNC TRADE QUANTITY */}
      <h4>Sync Trade Quantity</h4>
      {props.tips && <p>
        How many buys and sells to keep in sync with Coinbase. There is a hard limit of {user.botSettings.orders_to_sync} set
        by the admin. This is configurable because Coinbase has a limit of 500, and the bot needs to allow some margin. Setting
        this to a higher number will make it easier to keep the price within the spread, but will slightly slow down the bot.
        The admin can set a max based on the hardware the bot is running on. You can choose your risk tolerance within that limit.
      </p>}
      <p>Current sync quantity: {Number(user.sync_quantity)} Max: {user.botSettings.orders_to_sync}</p>
      <div className='left-border'>
        <label htmlFor="sync_quantity">
          Set Sync Quantity:
        </label>
        <input
          type="number"
          name="sync_quantity"
          id='sync_quantity'
          value={sync_quantity}
          required
          onChange={(event) => setSync_quantity(Number(event.target.value))}
        />
        <br />
        <button className={`btn-blue btn-reinvest medium ${user.theme}`} onClick={() => { sendSyncQuantity({ sync_quantity }) }}>Save</button>
      </div>
      <div className={`divider ${theme}`} />


      {/* PROFIT ACCURACY */}
      <h4>Profit accuracy</h4>
      {props.tips && <p>
        How many decimals to display on screen for profits.
      </p>}
      <p>Current accuracy: {Number(user.profit_accuracy)}</p>
      <div className='left-border'>
        <label htmlFor="profit_accuracy">
          Set Max:
        </label>
        <input
          type="number"
          name="profit_accuracy"
          id='profit_accuracy'
          value={profit_accuracy}
          required
          onChange={(event) => setProfit_accuracy(Number(event.target.value))}
        />
        <br />
        <button className={`btn-blue btn-reinvest medium ${user.theme}`} onClick={() => { updateProfitAccuracy({ profit_accuracy }) }}>Save</button>
      </div>
      <div className={`divider ${theme}`} />
    </div>
  );
}

export default General;