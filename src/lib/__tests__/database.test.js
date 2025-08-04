/**
 * Tests for IndexedDB Database Implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  database,
  scanHistoryDAO,
  preferencesDAO,
  queueDAO,
} from "../database.js";

// Mock IndexedDB for testing
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};

const mockIDBDatabase = {
  version: 1,
  objectStoreNames: ["scanHistory", "userPreferences", "queuedRequests"],
  transaction: vi.fn(),
  close: vi.fn(),
  createObjectStore: vi.fn(),
};

const mockIDBTransaction = {
  objectStore: vi.fn(),
  oncomplete: null,
  onerror: null,
  onabort: null,
};

const mockIDBObjectStore = {
  add: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  clear: vi.fn(),
  createIndex: vi.fn(),
  index: vi.fn(),
};

const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null,
};

// Setup mocks
beforeEach(() => {
  global.indexedDB = mockIndexedDB;
  global.crypto = {
    subtle: {
      generateKey: vi.fn().mockResolvedValue({}),
      encrypt: vi.fn().mockResolvedValue(new ArrayBuffer(16)),
      decrypt: vi.fn().mockResolvedValue(new ArrayBuffer(16)),
      exportKey: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      importKey: vi.fn().mockResolvedValue({}),
      deriveBits: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      deriveKey: vi.fn().mockResolvedValue({}),
    },
    getRandomValues: vi.fn().mockReturnValue(new Uint8Array(16)),
  };

  global.TextEncoder = vi.fn().mockImplementation(() => ({
    encode: vi.fn().mockReturnValue(new Uint8Array(16)),
  }));

  global.TextDecoder = vi.fn().mockImplementation(() => ({
    decode: vi.fn().mockReturnValue("test"),
  }));

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  global.localStorage = localStorageMock;

  // Setup IndexedDB mock responses
  mockIndexedDB.open.mockImplementation(() => {
    const request = { ...mockIDBRequest };
    setTimeout(() => {
      request.result = mockIDBDatabase;
      if (request.onsuccess) request.onsuccess();
    }, 0);
    return request;
  });

  mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
  mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);

  // Setup object store mock responses
  mockIDBObjectStore.add.mockImplementation(() => {
    const request = { ...mockIDBRequest };
    setTimeout(() => {
      request.result = "test-id";
      if (request.onsuccess) request.onsuccess();
    }, 0);
    return request;
  });

  mockIDBObjectStore.get.mockImplementation(() => {
    const request = { ...mockIDBRequest };
    setTimeout(() => {
      request.result = { id: "test-id", content: "test-content" };
      if (request.onsuccess) request.onsuccess();
    }, 0);
    return request;
  });

  mockIDBObjectStore.getAll.mockImplementation(() => {
    const request = { ...mockIDBRequest };
    setTimeout(() => {
      request.result = [];
      if (request.onsuccess) request.onsuccess();
    }, 0);
    return request;
  });
});

afterEach(() => {
  vi.clearAllMocks();
  database.close();
});

describe("Database Initialization", () => {
  it("should initialize database successfully", async () => {
    await database.initialize();
    expect(database.isInitialized).toBe(true);
  });

  it("should handle initialization errors gracefully", async () => {
    mockIndexedDB.open.mockImplementation(() => {
      const request = { ...mockIDBRequest };
      setTimeout(() => {
        request.error = new Error("Database error");
        if (request.onerror) request.onerror();
      }, 0);
      return request;
    });

    await expect(database.initialize()).rejects.toThrow();
  });

  it("should not reinitialize if already initialized", async () => {
    await database.initialize();
    const firstCall = mockIndexedDB.open.mock.calls.length;

    await database.initialize();
    const secondCall = mockIndexedDB.open.mock.calls.length;

    expect(secondCall).toBe(firstCall);
  });
});

describe("Scan History DAO", () => {
  beforeEach(async () => {
    await database.initialize();
  });

  it("should add scan to history", async () => {
    const scanData = {
      content: "https://example.com",
      type: "url",
      safetyStatus: "safe",
    };

    const scanId = await scanHistoryDAO.addScan(scanData);
    expect(scanId).toBeDefined();
    expect(mockIDBObjectStore.add).toHaveBeenCalled();
  });

  it("should generate unique IDs for scans", () => {
    const id1 = scanHistoryDAO.generateId();
    const id2 = scanHistoryDAO.generateId();

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^scan_\d+_[a-z0-9]+$/);
  });

  it("should get scan by ID", async () => {
    const scan = await scanHistoryDAO.getScan("test-id");
    expect(scan).toBeDefined();
    expect(mockIDBObjectStore.get).toHaveBeenCalledWith("test-id");
  });

  it("should get all scans", async () => {
    const scans = await scanHistoryDAO.getAllScans();
    expect(Array.isArray(scans)).toBe(true);
    expect(mockIDBObjectStore.getAll).toHaveBeenCalled();
  });
});

describe("Preferences DAO", () => {
  beforeEach(async () => {
    await database.initialize();
  });

  it("should set and get preferences", async () => {
    await preferencesDAO.setPreference("theme", "dark");
    expect(mockIDBObjectStore.add).toHaveBeenCalled();

    const theme = await preferencesDAO.getPreference("theme");
    expect(mockIDBObjectStore.get).toHaveBeenCalledWith("theme");
  });

  it("should return default preferences", () => {
    const defaults = preferencesDAO.getDefaultPreferences();
    expect(defaults).toHaveProperty("theme");
    expect(defaults).toHaveProperty("notifications");
    expect(defaults).toHaveProperty("autoScan");
  });

  it("should validate preferences", () => {
    expect(preferencesDAO.validatePreference("theme", "dark")).toBe(true);
    expect(preferencesDAO.validatePreference("theme", "invalid")).toBe(false);
    expect(preferencesDAO.validatePreference("notifications", true)).toBe(true);
    expect(preferencesDAO.validatePreference("notifications", "invalid")).toBe(
      false
    );
  });

  it("should identify sensitive preferences", () => {
    expect(preferencesDAO.isSensitivePreference("apiKey")).toBe(true);
    expect(preferencesDAO.isSensitivePreference("theme")).toBe(false);
    expect(preferencesDAO.isSensitivePreference("authToken")).toBe(true);
  });
});

describe("Queue DAO", () => {
  beforeEach(async () => {
    await database.initialize();
  });

  it("should queue requests", async () => {
    const requestData = {
      url: "https://api.example.com/sync",
      method: "POST",
      body: JSON.stringify({ data: "test" }),
      priority: 1,
    };

    const requestId = await queueDAO.queueRequest(requestData);
    expect(requestId).toBeDefined();
    expect(mockIDBObjectStore.add).toHaveBeenCalled();
  });

  it("should generate unique IDs for requests", () => {
    const id1 = queueDAO.generateId();
    const id2 = queueDAO.generateId();

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^queue_\d+_[a-z0-9]+$/);
  });

  it("should get queued requests", async () => {
    const requests = await queueDAO.getAllQueuedRequests();
    expect(Array.isArray(requests)).toBe(true);
    expect(mockIDBObjectStore.getAll).toHaveBeenCalled();
  });

  it("should increment retry count", async () => {
    // Mock getting existing request
    mockIDBObjectStore.get.mockImplementationOnce(() => {
      const request = { ...mockIDBRequest };
      setTimeout(() => {
        request.result = { id: "test-id", retryCount: 0 };
        if (request.onsuccess) request.onsuccess();
      }, 0);
      return request;
    });

    // Mock put operation
    mockIDBObjectStore.put.mockImplementationOnce(() => {
      const request = { ...mockIDBRequest };
      setTimeout(() => {
        request.result = "test-id";
        if (request.onsuccess) request.onsuccess();
      }, 0);
      return request;
    });

    await queueDAO.incrementRetryCount("test-id");
    expect(mockIDBObjectStore.put).toHaveBeenCalled();
  });
});

describe("Database Statistics", () => {
  beforeEach(async () => {
    await database.initialize();
  });

  it("should get database statistics", async () => {
    const stats = await database.getStatistics();

    expect(stats).toHaveProperty("scanHistory");
    expect(stats).toHaveProperty("queue");
    expect(stats).toHaveProperty("preferences");
    expect(stats).toHaveProperty("database");
  });
});

describe("Data Export/Import", () => {
  beforeEach(async () => {
    await database.initialize();
  });

  it("should export all data", async () => {
    const exportData = await database.exportAllData();

    expect(exportData).toHaveProperty("scanHistory");
    expect(exportData).toHaveProperty("preferences");
    expect(exportData).toHaveProperty("queuedRequests");
    expect(exportData).toHaveProperty("exportedAt");
    expect(exportData).toHaveProperty("version");
  });

  it("should import data successfully", async () => {
    const mockBackupData = {
      scanHistory: [],
      preferences: { preferences: { theme: "dark" } },
      queuedRequests: { requests: [] },
    };

    const results = await database.importAllData(mockBackupData);

    expect(results).toHaveProperty("success");
    expect(results).toHaveProperty("imported");
    expect(results).toHaveProperty("errors");
  });
});

describe("Database Health Check", () => {
  beforeEach(async () => {
    await database.initialize();
  });

  it("should perform health check", async () => {
    const health = await database.healthCheck();

    expect(health).toHaveProperty("status");
    expect(health).toHaveProperty("issues");
    expect(health).toHaveProperty("details");
    expect(["healthy", "degraded", "unhealthy"]).toContain(health.status);
  });
});

describe("Database Reset", () => {
  it("should reset database completely", async () => {
    await database.initialize();

    mockIndexedDB.deleteDatabase.mockImplementation(() => {
      const request = { ...mockIDBRequest };
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess();
      }, 0);
      return request;
    });

    await database.reset();

    expect(mockIndexedDB.deleteDatabase).toHaveBeenCalled();
    expect(database.isInitialized).toBe(true); // Should be reinitialized
  });
});

describe("Error Handling", () => {
  beforeEach(async () => {
    await database.initialize();
  });

  it("should handle database operation errors", async () => {
    mockIDBObjectStore.add.mockImplementation(() => {
      const request = { ...mockIDBRequest };
      setTimeout(() => {
        request.error = new Error("Add failed");
        if (request.onerror) request.onerror();
      }, 0);
      return request;
    });

    await expect(
      scanHistoryDAO.addScan({
        content: "test",
        type: "text",
      })
    ).rejects.toThrow();
  });

  it("should handle encryption errors gracefully", async () => {
    global.crypto.subtle.encrypt.mockRejectedValue(
      new Error("Encryption failed")
    );

    // Should still work but without encryption
    const scanData = {
      content: "test content",
      type: "text",
      safetyStatus: "safe",
    };

    // The operation should handle encryption failure gracefully
    await expect(scanHistoryDAO.addScan(scanData)).resolves.toBeDefined();
  });
});
