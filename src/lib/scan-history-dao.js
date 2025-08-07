/**
 * Data Access Object for Scan History
 * Handles CRUD operations for QR code scan history with encryption
 */

import { dbManager } from "./db-manager.js";

export class ScanHistoryDAO {
  constructor() {
    this.storeName = "scanHistory";
    this.sensitiveFields = ["content", "safetyDetails"];
  }

  /**
   * Generate unique ID for scan record
   * @returns {string}
   */
  generateId() {
    return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add new scan to history
   * @param {object} scanData
   * @returns {Promise<string>} Scan ID
   */
  async addScan(scanData) {
    const scan = {
      id: this.generateId(),
      content: scanData.content,
      type: scanData.type || "unknown",
      timestamp: Date.now(),
      safetyStatus: scanData.safetyStatus || "unknown",
      safetyDetails: scanData.safetyDetails || {},
      synced: false,
      encrypted: false,
      version: 1,
    };

    return await dbManager.add(this.storeName, scan, this.sensitiveFields);
  }

  /**
   * Get scan by ID
   * @param {string} scanId
   * @returns {Promise<object|null>}
   */
  async getScan(scanId) {
    return await dbManager.get(this.storeName, scanId, this.sensitiveFields);
  }

  /**
   * Get all scans ordered by timestamp (newest first)
   * @returns {Promise<Array>}
   */
  async getAllScans() {
    const scans = await dbManager.getAll(this.storeName, this.sensitiveFields);
    return scans.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get scans by safety status
   * @param {string} safetyStatus
   * @returns {Promise<Array>}
   */
  async getScansBySafetyStatus(safetyStatus) {
    return await dbManager.queryByIndex(
      this.storeName,
      "safetyStatus",
      safetyStatus,
      this.sensitiveFields
    );
  }

  /**
   * Get unsynced scans
   * @returns {Promise<Array>}
   */
  async getUnsyncedScans() {
    return await dbManager.queryByIndex(
      this.storeName,
      "synced",
      false,
      this.sensitiveFields
    );
  }

  /**
   * Mark scan as synced
   * @param {string} scanId
   * @returns {Promise<void>}
   */
  async markSynced(scanId) {
    await dbManager.update(
      this.storeName,
      scanId,
      { synced: true },
      this.sensitiveFields
    );
  }

  /**
   * Update scan safety status
   * @param {string} scanId
   * @param {string} safetyStatus
   * @param {object} safetyDetails
   * @returns {Promise<void>}
   */
  async updateSafetyStatus(scanId, safetyStatus, safetyDetails = {}) {
    await dbManager.update(
      this.storeName,
      scanId,
      { safetyStatus, safetyDetails },
      this.sensitiveFields
    );
  }

  /**
   * Delete scan by ID
   * @param {string} scanId
   * @returns {Promise<void>}
   */
  async deleteScan(scanId) {
    await dbManager.delete(this.storeName, scanId);
  }

  /**
   * Get scans within date range
   * @param {number} startDate Unix timestamp
   * @param {number} endDate Unix timestamp
   * @returns {Promise<Array>}
   */
  async getScansInDateRange(startDate, endDate) {
    const allScans = await this.getAllScans();
    return allScans.filter(
      (scan) => scan.timestamp >= startDate && scan.timestamp <= endDate
    );
  }

  /**
   * Search scans by content (case-insensitive)
   * @param {string} searchTerm
   * @returns {Promise<Array>}
   */
  async searchScans(searchTerm) {
    const allScans = await this.getAllScans();
    const lowerSearchTerm = searchTerm.toLowerCase();

    return allScans.filter(
      (scan) =>
        scan.content.toLowerCase().includes(lowerSearchTerm) ||
        scan.type.toLowerCase().includes(lowerSearchTerm)
    );
  }

  /**
   * Get scan statistics
   * @returns {Promise<object>}
   */
  async getStatistics() {
    const allScans = await this.getAllScans();

    const stats = {
      total: allScans.length,
      safe: 0,
      warning: 0,
      dangerous: 0,
      unknown: 0,
      synced: 0,
      unsynced: 0,
      byType: {},
      recentScans: allScans.slice(0, 10), // Last 10 scans
    };

    allScans.forEach((scan) => {
      // Count by safety status
      stats[scan.safetyStatus] = (stats[scan.safetyStatus] || 0) + 1;

      // Count sync status
      if (scan.synced) {
        stats.synced++;
      } else {
        stats.unsynced++;
      }

      // Count by type
      stats.byType[scan.type] = (stats.byType[scan.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clear all scan history
   * @returns {Promise<void>}
   */
  async clearHistory() {
    await dbManager.clear(this.storeName);
  }

  /**
   * Export scan history for backup
   * @returns {Promise<Array>}
   */
  async exportHistory() {
    const scans = await this.getAllScans();
    return scans.map((scan) => ({
      ...scan,
      exportedAt: Date.now(),
    }));
  }

  /**
   * Import scan history from backup
   * @param {Array} scans
   * @returns {Promise<number>} Number of imported scans
   */
  async importHistory(scans) {
    let importedCount = 0;

    for (const scan of scans) {
      try {
        // Generate new ID to avoid conflicts
        const importedScan = {
          ...scan,
          id: this.generateId(),
          synced: false, // Mark as unsynced after import
          importedAt: Date.now(),
        };

        await dbManager.add(this.storeName, importedScan, this.sensitiveFields);
        importedCount++;
      } catch (error) {
        console.error("Failed to import scan:", error);
      }
    }

    return importedCount;
  }
}

// Singleton instance
export const scanHistoryDAO = new ScanHistoryDAO();
