/**
 * Notification Templates - Predefined notification configurations
 * Implements requirements 4.1, 4.2, 4.3, 4.4
 */

/**
 * Base notification template with common properties
 */
const baseTemplate = {
  icon: "/android-chrome-192x192.png",
  badge: "/android-chrome-192x192.png",
  vibrate: [200, 100, 200],
  requireInteraction: false,
  silent: false,
  dir: "ltr",
  lang: "en",
};

/**
 * App update notification template
 * Requirement 4.1: When the app has updates available THEN the user SHALL be notified through push notifications
 */
export const updateNotificationTemplate = (version) => ({
  ...baseTemplate,
  title: "QR Guardian Update Available",
  body: `Version ${version} is ready to install. Tap to update now.`,
  tag: "app-update",
  requireInteraction: true,
  actions: [
    {
      action: "update",
      title: "Update Now",
      icon: "/icons/update-icon.png",
    },
    {
      action: "dismiss",
      title: "Later",
      icon: "/icons/dismiss-icon.png",
    },
  ],
  data: {
    type: "update",
    version: version,
    url: "/",
    timestamp: Date.now(),
  },
});

/**
 * Security alert notification template
 * Requirement 4.2: When security threats are detected THEN the user SHALL receive appropriate alerts
 */
export const securityAlertTemplate = (threat) => ({
  ...baseTemplate,
  title: "Security Alert - QR Guardian",
  body: `Potential security threat detected: ${threat.description}`,
  tag: "security-alert",
  requireInteraction: true,
  vibrate: [300, 100, 300, 100, 300],
  actions: [
    {
      action: "view",
      title: "View Details",
      icon: "/icons/view-icon.png",
    },
    {
      action: "dismiss",
      title: "Dismiss",
      icon: "/icons/dismiss-icon.png",
    },
  ],
  data: {
    type: "security",
    threat: threat,
    url: "/?alert=security",
    timestamp: Date.now(),
    severity: threat.severity || "medium",
  },
});

/**
 * Critical security alert template for high-severity threats
 */
export const criticalSecurityAlertTemplate = (threat) => ({
  ...baseTemplate,
  title: "🚨 Critical Security Alert",
  body: `URGENT: ${threat.description}. Immediate action required.`,
  tag: "critical-security-alert",
  requireInteraction: true,
  vibrate: [500, 200, 500, 200, 500],
  actions: [
    {
      action: "view",
      title: "View Now",
      icon: "/icons/urgent-icon.png",
    },
  ],
  data: {
    type: "security",
    threat: threat,
    url: "/?alert=critical-security",
    timestamp: Date.now(),
    severity: "critical",
  },
});

/**
 * Malicious QR code detected notification
 */
export const maliciousQRDetectedTemplate = (qrData) => ({
  ...baseTemplate,
  title: "⚠️ Malicious QR Code Blocked",
  body: `A potentially harmful QR code was blocked. Content: ${qrData.content.substring(
    0,
    50
  )}...`,
  tag: "malicious-qr-blocked",
  requireInteraction: true,
  vibrate: [400, 150, 400, 150, 400],
  actions: [
    {
      action: "view",
      title: "View Details",
      icon: "/icons/warning-icon.png",
    },
    {
      action: "dismiss",
      title: "OK",
      icon: "/icons/ok-icon.png",
    },
  ],
  data: {
    type: "security",
    threat: {
      type: "malicious-qr",
      content: qrData.content,
      reason: qrData.reason,
    },
    url: "/?alert=malicious-qr",
    timestamp: Date.now(),
    severity: "high",
  },
});

/**
 * Sync completion notification template
 */
export const syncCompleteTemplate = (syncData) => ({
  ...baseTemplate,
  title: "QR Guardian - Sync Complete",
  body: `${syncData.count} items synced successfully.`,
  tag: "sync-complete",
  requireInteraction: false,
  silent: true,
  actions: [
    {
      action: "view",
      title: "View History",
      icon: "/icons/history-icon.png",
    },
  ],
  data: {
    type: "sync",
    syncData: syncData,
    url: "/?tab=history",
    timestamp: Date.now(),
  },
});

/**
 * Sync failed notification template
 */
