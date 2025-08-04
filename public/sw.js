import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Clean up outdated caches
cleanupOutdatedCaches();

// Precache and route static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache-first strategy for static assets (JS, CSS, fonts, images)
registerRoute(
  ({ request }) => 
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'static-assets-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Network-first strategy for API calls
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') || url.hostname.includes('api.'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Stale-while-revalidate for HTML pages
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({
    cacheName: 'pages-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Cache-first strategy for Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Cache-first strategy for CDN resources
registerRoute(
  ({ url }) => url.origin === 'https://cdn.jsdelivr.net' || url.origin === 'https://unpkg.com',
  new CacheFirst({
    cacheName: 'cdn-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Handle offline fallback
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open('offline-cache');
        await cache.addAll([
          OFFLINE_URL,
          '/',
          '/static/css/main.css',
          '/static/js/main.js'
        ]);
        
        // Notify clients that offline resources are ready
        broadcastMessage({
          type: 'OFFLINE_READY',
          payload: { message: 'Offline resources cached successfully' }
        });
        
        console.log('Service Worker installed successfully');
      } catch (error) {
        console.error('Service Worker installation failed:', error);
        broadcastMessage({
          type: 'ERROR',
          payload: { 
            type: 'installation-failed',
            message: 'Failed to cache offline resources',
            error: error.message 
          }
        });
        throw error;
      }
    })()
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames.map((cacheName) => {
          // Clean up old caches if needed
          if (cacheName.startsWith('qr-guardian-') && !cacheName.includes('v1')) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        }).filter(Boolean);
        
        await Promise.all(deletePromises);
        
        // Take control of all clients immediately
        await self.clients.claim();
        
        console.log('Service Worker activated successfully');
        
        // Notify clients that cache has been updated
        broadcastMessage({
          type: 'CACHE_UPDATED',
          payload: { message: 'Service Worker activated and caches updated' }
        });
        
      } catch (error) {
        console.error('Service Worker activation failed:', error);
        broadcastMessage({
          type: 'ERROR',
          payload: { 
            type: 'activation-failed',
            message: 'Failed to activate service worker',
            error: error.message 
          }
        });
      }
    })()
  );
});

// Handle fetch events for offline functionality
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  const { data } = event;
  
  if (!data) return;

  const messageId = data._messageId;
  
  try {
    switch (data.type) {
      case 'SKIP_WAITING':
        console.log('Received SKIP_WAITING message');
        self.skipWaiting();
        
        // Send response if message ID is provided
        if (messageId) {
          event.ports[0]?.postMessage({ 
            _messageId: messageId, 
            success: true 
          }) || self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({ 
                _messageId: messageId, 
                success: true 
              });
            });
          });
        }
        break;
        
      case 'GET_CACHE_INFO':
        handleGetCacheInfo(event, messageId);
        break;
        
      case 'CLEAR_CACHE':
        handleClearCache(event, messageId, data.cacheName);
        break;
        
      default:
        console.log('Unknown message type:', data.type);
        if (messageId) {
          event.ports[0]?.postMessage({ 
            _messageId: messageId, 
            error: 'Unknown message type' 
          });
        }
    }
  } catch (error) {
    console.error('Error handling message:', error);
    if (messageId) {
      event.ports[0]?.postMessage({ 
        _messageId: messageId, 
        error: error.message 
      });
    }
  }
});

// Handle cache info requests
async function handleGetCacheInfo(event, messageId) {
  try {
    const cacheNames = await caches.keys();
    const cacheInfo = [];
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      cacheInfo.push({
        name: cacheName,
        entryCount: keys.length
      });
    }
    
    if (messageId) {
      event.ports[0]?.postMessage({ 
        _messageId: messageId, 
        success: true, 
        data: cacheInfo 
      });
    }
  } catch (error) {
    if (messageId) {
      event.ports[0]?.postMessage({ 
        _messageId: messageId, 
        error: error.message 
      });
    }
  }
}

// Handle cache clearing requests
async function handleClearCache(event, messageId, cacheName) {
  try {
    if (cacheName) {
      await caches.delete(cacheName);
    } else {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    if (messageId) {
      event.ports[0]?.postMessage({ 
        _messageId: messageId, 
        success: true 
      });
    }
  } catch (error) {
    if (messageId) {
      event.ports[0]?.postMessage({ 
        _messageId: messageId, 
        error: error.message 
      });
    }
  }
}

// Utility function to broadcast messages to all clients
async function broadcastMessage(message) {
  try {
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach(client => {
      client.postMessage(message);
    });
  } catch (error) {
    console.error('Failed to broadcast message:', error);
  }
}

console.log('Service Worker loaded successfully');