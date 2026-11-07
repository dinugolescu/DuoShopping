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
    // Lista din care vine anunțul (din `tag`, „lista-<id>”), ca atingerea să deschidă direct lista.
    data: { url: d.url || '/', listId: (d.tag || '').startsWith('lista-') ? d.tag.slice(6) : null },
  }))
})

// La atingere: dacă aplicația e deschisă, o aducem în față și îi spunem ce listă să arate; altfel o
// deschidem direct la listă (`?list=<id>`). Unde aducerea în față nu merge (iPhone), o deschidem din nou.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const { url: path = '/', listId } = event.notification.data || {}
  const url = new URL(path, self.location.origin)
  if (listId) url.searchParams.set('list', listId)
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = wins.find((w) => w.url.startsWith(self.location.origin))
    if (open) {
      if (listId) open.postMessage({ type: 'open-list', listId })
      try { await open.focus(); return } catch { /* continuăm cu deschiderea */ }
    }
    return self.clients.openWindow(url.href)
  })())
})
