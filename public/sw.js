/* Service Worker — Web Push + notification click (không cache HTML/JS) */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Xóa cache cũ nếu có (tránh iOS/PWA kẹt bản cũ)
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* ignore */
      }
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        client.postMessage({ type: 'OM_SW_ACTIVATED' });
      });
    })()
  );
});

// Không intercept fetch — luôn để mạng/CDN lo HTML & assets

self.addEventListener('push', (event) => {
  let data = { title: 'Our Memory', body: 'Có gì đó mới từ người ấy…', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* ignore */
  }

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const focused = clients.some((c) => c.focused || c.visibilityState === 'visible');

      // App đang mở → báo UI trong app (iOS hay không hiện system banner)
      clients.forEach((client) => {
        client.postMessage({
          type: 'OM_PUSH',
          title: data.title,
          body: data.body,
          url: data.url || '/',
          tag: data.tag || 'our-memory',
        });
      });

      // Vẫn hiện system notification nếu không có cửa sổ đang mở / không focus
      if (!focused || clients.length === 0) {
        await self.registration.showNotification(data.title || 'Our Memory', {
          body: data.body || '',
          icon: '/icons/icon-192.png?v=2',
          badge: '/icons/favicon-32.png?v=2',
          data: { url: data.url || '/' },
          tag: data.tag || 'our-memory',
          renotify: true,
        });
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
