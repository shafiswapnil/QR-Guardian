/**
 * Development Service Worker
 * Simple service worker for development mode without ES6 imports
 */

console.log("Development Service Worker loaded");

// Basic service worker lifecycle
self.addEventListener("install", (event) => {
  console.log("Development Service Worker installing...");
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Development Service Worker activating...");
  // Take control of all clients immediately
  event.waitUntil(self.clients.claim());
});

// Handle messages from the main thread
self.addEventListener("message", (event) => {
  const data = event.data;

  if (!data) return;

  const messageId = data._messageId;

  try {
    switch (data.type) {
      case "SKIP_WAITING":
        console.log("Received SKIP_WAITING message in dev mode");
        self.skipWaiting();

        // Send response if message ID is provided
        if (messageId) {
          if (event.ports[0]) {
            event.ports[0].postMessage({
              _messageId: messageId,
              success: true,
            });
          } else {
            self.clients.matchAll().then((clients) => {
              clients.forEach((client) => {
                client.postMessage({
                  _messageId: messageId,
                  success: true,
                });
              });
            });
          }
        }
        break;

      case "GET_CACHE_INFO":
        // Return empty cache info for development
        if (messageId) {
          if (event.ports[0]) {
            event.ports[0].postMessage({
              _messageId: messageId,
              success: true,
              data: [],
            });
          }
        }
        break;

      case "CLEAR_CACHE":
        // No-op for development
        if (messageId) {
          if (event.ports[0]) {
            event.ports[0].postMessage({
              _messageId: messageId,
              success: true,
            });
          }
        }
        break;

      default:
        console.log("Unknown message type in dev mode:", data.type);
        if (messageId) {
          if (event.ports[0]) {
            event.ports[0].postMessage({
              _messageId: messageId,
              error: "Unknown message type",
            });
          }
        }
    }
  } catch (error) {
    console.error("Error handling message in dev mode:", error);
    if (messageId) {
      if (event.ports[0]) {
        event.ports[0].postMessage({
          _messageId: messageId,
          error: error.message,
        });
      }
    }
  }
});

// Basic fetch handler - just pass through to network in development
self.addEventListener("fetch", (event) => {
  // In development, just pass through all requests
  // This prevents any caching issues during development
  return;
});

console.log("Development Service Worker ready");
