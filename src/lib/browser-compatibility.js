/**
 * Browser Compatibility Utilities
 * Handles cross-browser differences and optimizations for PWA features
 */

class BrowserCompatibility {
  constructor() {
    this.browser = this.detectBrowser();
    this.capabilities = this.detectCapabilities();
  }

  /**
   * Detect current browser
   */
  detectBrowser() {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes("chrome") && !userAgent.includes("edg")) {
      return "chrome";
    } else if (userAgent.includes("safari") && !userAgent.includes("chrome")) {
      return "safari";
    } else if (userAgent.includes("edg")) {
      return "edge";
    } else if (userAgent.includes("firefox")) {
      return "firefox";
    }

    return "unknown";
  }

  /**
   * Detect browser capabilities
   */
  detectCapabilities() {
    return {
      serviceWorker: "serviceWorker" in navigator,
      pushNotifications: "PushManager" in window,
      installPrompt: "onbeforeinstallprompt" in window,
      indexedDB: "indexedDB" in window,
      webShare: "share" in navigator,
      backgroundSync:
        "serviceWorker" in navigator &&
        "sync" in window.ServiceWorkerRegistration.prototype,
      notifications: "Notification" in window,
      geolocation: "geolocation" in navigator,
      camera:
        "mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices,
      fullscreen: "requestFullscreen" in document.documentElement,
      orientation: "orientation" in screen,
      vibration: "vibrate" in navigator,
    };
  }

  /**
   * Get browser-specific install instructions
   */
  getInstallInstructions() {
    const instructions = {
      chrome: {
        desktop: [
          "Click the install button in the address bar",
          "Or use the menu: More tools → Install QR Guardian",
          "The app will appear in your applications folder",
        ],
        mobile: [
          "Tap the menu button (⋮)",
          'Select "Add to Home screen"',
          "Confirm the installation",
        ],
      },
      safari: {
        desktop: [
          "Safari doesn't support PWA installation on desktop",
          "You can bookmark the page for quick access",
        ],
        mobile: [
          "Tap the Share button (□↗)",
          'Scroll down and tap "Add to Home Screen"',
          'Customize the name and tap "Add"',
        ],
      },
      edge: {
        desktop: [
          "Click the install button in the address bar",
          "Or use Settings and more (⋯) → Apps → Install this site as an app",
          "The app will appear in your Start menu",
        ],
        mobile: [
          "Tap the menu button (⋯)",
          'Select "Add to phone"',
          "Confirm the installation",
        ],
      },
      firefox: {
        desktop: [
          "Firefox doesn't support PWA installation on desktop",
          "You can bookmark the page or pin the tab",
        ],
        mobile: [
          "Tap the menu button (⋯)",
          'Select "Install"',
          "Confirm the installation",
        ],
      },
    };

    const isMobile = this.isMobile();
    const browserInstructions =
      instructions[this.browser] || instructions.chrome;

    return {
      browser: this.browser,
      platform: isMobile ? "mobile" : "desktop",
      instructions: browserInstructions[isMobile ? "mobile" : "desktop"],
      supported: this.isInstallSupported(),
    };
  }

  /**
   * Check if PWA installation is supported
   */
  isInstallSupported() {
    switch (this.browser) {
      case "chrome":
        return true;
      case "edge":
        return true;
      case "firefox":
        return this.isMobile(); // Only mobile Firefox supports PWA install
      case "safari":
        return this.isMobile(); // Only mobile Safari supports add to home screen
      default:
        return false;
    }
  }

  /**
   * Check if device is mobile
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  /**
   * Get browser-specific service worker registration options
   */
  getServiceWorkerOptions() {
    const baseOptions = {
      scope: "/",
    };

    switch (this.browser) {
      case "safari":
        // Safari has stricter service worker requirements
        return {
          ...baseOptions,
          updateViaCache: "none", // Prevent caching issues in Safari
        };
      case "firefox":
        return {
          ...baseOptions,
          updateViaCache: "imports",
        };
      default:
        return baseOptions;
    }
  }

  /**
   * Get browser-specific notification options
   */
  getNotificationOptions(baseOptions = {}) {
    const options = { ...baseOptions };

    switch (this.browser) {
      case "safari":
        // Safari has limited notification support
        delete options.actions; // Safari doesn't support notification actions
        delete options.image; // Safari doesn't support notification images
        break;
      case "firefox":
        // Firefox has good notification support
        break;
      case "chrome":
      case "edge":
        // Chrome and Edge have full notification support
        break;
    }

    return options;
  }

  /**
   * Get browser-specific cache strategies
   */
  getCacheStrategies() {
    const strategies = {
      chrome: {
        static: "CacheFirst",
        api: "NetworkFirst",
        images: "CacheFirst",
      },
      safari: {
        static: "CacheFirst",
        api: "NetworkFirst", // Safari can be aggressive with caching
        images: "CacheFirst",
      },
      firefox: {
        static: "CacheFirst",
        api: "NetworkFirst",
        images: "CacheFirst",
      },
      edge: {
        static: "CacheFirst",
        api: "NetworkFirst",
        images: "CacheFirst",
      },
    };

    return strategies[this.browser] || strategies.chrome;
  }

  /**
   * Handle browser-specific fullscreen API
   */
  requestFullscreen(element = document.documentElement) {
    if (!this.capabilities.fullscreen) {
      console.warn("Fullscreen not supported in this browser");
      return Promise.reject(new Error("Fullscreen not supported"));
    }

    // Try different fullscreen methods for cross-browser compatibility
    if (element.requestFullscreen) {
      return element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      // Safari
      return element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
      // Firefox
      return element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
      // IE/Edge
      return element.msRequestFullscreen();
    }

    return Promise.reject(new Error("Fullscreen method not found"));
  }

  /**
   * Handle browser-specific vibration API
   */
  vibrate(pattern = 200) {
    if (!this.capabilities.vibration) {
      console.warn("Vibration not supported in this browser");
      return false;
    }

    try {
      return navigator.vibrate(pattern);
    } catch (error) {
      console.warn("Vibration failed:", error);
      return false;
    }
  }

  /**
   * Get browser-specific web share options
   */
  async share(shareData) {
    if (!this.capabilities.webShare) {
      // Fallback to clipboard or custom share dialog
      return this.fallbackShare(shareData);
    }

    try {
      await navigator.share(shareData);
      return true;
    } catch (error) {
      console.warn("Web Share failed:", error);
      return this.fallbackShare(shareData);
    }
  }

  /**
   * Fallback sharing method for browsers without Web Share API
   */
  async fallbackShare(shareData) {
    const { title, text, url } = shareData;
    const shareText = `${title}\n${text}\n${url}`;

    // Try clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareText);
        return { method: "clipboard", success: true };
      } catch (error) {
        console.warn("Clipboard write failed:", error);
      }
    }

    // Fallback to creating a temporary textarea
    const textarea = document.createElement("textarea");
    textarea.value = shareText;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return { method: "execCommand", success };
    } catch (error) {
      document.body.removeChild(textarea);
      return { method: "none", success: false };
    }
  }

  /**
   * Get browser-specific performance optimizations
   */
  getPerformanceOptimizations() {
    const optimizations = {
      chrome: {
        useRequestIdleCallback: true,
        useIntersectionObserver: true,
        useWebWorkers: true,
        prefetchStrategy: "aggressive",
      },
      safari: {
        useRequestIdleCallback: false, // Limited support
        useIntersectionObserver: true,
        useWebWorkers: true,
        prefetchStrategy: "conservative", // Safari can be memory constrained
      },
      firefox: {
        useRequestIdleCallback: true,
        useIntersectionObserver: true,
        useWebWorkers: true,
        prefetchStrategy: "moderate",
      },
      edge: {
        useRequestIdleCallback: true,
        useIntersectionObserver: true,
        useWebWorkers: true,
        prefetchStrategy: "aggressive",
      },
    };

    return optimizations[this.browser] || optimizations.chrome;
  }

  /**
   * Apply browser-specific CSS fixes
   */
  applyCSSFixes() {
    const style = document.createElement("style");
    let css = "";

    switch (this.browser) {
      case "safari":
        css += `
          /* Safari-specific fixes */
          .pwa-install-button {
            -webkit-appearance: none;
            border-radius: 8px;
          }
          
          /* Fix Safari viewport issues */
          .app-container {
            min-height: -webkit-fill-available;
          }
          
          /* Safari safe area support */
          .safe-area-inset {
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
            padding-left: env(safe-area-inset-left);
            padding-right: env(safe-area-inset-right);
          }
        `;
        break;

      case "firefox":
        css += `
          /* Firefox-specific fixes */
          .pwa-install-button {
            -moz-appearance: none;
          }
        `;
        break;

      case "edge":
        css += `
          /* Edge-specific fixes */
          .pwa-install-button {
            -ms-appearance: none;
          }
        `;
        break;
    }

    if (css) {
      style.textContent = css;
      document.head.appendChild(style);
    }
  }

  /**
   * Get browser compatibility report
   */
  getCompatibilityReport() {
    return {
      browser: this.browser,
      capabilities: this.capabilities,
      installSupported: this.isInstallSupported(),
      isMobile: this.isMobile(),
      recommendations: this.getRecommendations(),
    };
  }

  /**
   * Get browser-specific recommendations
   */
  getRecommendations() {
    const recommendations = [];

    if (this.browser === "safari" && !this.isMobile()) {
      recommendations.push(
        "Consider showing a bookmark prompt instead of install prompt on Safari desktop"
      );
    }

    if (this.browser === "firefox" && !this.isMobile()) {
      recommendations.push("PWA installation not supported on Firefox desktop");
    }

    if (!this.capabilities.pushNotifications) {
      recommendations.push(
        "Push notifications not supported - consider alternative notification methods"
      );
    }

    if (!this.capabilities.backgroundSync) {
      recommendations.push(
        "Background sync not supported - implement alternative offline sync strategy"
      );
    }

    return recommendations;
  }
}

// Create singleton instance
const browserCompatibility = new BrowserCompatibility();

export default browserCompatibility;
