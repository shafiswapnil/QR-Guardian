/**
 * NotificationHandler - Handles notification click routing and actions
 * Implements requirement 4.4: When notifications are sent THEN they SHALL work even when the app is closed
 */

import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const NotificationHandler = ({
  onRouteChange,
  onUpdateRequest,
  onSecurityAlert,
}) => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Handle service worker messages for notification actions
    const handleServiceWorkerMessage = (event) => {
      const { data } = event;

      if (!data || !data.type) return;

      switch (data.type) {
        case "APPLY_UPDATE":
          console.log("Update requested from notification");
          if (onUpdateRequest) {
            onUpdateRequest(data.version);
          }
          break;

        case "NOTIFICATION_CLICKED":
          console.log("Notification clicked:", data);
          handleNotificationRoute(data.notificationData);
          break;

        default:
          console.log("Unknown service worker message:", data.type);
      }
    };

    // Listen for service worker messages
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener(
        "message",
        handleServiceWorkerMessage
      );
    }

    // Handle URL parameters from notification clicks
    const alert = searchParams.get("alert");
    const action = searchParams.get("action");

    if (alert) {
      handleAlertRoute(alert, action);
    }

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "message",
          handleServiceWorkerMessage
        );
      }
    };
  }, [searchParams, onRouteChange, onUpdateRequest, onSecurityAlert]);

  const handleNotificationRoute = (notificationData) => {
    if (!notificationData || !notificationData.data) return;

    const { type, url } = notificationData.data;

    switch (type) {
      case "update":
        if (onRouteChange) {
          onRouteChange("settings"); // Navigate to settings for update
        }
        break;

      case "security":
        if (onSecurityAlert) {
          onSecurityAlert(notificationData.data.threat);
        }
        if (onRouteChange) {
          onRouteChange("safety");
        }
        break;

      case "sync":
        if (onRouteChange) {
          onRouteChange("history");
        }
        break;

      default:
        // Default navigation
        if (url && onRouteChange) {
          const urlPath = new URL(url, window.location.origin).pathname;
          onRouteChange(urlPath.substring(1) || "scanner");
        }
    }
  };

  const handleAlertRoute = (alertType, action) => {
    switch (alertType) {
      case "security":
      case "critical-security":
      case "malicious-qr":
        if (onSecurityAlert) {
          onSecurityAlert({
            type: alertType,
            description: "Security alert from notification",
            severity: alertType === "critical-security" ? "critical" : "high",
          });
        }
        if (onRouteChange) {
          onRouteChange("safety");
        }
        break;

      case "update":
        if (onUpdateRequest && action === "apply") {
          onUpdateRequest();
        }
        break;

      default:
        console.log("Unknown alert type:", alertType);
    }

    // Clean up URL parameters
    const newUrl = new URL(window.location);
    newUrl.searchParams.delete("alert");
    newUrl.searchParams.delete("action");
    window.history.replaceState({}, "", newUrl);
  };

  // This component doesn't render anything
  return null;
};

export default NotificationHandler;
