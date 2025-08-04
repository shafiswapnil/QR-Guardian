/**
 * Database Migration Utilities
 * Handles schema updates and data migrations for IndexedDB
 */

import { DB_CONFIG, MIGRATIONS } from "./db-schema.js";
import { dbManager } from "./db-manager.js";

export class MigrationManager {
  constructor() {
    this.migrationHistoryKey = "qr-guardian-migration-history";
  }

  /**
   * Get migration history from localStorage
   * @returns {Array}
   */
  getMigrationHistory() {
    try {
      const history = localStorage.getItem(this.migrationHistoryKey);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error("Failed to load migration history:", error);
      return [];
    }
  }

  /**
   * Save migration history to localStorage
   * @param {Array} history
   */
  saveMigrationHistory(history) {
    try {
      localStorage.setItem(this.migrationHistoryKey, JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save migration history:", error);
    }
  }

  /**
   * Record successful migration
   * @param {number} version
   * @param {string} description
   */
  recordMigration(version, description) {
    const history = this.getMigrationHistory();
    history.push({
      version,
      description,
      timestamp: Date.now(),
      success: true,
    });
    this.saveMigrationHistory(history);
  }

  /**
   * Record failed migration
   * @param {number} version
   * @param {string} description
   * @param {Error} error
   */
  recordFailedMigration(version, description, error) {
    const history = this.getMigrationHistory();
    history.push({
      version,
      description,
      timestamp: Date.now(),
      success: false,
      error: error.message,
    });
    this.saveMigrationHistory(history);
  }

  /**
   * Check if migration has been applied
   * @param {number} version
   * @returns {boolean}
   */
  isMigrationApplied(version) {
    const history = this.getMigrationHistory();
    return history.some((entry) => entry.version === version && entry.success);
  }

  /**
   * Get pending migrations
   * @param {number} currentVersion
   * @returns {Array}
   */
  getPendingMigrations(currentVersion) {
    const pending = [];

    for (
      let version = currentVersion + 1;
      version <= DB_CONFIG.version;
      version++
    ) {
      if (MIGRATIONS[version] && !this.isMigrationApplied(version)) {
        pending.push({
          version,
          migration: MIGRATIONS[version],
        });
      }
    }

    return pending;
  }

  /**
   * Backup data before migration
   * @param {IDBDatabase} db
   * @returns {Promise<object>}
   */
  async backupData(db) {
    const backup = {
      timestamp: Date.now(),
      version: db.version,
      stores: {},
    };

    const storeNames = Array.from(db.objectStoreNames);

    for (const storeName of storeNames) {
      try {
        const transaction = db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const data = await this.getAllFromStore(store);
        backup.stores[storeName] = data;
      } catch (error) {
        console.error(`Failed to backup store ${storeName}:`, error);
        backup.stores[storeName] = [];
      }
    }

    return backup;
  }

  /**
   * Get all data from a store
   * @param {IDBObjectStore} store
   * @returns {Promise<Array>}
   */
  getAllFromStore(store) {
    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get data from store: ${request.error}`));
      };
    });
  }

  /**
   * Save backup to localStorage
   * @param {object} backup
   */
  saveBackup(backup) {
    try {
      const backupKey = `qr-guardian-backup-${backup.timestamp}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));

