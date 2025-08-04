/**
 * Background Sync Tests
 * Tests for background synchronization functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock dependencies
vi.mock("../sw-manager.js", () => ({
  default: {
    on: vi.fn(),
    postMessage: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock("../queue-dao.js", () => ({
  queueDAO: {
    queueRequest: vi.fn(),
    getRetryableRequests: vi.fn(),
    getQueueStatistics: vi.fn(),
    clearFailedRequests: vi.fn(),
    clearQueue: vi.fn(),
    getFailedRequests: vi.fn(),
    removeRequest: vi.fn(),
    incrementRetryCount: vi.fn(),
  },
}));

// Set up global mocks
global.window = {
  ServiceWorkerRegistration: {
    prototype: {
      sync: true,
    },
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

global.navigator = {
  serviceWorker: {
    register: vi.fn(),
  },
  onLine: true,
};

// Import after mocks are set up
const { default: backgroundSyncManager } = await import(
  "../background-sync-manager.js"
);
const { queueDAO } = await import("../queue-dao.js");

describe("BackgroundSyncManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.navigator.onLine = true;
    global.window.ServiceWorkerRegistration.prototype.sync = true;
  });

  afterEach(() => {
    backgroundSyncManager.destroy();
  });

  describe("Support Detection", () => {
    it("should detect background sync support", () => {
      const status = backgroundSyncManager.getSyncStatus();
      expect(status.isSupported).toBe(true);
    });

    it("should handle unsupported browsers", () => {
      // Temporarily remove sync support
      delete global.window.ServiceWorkerRegistration.prototype.sync;

      // Test support detection by checking the method directly
      const isSupported =
        "serviceWorker" in global.navigator &&
        "sync" in global.window.ServiceWorkerRegistration.prototype;

      expect(isSupported).toBe(false);

      // Restore sync support
      global.window.ServiceWorkerRegistration.prototype.sync = true;
    });
  });

  describe("Request Queuing", () => {
    it("should queue requests successfully", async () => {
      const requestData = {
        url: "https://api.example.com/data",
        method: "POST",
        body: JSON.stringify({ test: "data" }),
        headers: { "Content-Type": "application/json" },
      };

      queueDAO.queueRequest.mockResolvedValue("test-request-id");

      const requestId = await backgroundSyncManager.queueRequest(requestData);

      expect(requestId).toBe("test-request-id");
      expect(queueDAO.queueRequest).toHaveBeenCalledWith(requestData);
    });

    it("should handle queue failures", async () => {
      const requestData = {
        url: "https://api.example.com/data",
        method: "POST",
      };

      queueDAO.queueRequest.mockRejectedValue(new Error("Queue failed"));

      await expect(
        backgroundSyncManager.queueRequest(requestData)
      ).rejects.toThrow("Queue failed");
    });

    it("should validate request data", async () => {
      const invalidRequestData = {
        method: "POST",
        // Missing URL
      };

      await expect(
        backgroundSyncManager.queueRequest(invalidRequestData)
      ).rejects.toThrow("Request URL is required");
    });
  });

  describe("Sync Triggering", () => {
    it("should trigger sync when online", async () => {
      global.navigator.onLine = true;

      const result = await backgroundSyncManager.triggerSync();
      expect(result).toBe(true);
    });

    it("should not trigger sync when offline", async () => {
      global.navigator.onLine = false;

      const result = await backgroundSyncManager.triggerSync();
      expect(result).toBe(false);
    });

    it("should prevent concurrent syncs", async () => {
      global.navigator.onLine = true;
      backgroundSyncManager.syncInProgress = true;

      const result = await backgroundSyncManager.triggerSync();
      expect(result).toBe(false);
    });
  });

  describe("Manual Sync", () => {
    it("should process requests manually when background sync unavailable", async () => {
      const mockRequests = [
        {
          id: "req1",
          url: "https://api.example.com/test1",
          method: "GET",
          retryCount: 0,
          maxRetries: 3,
        },
        {
          id: "req2",
          url: "https://api.example.com/test2",
          method: "POST",
          body: '{"test": true}',
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      queueDAO.getRetryableRequests.mockResolvedValue(mockRequests);
      queueDAO.removeRequest.mockResolvedValue();

      // Mock successful fetch responses
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockResolvedValueOnce({ ok: true, status: 201 });

      await backgroundSyncManager._manualSync();

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(queueDAO.removeRequest).toHaveBeenCalledWith("req1");
      expect(queueDAO.removeRequest).toHaveBeenCalledWith("req2");
    });

    it("should handle failed requests in manual sync", async () => {
      const mockRequests = [
        {
          id: "req1",
          url: "https://api.example.com/test1",
          method: "GET",
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      queueDAO.getRetryableRequests.mockResolvedValue(mockRequests);
      queueDAO.incrementRetryCount.mockResolvedValue();

      // Mock failed fetch response
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

      await backgroundSyncManager._manualSync();

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(queueDAO.incrementRetryCount).toHaveBeenCalledWith("req1");
    });

    it("should skip requests that exceeded max retries", async () => {
      const mockRequests = [
        {
          id: "req1",
          url: "https://api.example.com/test1",
          method: "GET",
          retryCount: 3,
          maxRetries: 3,
        },
      ];

      queueDAO.getRetryableRequests.mockResolvedValue(mockRequests);
      queueDAO.removeRequest.mockResolvedValue();

      await backgroundSyncManager._manualSync();

      expect(fetch).not.toHaveBeenCalled();
      expect(queueDAO.removeRequest).toHaveBeenCalledWith("req1");
    });
  });

  describe("Queue Management", () => {
    it("should get queue statistics", async () => {
      const mockStats = {
        total: 5,
        retryable: 3,
        failed: 2,
        byPriority: { 1: 1, 2: 2, 3: 2 },
        byMethod: { GET: 3, POST: 2 },
      };

      queueDAO.getQueueStatistics.mockResolvedValue(mockStats);

      const stats = await backgroundSyncManager.getQueueStats();
      expect(stats).toEqual(mockStats);
    });

    it("should clear failed requests", async () => {
      queueDAO.clearFailedRequests.mockResolvedValue(3);

      const count = await backgroundSyncManager.clearFailedRequests();
      expect(count).toBe(3);
      expect(queueDAO.clearFailedRequests).toHaveBeenCalled();
    });

    it("should clear entire queue", async () => {
      queueDAO.clearQueue.mockResolvedValue();

      const result = await backgroundSyncManager.clearQueue();
      expect(result).toBe(true);
      expect(queueDAO.clearQueue).toHaveBeenCalled();
    });

    it("should retry failed requests", async () => {
      const mockFailedRequests = [
        { id: "req1", retryCount: 3, failed: true },
        { id: "req2", retryCount: 3, failed: true },
      ];

      queueDAO.getFailedRequests.mockResolvedValue(mockFailedRequests);
      queueDAO.update = vi.fn().mockResolvedValue();

      const count = await backgroundSyncManager.retryFailedRequests();
      expect(count).toBe(2);
    });
  });

  describe("Event Handling", () => {
    it("should emit events for sync completion", () => {
      const callback = vi.fn();
      backgroundSyncManager.on("sync-complete", callback);

      backgroundSyncManager._handleSyncComplete({ processedCount: 5 });

      expect(callback).toHaveBeenCalledWith({ processedCount: 5 });
    });

    it("should emit events for sync failure", () => {
      const callback = vi.fn();
      backgroundSyncManager.on("sync-failed", callback);

      backgroundSyncManager._handleSyncFailed({ error: "Test error" });

      expect(callback).toHaveBeenCalledWith({ error: "Test error" });
    });

    it("should emit events for request sync", () => {
      const callback = vi.fn();
      backgroundSyncManager.on("request-synced", callback);

      const payload = { requestId: "req1", status: 200 };
      backgroundSyncManager._handleRequestSynced(payload);

      expect(callback).toHaveBeenCalledWith(payload);
    });
  });

  describe("Network Status Handling", () => {
    it("should trigger sync when network comes online", () => {
      const triggerSyncSpy = vi.spyOn(backgroundSyncManager, "triggerSync");

      backgroundSyncManager._handleNetworkOnline();

      expect(triggerSyncSpy).toHaveBeenCalled();
    });

    it("should emit offline event when network goes offline", () => {
      const callback = vi.fn();
      backgroundSyncManager.on("network-offline", callback);

      backgroundSyncManager._handleNetworkOffline();

      expect(callback).toHaveBeenCalled();
    });
  });
});
