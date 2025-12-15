// service-worker.js
const CACHE_NAME = 'hours-tracker-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './script.js'
];

// Installation
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie Cache First avec fallback réseau
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retourner la ressource du cache si elle existe
        if (response) {
          return response;
        }
        
        // Sinon, faire la requête réseau
        return fetch(event.request)
          .then(response => {
            // Ne pas mettre en cache les requêtes non-GET ou les erreurs
            if (!response || response.status !== 200 || event.request.method !== 'GET') {
              return response;
            }
            
            // Mettre en cache la nouvelle ressource
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Fallback pour les pages
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return new Response('Hors ligne', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});