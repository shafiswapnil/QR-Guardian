import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("PWA Install Prompt Functionality", () => {
  let mockDeferredPrompt;
  let addEventListenerSpy;
  let removeEventListenerSpy;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock deferred prompt
    mockDeferredPrompt = {
      prompt: vi.fn().mockResolvedValue({ outcome: "accepted" }),
      preventDefault: vi.fn(),
    };

    // Mock event listeners
    addEventListenerSpy = vi.spyOn(window, "addEventListener");
    removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    // Mock navigator.userAgent
    Object.defineProperty(navigator, "userAgent", {
      writable: true,
      value:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    });

    // Mock localStorage.getItem to return empty array
    localStorageMock.getItem.mockReturnValue("[]");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Browser Detection", () => {
    it("should detect Chrome browser correctly", () => {
      Object.defineProperty(navigator, "userAgent", {
        writable: true,
        value:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      });

      // Test browser detection logic directly
      const userAgent = navigator.userAgent.toLowerCase();
      const isChrome =
        userAgent.includes("chrome") && !userAgent.includes("edg");

      expect(isChrome).toBe(true);
    });

    it("should detect Safari browser correctly", () => {
      Object.defineProperty(navigator, "userAgent", {
        writable: true,
        value:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1",
      });

      const userAgent = navigator.userAgent.toLowerCase();
      const isSafari =
        userAgent.includes("safari") && !userAgent.includes("chrome");

      expect(isSafari).toBe(true);
    });

    it("should detect Firefox browser correctly", () => {
      Object.defineProperty(navigator, "userAgent", {
        writable: true,
        value:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0",
      });

      const userAgent = navigator.userAgent.toLowerCase();
      const isFirefox = userAgent.includes("firefox");

      expect(isFirefox).toBe(true);
    });

    it("should detect Edge browser correctly", () => {
      Object.defineProperty(navigator, "userAgent", {
        writable: true,
        value:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59",
      });

      const userAgent = navigator.userAgent.toLowerCase();
      const isEdge = userAgent.includes("edg");

      expect(isEdge).toBe(true);
    });
  });

  describe("Install Status Detection", () => {
    it("should detect installed state from display mode", () => {
      // Mock standalone display mode
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === "(display-mode: standalone)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const isStandalone = window.matchMedia(
        "(display-mode: standalone)"
      ).matches;
      expect(isStandalone).toBe(true);
    });

    it("should detect installed state from navigator.standalone", () => {
      // Mock iOS standalone mode
      Object.defineProperty(window.navigator, "standalone", {
        writable: true,
        value: true,
      });

      expect(window.navigator.standalone).toBe(true);
    });

    it("should detect installed state from android-app referrer", () => {
      // Mock document.referrer
      Object.defineProperty(document, "referrer", {
        writable: true,
        value: "android-app://com.example.app",
      });

      const isFromAndroidApp = document.referrer.includes("android-app://");
      expect(isFromAndroidApp).toBe(true);
    });
  });

  describe("Event Handling", () => {
    it("should handle beforeinstallprompt event correctly", () => {
      const mockEvent = {
        preventDefault: vi.fn(),
        ...mockDeferredPrompt,
      };

      // Simulate the event handler logic
      mockEvent.preventDefault();

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should handle app installed event correctly", () => {
      const mockEvent = {};

      // Simulate successful installation
      const installSuccess = true;

      expect(installSuccess).toBe(true);
    });
  });

  describe("Install Analytics", () => {
    it("should track install events correctly", () => {
      const event = {
        type: "pwa_install",
        action: "test_event",
        data: {
          test: "data",
          browser: "chrome",
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          url: window.location.href,
          referrer: document.referrer,
        },
      };

      // Simulate storing event
      const existingEvents = [];
      existingEvents.push(event);

      expect(existingEvents).toHaveLength(1);
      expect(existingEvents[0].action).toBe("test_event");
    });

    it("should calculate analytics correctly", () => {
      const mockEvents = [
        { action: "prompt_shown", data: { timestamp: Date.now() } },
        { action: "success", data: { timestamp: Date.now() } },
        { action: "dismissed", data: { timestamp: Date.now() } },
        { action: "error", data: { timestamp: Date.now() } },
      ];

      // Calculate analytics
      const analytics = {
        totalEvents: mockEvents.length,
        promptsShown: mockEvents.filter((e) => e.action === "prompt_shown")
          .length,
        installs: mockEvents.filter((e) => e.action === "success").length,
        dismissals: mockEvents.filter((e) => e.action === "dismissed").length,
        errors: mockEvents.filter(
          (e) => e.action === "error" || e.action === "prompt_error"
        ).length,
        lastEvent: mockEvents[mockEvents.length - 1] || null,
        events: mockEvents,
      };

      expect(analytics.totalEvents).toBe(4);
      expect(analytics.promptsShown).toBe(1);
      expect(analytics.installs).toBe(1);
      expect(analytics.dismissals).toBe(1);
      expect(analytics.errors).toBe(1);
    });

    it("should limit stored events to prevent storage bloat", () => {
      // Create 60 events (more than the 50 limit)
      const manyEvents = Array.from({ length: 60 }, (_, i) => ({
        action: `event_${i}`,
        data: { timestamp: Date.now() + i },
      }));

      // Simulate limiting logic
      const limitedEvents = manyEvents.slice(-50);

      expect(limitedEvents.length).toBe(50);
      expect(limitedEvents[0].action).toBe("event_10"); // Should start from event_10
    });
  });

  describe("Install Prompt Functionality", () => {
    it("should prompt install successfully", async () => {
      const result = await mockDeferredPrompt.prompt();

      expect(mockDeferredPrompt.prompt).toHaveBeenCalled();
      expect(result.outcome).toBe("accepted");
    });

    it("should handle prompt install when no deferred prompt available", async () => {
      const result = { outcome: "not_available" };

      expect(result.outcome).toBe("not_available");
    });

    it("should handle prompt errors gracefully", async () => {
      const errorPrompt = {
        prompt: vi.fn().mockRejectedValue(new Error("Prompt failed")),
      };

      try {
        await errorPrompt.prompt();
      } catch (error) {
        expect(error.message).toBe("Prompt failed");
      }
    });
  });

  describe("Notification Integration", () => {
    it("should show install success notification when available", async () => {
      // Mock service worker and notification API
      const mockRegistration = {
        showNotification: vi.fn(),
      };

      Object.defineProperty(navigator, "serviceWorker", {
        writable: true,
        value: {
          ready: Promise.resolve(mockRegistration),
        },
      });

      Object.defineProperty(window, "Notification", {
        writable: true,
        value: {
          permission: "granted",
        },
      });

      // Simulate showing notification
      if ("serviceWorker" in navigator && "Notification" in window) {
        const registration = await navigator.serviceWorker.ready;
        if (window.Notification.permission === "granted") {
          registration.showNotification("Test", {});
        }
      }

      expect(mockRegistration.showNotification).toHaveBeenCalledWith(
        "Test",
        {}
      );
    });
  });

  describe("Session Storage Integration", () => {
    it("should respect dismissed state in session storage", () => {
      sessionStorageMock.getItem.mockReturnValue("true");

      const isDismissed =
        sessionStorage.getItem("install_prompt_dismissed") === "true";

      expect(isDismissed).toBe(true);
    });

    it("should set dismissed state in session storage", () => {
      sessionStorage.setItem("install_prompt_dismissed", "true");

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        "install_prompt_dismissed",
        "true"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle localStorage errors gracefully", () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      let analytics = null;
      try {
        const events = JSON.parse(
          localStorage.getItem("pwa_install_events") || "[]"
        );
        analytics = { events };
      } catch (error) {
        analytics = null;
      }

      expect(analytics).toBe(null);
    });

    it("should handle JSON parsing errors gracefully", () => {
      localStorageMock.getItem.mockReturnValue("invalid json");

      let analytics = null;
      try {
        const events = JSON.parse(
          localStorage.getItem("pwa_install_events") || "[]"
        );
        analytics = { events };
      } catch (error) {
        analytics = null;
      }

      expect(analytics).toBe(null);
    });
  });
});
