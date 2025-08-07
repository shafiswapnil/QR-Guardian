/**
 * Example usage of the IndexedDB system
 * This file demonstrates how to use the database in the QR Guardian app
 */

import { database } from "./database.js";

/**
 * Example: Initialize and use the database
 */
export async function initializeDatabase() {
  try {
    console.log("Initializing QR Guardian database...");

    // Initialize the database (optionally with user password for encryption)
    await database.initialize();

    console.log("Database initialized successfully!");

    // Get database statistics
    const stats = await database.getStatistics();
    console.log("Database statistics:", stats);

    return true;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    return false;
  }
}

/**
 * Example: Working with scan history
 */
export async function scanHistoryExample() {
  try {
    // Add a new scan to history
    const scanData = {
      content: "https://example.com",
      type: "url",
      safetyStatus: "safe",
      safetyDetails: {
        checks: ["malware", "phishing"],
        score: 95,
      },
    };

    const scanId = await database.scanHistory.addScan(scanData);
    console.log("Added scan with ID:", scanId);

    // Get the scan back
    const retrievedScan = await database.scanHistory.getScan(scanId);
    console.log("Retrieved scan:", retrievedScan);

    // Get all scans
    const allScans = await database.scanHistory.getAllScans();
    console.log("Total scans:", allScans.length);

    // Get scan statistics
    const stats = await database.scanHistory.getStatistics();
    console.log("Scan statistics:", stats);

    // Search scans
    const searchResults = await database.scanHistory.searchScans("example");
    console.log("Search results:", searchResults.length);

    return scanId;
  } catch (error) {
    console.error("Scan history example failed:", error);
    return null;
  }
}

/**
 * Example: Working with preferences
 */
export async function preferencesExample() {
  try {
    // Set individual preferences
    await database.preferences.setPreference("theme", "dark");
    await database.preferences.setPreference("notifications", true);
    await database.preferences.setPreference("autoScan", false);

    // Set multiple preferences at once
    await database.preferences.setMultiplePreferences({
      soundEnabled: true,
      vibrationEnabled: false,
      language: "en",
    });

    // Get individual preference
    const theme = await database.preferences.getPreference("theme");
    console.log("Current theme:", theme);

    // Get all preferences with defaults
    const allPrefs = await database.preferences.getPreferencesWithDefaults();
    console.log("All preferences:", allPrefs);

    // Set a sensitive preference (will be encrypted)
    await database.preferences.setPreference("apiKey", "secret-key-123", true);

    return allPrefs;
  } catch (error) {
    console.error("Preferences example failed:", error);
    return null;
  }
}

/**
 * Example: Working with request queue
 */
export async function queueExample() {
  try {
    // Queue a high-priority request
    const requestData = {
      url: "https://api.example.com/sync",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync", data: "test" }),
      priority: 1, // High priority
      maxRetries: 3,
    };

    const requestId = await database.queue.queueRequest(requestData);
    console.log("Queued request with ID:", requestId);

    // Get all queued requests
    const allRequests = await database.queue.getAllQueuedRequests();
    console.log("Total queued requests:", allRequests.length);

    // Get high priority requests
    const highPriorityRequests = await database.queue.getHighPriorityRequests();
    console.log("High priority requests:", highPriorityRequests.length);

    // Simulate processing a request (increment retry count)
    await database.queue.incrementRetryCount(requestId);

    // Get queue statistics
    const stats = await database.queue.getQueueStatistics();
    console.log("Queue statistics:", stats);

    // Clean up - remove the test request
    await database.queue.removeRequest(requestId);

    return requestId;
  } catch (error) {
    console.error("Queue example failed:", error);
    return null;
  }
}

/**
 * Example: Data backup and restore
 */
export async function backupRestoreExample() {
  try {
    // Export all data
    const backupData = await database.exportAllData();
    console.log("Exported data:", {
      scanHistory: backupData.scanHistory.length,
      preferences: Object.keys(backupData.preferences.preferences || {}).length,
      queuedRequests: backupData.queuedRequests.requests.length,
    });

    // In a real app, you would save this to a file or send to a server
    const backupJson = JSON.stringify(backupData, null, 2);
    console.log("Backup size:", backupJson.length, "characters");

    // Example: Import data (in practice, you'd load this from a file)
    const importResults = await database.importAllData(backupData);
    console.log("Import results:", importResults);

    return backupData;
  } catch (error) {
    console.error("Backup/restore example failed:", error);
    return null;
  }
}

/**
 * Example: Database health check and maintenance
 */
export async function maintenanceExample() {
  try {
    // Perform health check
    const health = await database.healthCheck();
    console.log("Database health:", health);

    // Get migration history
    const migrationHistory = database.migrations.exportMigrationHistory();
    console.log("Migration history:", migrationHistory);

    // Clean up old queued requests (older than 1 hour)
    const oneHour = 60 * 60 * 1000;
    const cleanedCount = await database.queue.cleanupOldRequests(oneHour);
    console.log("Cleaned up", cleanedCount, "old requests");

    // Validate database integrity
    const integrity = await database.migrations.validateDatabaseIntegrity();
    console.log("Database integrity:", integrity);

    return health;
  } catch (error) {
    console.error("Maintenance example failed:", error);
    return null;
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log("=== QR Guardian Database Examples ===\n");

  // Initialize database
  const initialized = await initializeDatabase();
  if (!initialized) {
    console.error("Failed to initialize database, stopping examples");
    return;
  }

  console.log("\n--- Scan History Example ---");
  await scanHistoryExample();

  console.log("\n--- Preferences Example ---");
  await preferencesExample();

  console.log("\n--- Queue Example ---");
  await queueExample();

  console.log("\n--- Backup/Restore Example ---");
  await backupRestoreExample();

  console.log("\n--- Maintenance Example ---");
  await maintenanceExample();

  console.log("\n=== Examples completed ===");
}

// Export for use in other parts of the application
export { database, initializeDatabase as initDB };
