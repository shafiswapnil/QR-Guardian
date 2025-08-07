/**
 * Background Sync Manager
 * Handles background synchronization of offline requests
 */

import swManager from "./sw-manager.js";
import { queueDAO } from "./queue-dao.js";

class BackgroundSyncManager {
  constructor() {
    this.isSupported = this._checkSupport();
    this.listeners = new Map();
    this.syncInProgress = false;
    this.retryDelay = 1000; // 1 second base delay
    this.maxRetries = 3;

    // Initialize event listeners
    this._setupEventListeners();
  }

  /**
   * Check if background sync is supported
   */
  _checkSupport() {
    const nav = typeof navigator !== "undefined" ? navigator : global.navigator;
    const win = typeof window !== "undefined" ? window : global.window;

    return (
      nav &&
      "serviceWorker" in nav &&
      win &&
      win.ServiceWorkerRegistration &&
      "sync" in win.ServiceWorkerRegistration.prototype
    );
  }

  /**
   * Set up event listeners for service worker messages
   */
  _setupEventListeners() {
    // Listen for service worker messages
    swManager.on("message", (data) => {
      this._handleServiceWorkerMessage(data);
    });

    // Listen for network status changes
    const win = typeof window !== "undefined" ? window : global.window;

    if (win && typeof win.addEventListener === "function") {
      win.addEventListener("online", () => {
        this._handleNetworkOnline();
      });

      win.addEventListener("offline", () => {
        this._handleNetworkOffline();
      });
    }
  }

  /**
   * Handle service worker messages
   */
  _handleServiceWorkerMessage(data) {
    switch (data.type) {
      case "SYNC_COMPLETE":
        this._handleSyncComplete(data.payload);
        break;
      case "SYNC_FAILED":
        this._handleSyncFailed(data.payload);
        break;
      case "REQUEST_SYNCED":
        this._handleRequestSynced(data.payload);
        break;
      default:
        // Ignore unknown message types
        break;
    }
  }

  /**
   * Handle sync completion
   */
  _handleSyncComplete(payload) {
    console.log("Background sync completed:", payload);
    this.syncInProgress = false;
    this.emit("sync-complete", payload);
  }

  /**
   * Handle sync failure
   */
  _handleSyncFailed(payload) {
    console.error("Background sync failed:", payload);
    this.syncInProgress = false;
    this.emit("sync-failed", payload);
  }

  /**
   * Handle individual request sync
   */
  _handleRequestSynced(payload) {
    console.log("Request synced successfully:", payload);
    this.emit("request-synced", payload);
  }

  /**
   * Handle network coming online
   */
  _handleNetworkOnline() {
    console.log("Network online - triggering background sync");
    this.triggerSync();
  }

  /**
   * Handle network going offline
   */
  _handleNetworkOffline() {
    console.log("Network offline");
    this.emit("network-offline");
  }

  /**
   * Queue a request for background sync
   */
  async queueRequest(requestData) {
    try {
      // Validate request data
      if (!requestData.url) {
        throw new Error("Request URL is required");
      }

      // Add to local IndexedDB queue first
      const requestId = await queueDAO.queueRequest(requestData);

      if (!requestId) {
        throw new Error("Failed to queue request locally");
      }

      console.log("Request queued locally:", requestId);

      // If background sync is supported, also queue in service worker
      if (this.isSupported) {
        try {
          await swManager.postMessage(
            {
              type: "QUEUE_REQUEST",
              request: requestData,
            },
            true
          );

          console.log("Request queued in service worker");
        } catch (error) {
          console.warn(
            "Failed to queue in service worker, will rely on local queue:",
            error
          );
        }
      }

      // Try to trigger immediate sync if online
      if (navigator.onLine) {
        this.triggerSync();
      }

      this.emit("request-queued", { requestId, requestData });
      return requestId;
    } catch (error) {
      console.error("Failed to queue request:", error);
      this.emit("error", { type: "queue-failed", error });
      throw error;
    }
  }

  /**
   * Trigger background sync
   */
  async triggerSync() {
    const nav = typeof navigator !== "undefined" ? navigator : global.navigator;

    if (!nav || !nav.onLine) {
      console.log("Cannot trigger sync while offline");
      return false;
    }

    if (this.syncInProgress) {
      console.log("Sync already in progress");
      return false;
    }

    try {
      this.syncInProgress = true;
      this.emit("sync-started");

      // If background sync is supported, register it
      if (this.isSupported) {
        try {
          await swManager.postMessage(
            {
              type: "REGISTER_SYNC",
            },
            true
          );

          console.log("Background sync registered");
          return true;
        } catch (error) {
          console.warn(
            "Failed to register background sync, falling back to manual sync:",
            error
          );
        }
      }

      // Fallback to manual sync
      await this._manualSync();
      return true;
    } catch (error) {
      console.error("Failed to trigger sync:", error);
      this.syncInProgress = false;
      this.emit("error", { type: "sync-trigger-failed", error });
      return false;
    }
  }

