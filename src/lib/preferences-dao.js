/**
 * Data Access Object for User Preferences
 * Handles storage and retrieval of user preferences with encryption for sensitive data
 */

import { dbManager } from "./db-manager.js";

export class PreferencesDAO {
  constructor() {
    this.storeName = "userPreferences";
    this.sensitiveFields = ["value"]; // Encrypt preference values that might be sensitive
  }

  /**
   * Default preferences
   */
  getDefaultPreferences() {
    return {
      theme: "system",
      notifications: true,
      autoScan: false,
      soundEnabled: true,
      vibrationEnabled: true,
      saveHistory: true,
      autoSafetyCheck: true,
      offlineMode: true,
      language: "en",
      cameraPreference: "back",
      scanTimeout: 10000,
      maxHistoryItems: 1000,
      encryptHistory: true,
      syncEnabled: true,
      analyticsEnabled: false,
    };
  }

  /**
   * Set a preference value
   * @param {string} key
   * @param {any} value
   * @param {boolean} sensitive Whether the value should be encrypted
   * @returns {Promise<void>}
   */
  async setPreference(key, value, sensitive = false) {
    const preference = {
      key,
      value,
      encrypted: false,
      timestamp: Date.now(),
      version: 1,
    };

    const sensitiveFields = sensitive ? this.sensitiveFields : [];

    try {
      // Try to update existing preference
      const existing = await this.getPreference(key);
      if (existing !== null) {
        await dbManager.update(
          this.storeName,
          key,
          preference,
          sensitiveFields
        );
      } else {
        await dbManager.add(this.storeName, preference, sensitiveFields);
      }
    } catch (error) {
      // If update fails, try to add as new
      await dbManager.add(this.storeName, preference, sensitiveFields);
    }
  }

