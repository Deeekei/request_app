import { pushApi } from '../api/pushApi';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker не поддерживается браузером');
  }

  return navigator.serviceWorker.ready;
}

export async function getCurrentSubscription() {
  const registration = await getServiceWorkerRegistration();
  return registration.pushManager.getSubscription();
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    throw new Error('Уведомления не поддерживаются браузером');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error('Пользователь не разрешил уведомления');
  }

  return permission;
}

export async function subscribeToPush(token, deviceLabel = null) {
  if (!isPushSupported()) {
    throw new Error('Push-уведомления не поддерживаются браузером');
  }

  await requestNotificationPermission();

  const registration = await getServiceWorkerRegistration();
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const { public_key: publicKey } = await pushApi.getPublicKey(token);

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const payload = subscription.toJSON();
  await pushApi.subscribe(token, payload, deviceLabel);

  return payload;
}

export async function unsubscribeFromPush(token) {
  const registration = await getServiceWorkerRegistration();
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return false;
  }

  const payload = subscription.toJSON();
  await pushApi.unsubscribe(token, payload);
  await subscription.unsubscribe();

  return true;
}

export async function sendTestPush(token) {
  return pushApi.test(token, {
    title: 'Тестовое уведомление',
    body: 'Push-уведомления настроены корректно.',
    url: '/profile',
  });
}