  /**
   * Manual sync fallback when background sync is not available
   */
  async _manualSync() {
    try {
      console.log("Starting manual sync...");

      // Get all retryable requests
      const requests = await queueDAO.getRetryableRequests();

      if (requests.length === 0) {
        console.log("No requests to sync");
        this.syncInProgress = false;
        this.emit("sync-complete", { processedCount: 0 });
        return;
      }

      console.log(`Processing ${requests.length} queued requests manually`);

      let successCount = 0;
      let failureCount = 0;

      // Process requests in batches
      const batchSize = 5;
      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        const results = await this._processBatch(batch);

        results.forEach((result) => {
          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }
        });
      }

      console.log(
        `Manual sync completed: ${successCount} success, ${failureCount} failures`
      );

      this.syncInProgress = false;
      this.emit("sync-complete", {
        processedCount: successCount + failureCount,
        successCount,
        failureCount,
      });
    } catch (error) {
      console.error("Manual sync failed:", error);
      this.syncInProgress = false;
      this.emit("sync-failed", { error: error.message });
      throw error;
    }
  }

  /**
   * Process a batch of requests manually
   */
  async _processBatch(requests) {
    const promises = requests.map((request) => this._processRequest(request));
    return await Promise.allSettled(promises);
  }

  /**
   * Process individual request manually
   */
  async _processRequest(request) {
    try {
      // Skip requests that have exceeded max retries
      if (request.retryCount >= (request.maxRetries || this.maxRetries)) {
        console.warn("Request exceeded max retries:", request.id);
        await queueDAO.removeRequest(request.id);
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
        await queueDAO.removeRequest(request.id);

        console.log("Request processed successfully:", request.id);

        this.emit("request-synced", {
          requestId: request.id,
          url: request.url,
          method: request.method,
          status: response.status,
        });

        return { success: true, response };
      } else {
        // Request failed - increment retry count
        await queueDAO.incrementRetryCount(request.id);
        throw new Error(`Request failed with status: ${response.status}`);
      }
    } catch (error) {
      // Network or other error - increment retry count
      await queueDAO.incrementRetryCount(request.id);

      console.log(`Request ${request.id} failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    const nav = typeof navigator !== "undefined" ? navigator : global.navigator;

    return {
      isSupported: this.isSupported,
      syncInProgress: this.syncInProgress,
      isOnline: nav ? nav.onLine : false,
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      return await queueDAO.getQueueStatistics();
    } catch (error) {
      console.error("Failed to get queue stats:", error);
      return {
        total: 0,
        retryable: 0,
        failed: 0,
        byPriority: {},
        byMethod: {},
      };
    }
  }

  /**
   * Clear failed requests from queue
   */
  async clearFailedRequests() {
    try {
      const clearedCount = await queueDAO.clearFailedRequests();
      console.log(`Cleared ${clearedCount} failed requests`);
      this.emit("failed-requests-cleared", { count: clearedCount });
      return clearedCount;
    } catch (error) {
      console.error("Failed to clear failed requests:", error);
      this.emit("error", { type: "clear-failed-requests-error", error });
      throw error;
    }
  }

  /**
   * Clear entire queue
   */
  async clearQueue() {
    try {
      await queueDAO.clearQueue();
      console.log("Queue cleared");
      this.emit("queue-cleared");
      return true;
    } catch (error) {
      console.error("Failed to clear queue:", error);
      this.emit("error", { type: "clear-queue-error", error });
      throw error;
    }
  }

  /**
   * Retry failed requests
   */
  async retryFailedRequests() {
    try {
      const failedRequests = await queueDAO.getFailedRequests();

      if (failedRequests.length === 0) {
        console.log("No failed requests to retry");
        return 0;
      }

      // Reset retry count for failed requests
      for (const request of failedRequests) {
        await queueDAO.update(request.id, {
          retryCount: 0,
          failed: false,
          failedAt: null,
        });
      }

      console.log(`Reset ${failedRequests.length} failed requests for retry`);

      // Trigger sync
      await this.triggerSync();

      this.emit("failed-requests-retried", { count: failedRequests.length });
      return failedRequests.length;
    } catch (error) {
      console.error("Failed to retry failed requests:", error);
      this.emit("error", { type: "retry-failed-requests-error", error });
      throw error;
    }
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
          console.error("Error in background sync event listener:", error);
        }
      });
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Remove event listeners
    window.removeEventListener("online", this._handleNetworkOnline);
    window.removeEventListener("offline", this._handleNetworkOffline);

    // Clear listeners
    this.listeners.clear();

    // Reset state
    this.syncInProgress = false;
  }
}

// Create singleton instance
const backgroundSyncManager = new BackgroundSyncManager();

export default backgroundSyncManager;
