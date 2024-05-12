// import { no } from "../shared";
import coinbotFilled from "../assets/coinbotFilled.png";

interface NotificationSettings {
  dailyNotifications: boolean;
  dailyNotificationsTime: string;
  timeZone: string;
}

export function randomNotification() {

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


// get the subscription object
export const getSubscription = async (notificationSettings: NotificationSettings) => {
  console.log("getting subscription");
  const registration = await navigator.serviceWorker.ready;
  console.log(registration.pushManager, "registration ready")
  const sub = await registration.pushManager.getSubscription();
  // console.log(sub, "sub");
  if (sub) {
    console.log(sub, "sub");
    await subscribe(notificationSettings);
    return sub;
  } else {
    console.log("no subscription");
    return await subscribe(notificationSettings);
  }
};

const subscribe = async (notificationSettings: NotificationSettings) => {
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