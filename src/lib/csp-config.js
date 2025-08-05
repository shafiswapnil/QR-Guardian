/**
 * Content Security Policy Configuration
 * Implements security headers for PWA compliance
 */

// CSP directives for different environments
export const CSP_DIRECTIVES = {
  // Core directives
  "default-src": ["'self'"],

  // Script sources - allowing inline scripts for React and service worker
  "script-src": [
    "'self'",
    "'unsafe-inline'", // Required for React inline scripts
    "'unsafe-eval'", // Required for development and some libraries
    "https://cdn.jsdelivr.net",
    "https://unpkg.com",
  ],

  // Style sources - allowing inline styles for component styling
  "style-src": [
    "'self'",
    "'unsafe-inline'", // Required for styled components and CSS-in-JS
    "https://fonts.googleapis.com",
  ],

  // Font sources
  "font-src": ["'self'", "https://fonts.gstatic.com"],

  // Image sources - allowing data URLs for QR codes and blob URLs for camera
  "img-src": [
    "'self'",
    "data:", // Required for QR code generation
    "blob:", // Required for camera access
    "https:", // Allow HTTPS images
  ],

  // Media sources - for camera and microphone access
  "media-src": [
    "'self'",
    "blob:", // Required for camera stream
  ],

  // Connection sources - for API calls and WebSocket connections
  "connect-src": [
    "'self'",
    "https:", // Allow HTTPS connections
    "wss:", // Allow secure WebSocket connections
    "ws:", // Allow WebSocket connections for development
  ],

  // Worker sources - for service worker and web workers
  "worker-src": [
    "'self'",
    "blob:", // Allow blob URLs for dynamic workers
  ],

  // Manifest source
  "manifest-src": ["'self'"],

  // Base URI restriction
  "base-uri": ["'self'"],

  // Form action restriction
  "form-action": ["'self'"],

  // Frame ancestors - prevent embedding
  "frame-ancestors": ["'none'"],

  // Upgrade insecure requests
  "upgrade-insecure-requests": [],
};

// Additional security headers
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
};

/**
 * Generate CSP header string from directives
 * @param {Object} directives - CSP directives object
 * @returns {string} CSP header string
 */
export function generateCSPHeader(directives = CSP_DIRECTIVES) {
  return Object.entries(directives)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(" ")}`;
    })
    .join("; ");
}

/**
 * Get CSP configuration for different environments
 * @param {string} environment - Environment (development, production)
 * @returns {Object} CSP configuration
 */
export function getCSPConfig(environment = "production") {
  const config = { ...CSP_DIRECTIVES };

  if (environment === "development") {
    // Allow localhost connections for development
    config["connect-src"].push("http://localhost:*", "ws://localhost:*");

    // Allow eval for development tools
    if (!config["script-src"].includes("'unsafe-eval'")) {
      config["script-src"].push("'unsafe-eval'");
    }
  }

  return config;
}

/**
 * Validate CSP configuration
 * @param {Object} directives - CSP directives to validate
 * @returns {Object} Validation result
 */
export function validateCSP(directives) {
  const errors = [];
  const warnings = [];

  // Check for unsafe directives
  Object.entries(directives).forEach(([directive, sources]) => {
    if (sources.includes("'unsafe-inline'")) {
      warnings.push(
        `${directive} allows 'unsafe-inline' which may be insecure`
      );
    }

    if (sources.includes("'unsafe-eval'")) {
      warnings.push(`${directive} allows 'unsafe-eval' which may be insecure`);
    }

    if (sources.includes("*")) {
      errors.push(`${directive} allows all sources (*) which is insecure`);
    }
  });

  // Check for required directives
  const requiredDirectives = ["default-src", "script-src", "style-src"];
  requiredDirectives.forEach((directive) => {
    if (!directives[directive]) {
      errors.push(`Missing required directive: ${directive}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Apply CSP headers to a Response object
 * @param {Response} response - Response to modify
 * @param {Object} cspConfig - CSP configuration
 * @returns {Response} Modified response with CSP headers
 */
export function applyCSPHeaders(response, cspConfig = CSP_DIRECTIVES) {
  const headers = new Headers(response.headers);

  // Add CSP header
  headers.set("Content-Security-Policy", generateCSPHeader(cspConfig));

  // Add additional security headers
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    headers.set(header, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Check if a URL is allowed by CSP
 * @param {string} url - URL to check
 * @param {string} directive - CSP directive to check against
 * @param {Object} cspConfig - CSP configuration
 * @returns {boolean} Whether the URL is allowed
 */
export function isURLAllowed(url, directive, cspConfig = CSP_DIRECTIVES) {
  const sources = cspConfig[directive] || cspConfig["default-src"] || [];

  try {
    const urlObj = new URL(url);

    return sources.some((source) => {
      if (source === "'self'") {
        return urlObj.origin === self.location.origin;
      }

      if (source === "'unsafe-inline'" || source === "'unsafe-eval'") {
        return false; // These don't apply to URL checking
      }

      if (source === "data:") {
        return url.startsWith("data:");
      }

      if (source === "blob:") {
        return url.startsWith("blob:");
      }

      if (source === "https:") {
        return urlObj.protocol === "https:";
      }

      if (source === "http:") {
        return urlObj.protocol === "http:";
      }

      // Check if URL matches the source pattern
      return url.startsWith(source) || urlObj.origin === source;
    });
  } catch (error) {
    console.error("Error checking URL against CSP:", error);
    return false;
  }
}

// Export default configuration
export default {
  directives: CSP_DIRECTIVES,
  headers: SECURITY_HEADERS,
  generateHeader: generateCSPHeader,
  getConfig: getCSPConfig,
  validate: validateCSP,
  applyHeaders: applyCSPHeaders,
  isURLAllowed,
};
