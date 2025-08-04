import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
} from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

// Clean up outdated caches
cleanupOutdatedCaches();

// Precache and route static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache-first strategy for static assets (JS, CSS, fonts, images)
registerRoute(
  ({ request }) =>
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    request.destination === "image",
  new CacheFirst({
    cacheName: "static-assets-cache",
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
  ({ url }) =>
    url.pathname.startsWith("/api/") || url.hostname.includes("api."),
  new NetworkFirst({
    cacheName: "api-cache",
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
  ({ request }) => request.mode === "navigate",
  new StaleWhileRevalidate({
    cacheName: "pages-cache",
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
  ({ url }) =>
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-cache",
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
  ({ url }) =>
    url.origin === "https://cdn.jsdelivr.net" ||
    url.origin === "https://unpkg.com",
  new CacheFirst({
    cacheName: "cdn-cache",
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
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open("offline-cache");
        await cache.addAll([
          OFFLINE_URL,
          "/",
          "/static/css/main.css",
          "/static/js/main.js",
        ]);

        // Notify clients that offline resources are ready
        broadcastMessage({
          type: "OFFLINE_READY",
          payload: { message: "Offline resources cached successfully" },
        });

        console.log("Service Worker installed successfully");
      } catch (error) {
        console.error("Service Worker installation failed:", error);
        broadcastMessage({
          type: "ERROR",
          payload: {
            type: "installation-failed",
            message: "Failed to cache offline resources",
            error: error.message,
          },
        });
        throw error;
      }
    })()
  );
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");

  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
          .map((cacheName) => {
            // Clean up old caches if needed
            if (
              cacheName.startsWith("qr-guardian-") &&
              !cacheName.includes("v1")
            ) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
          .filter(Boolean);

        await Promise.all(deletePromises);

        // Take control of all clients immediately
        await self.clients.claim();

        console.log("Service Worker activated successfully");

        // Notify clients that cache has been updated
        broadcastMessage({
          type: "CACHE_UPDATED",
          payload: { message: "Service Worker activated and caches updated" },
        });
      } catch (error) {
        console.error("Service Worker activation failed:", error);
        broadcastMessage({
          type: "ERROR",
          payload: {
            type: "activation-failed",
            message: "Failed to activate service worker",
            error: error.message,
          },
        });
      }
    })()
  );
});

// Handle fetch events for offline functionality
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Handle navigation requests
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
  }
});

