/**
 * Service Worker Configuration
 * Acts as a network proxy to provide offline capabilities and resource caching.
 * Increment the CACHE_VERSION string below whenever you deploy changes to force a cache refresh.
 */

const CACHE_VERSION = 'arenax-cache-v1';

const CRITICAL_ASSETS = [
    '/',
    '/index.html',
    '/css/base.css',
    '/css/components.css',
    '/css/layout.css',
    '/css/game.css',
    '/css/chat.css',
    '/js/constants.js',
    '/js/premiumStickers.js',
    '/js/app.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => {
            return cache.addAll(CRITICAL_ASSETS);
        }).catch((error) => {
            console.error('Cache installation sequence encountered an error:', error);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_VERSION) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});