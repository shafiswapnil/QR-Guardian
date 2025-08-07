import { describe, it, expect, vi } from "vitest";

describe("OfflineManager", () => {
  // Simple tests that focus on core functionality without complex mocking

  it("should be importable", async () => {
    const offlineManager = await import("../offline-manager.js");
    expect(offlineManager.default).toBeDefined();
  });

  it("should have required methods", async () => {
    const { default: offlineManager } = await import("../offline-manager.js");

    expect(typeof offlineManager.getOnlineStatus).toBe("function");
    expect(typeof offlineManager.on).toBe("function");
    expect(typeof offlineManager.off).toBe("function");
    expect(typeof offlineManager.emit).toBe("function");
    expect(typeof offlineManager.storeScanHistory).toBe("function");
    expect(typeof offlineManager.getScanHistory).toBe("function");
    expect(typeof offlineManager.storeUserPreference).toBe("function");
    expect(typeof offlineManager.getUserPreference).toBe("function");
    expect(typeof offlineManager.queueRequest).toBe("function");
  });

  it("should handle event listeners", async () => {
    const { default: offlineManager } = await import("../offline-manager.js");

    const callback = vi.fn();

    // Add listener
    offlineManager.on("test-event", callback);

    // Emit event
    offlineManager.emit("test-event", { data: "test" });
    expect(callback).toHaveBeenCalledWith({ data: "test" });

    // Remove listener
    offlineManager.off("test-event", callback);

    // Emit again - should not be called
    offlineManager.emit("test-event", { data: "test2" });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should return online status", async () => {
    const { default: offlineManager } = await import("../offline-manager.js");

    const status = offlineManager.getOnlineStatus();
    expect(typeof status).toBe("boolean");
  });

  it("should handle storage operations gracefully when DB is not available", async () => {
    const { default: offlineManager } = await import("../offline-manager.js");

    // Force DB to null and initialization to fail to test localStorage fallback
    const originalDB = offlineManager.db;
    const originalIsInitialized = offlineManager.isInitialized;
    const originalInitPromise = offlineManager.initializationPromise;

    offlineManager.db = null;
    offlineManager.isInitialized = false;
    offlineManager.initializationPromise = Promise.resolve(false);

    const result = await offlineManager.storeScanHistory({
      content: "test",
      timestamp: new Date().toISOString(),
      isSafe: true,
    });

    // Should succeed with localStorage fallback
    expect(result).toBe(true);

    // Restore original state
    offlineManager.db = originalDB;
    offlineManager.isInitialized = originalIsInitialized;
    offlineManager.initializationPromise = originalInitPromise;
  });

  it("should handle user preferences gracefully when DB is not available", async () => {
    const { default: offlineManager } = await import("../offline-manager.js");

    // Force DB to null and initialization to fail to test localStorage fallback
    const originalDB = offlineManager.db;
    const originalIsInitialized = offlineManager.isInitialized;
    const originalInitPromise = offlineManager.initializationPromise;

    offlineManager.db = null;
    offlineManager.isInitialized = false;
    offlineManager.initializationPromise = Promise.resolve(false);

    const storeResult = await offlineManager.storeUserPreference(
      "test",
      "value"
    );
    // Should succeed with localStorage fallback
    expect(storeResult).toBe(true);

    const getResult = await offlineManager.getUserPreference("test");
    // Should return the stored value from localStorage
    expect(getResult).toBe("value");

    // Restore original state
    offlineManager.db = originalDB;
    offlineManager.isInitialized = originalIsInitialized;
    offlineManager.initializationPromise = originalInitPromise;
  });

  it("should have cleanup method", async () => {
    const { default: offlineManager } = await import("../offline-manager.js");

    expect(typeof offlineManager.destroy).toBe("function");

    // Should not throw when called
    expect(() => offlineManager.destroy()).not.toThrow();
  });
});
