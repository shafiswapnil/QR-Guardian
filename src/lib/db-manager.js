/**
 * IndexedDB Manager for QR Guardian PWA
 * Provides data access layer with encryption support
 */

import { DB_CONFIG, SCHEMAS, MIGRATIONS } from "./db-schema.js";
import { encryptionManager, keyManager } from "./encryption.js";

class DatabaseManager {
  constructor() {
    this.db = null;
    this.encryptionKey = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the database and encryption
   * @param {string} userPassword Optional password for encryption
   * @returns {Promise<void>}
   */
  async initialize(userPassword = null) {
    if (this.isInitialized) return;

    try {
      // Initialize encryption key
      this.encryptionKey = await keyManager.initializeKey(userPassword);

      // Open database
      this.db = await this.openDatabase();
      this.isInitialized = true;

      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  /**
   * Open IndexedDB database with migrations
   * @returns {Promise<IDBDatabase>}
   */
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const transaction = event.target.transaction;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion;

        console.log(
          `Upgrading database from version ${oldVersion} to ${newVersion}`
        );

        // Run migrations
        for (let version = oldVersion + 1; version <= newVersion; version++) {
          if (MIGRATIONS[version]) {
            console.log(`Running migration for version ${version}`);
            MIGRATIONS[version].up(db, transaction);
          }
        }
      };
    });
  }

  /**
   * Ensure database is initialized
   * @private
   */
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
  }

  /**
   * Validate data against schema
   * @param {string} storeName
   * @param {object} data
   * @returns {boolean}
   */
  validateData(storeName, data) {
    const schema = SCHEMAS[storeName];
    if (!schema) return false;

    for (const [key, expectedType] of Object.entries(schema)) {
      if (!(key in data)) {
        console.warn(`Missing required field: ${key}`);
        return false;
      }

      const actualType = typeof data[key];
      if (expectedType !== "any" && actualType !== expectedType) {
        console.warn(
          `Type mismatch for ${key}: expected ${expectedType}, got ${actualType}`
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Encrypt sensitive data before storage
   * @param {object} data
   * @param {Array<string>} sensitiveFields
   * @returns {Promise<object>}
   */
  async encryptSensitiveData(data, sensitiveFields = []) {
    const encryptedData = { ...data };

    for (const field of sensitiveFields) {
      if (data[field] && typeof data[field] === "string") {
        try {
          encryptedData[field] = await encryptionManager.encryptForStorage(
            data[field],
            this.encryptionKey
          );
          encryptedData.encrypted = true;
        } catch (error) {
          console.warn(
            `Failed to encrypt field ${field}, storing unencrypted:`,
            error
          );
          // Keep original data if encryption fails
          encryptedData[field] = data[field];
          encryptedData.encrypted = false;
        }
      }
    }

    return encryptedData;
  }

  /**
   * Decrypt sensitive data after retrieval
   * @param {object} data
   * @param {Array<string>} sensitiveFields
   * @returns {Promise<object>}
   */
  async decryptSensitiveData(data, sensitiveFields = []) {
    if (!data.encrypted) return data;

    const decryptedData = { ...data };

    for (const field of sensitiveFields) {
      if (data[field] && typeof data[field] === "string") {
        try {
          decryptedData[field] = await encryptionManager.decryptFromStorage(
            data[field],
            this.encryptionKey
          );
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          // Keep encrypted data if decryption fails
        }
      }
    }

    return decryptedData;
  }

  /**
   * Add data to a store
   * @param {string} storeName
   * @param {object} data
   * @param {Array<string>} sensitiveFields
   * @returns {Promise<string>} Record ID
   */
  async add(storeName, data, sensitiveFields = []) {
    this.ensureInitialized();

    // Add metadata
    const recordData = {
      ...data,
      timestamp: data.timestamp || Date.now(),
      version: DB_CONFIG.version,
    };

    // Validate data
    if (!this.validateData(storeName, recordData)) {
      throw new Error(`Invalid data for store ${storeName}`);
    }

    // Encrypt sensitive fields
    const encryptedData = await this.encryptSensitiveData(
      recordData,
      sensitiveFields
    );

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.add(encryptedData);

      request.onsuccess = () => {
        resolve(encryptedData.id || request.result);
      };

      request.onerror = () => {
        reject(
          new Error(`Failed to add data to ${storeName}: ${request.error}`)
        );
      };
    });
  }

  /**
   * Get data by ID
   * @param {string} storeName
   * @param {string} id
   * @param {Array<string>} sensitiveFields
   * @returns {Promise<object|null>}
   */
  async get(storeName, id, sensitiveFields = []) {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = async () => {
        if (request.result) {
          const decryptedData = await this.decryptSensitiveData(
            request.result,
            sensitiveFields
          );
          resolve(decryptedData);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(
          new Error(`Failed to get data from ${storeName}: ${request.error}`)
        );
      };
    });
  }

  /**
   * Update data by ID
   * @param {string} storeName
   * @param {string} id
   * @param {object} updates
   * @param {Array<string>} sensitiveFields
   * @returns {Promise<void>}
   */
  async update(storeName, id, updates, sensitiveFields = []) {
    this.ensureInitialized();

    // Get existing data
    const existingData = await this.get(storeName, id, sensitiveFields);
    if (!existingData) {
      throw new Error(`Record with ID ${id} not found in ${storeName}`);
    }

    // Merge updates
    const updatedData = {
      ...existingData,
      ...updates,
      timestamp: Date.now(),
    };

    // Encrypt sensitive fields
    const encryptedData = await this.encryptSensitiveData(
      updatedData,
      sensitiveFields
    );

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(encryptedData);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(`Failed to update data in ${storeName}: ${request.error}`)
        );
      };
    });
  }

  /**
   * Delete data by ID
   * @param {string} storeName
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(storeName, id) {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(`Failed to delete data from ${storeName}: ${request.error}`)
        );
      };
    });
  }

  /**
   * Get all data from a store
   * @param {string} storeName
   * @param {Array<string>} sensitiveFields
   * @returns {Promise<Array>}
   */
  async getAll(storeName, sensitiveFields = []) {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = async () => {
        const results = [];
        for (const item of request.result) {
          const decryptedItem = await this.decryptSensitiveData(
            item,
            sensitiveFields
          );
          results.push(decryptedItem);
        }
        resolve(results);
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to get all data from ${storeName}: ${request.error}`
          )
        );
      };
    });
  }

  /**
   * Query data using an index
   * @param {string} storeName
   * @param {string} indexName
   * @param {any} value
   * @param {Array<string>} sensitiveFields
   * @returns {Promise<Array>}
   */
  async queryByIndex(storeName, indexName, value, sensitiveFields = []) {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = async () => {
        const results = [];
        for (const item of request.result) {
          const decryptedItem = await this.decryptSensitiveData(
            item,
            sensitiveFields
          );
          results.push(decryptedItem);
        }
        resolve(results);
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to query ${storeName} by ${indexName}: ${request.error}`
          )
        );
      };
    });
  }

  /**
   * Clear all data from a store
   * @param {string} storeName
   * @returns {Promise<void>}
   */
  async clear(storeName) {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to clear ${storeName}: ${request.error}`));
      };
    });
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }

  /**
   * Delete the entire database
   * @returns {Promise<void>}
   */
  static async deleteDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_CONFIG.name);

      request.onsuccess = () => {
        console.log("Database deleted successfully");
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete database: ${request.error}`));
      };

      request.onblocked = () => {
        console.warn("Database deletion blocked - close all connections");
      };
    });
  }
}

// Singleton instance
export const dbManager = new DatabaseManager();
