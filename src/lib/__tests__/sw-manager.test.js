/**
 * Service Worker Manager Tests
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock service worker API
const mockServiceWorker = {
  register: vi.fn(),
  addEventListener: vi.fn(),
  controller: null,
};

const mockRegistration = {
  installing: null,
  waiting: null,
  active: { postMessage: vi.fn(), scriptURL: "/sw.js" },
  addEventListener: vi.fn(),
  unregister: vi.fn(),
  update: vi.fn(),
  scope: "/",
  scriptURL: "/sw.js",
};

// Mock navigator
Object.defineProperty(global.navigator, "serviceWorker", {
  value: mockServiceWorker,
  writable: true,
});

// Mock caches API
global.caches = {
  keys: vi.fn().mockResolvedValue(["cache1", "cache2"]),
  delete: vi.fn().mockResolvedValue(true),
  open: vi.fn().mockResolvedValue({
    keys: vi
      .fn()
      .mockResolvedValue([
        { url: "https://example.com/file1.js" },
        { url: "https://example.com/file2.css" },
      ]),
  }),
};

describe("ServiceWorkerManager", () => {
  let swManager;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const module = await import("../sw-manager.js");
    swManager = module.default;
    swManager.destroy();
  });

  describe("register", () => {
    it("should register service worker successfully", async () => {
      mockServiceWorker.register.mockResolvedValue(mockRegistration);

      const result = await swManager.register();

      expect(result).toBe(true);
      expect(mockServiceWorker.register).toHaveBeenCalledWith("/sw.js", {
        scope: "/",
        updateViaCache: "imports",
      });
    });

    it("should handle registration errors", async () => {
      // Set shorter retry delay for testing
      swManager.retryDelay = 10;
      mockServiceWorker.register.mockRejectedValue(
        new Error("Registration failed")
      );

      const result = await swManager.register();

      expect(result).toBe(false);
    }, 10000);
  });

  describe("getStatus", () => {
    it("should return correct status for different states", () => {
      // Not registered
      swManager.registration = null;
      expect(swManager.getStatus()).toBe("not-registered");

      // Active
      swManager.registration = { ...mockRegistration, active: {} };
      expect(swManager.getStatus()).toBe("active");
    });
  });

  describe("skipWaiting", () => {
    it("should send skip waiting message and handle response", async () => {
      const mockWaiting = { postMessage: vi.fn() };
      swManager.registration = {
        ...mockRegistration,
        waiting: mockWaiting,
        active: mockWaiting,
      };

      // Mock successful response
      vi.spyOn(swManager, "postMessage").mockResolvedValue({ success: true });

      const result = await swManager.skipWaiting();

      expect(result).toBe(true);
      expect(swManager.postMessage).toHaveBeenCalledWith(
        { type: "SKIP_WAITING" },
        true
      );
    });

    it("should return false when no waiting service worker", async () => {
      swManager.registration = mockRegistration;
      const errorSpy = vi.fn();
      swManager.on("error", errorSpy);

      const result = await swManager.skipWaiting();

      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "no-waiting-worker",
        })
      );
    });
  });

  describe("checkForUpdates", () => {
    it("should check for updates successfully", async () => {
      swManager.registration = mockRegistration;
      mockRegistration.update.mockResolvedValue();
      const updateCheckSpy = vi.fn();
      swManager.on("updatecheck", updateCheckSpy);

      const result = await swManager.checkForUpdates();

      expect(result).toBe(true);
      expect(mockRegistration.update).toHaveBeenCalled();
      expect(updateCheckSpy).toHaveBeenCalled();
    });

    it("should return false when no registration", async () => {
      swManager.registration = null;
      const errorSpy = vi.fn();
      swManager.on("error", errorSpy);

      const result = await swManager.checkForUpdates();

      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "no-registration",
        })
      );
    });
  });

  describe("postMessage", () => {
    it("should send message without expecting response", () => {
      const mockActive = { postMessage: vi.fn() };
      swManager.registration = {
        ...mockRegistration,
        active: mockActive,
      };

      swManager.postMessage({ type: "TEST" });

      expect(mockActive.postMessage).toHaveBeenCalledWith({ type: "TEST" });
    });

    it("should send message and wait for response", async () => {
      const mockActive = { postMessage: vi.fn() };
      swManager.registration = {
        ...mockRegistration,
        active: mockActive,
      };

      // Simulate response
      setTimeout(() => {
        swManager._handleMessage({
          data: { _messageId: 1, success: true },
        });
      }, 10);

      const response = await swManager.postMessage({ type: "TEST" }, true);

      expect(response).toEqual({ _messageId: 1, success: true });
      expect(mockActive.postMessage).toHaveBeenCalledWith({
        type: "TEST",
        _messageId: 1,
      });
    });
  });

  describe("getServiceWorkerInfo", () => {
    it("should return detailed service worker information", () => {
      swManager.registration = mockRegistration;
      swManager.updateAvailable = true;

      const info = swManager.getServiceWorkerInfo();

      expect(info).toEqual({
        status: "active",
        registration: mockRegistration,
        updateAvailable: true,
        scope: "/",
        scriptURL: "/sw.js",
        installing: false,
        waiting: false,
        active: true,
      });
    });

    it("should return not-registered when no registration", () => {
      swManager.registration = null;

      const info = swManager.getServiceWorkerInfo();

      expect(info).toEqual({
        status: "not-registered",
        registration: null,
      });
    });
  });

  describe("clearCaches", () => {
    it("should clear all caches successfully", async () => {
      const cachesCleared = vi.fn();
      swManager.on("cachescleared", cachesCleared);

      const result = await swManager.clearCaches();

      expect(result).toBe(true);
      expect(global.caches.keys).toHaveBeenCalled();
      expect(global.caches.delete).toHaveBeenCalledWith("cache1");
      expect(global.caches.delete).toHaveBeenCalledWith("cache2");
      expect(cachesCleared).toHaveBeenCalled();
    });
  });

  describe("getCacheInfo", () => {
    it("should return cache information", async () => {
      const cacheInfo = await swManager.getCacheInfo();

      expect(cacheInfo).toEqual([
        {
          name: "cache1",
          entryCount: 2,
          urls: [
            "https://example.com/file1.js",
            "https://example.com/file2.css",
          ],
        },
        {
          name: "cache2",
          entryCount: 2,
          urls: [
            "https://example.com/file1.js",
            "https://example.com/file2.css",
          ],
        },
      ]);
    });
  });

  describe("event handling", () => {
    it("should add and remove event listeners", () => {
      const callback = vi.fn();

      swManager.on("test", callback);
      swManager.emit("test", "data");

      expect(callback).toHaveBeenCalledWith("data");

      swManager.off("test", callback);
      swManager.emit("test", "data2");

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("lifecycle events", () => {
    it("should handle update found with state changes", () => {
      const mockNewWorker = {
        state: "installing",
        addEventListener: vi.fn(),
      };

      swManager.registration = {
        ...mockRegistration,
        installing: mockNewWorker,
      };

      const updateFoundSpy = vi.fn();
      const installingSpy = vi.fn();
      swManager.on("updatefound", updateFoundSpy);
      swManager.on("installing", installingSpy);

      swManager.handleUpdateFound();

      expect(updateFoundSpy).toHaveBeenCalledWith(mockNewWorker);
      expect(mockNewWorker.addEventListener).toHaveBeenCalledWith(
        "statechange",
        expect.any(Function)
      );

      // Simulate state change
      const stateChangeHandler =
        mockNewWorker.addEventListener.mock.calls[0][1];
      mockNewWorker.state = "installing";
      stateChangeHandler();

      expect(installingSpy).toHaveBeenCalledWith(mockNewWorker);
    });
  });

  describe("destroy", () => {
    it("should clean up resources", () => {
      swManager.registration = mockRegistration;
      swManager.updateAvailable = true;
      swManager.on("test", vi.fn());

      swManager.destroy();

      expect(swManager.registration).toBeNull();
      expect(swManager.updateAvailable).toBe(false);
      expect(swManager.listeners.size).toBe(0);
    });
  });
});
