/**
 * Main Database Module
 * Provides unified interface for all database operations
 */

import { dbManager } from "./db-manager.js";
import { scanHistoryDAO } from "./scan-history-dao.js";
import { preferencesDAO } from "./preferences-dao.js";
import { queueDAO } from "./queue-dao.js";
import { migrationManager } from "./db-migration.js";
import { keyManager } from "./encryption.js";

class Database {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Initialize the database system
   * @param {string} userPassword Optional password for encryption
   * @returns {Promise<void>}
   */
  async initialize(userPassword = null) {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization(userPassword);
    return this.initializationPromise;
  }

  /**
   * Internal initialization logic
   * @param {string} userPassword
   * @returns {Promise<void>}
   */
  async _performInitialization(userPassword) {
    try {
      console.log("Initializing QR Guardian database...");

      // Initialize the database manager
      await dbManager.initialize(userPassword);

      // Validate database integrity
      const integrity = await migrationManager.validateDatabaseIntegrity();
      if (!integrity.valid) {
        console.warn("Database integrity issues detected:", integrity.errors);

        // Attempt to repair
        const repairResults = await migrationManager.repairDatabase();
        if (repairResults.success) {
          console.log("Database repaired successfully");
        } else {
          console.error("Database repair failed:", repairResults.failed);
        }
      }

      this.isInitialized = true;
      console.log("Database initialized successfully");

      // Initialize default preferences if needed
      await this._initializeDefaults();
    } catch (error) {
      console.error("Database initialization failed:", error);
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Initialize default preferences and data
   * @private
   */
  async _initializeDefaults() {
    try {
      // Check if preferences exist
      const existingPrefs = await preferencesDAO.getAllPreferences();

      if (Object.keys(existingPrefs).length === 0) {
        console.log("Initializing default preferences...");
        const defaults = preferencesDAO.getDefaultPreferences();
        await preferencesDAO.setMultiplePreferences(defaults);
      }
    } catch (error) {
      console.error("Failed to initialize defaults:", error);
    }
  }

  /**
   * Get scan history DAO
   * @returns {ScanHistoryDAO}
   */
  get scanHistory() {
    this._ensureInitialized();
    return scanHistoryDAO;
  }

  /**
   * Get preferences DAO
   * @returns {PreferencesDAO}
   */
  get preferences() {
    this._ensureInitialized();
    return preferencesDAO;
  }

  /**
   * Get queue DAO
   * @returns {QueueDAO}
   */
  get queue() {
    this._ensureInitialized();
    return queueDAO;
  }

  /**
   * Get migration manager
   * @returns {MigrationManager}
   */
  get migrations() {
    return migrationManager;
  }

  /**
   * Ensure database is initialized
   * @private
   */
  _ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
  }

  /**
   * Get database statistics
   * @returns {Promise<object>}
   */
  async getStatistics() {
    this._ensureInitialized();

    const [scanStats, queueStats, preferences] = await Promise.all([
      scanHistoryDAO.getStatistics(),
      queueDAO.getQueueStatistics(),
      preferencesDAO.getAllPreferences(),
    ]);

    return {
      scanHistory: scanStats,
      queue: queueStats,
      preferences: {
        count: Object.keys(preferences).length,
        keys: Object.keys(preferences),
      },
      database: {
        initialized: this.isInitialized,
        version: dbManager.db?.version || 0,
      },
    };
  }

  /**
   * Export all data for backup
   * @returns {Promise<object>}
   */
  async exportAllData() {
    this._ensureInitialized();

    const [scanHistory, preferences, queuedRequests] = await Promise.all([
      scanHistoryDAO.exportHistory(),
      preferencesDAO.exportPreferences(),
      queueDAO.exportQueue(),
    ]);

    return {
      scanHistory,
      preferences,
      queuedRequests,
      exportedAt: Date.now(),
      version: 1,
    };
  }

  /**
   * Import all data from backup
   * @param {object} backupData
   * @returns {Promise<object>} Import results
   */
  async importAllData(backupData) {
    this._ensureInitialized();

    const results = {
      success: true,
      imported: {
        scanHistory: 0,
        preferences: 0,
        queuedRequests: 0,
      },
      errors: [],
    };

    try {
      // Import scan history
      if (backupData.scanHistory?.length) {
        results.imported.scanHistory = await scanHistoryDAO.importHistory(
          backupData.scanHistory
        );
      }

      // Import preferences
      if (backupData.preferences?.preferences) {
        await preferencesDAO.importPreferences(backupData.preferences);
        results.imported.preferences = Object.keys(
          backupData.preferences.preferences
        ).length;
      }

      // Import queued requests
      if (backupData.queuedRequests?.requests?.length) {
        for (const request of backupData.queuedRequests.requests) {
          try {
            await queueDAO.queueRequest(request);
            results.imported.queuedRequests++;
          } catch (error) {
            results.errors.push(
              `Failed to import queued request: ${error.message}`
            );
          }
        }
      }
    } catch (error) {
      results.success = false;
      results.errors.push(`Import failed: ${error.message}`);
    }

    return results;
  }

  /**
   * Clear all data (use with caution)
   * @returns {Promise<void>}
   */
  async clearAllData() {
    this._ensureInitialized();

    await Promise.all([
      scanHistoryDAO.clearHistory(),
      queueDAO.clearQueue(),
      preferencesDAO.resetToDefaults(),
    ]);

    console.log("All data cleared");
  }

  /**
   * Close database connection
   */
  close() {
    if (dbManager) {
      dbManager.close();
    }
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Reset database (delete and reinitialize)
   * @param {string} userPassword
   * @returns {Promise<void>}
   */
  async reset(userPassword = null) {
    // Close current connection
    this.close();

    // Clear encryption keys
    keyManager.clearKeys();

    // Delete database
    await dbManager.constructor.deleteDatabase();

    // Clear migration data
    migrationManager.clearMigrationData();

    // Reinitialize
    await this.initialize(userPassword);
  }

  /**
   * Health check
   * @returns {Promise<object>}
   */
  async healthCheck() {
    const health = {
      status: "healthy",
      issues: [],
      details: {},
    };

    try {
      // Check initialization
      if (!this.isInitialized) {
        health.status = "unhealthy";
        health.issues.push("Database not initialized");
        return health;
      }

      // Check database integrity
      const integrity = await migrationManager.validateDatabaseIntegrity();
      health.details.integrity = integrity;

      if (!integrity.valid) {
        health.status = "degraded";
        health.issues.push("Database integrity issues detected");
      }

      // Check data access
      try {
        await scanHistoryDAO.getStatistics();
        await preferencesDAO.getAllPreferences();
        await queueDAO.getQueueStatistics();
        health.details.dataAccess = "ok";
      } catch (error) {
        health.status = "unhealthy";
        health.issues.push("Data access failed");
        health.details.dataAccess = error.message;
      }

      // Check encryption
      try {
        const testKey = await keyManager.loadKey();
        health.details.encryption = testKey ? "ok" : "no key";
      } catch (error) {
        health.status = "degraded";
        health.issues.push("Encryption issues detected");
        health.details.encryption = error.message;
      }
    } catch (error) {
      health.status = "unhealthy";
      health.issues.push(`Health check failed: ${error.message}`);
    }

    return health;
  }
}

// Singleton instance
export const database = new Database();

// Export individual DAOs for direct access if needed
export {
  scanHistoryDAO,
  preferencesDAO,
  queueDAO,
  migrationManager,
  dbManager,
};
