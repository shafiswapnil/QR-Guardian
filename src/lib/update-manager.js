/**
 * Update Manager
 * Handles app update detection, user prompts, and seamless update application
 */

import swManager from "./sw-manager.js";

class UpdateManager {
  constructor() {
    this.updateAvailable = false;
    this.updatePromptShown = false;
    this.listeners = new Map();
    this.updateCheckInterval = null;
    this.updateCheckFrequency = 30 * 60 * 1000; // 30 minutes
    this.promptDelay = 5000; // 5 seconds delay before showing prompt
    this.maxPromptAttempts = 3;
    this.promptAttempts = 0;
    this.lastUpdateCheck = null;
    this.updateMetadata = null;
    this.rollbackData = null;
    this.isUpdating = false;

    this._setupServiceWorkerListeners();
  }

  /**
   * Initialize update manager
   */
  async initialize() {
    try {
      // Load rollback data from localStorage
      this._loadRollbackData();

      // Check for updates on initialization
      await this.checkForUpdates();

      // Start periodic update checks
      this.startPeriodicUpdateChecks();

      // Listen for visibility changes to check for updates when app becomes visible
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
          this.checkForUpdates();
        }
      });

      this.emit("initialized");
      console.log("UpdateManager initialized");
      return true;
    } catch (error) {
      console.error("Failed to initialize UpdateManager:", error);
      this.emit("error", { type: "initialization-failed", error });
      return false;
    }
  }

  /**
   * Set up service worker event listeners
   */
  _setupServiceWorkerListeners() {
    swManager.on("updateavailable", (worker) => {
      this._handleUpdateAvailable(worker);
    });

    swManager.on("activated", (worker) => {
      this._handleUpdateActivated(worker);
    });

    swManager.on("error", (error) => {
      this._handleServiceWorkerError(error);
    });

    swManager.on("controllerchange", () => {
      this._handleControllerChange();
    });
  }

  /**
   * Handle update available from service worker
   */
  _handleUpdateAvailable(worker) {
    console.log("Update available detected");
    this.updateAvailable = true;
    this.updateMetadata = {
      timestamp: Date.now(),
      worker: worker,
      version: this._extractVersionFromWorker(worker),
    };

    this.emit("updateavailable", this.updateMetadata);

    // Show update prompt after delay
    setTimeout(() => {
      this.showUpdatePrompt();
    }, this.promptDelay);
  }

  /**
   * Handle update activated
   */
  _handleUpdateActivated(worker) {
    console.log("Update activated");
    this.updateAvailable = false;
    this.updatePromptShown = false;
    this.promptAttempts = 0;
    this.isUpdating = false;

    // Clear rollback data on successful update
    this._clearRollbackData();

    this.emit("updateactivated", {
      timestamp: Date.now(),
      worker: worker,
      version: this._extractVersionFromWorker(worker),
    });
  }

  /**
   * Handle service worker errors
   */
  _handleServiceWorkerError(error) {
    const errorMessage =
      error?.message || error?.toString() || "Unknown service worker error";
    console.error("Service worker error in UpdateManager:", errorMessage);

    // If update fails, attempt rollback
    if (this.isUpdating && error?.type === "installation-error") {
      this._attemptRollback(error);
    }

    this.emit("error", { type: "service-worker-error", error: errorMessage });
  }

  /**
   * Handle controller change
   */
  _handleControllerChange() {
    console.log("Service worker controller changed");
    this.emit("controllerchange");
  }

  /**
   * Check for updates
   */
  async checkForUpdates() {
    try {
      console.log("Checking for updates...");
      this.lastUpdateCheck = Date.now();

      const result = await swManager.checkForUpdates();

      if (result) {
        this.emit("updatecheck", { timestamp: this.lastUpdateCheck });
      }

      return result;
    } catch (error) {
      console.error("Failed to check for updates:", error);
      this.emit("error", { type: "update-check-failed", error });
      return false;
    }
  }

  /**
   * Show update prompt to user
   */
  showUpdatePrompt() {
    if (!this.updateAvailable || this.updatePromptShown) {
      return false;
    }

    if (this.promptAttempts >= this.maxPromptAttempts) {
      console.log("Max prompt attempts reached, showing banner instead");
      this.showUpdateBanner();
      return false;
    }

    this.updatePromptShown = true;
    this.promptAttempts++;

    const promptData = {
      title: "Update Available",
      message:
        "A new version of QR Guardian is available. Would you like to update now?",
      version: this.updateMetadata?.version,
      timestamp: Date.now(),
      attempt: this.promptAttempts,
    };

    this.emit("updateprompt", promptData);
    console.log("Update prompt shown");
    return true;
  }

  /**
   * Show update banner (less intrusive than prompt)
   */
  showUpdateBanner() {
    const bannerData = {
      title: "Update Available",
      message: "A new version is ready to install",
      version: this.updateMetadata?.version,
      timestamp: Date.now(),
      persistent: true,
    };

    this.emit("updatebanner", bannerData);
    console.log("Update banner shown");
  }

  /**
   * Apply update (skip waiting and reload)
   */
  async applyUpdate() {
    if (!this.updateAvailable) {
      console.warn("No update available to apply");
      this.emit("error", {
        type: "no-update-available",
        message: "No update available to apply",
      });
      return false;
    }

    try {
      console.log("Applying update...");
      this.isUpdating = true;

      // Save rollback data before updating
      this._saveRollbackData();

      this.emit("updatestarted", { timestamp: Date.now() });

      // Skip waiting to activate new service worker
      const skipResult = await swManager.skipWaiting();

      if (!skipResult) {
        throw new Error("Failed to skip waiting");
      }

      // Wait a moment for the new service worker to take control
      await this._delay(500);

      // Reload the page to complete the update
      this.emit("updateapplying", { timestamp: Date.now() });
      window.location.reload();

      return true;
    } catch (error) {
      console.error("Failed to apply update:", error);
      this.isUpdating = false;
      this.emit("error", { type: "update-apply-failed", error });

      // Attempt rollback on failure
      await this._attemptRollback(error);
      return false;
    }
  }

  /**
   * Dismiss update prompt
   */
  dismissUpdatePrompt() {
    this.updatePromptShown = false;
    this.emit("updatepromptdismissed", { timestamp: Date.now() });

    // Show banner after dismissing prompt
    setTimeout(() => {
      this.showUpdateBanner();
    }, 60000); // Show banner after 1 minute
  }

  /**
   * Postpone update
   */
  postponeUpdate(duration = 3600000) {
    // Default 1 hour
    this.updatePromptShown = false;
    this.emit("updatepostponed", {
      timestamp: Date.now(),
      duration: duration,
    });

    // Show prompt again after duration
    setTimeout(() => {
      if (this.updateAvailable) {
        this.showUpdatePrompt();
      }
    }, duration);
  }

  /**
   * Start periodic update checks
   */
  startPeriodicUpdateChecks() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }

    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.updateCheckFrequency);

    console.log(
      `Started periodic update checks every ${
        this.updateCheckFrequency / 1000 / 60
      } minutes`
    );
  }

  /**
   * Stop periodic update checks
   */
  stopPeriodicUpdateChecks() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
      console.log("Stopped periodic update checks");
    }
  }

  /**
   * Save rollback data
   */
  _saveRollbackData() {
    try {
      const rollbackData = {
        timestamp: Date.now(),
        currentVersion: this._getCurrentVersion(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        swInfo: swManager.getServiceWorkerInfo(),
      };

      localStorage.setItem(
        "qr-guardian-rollback",
        JSON.stringify(rollbackData)
      );
      this.rollbackData = rollbackData;
      console.log("Rollback data saved");
    } catch (error) {
      console.error("Failed to save rollback data:", error);
    }
  }

  /**
   * Load rollback data
   */
  _loadRollbackData() {
    try {
      const stored = localStorage.getItem("qr-guardian-rollback");
      if (stored) {
        this.rollbackData = JSON.parse(stored);
        console.log("Rollback data loaded");
      }
    } catch (error) {
      console.error("Failed to load rollback data:", error);
      this._clearRollbackData();
    }
  }

  /**
   * Clear rollback data
   */
  _clearRollbackData() {
    try {
      localStorage.removeItem("qr-guardian-rollback");
      this.rollbackData = null;
      console.log("Rollback data cleared");
    } catch (error) {
      console.error("Failed to clear rollback data:", error);
    }
  }

  /**
   * Attempt rollback on update failure
   */
  async _attemptRollback(error) {
    if (!this.rollbackData) {
      console.warn("No rollback data available");
      this.emit("rollbackfailed", {
        reason: "no-rollback-data",
        error: error,
      });
      return false;
    }

    try {
      console.log("Attempting rollback...");
      this.emit("rollbackstarted", {
        timestamp: Date.now(),
        rollbackData: this.rollbackData,
        error: error,
      });

      // Clear current caches
      await swManager.clearCaches();

      // Unregister current service worker
      await swManager.unregister();

      // Wait a moment
      await this._delay(1000);

      // Re-register service worker (this should get the previous version from cache)
      await swManager.register();

      this.emit("rollbackcompleted", {
        timestamp: Date.now(),
        rollbackData: this.rollbackData,
      });

      console.log("Rollback completed successfully");
      return true;
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError);
      this.emit("rollbackfailed", {
        reason: "rollback-error",
        error: rollbackError,
        originalError: error,
      });
      return false;
    }
  }

  /**
   * Get current app version
   */
  _getCurrentVersion() {
    // Try to get version from various sources
    const metaVersion = document.querySelector('meta[name="version"]');
    if (metaVersion) {
      return metaVersion.content;
    }

    // Fallback to timestamp or build info
    const buildTime = document.querySelector('meta[name="build-time"]');
    if (buildTime) {
      return buildTime.content;
    }

    // Last resort: use current timestamp
    return Date.now().toString();
  }

  /**
   * Extract version from service worker
   */
  _extractVersionFromWorker(worker) {
    if (!worker || !worker.scriptURL) {
      return "unknown";
    }

    // Try to extract version from URL parameters or timestamp
    const url = new URL(worker.scriptURL);
    const version =
      url.searchParams.get("v") || url.searchParams.get("version");

    if (version) {
      return version;
    }

    // Fallback to timestamp
    return Date.now().toString();
  }

  /**
   * Get update status
   */
  getUpdateStatus() {
    return {
      updateAvailable: this.updateAvailable,
      updatePromptShown: this.updatePromptShown,
      promptAttempts: this.promptAttempts,
      lastUpdateCheck: this.lastUpdateCheck,
      isUpdating: this.isUpdating,
      updateMetadata: this.updateMetadata,
      hasRollbackData: !!this.rollbackData,
    };
  }

  /**
   * Force update check
   */
  async forceUpdateCheck() {
    console.log("Forcing update check...");
    return await swManager.forceUpdateCheck();
  }

  /**
   * Set update check frequency
   */
  setUpdateCheckFrequency(frequency) {
    this.updateCheckFrequency = frequency;

    // Restart periodic checks with new frequency
    if (this.updateCheckInterval) {
      this.stopPeriodicUpdateChecks();
      this.startPeriodicUpdateChecks();
    }

    console.log(
      `Update check frequency set to ${frequency / 1000 / 60} minutes`
    );
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
          console.error("Error in UpdateManager event listener:", error);
        }
      });
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
    // Stop periodic checks
    this.stopPeriodicUpdateChecks();

    // Clear listeners
    this.listeners.clear();

    // Reset state
    this.updateAvailable = false;
    this.updatePromptShown = false;
    this.promptAttempts = 0;
    this.isUpdating = false;
    this.updateMetadata = null;

    console.log("UpdateManager destroyed");
  }
}

// Create singleton instance
const updateManager = new UpdateManager();

export default updateManager;
