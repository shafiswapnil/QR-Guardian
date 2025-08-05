import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook for managing PWA install prompt
 *
 * Handles beforeinstallprompt event, browser detection, and install tracking
 * Provides a clean API for components to interact with PWA installation
 */
export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [browserInfo, setBrowserInfo] = useState({
    type: "unknown",
    supportsInstall: false,
  });

  // Detect browser and installation capabilities
  const detectBrowser = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    let type = "unknown";
    let supportsInstall = false;

    if (userAgent.includes("chrome") && !userAgent.includes("edg")) {
      type = "chrome";
      supportsInstall = true;
    } else if (userAgent.includes("firefox")) {
      type = "firefox";
      supportsInstall = false; // Firefox doesn't support PWA install prompts yet
    } else if (userAgent.includes("safari") && !userAgent.includes("chrome")) {
      type = "safari";
      supportsInstall = true; // Manual install via Add to Home Screen
    } else if (userAgent.includes("edg")) {
      type = "edge";
      supportsInstall = true;
    }

    return { type, supportsInstall };
  }, []);

  // Check if app is already installed
  const checkInstallStatus = useCallback(() => {
    // Check if running in standalone mode (installed PWA)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return true;
    }

    // Check if running as installed PWA on iOS
    if (window.navigator.standalone === true) {
      return true;
    }

    // Check for other indicators of installed state
    if (document.referrer.includes("android-app://")) {
      return true;
    }

    return false;
  }, []);

  // Track install-related events
  const trackInstallEvent = useCallback(
    (action, data = {}) => {
      const event = {
        type: "pwa_install",
        action,
        data: {
          ...data,
          browser: browserInfo.type,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          url: window.location.href,
          referrer: document.referrer,
        },
      };

      // Store in localStorage for analytics
      try {
        const installEvents = JSON.parse(
          localStorage.getItem("pwa_install_events") || "[]"
        );
        installEvents.push(event);

        // Keep only last 50 events to prevent storage bloat
        if (installEvents.length > 50) {
          installEvents.splice(0, installEvents.length - 50);
        }

        localStorage.setItem(
          "pwa_install_events",
          JSON.stringify(installEvents)
        );
      } catch (error) {
        console.error("Failed to store install event:", error);
      }

      // Log for debugging
      console.log("PWA Install Event:", event);

      // Dispatch custom event for other parts of the app to listen to
      window.dispatchEvent(
        new CustomEvent("pwa-install-event", { detail: event })
      );
    },
    [browserInfo.type]
  );

  // Prompt user to install the app
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      trackInstallEvent("prompt_not_available", {
        reason: "No deferred prompt available",
        browserSupport: browserInfo.supportsInstall,
      });
      return { outcome: "not_available" };
    }

    try {
      trackInstallEvent("prompt_shown");

      // Show the install prompt
      const result = await deferredPrompt.prompt();

      // Track the outcome
      trackInstallEvent("prompt_result", { outcome: result.outcome });

      // Clear the deferred prompt
      setDeferredPrompt(null);
      setIsInstallable(false);

      return result;
    } catch (error) {
      trackInstallEvent("prompt_error", {
        error: error.message,
        stack: error.stack,
      });

      console.error("Error showing install prompt:", error);
      return { outcome: "error", error };
    }
  }, [deferredPrompt, browserInfo.supportsInstall, trackInstallEvent]);

  // Get install analytics data
  const getInstallAnalytics = useCallback(() => {
    try {
      const events = JSON.parse(
        localStorage.getItem("pwa_install_events") || "[]"
      );

      // Aggregate analytics
      const analytics = {
        totalEvents: events.length,
        promptsShown: events.filter((e) => e.action === "prompt_shown").length,
        installs: events.filter((e) => e.action === "install_success").length,
        dismissals: events.filter((e) => e.action === "prompt_dismissed")
          .length,
        errors: events.filter(
          (e) => e.action === "install_error" || e.action === "prompt_error"
        ).length,
        lastEvent: events[events.length - 1] || null,
        events: events,
      };

      return analytics;
    } catch (error) {
      console.error("Failed to get install analytics:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    // Initialize browser detection
    const browser = detectBrowser();
    setBrowserInfo(browser);

    // Check if already installed
    const installed = checkInstallStatus();
    setIsInstalled(installed);

    // Don't set up event listeners if already installed
    if (installed) {
      return;
    }

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log("beforeinstallprompt event fired");

      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();

      // Store the event
      setDeferredPrompt(e);
      setIsInstallable(true);

      // Track that prompt is available
      trackInstallEvent("prompt_available", {
        browser: browser.type,
        userAgent: navigator.userAgent,
      });
    };

    // Handle app installed event
    const handleAppInstalled = (e) => {
      console.log("PWA was installed successfully");

      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);

      // Track successful installation
      trackInstallEvent("install_success", {
        method: "beforeinstallprompt",
        browser: browser.type,
      });
    };

    // Add event listeners
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Cleanup
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [detectBrowser, checkInstallStatus, trackInstallEvent]);

  return {
    // State
    isInstallable,
    isInstalled,
    deferredPrompt,
    browserInfo,

    // Actions
    promptInstall,
    trackInstallEvent,

    // Analytics
    getInstallAnalytics,
  };
};