export const syncFailedTemplate = (error) => ({
  ...baseTemplate,
  title: "QR Guardian - Sync Failed",
  body: "Some data could not be synced. Will retry automatically.",
  tag: "sync-failed",
  requireInteraction: false,
  actions: [
    {
      action: "retry",
      title: "Retry Now",
      icon: "/icons/retry-icon.png",
    },
    {
      action: "dismiss",
      title: "OK",
      icon: "/icons/ok-icon.png",
    },
  ],
  data: {
    type: "sync-error",
    error: error.message,
    url: "/",
    timestamp: Date.now(),
  },
});

/**
 * App installation success notification
 */
export const installSuccessTemplate = () => ({
  ...baseTemplate,
  title: "QR Guardian Installed!",
  body: "QR Guardian has been successfully installed. You can now access it from your home screen.",
  tag: "install-success",
  requireInteraction: false,
  vibrate: [100, 50, 100],
  actions: [
    {
      action: "open",
      title: "Open App",
      icon: "/icons/open-icon.png",
    },
  ],
  data: {
    type: "install",
    url: "/",
    timestamp: Date.now(),
  },
});

/**
 * Offline mode notification template
 */
export const offlineModeTemplate = () => ({
  ...baseTemplate,
  title: "QR Guardian - Offline Mode",
  body: "You are now offline. Limited features available.",
  tag: "offline-mode",
  requireInteraction: false,
  silent: true,
  data: {
    type: "offline",
    url: "/",
    timestamp: Date.now(),
  },
});

/**
 * Back online notification template
 */
export const backOnlineTemplate = () => ({
  ...baseTemplate,
  title: "QR Guardian - Back Online",
  body: "Connection restored. All features are now available.",
  tag: "back-online",
  requireInteraction: false,
  silent: true,
  data: {
    type: "online",
    url: "/",
    timestamp: Date.now(),
  },
});

/**
 * General app notification template
 */
export const generalNotificationTemplate = (title, body, options = {}) => ({
  ...baseTemplate,
  title: title || "QR Guardian",
  body: body || "You have a new notification",
  tag: options.tag || "general",
  requireInteraction: options.requireInteraction || false,
  silent: options.silent || false,
  vibrate: options.vibrate || baseTemplate.vibrate,
  actions: options.actions || [],
  data: {
    type: "general",
    url: options.url || "/",
    timestamp: Date.now(),
    ...options.data,
  },
});

/**
 * Permission request notification template
 */
export const permissionRequestTemplate = (permission) => ({
  ...baseTemplate,
  title: "QR Guardian - Permission Required",
  body: `Please grant ${permission} permission for the best experience.`,
  tag: "permission-request",
  requireInteraction: true,
  actions: [
    {
      action: "grant",
      title: "Grant Permission",
      icon: "/icons/grant-icon.png",
    },
    {
      action: "dismiss",
      title: "Not Now",
      icon: "/icons/dismiss-icon.png",
    },
  ],
  data: {
    type: "permission",
    permission: permission,
    url: "/",
    timestamp: Date.now(),
  },
});

/**
 * Helper function to get notification template by type
 */
export const getNotificationTemplate = (type, data) => {
  switch (type) {
    case "update":
      return updateNotificationTemplate(data.version);
    case "security":
      return data.severity === "critical"
        ? criticalSecurityAlertTemplate(data.threat)
        : securityAlertTemplate(data.threat);
    case "malicious-qr":
      return maliciousQRDetectedTemplate(data);
    case "sync-complete":
      return syncCompleteTemplate(data);
    case "sync-failed":
      return syncFailedTemplate(data.error);
    case "install-success":
      return installSuccessTemplate();
    case "offline":
      return offlineModeTemplate();
    case "online":
      return backOnlineTemplate();
    case "permission":
      return permissionRequestTemplate(data.permission);
    case "general":
    default:
      return generalNotificationTemplate(data.title, data.body, data.options);
  }
};

/**
 * Validate notification template
 */
export const validateNotificationTemplate = (template) => {
  const required = ["title", "body"];
  const missing = required.filter((field) => !template[field]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required notification fields: ${missing.join(", ")}`
    );
  }

  // Validate actions if present
  if (template.actions) {
    template.actions.forEach((action, index) => {
      if (!action.action || !action.title) {
        throw new Error(
          `Invalid action at index ${index}: action and title are required`
        );
      }
    });
  }

  return true;
};
