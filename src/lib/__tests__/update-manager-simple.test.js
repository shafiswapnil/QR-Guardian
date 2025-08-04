/**
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Simple integration test for UpdateManager
describe("UpdateManager Integration", () => {
  let UpdateManager;
  let updateManager;

  beforeEach(async () => {
    // Mock global objects
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    global.document = {
      addEventListener: vi.fn(),
      hidden: false,
      querySelector: vi.fn(),
    };

    global.window = {
      location: {
        reload: vi.fn(),
        href: "https://example.com",
      },
    };

    global.navigator = {
      userAgent: "Test User Agent",
      onLine: true,
    };

    // Mock the sw-manager module
    vi.doMock("../sw-manager.js", () => ({
      default: {
        on: vi.fn(),
        off: vi.fn(),
        checkForUpdates: vi.fn().mockResolvedValue(true),
        forceUpdateCheck: vi.fn().mockResolvedValue(true),
        skipWaiting: vi.fn().mockResolvedValue(true),
        getServiceWorkerInfo: vi.fn().mockReturnValue({ status: "active" }),
        clearCaches: vi.fn().mockResolvedValue(true),
        unregister: vi.fn().mockResolvedValue(true),
        register: vi.fn().mockResolvedValue(true),
      },
    }));

    // Import after mocking
    const module = await import("../update-manager.js");
    UpdateManager = module.default.constructor;
    updateManager = new UpdateManager();
  });

  it("should create UpdateManager instance", () => {
    expect(updateManager).toBeDefined();
    expect(updateManager.updateAvailable).toBe(false);
    expect(updateManager.updatePromptShown).toBe(false);
    expect(updateManager.promptAttempts).toBe(0);
    expect(updateManager.isUpdating).toBe(false);
  });

  it("should handle event listeners", () => {
    const callback = vi.fn();

    updateManager.on("test", callback);
    updateManager.emit("test", { data: "test" });

    expect(callback).toHaveBeenCalledWith({ data: "test" });

    updateManager.off("test", callback);
    updateManager.emit("test", { data: "test2" });

    // Should not be called again after removing listener
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should get update status", () => {
    updateManager.updateAvailable = true;
    updateManager.promptAttempts = 2;
    updateManager.lastUpdateCheck = 123456789;

    const status = updateManager.getUpdateStatus();

    expect(status).toEqual({
      updateAvailable: true,
      updatePromptShown: false,
      promptAttempts: 2,
      lastUpdateCheck: 123456789,
      isUpdating: false,
      updateMetadata: null,
      hasRollbackData: false,
    });
  });

  it("should show update prompt when update is available", () => {
    updateManager.updateAvailable = true;
    updateManager.updateMetadata = { version: "1.0.0" };

    const emitSpy = vi.spyOn(updateManager, "emit");

    const result = updateManager.showUpdatePrompt();

    expect(result).toBe(true);
    expect(updateManager.updatePromptShown).toBe(true);
    expect(updateManager.promptAttempts).toBe(1);
    expect(emitSpy).toHaveBeenCalledWith(
      "updateprompt",
      expect.objectContaining({
        title: "Update Available",
        version: "1.0.0",
        attempt: 1,
      })
    );
  });

  it("should not show prompt if no update available", () => {
    updateManager.updateAvailable = false;

    const result = updateManager.showUpdatePrompt();

    expect(result).toBe(false);
    expect(updateManager.updatePromptShown).toBe(false);
  });

  it("should dismiss update prompt", () => {
    updateManager.updatePromptShown = true;
    const emitSpy = vi.spyOn(updateManager, "emit");

    updateManager.dismissUpdatePrompt();

    expect(updateManager.updatePromptShown).toBe(false);
    expect(emitSpy).toHaveBeenCalledWith(
      "updatepromptdismissed",
      expect.any(Object)
    );
  });

  it("should postpone update", () => {
    updateManager.updatePromptShown = true;
    const emitSpy = vi.spyOn(updateManager, "emit");

    updateManager.postponeUpdate(5000);

    expect(updateManager.updatePromptShown).toBe(false);
    expect(emitSpy).toHaveBeenCalledWith(
      "updatepostponed",
      expect.objectContaining({
        duration: 5000,
      })
    );
  });

  it("should show update banner", () => {
    updateManager.updateAvailable = true;
    updateManager.updateMetadata = { version: "2.0.0" };

    const emitSpy = vi.spyOn(updateManager, "emit");

    updateManager.showUpdateBanner();

    expect(emitSpy).toHaveBeenCalledWith(
      "updatebanner",
      expect.objectContaining({
        title: "Update Available",
        message: "A new version is ready to install",
        version: "2.0.0",
        persistent: true,
      })
    );
  });

  it("should extract version from worker URL", () => {
    const worker = { scriptURL: "https://example.com/sw.js?v=1.2.3" };

    const version = updateManager._extractVersionFromWorker(worker);

    expect(version).toBe("1.2.3");
  });

  it("should extract version from worker URL with version param", () => {
    const worker = { scriptURL: "https://example.com/sw.js?version=2.1.0" };

    const version = updateManager._extractVersionFromWorker(worker);

    expect(version).toBe("2.1.0");
  });

  it("should handle worker without URL", () => {
    const worker = null;

    const version = updateManager._extractVersionFromWorker(worker);

    expect(version).toBe("unknown");
  });

  it("should get current version from meta tag", () => {
    const mockMeta = { content: "1.5.0" };
    global.document.querySelector.mockReturnValue(mockMeta);

    const version = updateManager._getCurrentVersion();

    expect(version).toBe("1.5.0");
    expect(global.document.querySelector).toHaveBeenCalledWith(
      'meta[name="version"]'
    );
  });

  it("should fallback to build time for version", () => {
    global.document.querySelector
      .mockReturnValueOnce(null) // No version meta
      .mockReturnValueOnce({ content: "2023-01-01T12:00:00Z" }); // Build time meta

    const version = updateManager._getCurrentVersion();

    expect(version).toBe("2023-01-01T12:00:00Z");
  });

  it("should start and stop periodic update checks", () => {
    const setIntervalSpy = vi.spyOn(global, "setInterval");
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");

    updateManager.startPeriodicUpdateChecks();
    expect(setIntervalSpy).toHaveBeenCalled();
    expect(updateManager.updateCheckInterval).toBeDefined();

    updateManager.stopPeriodicUpdateChecks();
    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(updateManager.updateCheckInterval).toBeNull();
  });

  it("should set update check frequency", () => {
    const stopSpy = vi.spyOn(updateManager, "stopPeriodicUpdateChecks");
    const startSpy = vi.spyOn(updateManager, "startPeriodicUpdateChecks");

    updateManager.updateCheckInterval = 123; // Simulate running interval

    updateManager.setUpdateCheckFrequency(60000);

    expect(updateManager.updateCheckFrequency).toBe(60000);
    expect(stopSpy).toHaveBeenCalled();
    expect(startSpy).toHaveBeenCalled();
  });

  it("should clean up resources on destroy", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");

    updateManager.updateCheckInterval = 456;
    updateManager.listeners.set("test", new Set([vi.fn()]));
    updateManager.updateAvailable = true;

    updateManager.destroy();

    expect(clearIntervalSpy).toHaveBeenCalledWith(456);
    expect(updateManager.updateCheckInterval).toBeNull();
    expect(updateManager.listeners.size).toBe(0);
    expect(updateManager.updateAvailable).toBe(false);
    expect(updateManager.isUpdating).toBe(false);
  });

  it("should handle localStorage operations for rollback data", () => {
    const testData = {
      timestamp: Date.now(),
      currentVersion: "1.0.0",
      userAgent: "Test Agent",
    };

    global.localStorage.getItem.mockReturnValue(JSON.stringify(testData));

    updateManager._loadRollbackData();
    expect(updateManager.rollbackData).toEqual(testData);

    updateManager._saveRollbackData();
    expect(global.localStorage.setItem).toHaveBeenCalledWith(
      "qr-guardian-rollback",
      expect.any(String)
    );

    updateManager._clearRollbackData();
    expect(global.localStorage.removeItem).toHaveBeenCalledWith(
      "qr-guardian-rollback"
    );
    expect(updateManager.rollbackData).toBeNull();
  });

  it("should handle localStorage errors gracefully", () => {
    global.localStorage.getItem.mockImplementation(() => {
      throw new Error("Storage error");
    });

    // Should not throw
    expect(() => updateManager._loadRollbackData()).not.toThrow();
    expect(updateManager.rollbackData).toBeNull();
  });
});
