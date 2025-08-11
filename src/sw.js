/*
  Custom Service Worker for VitePWA (JavaScript)
  - Handles web push notifications
*/

// Workbox precache injection for injectManifest
import { precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

self.skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener('push', (event) => {
  try {
    const data = event.data ? (() => {
      try { return event.data.json(); } catch { return { title: 'Notification', message: event.data.text() }; }
    })() : { title: 'Notification', message: '' };

    const title = data.title || 'FindIt Alert';
    const options = {
      body: data.message || '',
      icon: '/icons/icon-512.png',
      badge: '/icons/icon-512.png',
      data,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // no-op
  }
});

self.addEventListener('notificationclick', (event) => {
  const target = (event.notification?.data?.url) || '/';
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
