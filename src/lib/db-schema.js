/**
 * IndexedDB Database Schema for QR Guardian PWA
 * Defines the structure and versioning for local data storage
 */

export const DB_CONFIG = {
  name: "QRGuardianDB",
  version: 1,
  stores: {
    scanHistory: {
      name: "scanHistory",
      keyPath: "id",
      autoIncrement: false,
      indexes: [
        { name: "timestamp", keyPath: "timestamp", unique: false },
        { name: "safetyStatus", keyPath: "safetyStatus", unique: false },
        { name: "synced", keyPath: "synced", unique: false },
      ],
    },
    userPreferences: {
      name: "userPreferences",
      keyPath: "key",
      autoIncrement: false,
      indexes: [],
    },
    queuedRequests: {
      name: "queuedRequests",
      keyPath: "id",
      autoIncrement: false,
      indexes: [
        { name: "timestamp", keyPath: "timestamp", unique: false },
        { name: "priority", keyPath: "priority", unique: false },
      ],
    },
  },
};

/**
 * Schema definitions for data validation
 */
export const SCHEMAS = {
  scanHistory: {
    id: "string", // UUID
    content: "string", // QR code content (encrypted)
    type: "string", // QR code type (url, text, etc.)
    timestamp: "number", // Unix timestamp
    safetyStatus: "string", // safe, warning, dangerous, unknown
    safetyDetails: "object", // Detailed safety analysis
    synced: "boolean", // Whether synced to server
    encrypted: "boolean", // Whether content is encrypted
    version: "number", // Schema version for migrations
  },

  userPreferences: {
    key: "string", // Preference key
    value: "any", // Preference value (encrypted if sensitive)
    encrypted: "boolean", // Whether value is encrypted
    timestamp: "number", // Last updated timestamp
    version: "number", // Schema version
  },

  queuedRequests: {
    id: "string", // UUID
    url: "string",
    method: "string",
    headers: "object",
    body: "string",
    timestamp: "number",
    priority: "number", // 1-5, 1 being highest priority
    retryCount: "number",
    maxRetries: "number",
    version: "number",
  },
};

/**
 * Migration scripts for schema updates
 */
export const MIGRATIONS = {
  1: {
    description: "Initial schema creation",
    up: (db, transaction) => {
      // Create scan history store
      const scanHistoryStore = db.createObjectStore(
        DB_CONFIG.stores.scanHistory.name,
        {
          keyPath: DB_CONFIG.stores.scanHistory.keyPath,
          autoIncrement: DB_CONFIG.stores.scanHistory.autoIncrement,
        }
      );

      // Add indexes for scan history
      DB_CONFIG.stores.scanHistory.indexes.forEach((index) => {
        scanHistoryStore.createIndex(index.name, index.keyPath, {
          unique: index.unique,
        });
      });

      // Create user preferences store
      const preferencesStore = db.createObjectStore(
        DB_CONFIG.stores.userPreferences.name,
        {
          keyPath: DB_CONFIG.stores.userPreferences.keyPath,
          autoIncrement: DB_CONFIG.stores.userPreferences.autoIncrement,
        }
      );

      // Create queued requests store
      const queuedStore = db.createObjectStore(
        DB_CONFIG.stores.queuedRequests.name,
        {
          keyPath: DB_CONFIG.stores.queuedRequests.keyPath,
          autoIncrement: DB_CONFIG.stores.queuedRequests.autoIncrement,
        }
      );

      // Add indexes for queued requests
      DB_CONFIG.stores.queuedRequests.indexes.forEach((index) => {
        queuedStore.createIndex(index.name, index.keyPath, {
          unique: index.unique,
        });
      });
    },
  },
};
