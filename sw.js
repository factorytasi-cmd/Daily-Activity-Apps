// =========================================================
// LUSS — Service Worker
// Menangani notifikasi push yang diterima browser.
// =========================================================

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}

  const title = data.title || 'LUSS';
  const options = {
    body: data.body || '',
    tag: data.tag || `luss-${Date.now()}`,
    renotify: true,
    requireInteraction: false
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./daily-activity.html');
    })
  );
});
