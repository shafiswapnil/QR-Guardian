/**
 * CSP Validation and Monitoring Utilities
 * Helps validate and monitor Content Security Policy compliance
 */

import { CSP_DIRECTIVES, isURLAllowed } from "./csp-config.js";

/**
 * CSP Violation Reporter
 * Handles CSP violation reports and logging
 */
export class CSPViolationReporter {
  constructor() {
    this.violations = [];
    this.setupViolationListener();
  }

  /**
   * Set up CSP violation event listener
   */
  setupViolationListener() {
    if (typeof document !== "undefined") {
      document.addEventListener("securitypolicyviolation", (event) => {
        this.handleViolation(event);
      });
    }
  }

  /**
   * Handle CSP violation event
   * @param {SecurityPolicyViolationEvent} event - Violation event
   */
  handleViolation(event) {
    const violation = {
      timestamp: Date.now(),
      directive: event.violatedDirective,
      blockedURI: event.blockedURI,
      sourceFile: event.sourceFile,
      lineNumber: event.lineNumber,
      columnNumber: event.columnNumber,
      originalPolicy: event.originalPolicy,
      disposition: event.disposition,
      statusCode: event.statusCode,
    };

    this.violations.push(violation);

    // Log violation for debugging
    console.warn("CSP Violation:", violation);

    // Report to analytics if available
    this.reportViolation(violation);

    // Limit stored violations to prevent memory issues
    if (this.violations.length > 100) {
      this.violations = this.violations.slice(-50);
    }
  }

  /**
   * Report violation to analytics or monitoring service
   * @param {Object} violation - Violation details
   */
  reportViolation(violation) {
    // In a real application, you might send this to an analytics service
    // For now, we'll just store it locally for debugging
    try {
      const stored = localStorage.getItem("csp-violations");
      const violations = stored ? JSON.parse(stored) : [];
      violations.push(violation);

      // Keep only last 50 violations
      if (violations.length > 50) {
        violations.splice(0, violations.length - 50);
      }

      localStorage.setItem("csp-violations", JSON.stringify(violations));
    } catch (error) {
      console.error("Failed to store CSP violation:", error);
    }
  }

  /**
   * Get all recorded violations
   * @returns {Array} Array of violation objects
   */
  getViolations() {
    return [...this.violations];
  }

  /**
   * Get violations by directive
   * @param {string} directive - CSP directive to filter by
   * @returns {Array} Filtered violations
   */
  getViolationsByDirective(directive) {
    return this.violations.filter((v) => v.directive === directive);
  }

  /**
   * Clear all recorded violations
   */
  clearViolations() {
    this.violations = [];
    try {
      localStorage.removeItem("csp-violations");
    } catch (error) {
      console.error("Failed to clear stored violations:", error);
    }
  }

  /**
   * Get violation statistics
   * @returns {Object} Violation statistics
   */
  getStatistics() {
    const stats = {
      total: this.violations.length,
      byDirective: {},
      bySource: {},
      recent: 0,
    };

    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    this.violations.forEach((violation) => {
      // Count by directive
      stats.byDirective[violation.directive] =
        (stats.byDirective[violation.directive] || 0) + 1;

      // Count by source
      const source = violation.sourceFile || "inline";
      stats.bySource[source] = (stats.bySource[source] || 0) + 1;

      // Count recent violations
      if (violation.timestamp > oneHourAgo) {
        stats.recent++;
      }
    });

    return stats;
  }
}

/**
 * CSP Resource Validator
 * Validates resources against CSP policies
 */
export class CSPResourceValidator {
  constructor(cspConfig = CSP_DIRECTIVES) {
    this.cspConfig = cspConfig;
  }

  /**
   * Validate a script source
   * @param {string} src - Script source URL
   * @returns {Object} Validation result
   */
  validateScript(src) {
    return this.validateResource(src, "script-src");
  }

  /**
   * Validate a style source
   * @param {string} src - Style source URL
   * @returns {Object} Validation result
   */
  validateStyle(src) {
    return this.validateResource(src, "style-src");
  }

  /**
   * Validate an image source
   * @param {string} src - Image source URL
   * @returns {Object} Validation result
   */
  validateImage(src) {
    return this.validateResource(src, "img-src");
  }

