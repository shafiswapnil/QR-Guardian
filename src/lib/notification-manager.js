/**
 * NotificationManager - Handles push notifications and permission management
 * Implements requirements 4.1, 4.2, 4.3, 4.4
 */

class NotificationManager {
  constructor() {
    this.permission = "default";
    this.registration = null;
    this.isSupported = "Notification" in window && "serviceWorker" in navigator;

    // Initialize permission state
    if (this.isSupported) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Request notification permission from user
   * Requirement 4.3: When the user grants notification permission THEN they SHALL receive relevant app notifications
   */
  async requestPermission() {
    if (!this.isSupported) {
      console.warn("Notifications not supported in this browser");
      return false;
    }

    if (this.permission === "granted") {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;

      if (permission === "granted") {
        console.log("Notification permission granted");
        return true;
      } else {
        console.log("Notification permission denied");
        return false;
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }

  /**
   * Set service worker registration for push notifications
   */
  setServiceWorkerRegistration(registration) {
    this.registration = registration;
  }

  /**
   * Show a local notification
   * Requirement 4.2: When security threats are detected THEN the user SHALL receive appropriate alerts
   */
  async showNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== "granted") {
      console.warn(
        "Cannot show notification: permission not granted or not supported"
      );
      return false;
    }

    const defaultOptions = {
      icon: "/android-chrome-192x192.png",
      badge: "/android-chrome-192x192.png",
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false,
      ...options,
    };

    try {
      if (this.registration) {
        // Use service worker to show notification for better persistence
        await this.registration.showNotification(title, defaultOptions);
      } else {
        // Fallback to regular notification
        new Notification(title, defaultOptions);
      }
      return true;
    } catch (error) {
      console.error("Error showing notification:", error);
      return false;
    }
  }

  /**
   * Show update notification
   * Requirement 4.1: When the app has updates available THEN the user SHALL be notified through push notifications
   */
  async showUpdateNotification(version) {
    return this.showNotification("QR Guardian Update Available", {
      body: `Version ${version} is ready to install. Tap to update now.`,
      tag: "app-update",
      icon: "/android-chrome-192x192.png",
      actions: [
        {
          action: "update",
          title: "Update Now",
        },
        {
          action: "dismiss",
          title: "Later",
        },
      ],
      data: {
        type: "update",
        version: version,
        url: "/",
      },
      requireInteraction: true,
    });
  }

  /**
   * Show security alert notification
   * Requirement 4.2: When security threats are detected THEN the user SHALL receive appropriate alerts
   */
  async showSecurityAlert(threat) {
    return this.showNotification("Security Alert - QR Guardian", {
      body: `Potential security threat detected: ${threat.description}`,
      tag: "security-alert",
      icon: "/android-chrome-192x192.png",
      actions: [
        {
          action: "view",
          title: "View Details",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ],
      data: {
        type: "security",
        threat: threat,
        url: "/?alert=security",
      },
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 300],
    });
  }

  /**
   * Show general app notification
   */
  async showAppNotification(message, options = {}) {
    return this.showNotification("QR Guardian", {
      body: message,
      tag: "app-notification",
      ...options,
    });
  }

  /**
   * Get current permission status
   */
  getPermissionStatus() {
    return this.permission;
  }

  /**
   * Check if notifications are supported
   */
  isNotificationSupported() {
    return this.isSupported;
  }

  /**
   * Clear all notifications with a specific tag
   */
  async clearNotifications(tag) {
    if (!this.registration) {
      return;
    }

    try {
      const notifications = await this.registration.getNotifications({ tag });
      notifications.forEach((notification) => notification.close());
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  }

  /**
   * Handle notification click events (called from service worker)
   * Requirement 4.4: When notifications are sent THEN they SHALL work even when the app is closed
   */
  static handleNotificationClick(event) {
    const notification = event.notification;
    const action = event.action;
    const data = notification.data || {};

    notification.close();

    // Handle different notification types and actions
    switch (data.type) {
      case "update":
        if (action === "update") {
          // Trigger app update
          self.clients.matchAll().then((clients) => {
            if (clients.length > 0) {
              clients[0].postMessage({
                type: "APPLY_UPDATE",
                version: data.version,
              });
            }
          });
        }
        break;

      case "security":
        if (action === "view") {
          // Open app to security alert page
          self.clients.openWindow(data.url || "/");
        }
        break;

      default:
        // Open the app
        self.clients.openWindow(data.url || "/");
        break;
    }

    // Focus existing window if available
    return self.clients.matchAll().then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow(data.url || "/");
    });
  }
}

export default NotificationManager;
