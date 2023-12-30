
// SERVICE WORKER
export const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    // unregister previous service worker
    const registrations = await navigator.serviceWorker.getRegistrations();
    // for (const registration of registrations) {
    //   registration.unregister();
    // }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      if (registration.installing) {
        console.log("Service worker installing");
      } else if (registration.waiting) {
        console.log("Service worker installed");
      } else if (registration.active) {
        console.log("Service worker active");
      }

      // // subscribe to push notifications
      // await getSubscription();

    } catch (error) {
      console.error(`Registration failed with ${error}`);
    }
  }
};

// // get the subscription object
// const getSubscription = async () => {
//   console.log("getting subscription");
//   const registration = await navigator.serviceWorker.ready;
//   console.log(registration.pushManager, "registration ready")
//   const sub = await registration.pushManager.getSubscription();
//   // console.log(sub, "sub");
//   if (sub) {
//     console.log(sub, "sub");
//     return sub;
//   } else {
//     console.log("no subscription");
//     return await subscribe();
//   }
// };

// // subscribe to push notifications
// const subscribe = async () => {
//   console.log("subscribing");
//   const sw = await navigator.serviceWorker.ready;
//   console.log(sw, "registration");
//   // get the public key from the server
//   const response = await fetch("/api/notifications/public-key");
//   const publicKey = await response.text();
//   const convertedVapidKey = urlBase64ToUint8Array(publicKey);
//   console.log("public key converted>>>>>>>>");


//   const subscription = await sw.pushManager.subscribe({
//     userVisibleOnly: true,
//     applicationServerKey: convertedVapidKey
//   });
//   console.log(subscription, "subscription");

//   // send the subscription object to the server
//   console.log("sending subscription to server");
//   await fetch("/api/notifications/subscribe", {
//     method: "POST",
//     body: JSON.stringify(subscription),
//     headers: {
//       "content-type": "application/json",
//     },
//   });
// };

// // https://github.com/mdn/serviceworker-cookbook/blob/master/push-payload/index.js
// // This function is needed because Chrome doesn't accept a base64 encoded string
// // as value for applicationServerKey in pushManager.subscribe yet
// // https://bugs.chromium.org/p/chromium/issues/detail?id=802280
// function urlBase64ToUint8Array(base64String: string) {
//   var padding = '='.repeat((4 - base64String.length % 4) % 4);
//   var base64 = (base64String + padding)
//     .replace(/\-/g, '+')
//     .replace(/_/g, '/');

//   var rawData = window.atob(base64);
//   var outputArray = new Uint8Array(rawData.length);

//   for (var i = 0; i < rawData.length; ++i) {
//     outputArray[i] = rawData.charCodeAt(i);
//   }
//   return outputArray;
// }