/**
 * Data Access Object for Queued Requests
 * Handles offline request queuing for background sync
 */

import { dbManager } from "./db-manager.js";

export class QueueDAO {
  constructor() {
    this.storeName = "queuedRequests";
    this.sensitiveFields = ["body"]; // Encrypt request body if it contains sensitive data
  }

  /**
   * Generate unique ID for queued request
   * @returns {string}
   */
  generateId() {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add request to queue
   * @param {object} requestData
   * @returns {Promise<string>} Request ID
   */
  async queueRequest(requestData) {
    const queuedRequest = {
      id: this.generateId(),
      url: requestData.url,
      method: requestData.method || "GET",
      headers: requestData.headers || {},
      body: requestData.body || "",
      timestamp: Date.now(),
      priority: requestData.priority || 3, // 1-5, 1 being highest
      retryCount: 0,
      maxRetries: requestData.maxRetries || 3,
      version: 1,
    };

    return await dbManager.add(
      this.storeName,
      queuedRequest,
      this.sensitiveFields
    );
  }

  /**
   * Get queued request by ID
   * @param {string} requestId
   * @returns {Promise<object|null>}
   */
  async getQueuedRequest(requestId) {
    return await dbManager.get(this.storeName, requestId, this.sensitiveFields);
  }

  /**
   * Get all queued requests ordered by priority and timestamp
   * @returns {Promise<Array>}
   */
  async getAllQueuedRequests() {
    const requests = await dbManager.getAll(
      this.storeName,
      this.sensitiveFields
    );

    // Sort by priority (ascending) then by timestamp (ascending - oldest first)
    return requests.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Get requests by priority
   * @param {number} priority
   * @returns {Promise<Array>}
   */
  async getRequestsByPriority(priority) {
    return await dbManager.queryByIndex(
      this.storeName,
      "priority",
      priority,
      this.sensitiveFields
    );
  }

  /**
   * Get high priority requests (priority 1-2)
   * @returns {Promise<Array>}
   */
  async getHighPriorityRequests() {
    const allRequests = await this.getAllQueuedRequests();
    return allRequests.filter((request) => request.priority <= 2);
  }

  /**
   * Get requests that haven't exceeded max retries
   * @returns {Promise<Array>}
   */
  async getRetryableRequests() {
    const allRequests = await this.getAllQueuedRequests();
    return allRequests.filter(
      (request) => request.retryCount < request.maxRetries
    );
  }

  /**
   * Get failed requests (exceeded max retries)
   * @returns {Promise<Array>}
   */
  async getFailedRequests() {
    const allRequests = await this.getAllQueuedRequests();
    return allRequests.filter(
      (request) => request.retryCount >= request.maxRetries
    );
  }

  /**
   * Update request retry count
   * @param {string} requestId
   * @returns {Promise<void>}
   */
  async incrementRetryCount(requestId) {
    const request = await this.getQueuedRequest(requestId);
    if (!request) {
      throw new Error(`Queued request ${requestId} not found`);
    }

    await dbManager.update(
      this.storeName,
      requestId,
      {
        retryCount: request.retryCount + 1,
        lastRetryAt: Date.now(),
      },
      this.sensitiveFields
    );
  }

  /**
   * Remove request from queue
   * @param {string} requestId
   * @returns {Promise<void>}
   */
  async removeRequest(requestId) {
    await dbManager.delete(this.storeName, requestId);
  }

  /**
   * Remove multiple requests from queue
   * @param {Array<string>} requestIds
   * @returns {Promise<void>}
   */
  async removeMultipleRequests(requestIds) {
    const promises = requestIds.map((id) => this.removeRequest(id));
    await Promise.all(promises);
  }

  /**
   * Clear all queued requests
   * @returns {Promise<void>}
   */
  async clearQueue() {
    await dbManager.clear(this.storeName);
  }

  /**
   * Clear failed requests only
   * @returns {Promise<number>} Number of cleared requests
   */
  async clearFailedRequests() {
    const failedRequests = await this.getFailedRequests();
    await this.removeMultipleRequests(failedRequests.map((req) => req.id));
    return failedRequests.length;
  }

  /**
   * Get queue statistics
   * @returns {Promise<object>}
   */
  async getQueueStatistics() {
    const allRequests = await this.getAllQueuedRequests();

    const stats = {
      total: allRequests.length,
      byPriority: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      byMethod: {},
      retryable: 0,
      failed: 0,
      oldestRequest: null,
      newestRequest: null,
    };

    if (allRequests.length === 0) {
      return stats;
    }

    // Find oldest and newest
    stats.oldestRequest = allRequests.reduce((oldest, current) =>
      current.timestamp < oldest.timestamp ? current : oldest
    );

    stats.newestRequest = allRequests.reduce((newest, current) =>
      current.timestamp > newest.timestamp ? current : newest
    );

    // Calculate statistics
    allRequests.forEach((request) => {
      // Count by priority
      stats.byPriority[request.priority] =
        (stats.byPriority[request.priority] || 0) + 1;

      // Count by method
      stats.byMethod[request.method] =
        (stats.byMethod[request.method] || 0) + 1;

      // Count retryable vs failed
      if (request.retryCount < request.maxRetries) {
        stats.retryable++;
      } else {
        stats.failed++;
      }
    });

    return stats;
  }

  /**
   * Get requests older than specified time
   * @param {number} maxAge Maximum age in milliseconds
   * @returns {Promise<Array>}
   */
  async getOldRequests(maxAge = 24 * 60 * 60 * 1000) {
    // Default: 24 hours
    const cutoffTime = Date.now() - maxAge;
    const allRequests = await this.getAllQueuedRequests();

    return allRequests.filter((request) => request.timestamp < cutoffTime);
  }

  /**
   * Clean up old requests
   * @param {number} maxAge Maximum age in milliseconds
   * @returns {Promise<number>} Number of cleaned requests
   */
  async cleanupOldRequests(maxAge = 24 * 60 * 60 * 1000) {
    const oldRequests = await this.getOldRequests(maxAge);
    await this.removeMultipleRequests(oldRequests.map((req) => req.id));
    return oldRequests.length;
  }

  /**
   * Update request priority
   * @param {string} requestId
   * @param {number} newPriority
   * @returns {Promise<void>}
   */
  async updatePriority(requestId, newPriority) {
    if (newPriority < 1 || newPriority > 5) {
      throw new Error("Priority must be between 1 and 5");
    }

    await dbManager.update(
      this.storeName,
      requestId,
      { priority: newPriority },
      this.sensitiveFields
    );
  }

  /**
   * Duplicate request detection
   * @param {object} requestData
   * @returns {Promise<object|null>} Existing similar request or null
   */
  async findSimilarRequest(requestData) {
    const allRequests = await this.getAllQueuedRequests();

    return (
      allRequests.find(
        (request) =>
          request.url === requestData.url &&
          request.method === requestData.method &&
          request.body === requestData.body
      ) || null
    );
  }

  /**
   * Add request with duplicate detection
   * @param {object} requestData
   * @param {boolean} allowDuplicates
   * @returns {Promise<string|null>} Request ID or null if duplicate found
   */
  async queueRequestWithDuplicateCheck(requestData, allowDuplicates = false) {
    if (!allowDuplicates) {
      const existing = await this.findSimilarRequest(requestData);
      if (existing) {
        console.log("Similar request already queued:", existing.id);
        return null;
      }
    }

    return await this.queueRequest(requestData);
  }

  /**
   * Export queue for debugging
   * @returns {Promise<object>}
   */
  async exportQueue() {
    const requests = await this.getAllQueuedRequests();
    const stats = await this.getQueueStatistics();

    return {
      requests,
      statistics: stats,
      exportedAt: Date.now(),
      version: 1,
    };
  }

  /**
   * Batch process requests
   * @param {number} batchSize
   * @returns {Promise<Array>} Batch of requests to process
   */
  async getNextBatch(batchSize = 10) {
    const retryableRequests = await this.getRetryableRequests();
    return retryableRequests.slice(0, batchSize);
  }
}

// Singleton instance
export const queueDAO = new QueueDAO();
