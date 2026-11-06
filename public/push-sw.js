// Inclus în service worker-ul aplicației (vezi `importScripts` în vite.config.js).
// Afișează notificările trimise de funcția `announce` și deschide aplicația la apăsare.

self.addEventListener('push', (event) => {
  let payload = {}
  try { payload = event.data ? event.data.json() : {} } catch { /* mesaj fără JSON */ }
  const d = payload.data || payload.notification || {}
  event.waitUntil(self.registration.showNotification(d.title || 'DuoShopping', {
    body: d.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || '/' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = wins.find((w) => w.url.startsWith(self.location.origin))
    if (open) return open.focus()
    return self.clients.openWindow(url)
  })())
})
