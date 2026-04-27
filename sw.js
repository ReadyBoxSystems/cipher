const CACHE = 'cipher-v1'
const ASSETS = ['/cipher/', '/cipher/index.html', '/cipher/style.css', '/cipher/app.js', '/cipher/supabase.js', '/cipher/crypto.js', '/cipher/ciphers.js', '/cipher/manifest.json']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('supabase.co')) return // never cache API calls
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  )
})