      // Keep only the last 3 backups
      this.cleanupOldBackups();
    } catch (error) {
      console.error("Failed to save backup:", error);
    }
  }

  /**
   * Clean up old backups
   */
  cleanupOldBackups() {
    try {
      const backupKeys = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("qr-guardian-backup-")) {
          backupKeys.push(key);
        }
      }

      // Sort by timestamp (newest first)
      backupKeys.sort((a, b) => {
        const timestampA = parseInt(a.split("-").pop());
        const timestampB = parseInt(b.split("-").pop());
        return timestampB - timestampA;
      });

      // Remove old backups (keep only 3 most recent)
      for (let i = 3; i < backupKeys.length; i++) {
        localStorage.removeItem(backupKeys[i]);
      }
    } catch (error) {
      console.error("Failed to cleanup old backups:", error);
    }
  }

  /**
   * Restore data from backup
   * @param {string} backupKey
   * @returns {Promise<void>}
   */
  async restoreFromBackup(backupKey) {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        throw new Error(`Backup ${backupKey} not found`);
      }

      const backup = JSON.parse(backupData);

      // Initialize database manager
      await dbManager.initialize();

      // Clear existing data
      for (const storeName of Object.keys(backup.stores)) {
        await dbManager.clear(storeName);
      }

      // Restore data
      for (const [storeName, data] of Object.entries(backup.stores)) {
        for (const item of data) {
          try {
            await dbManager.add(storeName, item);
          } catch (error) {
            console.error(`Failed to restore item in ${storeName}:`, error);
          }
        }
      }

      console.log(`Successfully restored from backup ${backupKey}`);
    } catch (error) {
      console.error("Failed to restore from backup:", error);
      throw error;
    }
  }

  /**
   * List available backups
   * @returns {Array}
   */
  listBackups() {
    const backups = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("qr-guardian-backup-")) {
        try {
          const backupData = localStorage.getItem(key);
          const backup = JSON.parse(backupData);
          backups.push({
            key,
            timestamp: backup.timestamp,
            version: backup.version,
            date: new Date(backup.timestamp).toISOString(),
            storeCount: Object.keys(backup.stores).length,
          });
        } catch (error) {
          console.error(`Failed to parse backup ${key}:`, error);
        }
      }
    }

    return backups.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Validate database integrity
   * @returns {Promise<object>}
   */
  async validateDatabaseIntegrity() {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      storeStats: {},
    };

    try {
      await dbManager.initialize();

      // Check each store
      for (const storeName of Object.keys(DB_CONFIG.stores)) {
        try {
          const data = await dbManager.getAll(storeName);
          results.storeStats[storeName] = {
            count: data.length,
            valid: true,
          };

          // Validate data structure
          for (const item of data) {
            if (!item.id) {
              results.errors.push(`Missing ID in ${storeName}`);
              results.valid = false;
            }

            if (!item.version) {
              results.warnings.push(
                `Missing version in ${storeName} item ${item.id}`
              );
            }

            if (!item.timestamp) {
              results.warnings.push(
                `Missing timestamp in ${storeName} item ${item.id}`
              );
            }
          }
        } catch (error) {
          results.errors.push(
            `Failed to validate store ${storeName}: ${error.message}`
          );
          results.valid = false;
          results.storeStats[storeName] = {
            count: 0,
            valid: false,
            error: error.message,
          };
        }
      }
    } catch (error) {
      results.errors.push(`Database initialization failed: ${error.message}`);
      results.valid = false;
    }

    return results;
  }

  /**
   * Repair database issues
   * @returns {Promise<object>}
   */
  async repairDatabase() {
    const repairResults = {
      success: true,
      repaired: [],
      failed: [],
    };

    try {
      await dbManager.initialize();

      // Check and repair each store
      for (const storeName of Object.keys(DB_CONFIG.stores)) {
        try {
          const data = await dbManager.getAll(storeName);

          for (const item of data) {
            let needsUpdate = false;
            const updates = {};

            // Add missing version
            if (!item.version) {
              updates.version = DB_CONFIG.version;
              needsUpdate = true;
            }

            // Add missing timestamp
            if (!item.timestamp) {
              updates.timestamp = Date.now();
              needsUpdate = true;
            }

            // Apply updates
            if (needsUpdate) {
              await dbManager.update(storeName, item.id, updates);
              repairResults.repaired.push(`${storeName}:${item.id}`);
            }
          }
        } catch (error) {
          repairResults.failed.push(`${storeName}: ${error.message}`);
          repairResults.success = false;
        }
      }
    } catch (error) {
      repairResults.failed.push(`Database repair failed: ${error.message}`);
      repairResults.success = false;
    }

    return repairResults;
  }

  /**
   * Export migration history
   * @returns {object}
   */
  exportMigrationHistory() {
    return {
      history: this.getMigrationHistory(),
      backups: this.listBackups(),
      exportedAt: Date.now(),
    };
  }

  /**
   * Clear all migration data (use with caution)
   */
  clearMigrationData() {
    // Clear migration history
    localStorage.removeItem(this.migrationHistoryKey);

    // Clear all backups
    const backupKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("qr-guardian-backup-")) {
        backupKeys.push(key);
      }
    }

    backupKeys.forEach((key) => localStorage.removeItem(key));
  }
}

// Singleton instance
export const migrationManager = new MigrationManager();
