// Înlocuiește service worker-ul aplicației vechi de pe duoshopping-9d75f.web.app: golește cache-ul,
// se scoate singur și reîncarcă paginile deschise, care ajung astfel pe pagina „s-a mutat”.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key)
    await self.registration.unregister()
    const wins = await self.clients.matchAll({ type: 'window' })
    for (const w of wins) w.navigate(w.url).catch(() => {})
  })())
})
