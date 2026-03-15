self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    if (!event.data) return;

    let payload = {};
    try {
        payload = event.data.json();
    } catch {
        payload = { title: 'Light', body: event.data.text() };
    }

    const title = payload.title || 'Light';
    const targetUrl = new URL(payload.url || '/inspiration', self.location.origin).toString();

    event.waitUntil(
        self.registration.showNotification(title, {
            body: payload.body || '',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: payload.tag || 'light-reminder',
            data: { url: targetUrl },
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || new URL('/inspiration', self.location.origin).toString();

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    client.focus();
                    if ('navigate' in client) {
                        return client.navigate(targetUrl);
                    }
                    return client;
                }
            }

            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }

            return undefined;
        })
    );
});
