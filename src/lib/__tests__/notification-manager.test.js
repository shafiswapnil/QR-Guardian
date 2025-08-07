/**
 * NotificationManager Tests
 * Tests for push notification system implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import NotificationManager from "../notification-manager.js";
import {
  updateNotificationTemplate,
  securityAlertTemplate,
  getNotificationTemplate,
  validateNotificationTemplate,
} from "../notification-templates.js";

// Mock global objects
const mockNotification = vi.fn();
const mockServiceWorkerRegistration = {
  showNotification: vi.fn().mockResolvedValue(undefined),
  getNotifications: vi.fn().mockResolvedValue([]),
};

// Setup global mocks
beforeEach(() => {
  // Mock Notification API
  global.Notification = mockNotification;
  global.Notification.permission = "default";
  global.Notification.requestPermission = vi.fn().mockResolvedValue("granted");

  // Mock navigator
  global.navigator = {
    serviceWorker: {
      ready: Promise.resolve(mockServiceWorkerRegistration),
    },
  };

  // Mock window
  global.window = {
    Notification: global.Notification,
  };

  // Reset mocks
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NotificationManager", () => {
  describe("Constructor and Initialization", () => {
    it("should initialize with correct default values", () => {
      const manager = new NotificationManager();

      expect(manager.permission).toBe("default");
      expect(manager.registration).toBe(null);
      expect(manager.isSupported).toBe(true);
    });

    it("should detect when notifications are not supported", () => {
      // Temporarily remove Notification from global
      const originalNotification = global.Notification;
      delete global.Notification;
      delete global.window.Notification;

      const manager = new NotificationManager();
      expect(manager.isSupported).toBe(false);

      // Restore
      global.Notification = originalNotification;
      global.window.Notification = originalNotification;
    });
  });

  describe("Permission Management", () => {
    it("should request notification permission successfully", async () => {
      const manager = new NotificationManager();

      const result = await manager.requestPermission();

      expect(global.Notification.requestPermission).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(manager.permission).toBe("granted");
    });

    it("should handle permission denial", async () => {
      global.Notification.requestPermission = vi
        .fn()
        .mockResolvedValue("denied");

      const manager = new NotificationManager();
      const result = await manager.requestPermission();

      expect(result).toBe(false);
      expect(manager.permission).toBe("denied");
    });

    it("should return true if permission already granted", async () => {
      global.Notification.permission = "granted";

      const manager = new NotificationManager();
      const result = await manager.requestPermission();

      expect(result).toBe(true);
      expect(global.Notification.requestPermission).not.toHaveBeenCalled();
    });

    it("should handle permission request errors", async () => {
      global.Notification.requestPermission = vi
        .fn()
        .mockRejectedValue(new Error("Permission error"));

      const manager = new NotificationManager();
      const result = await manager.requestPermission();

      expect(result).toBe(false);
    });
  });

  describe("Service Worker Integration", () => {
    it("should set service worker registration", () => {
      const manager = new NotificationManager();

      manager.setServiceWorkerRegistration(mockServiceWorkerRegistration);

      expect(manager.registration).toBe(mockServiceWorkerRegistration);
    });
  });

  describe("Notification Display", () => {
    beforeEach(() => {
      global.Notification.permission = "granted";
    });

    it("should show notification with service worker when available", async () => {
      const manager = new NotificationManager();
      manager.setServiceWorkerRegistration(mockServiceWorkerRegistration);

      const result = await manager.showNotification("Test Title", {
        body: "Test Body",
      });

      expect(result).toBe(true);
      expect(
        mockServiceWorkerRegistration.showNotification
      ).toHaveBeenCalledWith(
        "Test Title",
        expect.objectContaining({
          body: "Test Body",
          icon: "/android-chrome-192x192.png",
          badge: "/android-chrome-192x192.png",
          vibrate: [200, 100, 200],
        })
      );
    });

    it("should fallback to regular notification when service worker unavailable", async () => {
      const manager = new NotificationManager();

      const result = await manager.showNotification("Test Title", {
        body: "Test Body",
      });

      expect(result).toBe(true);
      expect(mockNotification).toHaveBeenCalledWith(
        "Test Title",
        expect.objectContaining({
          body: "Test Body",
          icon: "/android-chrome-192x192.png",
        })
      );
    });

    it("should not show notification without permission", async () => {
      global.Notification.permission = "denied";
      const manager = new NotificationManager();

      const result = await manager.showNotification("Test Title");

      expect(result).toBe(false);
      expect(
        mockServiceWorkerRegistration.showNotification
      ).not.toHaveBeenCalled();
      expect(mockNotification).not.toHaveBeenCalled();
    });

    it("should handle notification display errors", async () => {
      mockServiceWorkerRegistration.showNotification.mockRejectedValue(
        new Error("Display error")
      );

      const manager = new NotificationManager();
      manager.setServiceWorkerRegistration(mockServiceWorkerRegistration);

      const result = await manager.showNotification("Test Title");

      expect(result).toBe(false);
    });
  });

  describe("Specialized Notifications", () => {
    beforeEach(() => {
      global.Notification.permission = "granted";
    });

    it("should show update notification with correct template", async () => {
      const manager = new NotificationManager();
      manager.setServiceWorkerRegistration(mockServiceWorkerRegistration);

      const result = await manager.showUpdateNotification("2.1.0");

      expect(result).toBe(true);
      expect(
        mockServiceWorkerRegistration.showNotification
      ).toHaveBeenCalledWith(
        "QR Guardian Update Available",
        expect.objectContaining({
          body: "Version 2.1.0 is ready to install. Tap to update now.",
          tag: "app-update",
          requireInteraction: true,
          actions: expect.arrayContaining([
            expect.objectContaining({ action: "update", title: "Update Now" }),
            expect.objectContaining({ action: "dismiss", title: "Later" }),
          ]),
        })
      );
    });

    it("should show security alert notification", async () => {
      const manager = new NotificationManager();
      manager.setServiceWorkerRegistration(mockServiceWorkerRegistration);

      const threat = {
        description: "Malicious URL detected",
        severity: "high",
      };

      const result = await manager.showSecurityAlert(threat);

      expect(result).toBe(true);
      expect(
        mockServiceWorkerRegistration.showNotification
      ).toHaveBeenCalledWith(
        "Security Alert - QR Guardian",
        expect.objectContaining({
          body: "Potential security threat detected: Malicious URL detected",
          tag: "security-alert",
          requireInteraction: true,
          vibrate: [300, 100, 300, 100, 300],
        })
      );
    });

    it("should show general app notification", async () => {
      const manager = new NotificationManager();
      manager.setServiceWorkerRegistration(mockServiceWorkerRegistration);

      const result = await manager.showAppNotification("Test message", {
        tag: "test",
      });

      expect(result).toBe(true);
      expect(
        mockServiceWorkerRegistration.showNotification
      ).toHaveBeenCalledWith(
        "QR Guardian",
        expect.objectContaining({
          body: "Test message",
          tag: "test",
        })
      );
    });
  });

  describe("Notification Management", () => {
    it("should clear notifications by tag", async () => {
      const mockNotifications = [{ close: vi.fn() }, { close: vi.fn() }];
      mockServiceWorkerRegistration.getNotifications.mockResolvedValue(
        mockNotifications
      );

      const manager = new NotificationManager();
      manager.setServiceWorkerRegistration(mockServiceWorkerRegistration);

      await manager.clearNotifications("test-tag");

      expect(
        mockServiceWorkerRegistration.getNotifications
      ).toHaveBeenCalledWith({ tag: "test-tag" });
      expect(mockNotifications[0].close).toHaveBeenCalled();
      expect(mockNotifications[1].close).toHaveBeenCalled();
    });

    it("should handle clear notifications errors gracefully", async () => {
      mockServiceWorkerRegistration.getNotifications.mockRejectedValue(
        new Error("Clear error")
      );

      const manager = new NotificationManager();
      manager.setServiceWorkerRegistration(mockServiceWorkerRegistration);

      // Should not throw
      await expect(
        manager.clearNotifications("test-tag")
      ).resolves.toBeUndefined();
    });
  });

  describe("Status Methods", () => {
    it("should return correct permission status", () => {
      global.Notification.permission = "granted";
      const manager = new NotificationManager();

      expect(manager.getPermissionStatus()).toBe("granted");
    });

    it("should return correct support status", () => {
      const manager = new NotificationManager();

      expect(manager.isNotificationSupported()).toBe(true);
    });
  });

  describe("Static Methods", () => {
    it("should handle notification click events correctly", async () => {
      const mockEvent = {
        notification: {
          close: vi.fn(),
          data: {
            type: "update",
            version: "2.1.0",
            url: "/",
          },
        },
        action: "update",
      };

      const mockClients = [{ postMessage: vi.fn(), focus: vi.fn() }];
      global.self = {
        clients: {
          matchAll: vi.fn().mockResolvedValue(mockClients),
          openWindow: vi.fn(),
        },
      };

      await NotificationManager.handleNotificationClick(mockEvent);

      expect(mockEvent.notification.close).toHaveBeenCalled();
      expect(mockClients[0].postMessage).toHaveBeenCalledWith({
        type: "APPLY_UPDATE",
        version: "2.1.0",
      });
    });
  });
});

describe("Notification Templates", () => {
  describe("Template Generation", () => {
    it("should generate update notification template", () => {
      const template = updateNotificationTemplate("2.1.0");

      expect(template.title).toBe("QR Guardian Update Available");
      expect(template.body).toContain("Version 2.1.0");
      expect(template.tag).toBe("app-update");
      expect(template.requireInteraction).toBe(true);
      expect(template.actions).toHaveLength(2);
      expect(template.data.type).toBe("update");
      expect(template.data.version).toBe("2.1.0");
    });

    it("should generate security alert template", () => {
      const threat = {
        description: "Malicious URL detected",
        severity: "high",
      };

      const template = securityAlertTemplate(threat);

      expect(template.title).toBe("Security Alert - QR Guardian");
      expect(template.body).toContain("Malicious URL detected");
      expect(template.tag).toBe("security-alert");
      expect(template.requireInteraction).toBe(true);
      expect(template.vibrate).toEqual([300, 100, 300, 100, 300]);
      expect(template.data.type).toBe("security");
      expect(template.data.threat).toBe(threat);
    });
  });

  describe("Template Selection", () => {
    it("should get correct template by type", () => {
      const updateTemplate = getNotificationTemplate("update", {
        version: "2.1.0",
      });
      expect(updateTemplate.data.type).toBe("update");

      const securityTemplate = getNotificationTemplate("security", {
        threat: { description: "Test threat" },
      });
      expect(securityTemplate.data.type).toBe("security");

      const generalTemplate = getNotificationTemplate("general", {
        title: "Test",
        body: "Test body",
      });
      expect(generalTemplate.data.type).toBe("general");
    });
  });

  describe("Template Validation", () => {
    it("should validate correct template", () => {
      const validTemplate = {
        title: "Test Title",
        body: "Test Body",
        actions: [{ action: "test", title: "Test Action" }],
      };

      expect(() => validateNotificationTemplate(validTemplate)).not.toThrow();
    });

    it("should throw error for missing required fields", () => {
      const invalidTemplate = {
        body: "Test Body",
        // Missing title
      };

      expect(() => validateNotificationTemplate(invalidTemplate)).toThrow(
        "Missing required notification fields: title"
      );
    });

    it("should throw error for invalid actions", () => {
      const invalidTemplate = {
        title: "Test Title",
        body: "Test Body",
        actions: [
          { title: "Test Action" }, // Missing action
        ],
      };

      expect(() => validateNotificationTemplate(invalidTemplate)).toThrow(
        "Invalid action at index 0: action and title are required"
      );
    });
  });
});
