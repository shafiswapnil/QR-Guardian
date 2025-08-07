/**
 * Service Worker Manager
 * Handles service worker registration, updates, and communication
 */

class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.updateAvailable = false;
    this.listeners = new Map();
    this.isRegistering = false;
    this.registrationPromise = null;
    this.messageId = 0;
    this.pendingMessages = new Map();
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Register the service worker with enhanced error handling and retry logic
   */
  async register() {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service Worker not supported");
      this.emit("error", {
        type: "unsupported",
        message: "Service Worker not supported",
      });
      return false;
    }

    // Prevent multiple simultaneous registrations
    if (this.isRegistering) {
      return this.registrationPromise;
    }

    this.isRegistering = true;
    this.registrationPromise = this._attemptRegistration();

    try {
      const result = await this.registrationPromise;
      return result;
    } finally {
      this.isRegistering = false;
      this.registrationPromise = null;
    }
  }

  /**
   * Attempt service worker registration with retry logic
   */
  async _attemptRegistration() {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Determine service worker URL based on environment
        const swUrl = this._getServiceWorkerUrl();

        this.registration = await navigator.serviceWorker.register(swUrl, {
          scope: "/",
          updateViaCache: "imports",
        });

        console.log(
          "Service Worker registered successfully:",
          this.registration
        );
        this.retryCount = 0; // Reset retry count on success

        // Set up event listeners
        this._setupEventListeners();

        // Check for existing service worker states
        this._checkInitialState();

        this.emit("registered", this.registration);
        return true;
      } catch (error) {
        console.error(
          `Service Worker registration attempt ${attempt + 1} failed:`,
          error
        );

        // In development, try to handle VitePWA conflicts
        if (!import.meta.env.PROD && attempt === 0) {
          try {
            await this._handleVitePWAConflicts();
            continue; // Retry after handling conflicts
          } catch (conflictError) {
            console.warn("Failed to handle VitePWA conflicts:", conflictError);
          }
        }

        if (attempt === this.maxRetries) {
          this.emit("error", {
            type: "registration-failed",
            message: "Service Worker registration failed after retries",
            error,
          });
          return false;
        }

        // Wait before retrying
        await this._delay(this.retryDelay * Math.pow(2, attempt));
      }
    }
    return false;
  }

  /**
   * Set up event listeners for service worker lifecycle
   */
  _setupEventListeners() {
    if (!this.registration) return;

    // Listen for updates
    this.registration.addEventListener("updatefound", () => {
      this.handleUpdateFound();
    });

    // Listen for controller changes
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("Service Worker controller changed");
      this.emit("controllerchange");
      // Reload the page to ensure new service worker takes control
      if (!navigator.serviceWorker.controller) {
        window.location.reload();
      }
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      this._handleMessage(event);
    });

    // Listen for service worker errors
    navigator.serviceWorker.addEventListener("error", (error) => {
      console.error("Service Worker error:", error);
      this.emit("error", { type: "runtime-error", error });
    });
  }

  /**
   * Check initial service worker state
   */
  _checkInitialState() {
    if (!this.registration) return;

    if (this.registration.installing) {
      console.log("Service Worker is installing");
      this.emit("installing");
    } else if (this.registration.waiting) {
      console.log("Service Worker is waiting");
      this.updateAvailable = true;
      this.emit("waiting");
    } else if (this.registration.active) {
      console.log("Service Worker is active");
      this.emit("active");
    }
  }

  /**
   * Handle service worker update found with enhanced lifecycle tracking
   */
  handleUpdateFound() {
    const newWorker = this.registration.installing;

    if (!newWorker) return;

    console.log("New Service Worker found");
    this.emit("updatefound", newWorker);

    newWorker.addEventListener("statechange", () => {
      console.log("Service Worker state changed to:", newWorker.state);

      switch (newWorker.state) {
        case "installing":
          this.emit("installing", newWorker);
          break;

        case "installed":
          if (navigator.serviceWorker.controller) {
            console.log("New Service Worker installed, update available");
            this.updateAvailable = true;
            this.emit("updateavailable", newWorker);
          } else {
            console.log("Service Worker installed for the first time");
            this.emit("installed", newWorker);
          }
          break;

        case "activating":
          this.emit("activating", newWorker);
          break;

        case "activated":
          console.log("Service Worker activated");
          this.updateAvailable = false;
          this.emit("activated", newWorker);
          break;

        case "redundant":
          console.log("Service Worker became redundant");
          this.emit("redundant", newWorker);
          break;
      }
    });

    // Handle installation errors
    newWorker.addEventListener("error", (error) => {
      console.error("Service Worker installation error:", error);
      this.emit("error", {
        type: "installation-error",
        error,
        worker: newWorker,
      });
    });
  }

  /**
   * Skip waiting and activate new service worker with enhanced error handling
   */
  async skipWaiting() {
    if (!this.registration || !this.registration.waiting) {
      console.warn("No waiting service worker to skip");
      this.emit("error", {
        type: "no-waiting-worker",
        message: "No waiting service worker to skip",
      });
      return false;
    }

    try {
      console.log("Skipping waiting for new service worker");

      // Send skip waiting message to service worker with response handling
      const response = await this.postMessage({ type: "SKIP_WAITING" }, true);

      if (response && response.success) {
        this.emit("skipwaiting");
        return true;
      } else {
        throw new Error(
          "Skip waiting failed: " + (response?.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Failed to skip waiting:", error);
      this.emit("error", { type: "skip-waiting-failed", error });
      return false;
    }
  }

  /**
   * Unregister the service worker
   */
  async unregister() {
    if (!this.registration) {
      console.warn("No service worker to unregister");
      return false;
    }

    try {
      const result = await this.registration.unregister();
      console.log("Service Worker unregistered:", result);
      this.registration = null;
      return result;
    } catch (error) {
      console.error("Failed to unregister service worker:", error);
      return false;
    }
  }

  /**
   * Check for service worker updates with enhanced error handling
   */
  async checkForUpdates() {
    if (!this.registration) {
      console.warn("No service worker registered");
      this.emit("error", {
        type: "no-registration",
        message: "No service worker registered",
      });
      return false;
    }

    try {
      console.log("Checking for service worker updates...");
      await this.registration.update();
      console.log("Update check completed");
      this.emit("updatecheck");
      return true;
    } catch (error) {
      console.error("Failed to check for updates:", error);
      this.emit("error", { type: "update-check-failed", error });
      return false;
    }
  }

  /**
   * Force check for updates with retry logic
   */
  async forceUpdateCheck() {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const success = await this.checkForUpdates();
      if (success) return true;

      if (attempt < this.maxRetries - 1) {
        await this._delay(this.retryDelay);
      }
    }
    return false;
  }

  /**
   * Post message to service worker with optional response handling
   */
  postMessage(message, expectResponse = false) {
    if (!this.registration) {
      console.warn("No service worker to send message to");
      if (expectResponse) {
        return Promise.reject(new Error("No service worker registered"));
      }
      return;
    }

    const target =
      this.registration.active ||
      this.registration.waiting ||
      this.registration.installing;
    if (!target) {
      console.warn("No service worker available to receive message");
      if (expectResponse) {
        return Promise.reject(new Error("No service worker available"));
      }
      return;
    }

    if (expectResponse) {
      return new Promise((resolve, reject) => {
        const messageId = ++this.messageId;
        const messageWithId = { ...message, _messageId: messageId };

        // Set up timeout for response
        const timeout = setTimeout(() => {
          this.pendingMessages.delete(messageId);
          reject(new Error("Message response timeout"));
        }, 5000); // 5 second timeout

        // Store pending message
        this.pendingMessages.set(messageId, { resolve, reject, timeout });

        try {
          target.postMessage(messageWithId);
        } catch (error) {
          this.pendingMessages.delete(messageId);
          clearTimeout(timeout);
          reject(error);
        }
      });
    } else {
      try {
        target.postMessage(message);
      } catch (error) {
        console.error("Failed to send message to service worker:", error);
        this.emit("error", { type: "message-send-failed", error });
      }
    }
  }

  /**
   * Handle messages from service worker
   */
  _handleMessage(event) {
    const { data } = event;

    if (!data) return;

    // Handle response messages
    if (data._messageId && this.pendingMessages.has(data._messageId)) {
      const { resolve, timeout } = this.pendingMessages.get(data._messageId);
      clearTimeout(timeout);
      this.pendingMessages.delete(data._messageId);
      resolve(data);
      return;
    }

    // Handle broadcast messages
    switch (data.type) {
      case "CACHE_UPDATED":
        this.emit("cacheupdated", data.payload);
        break;
      case "OFFLINE_READY":
        this.emit("offlineready", data.payload);
        break;
      case "ERROR":
        this.emit("error", { type: "service-worker-error", ...data.payload });
        break;
      default:
        this.emit("message", data);
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
          console.error("Error in event listener:", error);
        }
      });
    }
  }

  /**
   * Get service worker status
   */
  getStatus() {
    if (!this.registration) {
      return "not-registered";
    }

    if (this.registration.installing) {
      return "installing";
    }

    if (this.registration.waiting) {
      return "waiting";
    }

    if (this.registration.active) {
      return "active";
    }

    return "unknown";
  }

  /**
   * Check if update is available
   */
  isUpdateAvailable() {
    return this.updateAvailable;
  }

  /**
   * Get detailed service worker information
   */
  getServiceWorkerInfo() {
    if (!this.registration) {
      return { status: "not-registered", registration: null };
    }

    return {
      status: this.getStatus(),
      registration: this.registration,
      updateAvailable: this.updateAvailable,
      scope: this.registration.scope,
      scriptURL: this.registration.active?.scriptURL || null,
      installing: !!this.registration.installing,
      waiting: !!this.registration.waiting,
      active: !!this.registration.active,
    };
  }

  /**
   * Reload the page and ensure new service worker takes control
   */
  async reloadWithNewServiceWorker() {
    if (!this.registration?.waiting) {
      console.warn("No waiting service worker to activate");
      return false;
    }

    try {
      // Skip waiting first
      await this.skipWaiting();

      // Wait a bit for the new service worker to take control
      await this._delay(100);

      // Reload the page
      window.location.reload();
      return true;
    } catch (error) {
      console.error("Failed to reload with new service worker:", error);
      this.emit("error", { type: "reload-failed", error });
      return false;
    }
  }

  /**
   * Clear all service worker caches
   */
  async clearCaches() {
    try {
      const cacheNames = await caches.keys();
      const deletePromises = cacheNames.map((cacheName) =>
        caches.delete(cacheName)
      );
      await Promise.all(deletePromises);

      console.log("All caches cleared");
      this.emit("cachescleared");
      return true;
    } catch (error) {
      console.error("Failed to clear caches:", error);
      this.emit("error", { type: "cache-clear-failed", error });
      return false;
    }
  }

  /**
   * Get cache storage usage information
   */
  async getCacheInfo() {
    try {
      const cacheNames = await caches.keys();
      const cacheInfo = [];

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        cacheInfo.push({
          name: cacheName,
          entryCount: keys.length,
          urls: keys.map((request) => request.url),
        });
      }

      return cacheInfo;
    } catch (error) {
      console.error("Failed to get cache info:", error);
      return [];
    }
  }

  /**
   * Get the appropriate service worker URL based on environment
   */
  _getServiceWorkerUrl() {
    if (import.meta.env.PROD) {
      return "/sw.js";
    } else {
      // In development, use a simple service worker without ES6 imports
      return "/dev-sw.js";
    }
  }

  /**
   * Handle VitePWA development configuration conflicts
   */
  async _handleVitePWAConflicts() {
    try {
      // Check for existing registrations
      const registrations = await navigator.serviceWorker.getRegistrations();

      for (const registration of registrations) {
        // Look for VitePWA dev service worker
        if (
          registration.scope === window.location.origin + "/" &&
          registration.active?.scriptURL.includes("dev-sw.js")
        ) {
          console.log(
            "Unregistering VitePWA dev service worker:",
            registration.active.scriptURL
          );
          await registration.unregister();
        }
      }

      // Wait a bit for cleanup
      await this._delay(100);
    } catch (error) {
      console.warn("Error handling VitePWA conflicts:", error);
      throw error;
    }
  }

  /**
   * Utility method for delays
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Clear pending messages
    this.pendingMessages.forEach(({ timeout }) => clearTimeout(timeout));
    this.pendingMessages.clear();

    // Clear listeners
    this.listeners.clear();

    // Reset state
    this.registration = null;
    this.updateAvailable = false;
    this.isRegistering = false;
    this.registrationPromise = null;
  }
}

// Create singleton instance
const swManager = new ServiceWorkerManager();

export default swManager;