  /**
   * Get a preference value
   * @param {string} key
   * @param {any} defaultValue
   * @returns {Promise<any>}
   */
  async getPreference(key, defaultValue = null) {
    try {
      const preference = await dbManager.get(
        this.storeName,
        key,
        this.sensitiveFields
      );
      return preference ? preference.value : defaultValue;
    } catch (error) {
      console.error(`Failed to get preference ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Get all preferences
   * @returns {Promise<object>}
   */
  async getAllPreferences() {
    try {
      const preferences = await dbManager.getAll(
        this.storeName,
        this.sensitiveFields
      );
      const result = {};

      preferences.forEach((pref) => {
        result[pref.key] = pref.value;
      });

      return result;
    } catch (error) {
      console.error("Failed to get all preferences:", error);
      return {};
    }
  }

  /**
   * Get preferences with defaults applied
   * @returns {Promise<object>}
   */
  async getPreferencesWithDefaults() {
    const defaults = this.getDefaultPreferences();
    const stored = await this.getAllPreferences();

    return { ...defaults, ...stored };
  }

  /**
   * Set multiple preferences at once
   * @param {object} preferences
   * @returns {Promise<void>}
   */
  async setMultiplePreferences(preferences) {
    const promises = Object.entries(preferences).map(([key, value]) => {
      // Determine if preference should be encrypted based on key
      const sensitive = this.isSensitivePreference(key);
      return this.setPreference(key, value, sensitive);
    });

    await Promise.all(promises);
  }

  /**
   * Check if a preference key contains sensitive data
   * @param {string} key
   * @returns {boolean}
   */
  isSensitivePreference(key) {
    const sensitiveKeys = [
      "apiKey",
      "authToken",
      "password",
      "secret",
      "privateKey",
      "personalInfo",
    ];

    return sensitiveKeys.some((sensitiveKey) =>
      key.toLowerCase().includes(sensitiveKey.toLowerCase())
    );
  }

  /**
   * Delete a preference
   * @param {string} key
   * @returns {Promise<void>}
   */
  async deletePreference(key) {
    await dbManager.delete(this.storeName, key);
  }

  /**
   * Reset preferences to defaults
   * @returns {Promise<void>}
   */
  async resetToDefaults() {
    await dbManager.clear(this.storeName);
    const defaults = this.getDefaultPreferences();
    await this.setMultiplePreferences(defaults);
  }

  /**
   * Export preferences for backup
   * @returns {Promise<object>}
   */
  async exportPreferences() {
    const preferences = await this.getAllPreferences();
    return {
      preferences,
      exportedAt: Date.now(),
      version: 1,
    };
  }

  /**
   * Import preferences from backup
   * @param {object} backupData
   * @returns {Promise<void>}
   */
  async importPreferences(backupData) {
    if (!backupData.preferences) {
      throw new Error("Invalid backup data: missing preferences");
    }

    await this.setMultiplePreferences(backupData.preferences);
  }

  /**
   * Get preference metadata (timestamp, version, etc.)
   * @param {string} key
   * @returns {Promise<object|null>}
   */
  async getPreferenceMetadata(key) {
    try {
      const preference = await dbManager.get(
        this.storeName,
        key,
        this.sensitiveFields
      );
      if (!preference) return null;

      return {
        key: preference.key,
        timestamp: preference.timestamp,
        version: preference.version,
        encrypted: preference.encrypted,
      };
    } catch (error) {
      console.error(`Failed to get metadata for preference ${key}:`, error);
      return null;
    }
  }

  /**
   * Update preference timestamp (mark as recently accessed)
   * @param {string} key
   * @returns {Promise<void>}
   */
  async touchPreference(key) {
    try {
      const existing = await dbManager.get(
        this.storeName,
        key,
        this.sensitiveFields
      );
      if (existing) {
        await dbManager.update(
          this.storeName,
          key,
          { timestamp: Date.now() },
          this.sensitiveFields
        );
      }
    } catch (error) {
      console.error(`Failed to touch preference ${key}:`, error);
    }
  }

  /**
   * Get preferences modified after a certain timestamp
   * @param {number} timestamp
   * @returns {Promise<object>}
   */
  async getPreferencesModifiedAfter(timestamp) {
    try {
      const allPreferences = await dbManager.getAll(
        this.storeName,
        this.sensitiveFields
      );
      const result = {};

      allPreferences
        .filter((pref) => pref.timestamp > timestamp)
        .forEach((pref) => {
          result[pref.key] = pref.value;
        });

      return result;
    } catch (error) {
      console.error("Failed to get modified preferences:", error);
      return {};
    }
  }

  /**
   * Validate preference value
   * @param {string} key
   * @param {any} value
   * @returns {boolean}
   */
  validatePreference(key, value) {
    const validators = {
      theme: (val) => ["light", "dark", "system"].includes(val),
      notifications: (val) => typeof val === "boolean",
      autoScan: (val) => typeof val === "boolean",
      soundEnabled: (val) => typeof val === "boolean",
      vibrationEnabled: (val) => typeof val === "boolean",
      saveHistory: (val) => typeof val === "boolean",
      autoSafetyCheck: (val) => typeof val === "boolean",
      offlineMode: (val) => typeof val === "boolean",
      language: (val) => typeof val === "string" && val.length === 2,
      cameraPreference: (val) => ["front", "back"].includes(val),
      scanTimeout: (val) => typeof val === "number" && val > 0 && val <= 60000,
      maxHistoryItems: (val) =>
        typeof val === "number" && val > 0 && val <= 10000,
      encryptHistory: (val) => typeof val === "boolean",
      syncEnabled: (val) => typeof val === "boolean",
      analyticsEnabled: (val) => typeof val === "boolean",
    };

    const validator = validators[key];
    return validator ? validator(value) : true; // Allow unknown preferences
  }

  /**
   * Set preference with validation
   * @param {string} key
   * @param {any} value
   * @param {boolean} sensitive
   * @returns {Promise<void>}
   */
  async setValidatedPreference(key, value, sensitive = false) {
    if (!this.validatePreference(key, value)) {
      throw new Error(`Invalid value for preference ${key}: ${value}`);
    }

    await this.setPreference(key, value, sensitive);
  }
}

// Singleton instance
export const preferencesDAO = new PreferencesDAO();
