/**
 * Offline Manager
 * Handles offline functionality, network status monitoring, and data synchronization
 */

import backgroundSyncManager from "./background-sync-manager.js";

class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = new Map();
    this.requestQueue = [];
    this.dbName = "QRGuardianDB";
    this.dbVersion = 1;
    this.db = null;
    this.syncInProgress = false;

    // Initialize event listeners
    this._setupEventListeners();

    // Initialize IndexedDB
    this._initializeDB();

    // Set up background sync event listeners
    this._setupBackgroundSyncListeners();
  }

  /**
   * Set up background sync event listeners
   */
  _setupBackgroundSyncListeners() {
    // Listen for background sync events
    backgroundSyncManager.on("sync-complete", (data) => {
      console.log("Background sync completed:", data);
      this.emit("sync-completed", data);
    });

    backgroundSyncManager.on("sync-failed", (data) => {
      console.error("Background sync failed:", data);
      this.emit("sync-failed", data);
    });

    backgroundSyncManager.on("request-synced", (data) => {
      console.log("Request synced via background sync:", data);
      this.emit("request-synced", data);
    });

    backgroundSyncManager.on("error", (data) => {
      console.error("Background sync error:", data);
      this.emit("error", { type: "background-sync-error", ...data });
    });
  }

  /**
   * Set up network status event listeners
   */
  _setupEventListeners() {
    window.addEventListener("online", () => {
      console.log("Network status: Online");
      this.isOnline = true;
      this.emit("online");
      this._processRequestQueue();
    });

    window.addEventListener("offline", () => {
      console.log("Network status: Offline");
      this.isOnline = false;
      this.emit("offline");
    });

    // Listen for visibility change to check network status
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this._checkNetworkStatus();
      }
    });
  }

  /**
   * Initialize IndexedDB for offline storage
   */
  async _initializeDB() {
    if (!("indexedDB" in window)) {
      console.warn("IndexedDB not supported");
      this.emit("error", {
        type: "indexeddb-unsupported",
        message: "IndexedDB not supported",
      });
      return false;
    }

    try {
      this.db = await this._openDB();
      console.log("IndexedDB initialized successfully");
      this.emit("db-ready");
      return true;
    } catch (error) {
      console.error("Failed to initialize IndexedDB:", error);
      this.emit("error", { type: "db-init-failed", error });
      return false;
    }
  }

  /**
   * Open IndexedDB connection
   */
  _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create scan history store
        if (!db.objectStoreNames.contains("scanHistory")) {
          const scanStore = db.createObjectStore("scanHistory", {
            keyPath: "id",
            autoIncrement: true,
          });
          scanStore.createIndex("timestamp", "timestamp", { unique: false });
          scanStore.createIndex("synced", "synced", { unique: false });
        }

        // Create user preferences store
        if (!db.objectStoreNames.contains("userPreferences")) {
          db.createObjectStore("userPreferences", { keyPath: "key" });
        }

        // Create request queue store
        if (!db.objectStoreNames.contains("requestQueue")) {
          const queueStore = db.createObjectStore("requestQueue", {
            keyPath: "id",
            autoIncrement: true,
          });
          queueStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        console.log("IndexedDB schema created/updated");
      };
    });
  }

  /**
   * Check current network status
   */
  _checkNetworkStatus() {
    const wasOnline = this.isOnline;
    this.isOnline = navigator.onLine;

    if (wasOnline !== this.isOnline) {
      if (this.isOnline) {
        this.emit("online");
        this._processRequestQueue();
      } else {
        this.emit("offline");
      }
    }
  }

  /**
   * Get current online status
   */
  getOnlineStatus() {
    return this.isOnline;
  }

  /**
   * Store scan history item offline
   */
  async storeScanHistory(scanData) {
    if (!this.db) {
      console.warn("Database not initialized");
      return false;
    }

    try {
      const transaction = this.db.transaction(["scanHistory"], "readwrite");
      const store = transaction.objectStore("scanHistory");

      const scanItem = {
        ...scanData,
        timestamp: scanData.timestamp || new Date().toISOString(),
        synced: false,
        offline: !this.isOnline,
      };

      await this._promisifyRequest(store.add(scanItem));
      console.log("Scan history stored offline:", scanItem);

      this.emit("scan-stored", scanItem);
      return true;
    } catch (error) {
      console.error("Failed to store scan history:", error);
      this.emit("error", { type: "store-scan-failed", error });
      return false;
    }
  }

  /**
   * Get all scan history from IndexedDB
   */
  async getScanHistory() {
    if (!this.db) {
      console.warn("Database not initialized");
      return [];
    }

    try {
      const transaction = this.db.transaction(["scanHistory"], "readonly");
      const store = transaction.objectStore("scanHistory");
      const index = store.index("timestamp");

      const request = index.openCursor(null, "prev"); // Get newest first
      const results = [];

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };

        request.onerror = () => {
          reject(new Error("Failed to get scan history"));
        };
      });
    } catch (error) {
      console.error("Failed to get scan history:", error);
      return [];
    }
  }

  /**
   * Store user preferences offline
   */
  async storeUserPreference(key, value) {
    if (!this.db) {
      console.warn("Database not initialized");
      return false;
    }

    try {
      const transaction = this.db.transaction(["userPreferences"], "readwrite");
      const store = transaction.objectStore("userPreferences");

      await this._promisifyRequest(
        store.put({ key, value, timestamp: Date.now() })
      );
      console.log("User preference stored:", key, value);

      this.emit("preference-stored", { key, value });
      return true;
    } catch (error) {
      console.error("Failed to store user preference:", error);
      return false;
    }
  }

  /**
   * Get user preference from IndexedDB
   */
  async getUserPreference(key) {
    if (!this.db) {
      console.warn("Database not initialized");
      return null;
    }

    try {
      const transaction = this.db.transaction(["userPreferences"], "readonly");
      const store = transaction.objectStore("userPreferences");

      const result = await this._promisifyRequest(store.get(key));
      return result ? result.value : null;
    } catch (error) {
      console.error("Failed to get user preference:", error);
      return null;
    }
  }

  /**
   * Queue request for later processing when online
   */
  async queueRequest(requestData) {
    try {
      // Use background sync manager for queuing
      const requestId = await backgroundSyncManager.queueRequest(requestData);
      console.log("Request queued for background sync:", requestId);

      this.emit("request-queued", { requestId, requestData });
      return requestId;
    } catch (error) {
      console.error("Failed to queue request for background sync:", error);

      // Fallback to in-memory queue
      this.requestQueue.push(requestData);
      this.emit("request-queued", { requestData, fallback: true });
      return false;
    }
  }

  /**
   * Process queued requests when online
   */
  async _processRequestQueue() {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    console.log("Processing request queue...");

    try {
      // Trigger background sync for modern browsers
      await backgroundSyncManager.triggerSync();

      // Process in-memory queue as fallback
      for (const request of this.requestQueue) {
        await this._processQueuedRequest(request);
      }
      this.requestQueue = [];

      console.log("Request queue processing completed");
      this.emit("sync-completed");
    } catch (error) {
      console.error("Failed to process request queue:", error);
      this.emit("error", { type: "sync-failed", error });
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get queued requests from IndexedDB
   */
  async _getQueuedRequests() {
    if (!this.db) return [];

    try {
      const transaction = this.db.transaction(["requestQueue"], "readonly");
      const store = transaction.objectStore("requestQueue");

      return await this._promisifyRequest(store.getAll());
    } catch (error) {
      console.error("Failed to get queued requests:", error);
      return [];
    }
  }

  /**
   * Process a single queued request
   */
  async _processQueuedRequest(request) {
    try {
      // Skip requests that have failed too many times
      if (request.retryCount && request.retryCount >= 3) {
        console.warn("Request exceeded retry limit:", request);
        return true; // Remove from queue
      }

      const response = await fetch(request.url, {
        method: request.method || "GET",
        headers: request.headers || {},
        body: request.body || null,
      });

      if (response.ok) {
        console.log("Queued request processed successfully:", request);
        this.emit("request-synced", { request, response });
        return true;
      } else {
        console.warn("Queued request failed:", response.status, request);
        return false;
      }
    } catch (error) {
      console.error("Failed to process queued request:", error);
      return false;
    }
  }

  /**
   * Remove request from queue
   */
  async _removeFromQueue(requestId) {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(["requestQueue"], "readwrite");
      const store = transaction.objectStore("requestQueue");

      await this._promisifyRequest(store.delete(requestId));
    } catch (error) {
      console.error("Failed to remove request from queue:", error);
    }
  }

  /**
   * Increment retry count for failed request
   */
  async _incrementRetryCount(requestId) {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(["requestQueue"], "readwrite");
      const store = transaction.objectStore("requestQueue");

      const request = await this._promisifyRequest(store.get(requestId));
      if (request) {
        request.retryCount = (request.retryCount || 0) + 1;
        await this._promisifyRequest(store.put(request));
      }
    } catch (error) {
      console.error("Failed to increment retry count:", error);
    }
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData() {
    if (!this.db) {
      console.warn("Database not initialized");
      return false;
    }

    try {
      const transaction = this.db.transaction(
        ["scanHistory", "userPreferences", "requestQueue"],
        "readwrite"
      );

      await Promise.all([
        this._promisifyRequest(transaction.objectStore("scanHistory").clear()),
        this._promisifyRequest(
          transaction.objectStore("userPreferences").clear()
        ),
        this._promisifyRequest(transaction.objectStore("requestQueue").clear()),
      ]);

      console.log("All offline data cleared");
      this.emit("data-cleared");
      return true;
    } catch (error) {
      console.error("Failed to clear offline data:", error);
      return false;
    }
  }

  /**
   * Get offline storage usage statistics
   */
  async getStorageStats() {
    if (!this.db) {
      return { scanHistory: 0, userPreferences: 0, requestQueue: 0 };
    }

    try {
      const transaction = this.db.transaction(
        ["scanHistory", "userPreferences", "requestQueue"],
        "readonly"
      );

      const [scanCount, prefCount, queueCount] = await Promise.all([
        this._promisifyRequest(transaction.objectStore("scanHistory").count()),
        this._promisifyRequest(
          transaction.objectStore("userPreferences").count()
        ),
        this._promisifyRequest(transaction.objectStore("requestQueue").count()),
      ]);

      // Get background sync queue stats
      const backgroundSyncStats = await backgroundSyncManager.getQueueStats();

      return {
        scanHistory: scanCount,
        userPreferences: prefCount,
        requestQueue: queueCount,
        backgroundSync: backgroundSyncStats,
      };
    } catch (error) {
      console.error("Failed to get storage stats:", error);
      return {
        scanHistory: 0,
        userPreferences: 0,
        requestQueue: 0,
        backgroundSync: {},
      };
    }
  }

  /**
   * Get background sync status
   */
  getBackgroundSyncStatus() {
    return backgroundSyncManager.getSyncStatus();
  }

  /**
   * Trigger background sync manually
   */
  async triggerBackgroundSync() {
    try {
      const result = await backgroundSyncManager.triggerSync();
      this.emit("sync-triggered", { success: result });
      return result;
    } catch (error) {
      console.error("Failed to trigger background sync:", error);
      this.emit("error", { type: "sync-trigger-failed", error });
      return false;
    }
  }

  /**
   * Clear failed background sync requests
   */
  async clearFailedSyncRequests() {
    try {
      const count = await backgroundSyncManager.clearFailedRequests();
      this.emit("failed-requests-cleared", { count });
      return count;
    } catch (error) {
      console.error("Failed to clear failed sync requests:", error);
      this.emit("error", { type: "clear-failed-sync-requests-failed", error });
      return 0;
    }
  }

  /**
   * Retry failed background sync requests
   */
  async retryFailedSyncRequests() {
    try {
      const count = await backgroundSyncManager.retryFailedRequests();
      this.emit("failed-requests-retried", { count });
      return count;
    } catch (error) {
      console.error("Failed to retry failed sync requests:", error);
      this.emit("error", { type: "retry-failed-sync-requests-failed", error });
      return 0;
    }
  }

  /**
   * Convert IndexedDB request to Promise
   */
  _promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("Error in offline manager event listener:", error);
        }
      });
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Remove event listeners
    window.removeEventListener("online", this._handleOnline);
    window.removeEventListener("offline", this._handleOffline);
    document.removeEventListener(
      "visibilitychange",
      this._handleVisibilityChange
    );

    // Clean up background sync manager
    backgroundSyncManager.destroy();

    // Close database connection
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    // Clear listeners
    this.listeners.clear();

    // Clear request queue
    this.requestQueue = [];
  }
}

// Create singleton instance
const offlineManager = new OfflineManager();

export default offlineManager;