  /**
   * Validate a font source
   * @param {string} src - Font source URL
   * @returns {Object} Validation result
   */
  validateFont(src) {
    return this.validateResource(src, "font-src");
  }

  /**
   * Validate a connection source
   * @param {string} src - Connection URL
   * @returns {Object} Validation result
   */
  validateConnection(src) {
    return this.validateResource(src, "connect-src");
  }

  /**
   * Validate a resource against CSP directive
   * @param {string} src - Resource URL
   * @param {string} directive - CSP directive
   * @returns {Object} Validation result
   */
  validateResource(src, directive) {
    try {
      const allowed = isURLAllowed(src, directive, this.cspConfig);

      return {
        valid: allowed,
        src,
        directive,
        message: allowed
          ? "Resource is allowed by CSP"
          : `Resource blocked by CSP directive: ${directive}`,
        allowedSources:
          this.cspConfig[directive] || this.cspConfig["default-src"],
      };
    } catch (error) {
      return {
        valid: false,
        src,
        directive,
        message: `Error validating resource: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Validate multiple resources
   * @param {Array} resources - Array of {src, type} objects
   * @returns {Array} Array of validation results
   */
  validateResources(resources) {
    return resources.map((resource) => {
      const directive = this.getDirectiveForType(resource.type);
      return this.validateResource(resource.src, directive);
    });
  }

  /**
   * Get CSP directive for resource type
   * @param {string} type - Resource type
   * @returns {string} CSP directive
   */
  getDirectiveForType(type) {
    const typeMap = {
      script: "script-src",
      style: "style-src",
      image: "img-src",
      font: "font-src",
      media: "media-src",
      connect: "connect-src",
      worker: "worker-src",
      manifest: "manifest-src",
    };

    return typeMap[type] || "default-src";
  }
}

/**
 * CSP Compliance Checker
 * Checks overall CSP compliance and provides recommendations
 */
export class CSPComplianceChecker {
  constructor() {
    this.reporter = new CSPViolationReporter();
    this.validator = new CSPResourceValidator();
  }

  /**
   * Run comprehensive CSP compliance check
   * @returns {Object} Compliance report
   */
  async runComplianceCheck() {
    const report = {
      timestamp: Date.now(),
      overall: "unknown",
      scores: {},
      violations: this.reporter.getStatistics(),
      recommendations: [],
      details: {},
    };

    try {
      // Check CSP header presence
      report.details.headerPresent = this.checkCSPHeaderPresent();

      // Check for unsafe directives
      report.details.unsafeDirectives = this.checkUnsafeDirectives();

      // Check resource validation
      report.details.resourceValidation = await this.checkResourceValidation();

      // Calculate compliance score
      report.scores = this.calculateComplianceScores(report.details);

      // Generate recommendations
      report.recommendations = this.generateRecommendations(report.details);

      // Determine overall compliance
      report.overall = this.determineOverallCompliance(report.scores);
    } catch (error) {
      report.error = error.message;
      report.overall = "error";
    }

    return report;
  }

  /**
   * Check if CSP header is present
   * @returns {boolean} Whether CSP header is present
   */
  checkCSPHeaderPresent() {
    // Check meta tag
    const metaCSP = document.querySelector(
      'meta[http-equiv="Content-Security-Policy"]'
    );
    return !!metaCSP;
  }

  /**
   * Check for unsafe CSP directives
   * @returns {Object} Unsafe directive analysis
   */
  checkUnsafeDirectives() {
    const analysis = {
      hasUnsafeInline: false,
      hasUnsafeEval: false,
      hasWildcard: false,
      details: [],
    };

    Object.entries(CSP_DIRECTIVES).forEach(([directive, sources]) => {
      sources.forEach((source) => {
        if (source === "'unsafe-inline'") {
          analysis.hasUnsafeInline = true;
          analysis.details.push(`${directive} allows 'unsafe-inline'`);
        }
        if (source === "'unsafe-eval'") {
          analysis.hasUnsafeEval = true;
          analysis.details.push(`${directive} allows 'unsafe-eval'`);
        }
        if (source === "*") {
          analysis.hasWildcard = true;
          analysis.details.push(`${directive} allows all sources (*)`);
        }
      });
    });

    return analysis;
  }

  /**
   * Check resource validation
   * @returns {Object} Resource validation results
   */
  async checkResourceValidation() {
    const results = {
      scripts: [],
      styles: [],
      images: [],
      fonts: [],
    };

    try {
      // Check scripts
      const scripts = document.querySelectorAll("script[src]");
      scripts.forEach((script) => {
        results.scripts.push(this.validator.validateScript(script.src));
      });

      // Check styles
      const styles = document.querySelectorAll('link[rel="stylesheet"]');
      styles.forEach((style) => {
        results.styles.push(this.validator.validateStyle(style.href));
      });

      // Check images
      const images = document.querySelectorAll("img[src]");
      images.forEach((img) => {
        results.images.push(this.validator.validateImage(img.src));
      });

      // Check fonts (from CSS)
      const fontFaces = Array.from(document.styleSheets).flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules || [])
            .filter((rule) => rule.type === CSSRule.FONT_FACE_RULE)
            .map((rule) => rule.style.src);
        } catch (e) {
          return [];
        }
      });

      fontFaces.forEach((src) => {
        if (src) {
          results.fonts.push(this.validator.validateFont(src));
        }
      });
    } catch (error) {
      results.error = error.message;
    }

    return results;
  }

  /**
   * Calculate compliance scores
   * @param {Object} details - Compliance check details
   * @returns {Object} Compliance scores
   */
  calculateComplianceScores(details) {
    const scores = {
      header: 0,
      security: 0,
      resources: 0,
      overall: 0,
    };

    // Header score
    scores.header = details.headerPresent ? 100 : 0;

    // Security score
    let securityDeductions = 0;
    if (details.unsafeDirectives.hasUnsafeInline) securityDeductions += 20;
    if (details.unsafeDirectives.hasUnsafeEval) securityDeductions += 30;
    if (details.unsafeDirectives.hasWildcard) securityDeductions += 50;
    scores.security = Math.max(0, 100 - securityDeductions);

    // Resource score
    if (details.resourceValidation && !details.resourceValidation.error) {
      const allResources = [
        ...details.resourceValidation.scripts,
        ...details.resourceValidation.styles,
        ...details.resourceValidation.images,
        ...details.resourceValidation.fonts,
      ];

      if (allResources.length > 0) {
        const validResources = allResources.filter((r) => r.valid).length;
        scores.resources = Math.round(
          (validResources / allResources.length) * 100
        );
      } else {
        scores.resources = 100; // No resources to validate
      }
    }

    // Overall score
    scores.overall = Math.round(
      (scores.header + scores.security + scores.resources) / 3
    );

    return scores;
  }

  /**
   * Generate recommendations based on compliance check
   * @param {Object} details - Compliance check details
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(details) {
    const recommendations = [];

    if (!details.headerPresent) {
      recommendations.push({
        priority: "high",
        category: "header",
        message: "Add Content-Security-Policy header or meta tag",
        action: "Add CSP header to improve security",
      });
    }

    if (details.unsafeDirectives.hasUnsafeInline) {
      recommendations.push({
        priority: "medium",
        category: "security",
        message: "Remove unsafe-inline from CSP directives",
        action: "Use nonces or hashes for inline scripts and styles",
      });
    }

    if (details.unsafeDirectives.hasUnsafeEval) {
      recommendations.push({
        priority: "high",
        category: "security",
        message: "Remove unsafe-eval from CSP directives",
        action: "Avoid eval() and similar functions",
      });
    }

    if (details.unsafeDirectives.hasWildcard) {
      recommendations.push({
        priority: "critical",
        category: "security",
        message: "Remove wildcard (*) from CSP directives",
        action: "Specify exact domains instead of allowing all sources",
      });
    }

    return recommendations;
  }

  /**
   * Determine overall compliance level
   * @param {Object} scores - Compliance scores
   * @returns {string} Compliance level
   */
  determineOverallCompliance(scores) {
    if (scores.overall >= 90) return "excellent";
    if (scores.overall >= 75) return "good";
    if (scores.overall >= 60) return "fair";
    if (scores.overall >= 40) return "poor";
    return "critical";
  }
}

// Create global instances
export const cspReporter = new CSPViolationReporter();
export const cspValidator = new CSPResourceValidator();
export const cspChecker = new CSPComplianceChecker();

// Export default compliance checker
export default cspChecker;