// Handle messages from the main thread
self.addEventListener("message", (event) => {
  const { data } = event;

  if (!data) return;

  const messageId = data._messageId;

  try {
    switch (data.type) {
      case "SKIP_WAITING":
        console.log("Received SKIP_WAITING message");
        self.skipWaiting();

        // Send response if message ID is provided
        if (messageId) {
          event.ports[0]?.postMessage({
            _messageId: messageId,
            success: true,
          }) ||
            self.clients.matchAll().then((clients) => {
              clients.forEach((client) => {
                client.postMessage({
                  _messageId: messageId,
                  success: true,
                });
              });
            });
        }
        break;

      case "GET_CACHE_INFO":
        handleGetCacheInfo(event, messageId);
        break;

      case "CLEAR_CACHE":
        handleClearCache(event, messageId, data.cacheName);
        break;

      case "REGISTER_SYNC":
        handleRegisterSync(event, messageId);
        break;

      case "QUEUE_REQUEST":
        handleQueueRequest(event, messageId, data.request);
        break;

      default:
        console.log("Unknown message type:", data.type);
        if (messageId) {
          event.ports[0]?.postMessage({
            _messageId: messageId,
            error: "Unknown message type",
          });
        }
    }
  } catch (error) {
    console.error("Error handling message:", error);
    if (messageId) {
      event.ports[0]?.postMessage({
        _messageId: messageId,
        error: error.message,
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
        entryCount: keys.length,
      });
    }

    if (messageId) {
      event.ports[0]?.postMessage({
        _messageId: messageId,
        success: true,
        data: cacheInfo,
      });
    }
  } catch (error) {
    if (messageId) {
      event.ports[0]?.postMessage({
        _messageId: messageId,
        error: error.message,
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
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    if (messageId) {
      event.ports[0]?.postMessage({
        _messageId: messageId,
        success: true,
      });
    }
  } catch (error) {
    if (messageId) {
      event.ports[0]?.postMessage({
        _messageId: messageId,
        error: error.message,
      });
    }
  }
}

// Handle background sync registration
async function handleRegisterSync(event, messageId) {
  try {
    if (
      "serviceWorker" in navigator &&
      "sync" in window.ServiceWorkerRegistration.prototype
    ) {
      // Register background sync
      await self.registration.sync.register(SYNC_TAG);
      console.log("Background sync registered successfully");

      if (messageId) {
        event.ports[0]?.postMessage({
          _messageId: messageId,
          success: true,
          message: "Background sync registered",
        });
      }
    } else {
      throw new Error("Background sync not supported");
    }
  } catch (error) {
    console.error("Failed to register background sync:", error);
    if (messageId) {
      event.ports[0]?.postMessage({
        _messageId: messageId,
        error: error.message,
      });
    }
  }
}

// Handle request queuing
async function handleQueueRequest(event, messageId, requestData) {
  try {
    if (!requestData) {
      throw new Error("Request data is required");
    }

    // Add request to IndexedDB queue
    const db = await openQueueDB();
    const transaction = db.transaction(["queuedRequests"], "readwrite");
    const store = transaction.objectStore("queuedRequests");

    const queuedRequest = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: requestData.url,
      method: requestData.method || "GET",
      headers: requestData.headers || {},
      body: requestData.body || "",
      timestamp: Date.now(),
      priority: requestData.priority || 3,
      retryCount: 0,
      maxRetries: requestData.maxRetries || MAX_RETRY_ATTEMPTS,
    };

    await new Promise((resolve, reject) => {
      const request = store.add(queuedRequest);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log("Request queued successfully:", queuedRequest.id);

    // Try to register background sync
    try {
      await self.registration.sync.register(SYNC_TAG);
    } catch (syncError) {
      console.warn("Failed to register background sync:", syncError);
    }

    if (messageId) {
      event.ports[0]?.postMessage({
        _messageId: messageId,
        success: true,
        requestId: queuedRequest.id,
      });
    }
  } catch (error) {
    console.error("Failed to queue request:", error);
    if (messageId) {
      event.ports[0]?.postMessage({
        _messageId: messageId,
        error: error.message,
      });
    }
  }
}

// Background Sync functionality
const SYNC_TAG = "qr-guardian-sync";
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second base delay

// Register background sync
self.addEventListener("sync", (event) => {
  console.log("Background sync event triggered:", event.tag);

  if (event.tag === SYNC_TAG) {
    event.waitUntil(handleBackgroundSync());
  }
});

// Handle background sync
async function handleBackgroundSync() {
  console.log("Processing background sync...");

  try {
    // Get queued requests from IndexedDB
    const queuedRequests = await getQueuedRequests();

    if (queuedRequests.length === 0) {
      console.log("No requests to sync");
      return;
    }

    console.log(`Processing ${queuedRequests.length} queued requests`);

    // Process requests in batches
    const batchSize = 5;
    for (let i = 0; i < queuedRequests.length; i += batchSize) {
      const batch = queuedRequests.slice(i, i + batchSize);
      await processBatch(batch);
    }

    // Notify clients that sync is complete
    broadcastMessage({
      type: "SYNC_COMPLETE",
      payload: {
        message: "Background sync completed successfully",
        processedCount: queuedRequests.length,
      },
    });
  } catch (error) {
    console.error("Background sync failed:", error);

    // Notify clients of sync failure
    broadcastMessage({
      type: "SYNC_FAILED",
      payload: {
        message: "Background sync failed",
        error: error.message,
      },
    });

    // Re-throw to trigger retry
    throw error;
  }
}

// Process a batch of requests
async function processBatch(requests) {
  const promises = requests.map((request) => processQueuedRequest(request));
  const results = await Promise.allSettled(promises);

  results.forEach((result, index) => {
    const request = requests[index];
    if (result.status === "fulfilled") {
      console.log("Request processed successfully:", request.id);
    } else {
      console.error("Request processing failed:", request.id, result.reason);
    }
  });
}

// Process individual queued request
async function processQueuedRequest(request) {
  try {
    // Skip requests that have exceeded max retries
    if (request.retryCount >= (request.maxRetries || MAX_RETRY_ATTEMPTS)) {
      console.warn("Request exceeded max retries:", request.id);
      await markRequestAsFailed(request.id);
      return { success: false, reason: "max-retries-exceeded" };
    }

    // Prepare fetch options
    const fetchOptions = {
      method: request.method || "GET",
      headers: request.headers || {},
    };

    // Add body for non-GET requests
    if (request.body && request.method !== "GET") {
      fetchOptions.body = request.body;
    }

    // Make the request
    const response = await fetch(request.url, fetchOptions);

    if (response.ok) {
      // Request successful - remove from queue
      await removeFromQueue(request.id);

      // Notify clients of successful sync
      broadcastMessage({
        type: "REQUEST_SYNCED",
        payload: {
          requestId: request.id,
          url: request.url,
          method: request.method,
          status: response.status,
        },
      });

      return { success: true, response };
    } else {
      // Request failed - increment retry count
      await incrementRetryCount(request.id);
      throw new Error(`Request failed with status: ${response.status}`);
    }
  } catch (error) {
    // Network or other error - increment retry count
    await incrementRetryCount(request.id);

    // Calculate exponential backoff delay
    const delay = RETRY_DELAY * Math.pow(2, request.retryCount || 0);
    console.log(
      `Request ${request.id} failed, will retry after ${delay}ms:`,
      error.message
    );

    throw error;
  }
}

// Get queued requests from IndexedDB
async function getQueuedRequests() {
  try {
    const db = await openQueueDB();
    const transaction = db.transaction(["queuedRequests"], "readonly");
    const store = transaction.objectStore("queuedRequests");

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const requests = request.result || [];
        // Sort by priority and timestamp
        requests.sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          return a.timestamp - b.timestamp;
        });
        resolve(requests);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to get queued requests:", error);
    return [];
  }
}

// Remove request from queue
async function removeFromQueue(requestId) {
  try {
    const db = await openQueueDB();
    const transaction = db.transaction(["queuedRequests"], "readwrite");
    const store = transaction.objectStore("queuedRequests");

    return new Promise((resolve, reject) => {
      const request = store.delete(requestId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to remove request from queue:", error);
  }
}

// Increment retry count for failed request
async function incrementRetryCount(requestId) {
  try {
    const db = await openQueueDB();
    const transaction = db.transaction(["queuedRequests"], "readwrite");
    const store = transaction.objectStore("queuedRequests");

    return new Promise((resolve, reject) => {
      const getRequest = store.get(requestId);

      getRequest.onsuccess = () => {
        const request = getRequest.result;
        if (request) {
          request.retryCount = (request.retryCount || 0) + 1;
          request.lastRetryAt = Date.now();

          const putRequest = store.put(request);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(); // Request not found, might have been removed
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error("Failed to increment retry count:", error);
  }
}

// Mark request as failed (exceeded max retries)
async function markRequestAsFailed(requestId) {
  try {
    const db = await openQueueDB();
    const transaction = db.transaction(["queuedRequests"], "readwrite");
    const store = transaction.objectStore("queuedRequests");

    return new Promise((resolve, reject) => {
      const getRequest = store.get(requestId);

      getRequest.onsuccess = () => {
        const request = getRequest.result;
        if (request) {
          request.failed = true;
          request.failedAt = Date.now();

          const putRequest = store.put(request);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error("Failed to mark request as failed:", error);
  }
}

// Open IndexedDB for queue operations
async function openQueueDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("QRGuardianDB", 1);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("queuedRequests")) {
        const store = db.createObjectStore("queuedRequests", { keyPath: "id" });
        store.createIndex("priority", "priority", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("retryCount", "retryCount", { unique: false });
      }
    };
  });
}

// Utility function to broadcast messages to all clients
async function broadcastMessage(message) {
  try {
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach((client) => {
      client.postMessage(message);
    });
  } catch (error) {
    console.error("Failed to broadcast message:", error);
  }
}

// Push notification event listeners
// Requirement 4.4: When notifications are sent THEN they SHALL work even when the app is closed

// Handle push events for push notifications
self.addEventListener("push", (event) => {
  console.log("Push event received:", event);

  let notificationData = {
    title: "QR Guardian",
    body: "You have a new notification",
    icon: "/android-chrome-192x192.png",
    badge: "/android-chrome-192x192.png",
    tag: "default",
    data: {
      type: "general",
      url: "/",
    },
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData,
      };
    } catch (error) {
      console.error("Error parsing push data:", error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // Show the notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      actions: notificationData.actions || [],
      requireInteraction: notificationData.requireInteraction || false,
      vibrate: notificationData.vibrate || [200, 100, 200],
      silent: notificationData.silent || false,
    })
  );
});

// Handle notification click events
// Requirement 4.4: When notifications are sent THEN they SHALL work even when the app is closed
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  // Close the notification
  notification.close();

  // Handle different notification types and actions
  event.waitUntil(
    (async () => {
      try {
        switch (data.type) {
          case "update":
            if (action === "update") {
              // Trigger app update
              const clients = await self.clients.matchAll();
              if (clients.length > 0) {
                clients[0].postMessage({
                  type: "APPLY_UPDATE",
                  version: data.version,
                });
                return clients[0].focus();
              }
              return self.clients.openWindow("/");
            } else if (action === "dismiss") {
              // Just close the notification (already done above)
              return;
            }
            break;

          case "security":
            if (action === "view") {
              // Open app to security alert page
              return self.clients.openWindow(data.url || "/?alert=security");
            } else if (action === "dismiss") {
              // Just close the notification
              return;
            }
            break;

          default:
            // Open the app for general notifications
            const clients = await self.clients.matchAll();
            if (clients.length > 0) {
              return clients[0].focus();
            }
            return self.clients.openWindow(data.url || "/");
        }

        // Default behavior: focus existing window or open new one
        const clients = await self.clients.matchAll();
        if (clients.length > 0) {
          return clients[0].focus();
        }
        return self.clients.openWindow(data.url || "/");
      } catch (error) {
        console.error("Error handling notification click:", error);
        // Fallback: just open the app
        return self.clients.openWindow("/");
      }
    })()
  );
});

// Handle notification close events
self.addEventListener("notificationclose", (event) => {
  console.log("Notification closed:", event);

  const notification = event.notification;
  const data = notification.data || {};

  // Track notification dismissal for analytics if needed
  broadcastMessage({
    type: "NOTIFICATION_DISMISSED",
    payload: {
      tag: notification.tag,
      type: data.type,
      timestamp: Date.now(),
    },
  });
});

console.log("Service Worker loaded successfully");
