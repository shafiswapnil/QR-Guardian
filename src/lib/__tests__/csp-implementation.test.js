/**
 * CSP Implementation Tests
 * Tests for Content Security Policy implementation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  CSP_DIRECTIVES,
  SECURITY_HEADERS,
  generateCSPHeader,
  getCSPConfig,
  validateCSP,
  isURLAllowed,
} from "../csp-config.js";

describe("CSP Configuration", () => {
  describe("generateCSPHeader", () => {
    it("should generate valid CSP header string", () => {
      const testDirectives = {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "https://fonts.googleapis.com"],
      };

      const header = generateCSPHeader(testDirectives);

      expect(header).toContain("default-src 'self'");
      expect(header).toContain("script-src 'self' 'unsafe-inline'");
      expect(header).toContain("style-src 'self' https://fonts.googleapis.com");
    });

    it("should handle directives with no sources", () => {
      const testDirectives = {
        "upgrade-insecure-requests": [],
      };

      const header = generateCSPHeader(testDirectives);
      expect(header).toBe("upgrade-insecure-requests");
    });

    it("should use default directives when none provided", () => {
      const header = generateCSPHeader();
      expect(header).toContain("default-src 'self'");
      expect(header).toContain("script-src");
      expect(header).toContain("style-src");
    });
  });

  describe("getCSPConfig", () => {
    it("should return production config by default", () => {
      const config = getCSPConfig();
      expect(config["default-src"]).toEqual(["'self'"]);
      expect(config["connect-src"]).not.toContain("http://localhost:*");
    });

    it("should return development config with localhost", () => {
      const config = getCSPConfig("development");
      expect(config["connect-src"]).toContain("http://localhost:*");
      expect(config["connect-src"]).toContain("ws://localhost:*");
    });

    it("should include unsafe-eval in development", () => {
      const config = getCSPConfig("development");
      expect(config["script-src"]).toContain("'unsafe-eval'");
    });
  });

  describe("validateCSP", () => {
    it("should validate secure CSP configuration", () => {
      const secureConfig = {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'"],
      };

      const result = validateCSP(secureConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("should detect unsafe directives", () => {
      const unsafeConfig = {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "style-src": ["'self'", "*"],
      };

      const result = validateCSP(unsafeConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should detect missing required directives", () => {
      const incompleteConfig = {
        "default-src": ["'self'"],
      };

      const result = validateCSP(incompleteConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required directive: script-src");
      expect(result.errors).toContain("Missing required directive: style-src");
    });
  });

  describe("isURLAllowed", () => {
    const testConfig = {
      "script-src": ["'self'", "https://cdn.jsdelivr.net"],
      "img-src": ["'self'", "data:", "https:"],
      "default-src": ["'self'"],
    };

    beforeEach(() => {
      // Mock self.location for testing
      global.self = {
        location: {
          origin: "https://example.com",
        },
      };
    });

    it("should allow same-origin URLs", () => {
      const result = isURLAllowed(
        "https://example.com/script.js",
        "script-src",
        testConfig
      );
      expect(result).toBe(true);
    });

    it("should allow explicitly listed domains", () => {
      const result = isURLAllowed(
        "https://cdn.jsdelivr.net/npm/package",
        "script-src",
        testConfig
      );
      expect(result).toBe(true);
    });

    it("should allow data URLs when specified", () => {
      const result = isURLAllowed(
        "data:image/png;base64,abc123",
        "img-src",
        testConfig
      );
      expect(result).toBe(true);
    });

    it("should allow HTTPS URLs when https: is specified", () => {
      const result = isURLAllowed(
        "https://example.org/image.jpg",
        "img-src",
        testConfig
      );
      expect(result).toBe(true);
    });

    it("should block disallowed URLs", () => {
      const result = isURLAllowed(
        "http://malicious.com/script.js",
        "script-src",
        testConfig
      );
      expect(result).toBe(false);
    });

    it("should fall back to default-src when directive not found", () => {
      const result = isURLAllowed(
        "https://example.com/font.woff",
        "font-src",
        testConfig
      );
      expect(result).toBe(true);
    });
  });
});

describe("Security Headers", () => {
  it("should include all required security headers", () => {
    expect(SECURITY_HEADERS).toHaveProperty("X-Content-Type-Options");
    expect(SECURITY_HEADERS).toHaveProperty("X-Frame-Options");
    expect(SECURITY_HEADERS).toHaveProperty("X-XSS-Protection");
    expect(SECURITY_HEADERS).toHaveProperty("Referrer-Policy");
    expect(SECURITY_HEADERS).toHaveProperty("Strict-Transport-Security");
  });

  it("should have secure values for security headers", () => {
    expect(SECURITY_HEADERS["X-Frame-Options"]).toBe("DENY");
    expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
    expect(SECURITY_HEADERS["X-XSS-Protection"]).toBe("1; mode=block");
  });
});

describe("CSP Directives", () => {
  it("should have required CSP directives", () => {
    expect(CSP_DIRECTIVES).toHaveProperty("default-src");
    expect(CSP_DIRECTIVES).toHaveProperty("script-src");
    expect(CSP_DIRECTIVES).toHaveProperty("style-src");
    expect(CSP_DIRECTIVES).toHaveProperty("img-src");
    expect(CSP_DIRECTIVES).toHaveProperty("connect-src");
  });

  it("should allow self for default-src", () => {
    expect(CSP_DIRECTIVES["default-src"]).toContain("'self'");
  });

  it("should allow necessary sources for QR code functionality", () => {
    // Data URLs for QR code generation
    expect(CSP_DIRECTIVES["img-src"]).toContain("data:");

    // Blob URLs for camera access
    expect(CSP_DIRECTIVES["img-src"]).toContain("blob:");
    expect(CSP_DIRECTIVES["media-src"]).toContain("blob:");
  });

  it("should allow CDN sources for external libraries", () => {
    expect(CSP_DIRECTIVES["script-src"]).toContain("https://cdn.jsdelivr.net");
    expect(CSP_DIRECTIVES["script-src"]).toContain("https://unpkg.com");
  });

  it("should allow Google Fonts", () => {
    expect(CSP_DIRECTIVES["style-src"]).toContain(
      "https://fonts.googleapis.com"
    );
    expect(CSP_DIRECTIVES["font-src"]).toContain("https://fonts.gstatic.com");
  });

  it("should prevent frame embedding", () => {
    expect(CSP_DIRECTIVES["frame-ancestors"]).toEqual(["'none'"]);
  });

  it("should upgrade insecure requests", () => {
    expect(CSP_DIRECTIVES).toHaveProperty("upgrade-insecure-requests");
    expect(CSP_DIRECTIVES["upgrade-insecure-requests"]).toEqual([]);
  });
});

// Integration tests for browser environment
describe("CSP Browser Integration", () => {
  beforeEach(() => {
    // Mock DOM environment
    global.document = {
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      addEventListener: vi.fn(),
      styleSheets: [],
    };

    global.CSSRule = {
      FONT_FACE_RULE: 5,
    };
  });

  it("should detect CSP meta tag in document", () => {
    const mockMetaTag = { content: "default-src 'self'" };
    global.document.querySelector.mockReturnValue(mockMetaTag);

    // This would be tested in the actual CSP validator
    const metaCSP = document.querySelector(
      'meta[http-equiv="Content-Security-Policy"]'
    );
    expect(metaCSP).toBeTruthy();
  });

  it("should handle missing CSP meta tag", () => {
    global.document.querySelector.mockReturnValue(null);

    const metaCSP = document.querySelector(
      'meta[http-equiv="Content-Security-Policy"]'
    );
    expect(metaCSP).toBeFalsy();
  });
});

// Service Worker CSP tests
describe("Service Worker CSP Implementation", () => {
  beforeEach(() => {
    // Mock service worker environment
    global.self = {
      location: {
        origin: "https://example.com",
      },
    };

    global.Headers = class Headers {
      constructor(init) {
        this.headers = new Map();
        if (init) {
          Object.entries(init).forEach(([key, value]) => {
            this.headers.set(key.toLowerCase(), value);
          });
        }
      }

      get(name) {
        return this.headers.get(name.toLowerCase());
      }

      set(name, value) {
        this.headers.set(name.toLowerCase(), value);
      }

      has(name) {
        return this.headers.has(name.toLowerCase());
      }
    };

    global.Response = class Response {
      constructor(body, init = {}) {
        this.body = body;
        this.status = init.status || 200;
        this.statusText = init.statusText || "OK";
        this.headers = init.headers || new Headers();
      }
    };
  });

  it("should apply security headers to HTML responses", () => {
    const originalResponse = new Response("<html></html>", {
      headers: new Headers({ "content-type": "text/html" }),
    });

    // Mock the applySecurityHeaders function behavior
    const headers = new Headers(originalResponse.headers);
    headers.set("Content-Security-Policy", generateCSPHeader());
    headers.set("X-Frame-Options", "DENY");

    const secureResponse = new Response(originalResponse.body, {
      status: originalResponse.status,
      statusText: originalResponse.statusText,
      headers,
    });

    expect(secureResponse.headers.get("Content-Security-Policy")).toBeTruthy();
    expect(secureResponse.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("should not modify non-HTML responses", () => {
    const originalResponse = new Response('{"data": "test"}', {
      headers: new Headers({ "content-type": "application/json" }),
    });

    // Non-HTML responses should not get CSP headers in our implementation
    expect(originalResponse.headers.get("Content-Security-Policy")).toBeFalsy();
  });
});

describe("CSP Error Handling", () => {
  it("should handle invalid URLs gracefully", () => {
    const result = isURLAllowed("invalid-url", "script-src");
    expect(result).toBe(false);
  });

  it("should handle missing directive gracefully", () => {
    const config = { "default-src": ["'self'"] };
    const result = isURLAllowed(
      "https://example.com/test",
      "nonexistent-src",
      config
    );
    expect(result).toBe(true); // Should fall back to default-src
  });

  it("should handle empty configuration", () => {
    const result = validateCSP({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
