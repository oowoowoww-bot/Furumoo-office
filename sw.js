// 무무무빌딩 알림 전용 서비스 워커 — 화면을 저장(캐시)하지 않고, 폰 알림만 받아요.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || '무무무빌딩', {
    body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag || 'furumoo', data: d
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const d = e.notification.data || {};
  const url = new URL('./' + (d.room && d.tid ? '#chat=' + d.room + '/' + d.tid : ''), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
    for (const w of ws) { if ('focus' in w) { if (d.room) w.postMessage({ chat: d.room + '/' + d.tid }); return w.focus(); } }
    return self.clients.openWindow(url);
  }));
});
