const CACHE = 'cipher-v3'
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './app.js',
  './supabase.js',
  './crypto.js',
  './ciphers.js',
  './transport/index.js',
  './transport/interface.js',
  './transport/supabase-transport.js',
  './transport/mock-transport.js',
  './state/store.js',
  './lib/router.js',
  './lib/settings.js',
  './lib/utils.js',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Special+Elite&display=swap'
]

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
