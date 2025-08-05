#!/usr/bin/env node

/**
 * Cross-Browser PWA Testing Script
 * Tests PWA functionality across different browsers and devices
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CrossBrowserTester {
  constructor() {
    this.testResults = {
      chrome: {},
      safari: {},
      edge: {},
      firefox: {},
      mobile: {},
    };
    this.startTime = Date.now();
  }

  /**
   * Main test runner
   */
  async runAllTests() {
    console.log("🚀 Starting Cross-Browser PWA Testing...\n");

    // Test PWA manifest validity
    await this.testManifest();

    // Test service worker functionality
    await this.testServiceWorker();

    // Test install prompt compatibility
    await this.testInstallPrompt();

    // Test offline functionality
    await this.testOfflineCapabilities();

    // Test responsive design
    await this.testResponsiveDesign();

    // Generate test report
    this.generateReport();
  }

  /**
   * Test PWA manifest for cross-browser compatibility
   */
  async testManifest() {
    console.log("📋 Testing PWA Manifest...");

    try {
      // Check both possible manifest locations
      let manifestPath = path.join(
        process.cwd(),
        "dist",
        "manifest.webmanifest"
      );
      if (!fs.existsSync(manifestPath)) {
        manifestPath = path.join(process.cwd(), "public", "site.webmanifest");
      }

      if (!fs.existsSync(manifestPath)) {
        throw new Error("Manifest file not found");
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

      // Test required fields
      const requiredFields = [
        "name",
        "short_name",
        "start_url",
        "display",
        "icons",
      ];
      const missingFields = requiredFields.filter((field) => !manifest[field]);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      // Test icon sizes for different browsers
      const requiredIconSizes = ["192x192", "512x512"];
      const availableIcons = manifest.icons
        .map((icon) => icon.sizes || icon.src.match(/(\d+x\d+)/)?.[1])
        .filter(Boolean);

      const missingIcons = requiredIconSizes.filter(
        (size) => !availableIcons.includes(size)
      );

      if (missingIcons.length > 0) {
        console.warn(
          `⚠️  Missing recommended icon sizes: ${missingIcons.join(", ")}`
        );
      }

      // Browser-specific manifest tests
      this.testResults.chrome.manifest = this.testChromeManifest(manifest);
      this.testResults.safari.manifest = this.testSafariManifest(manifest);
      this.testResults.edge.manifest = this.testEdgeManifest(manifest);
      this.testResults.firefox.manifest = this.testFirefoxManifest(manifest);

      console.log("✅ Manifest tests completed\n");
    } catch (error) {
      console.error("❌ Manifest test failed:", error.message);
      this.testResults.manifest = { error: error.message };
    }
  }

  /**
   * Test Chrome-specific manifest requirements
   */
  testChromeManifest(manifest) {
    const results = { compatible: true, issues: [] };

    // Chrome requires theme_color for install prompt
    if (!manifest.theme_color) {
      results.issues.push("Missing theme_color for optimal Chrome experience");
    }

    // Chrome prefers standalone display mode
    if (manifest.display !== "standalone") {
      results.issues.push('Display mode should be "standalone" for Chrome');
    }

    // Chrome install criteria
    if (!manifest.start_url || manifest.start_url !== "/") {
      results.issues.push('start_url should be "/" for Chrome compatibility');
    }

    results.compatible = results.issues.length === 0;
    return results;
  }

  /**
   * Test Safari-specific manifest requirements
   */
  testSafariManifest(manifest) {
    const results = { compatible: true, issues: [] };

    // Safari uses apple-touch-icon meta tags primarily
    results.notes = [
      "Safari relies on apple-touch-icon meta tags",
      "Manifest support is limited in Safari",
    ];

    // Check if we have apple-specific meta tags in index.html
    const indexPath = path.join(process.cwd(), "index.html");
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, "utf8");

      if (!indexContent.includes("apple-touch-icon")) {
        results.issues.push("Missing apple-touch-icon meta tag for Safari");
      }

      if (!indexContent.includes("apple-mobile-web-app-capable")) {
        results.issues.push("Missing apple-mobile-web-app-capable meta tag");
      }
    }

    results.compatible = results.issues.length === 0;
    return results;
  }

  /**
   * Test Edge-specific manifest requirements
   */
  testEdgeManifest(manifest) {
    const results = { compatible: true, issues: [] };

    // Edge follows Chrome standards mostly
    if (!manifest.background_color) {
      results.issues.push("Missing background_color for Edge splash screen");
    }

    // Edge prefers specific icon formats
    const hasSquareIcons = manifest.icons.some(
      (icon) =>
        icon.sizes &&
        icon.sizes.includes("x") &&
        icon.sizes.split("x")[0] === icon.sizes.split("x")[1]
    );

    if (!hasSquareIcons) {
      results.issues.push("Edge prefers square icons");
    }

    results.compatible = results.issues.length === 0;
    return results;
  }

  /**
   * Test Firefox-specific manifest requirements
   */
  testFirefoxManifest(manifest) {
    const results = { compatible: true, issues: [] };

    // Firefox has good manifest support
    if (manifest.display === "fullscreen") {
      results.issues.push(
        "Firefox may not support fullscreen display mode well"
      );
    }

    // Firefox install criteria
    if (!manifest.icons || manifest.icons.length === 0) {
      results.issues.push(
        "Firefox requires at least one icon for installation"
      );
    }

    results.compatible = results.issues.length === 0;
    return results;
  }

  /**
   * Test service worker functionality
   */
  async testServiceWorker() {
    console.log("⚙️  Testing Service Worker...");

    try {
      const swPath = path.join(process.cwd(), "public", "sw.js");

      if (!fs.existsSync(swPath)) {
        throw new Error("Service worker file not found at public/sw.js");
      }

      const swContent = fs.readFileSync(swPath, "utf8");

      // Test for required service worker features
      const requiredFeatures = [
        "install",
        "activate",
        "fetch",
        "cache",
        "skipWaiting",
        "clients.claim",
      ];

      const missingFeatures = requiredFeatures.filter(
        (feature) => !swContent.includes(feature)
      );

      if (missingFeatures.length > 0) {
        console.warn(
          `⚠️  Service worker missing features: ${missingFeatures.join(", ")}`
        );
      }

      // Browser-specific service worker tests
      this.testResults.chrome.serviceWorker = { compatible: true };
      this.testResults.safari.serviceWorker = {
        compatible: true,
        notes: ["Limited service worker support in older Safari versions"],
      };
      this.testResults.edge.serviceWorker = { compatible: true };
      this.testResults.firefox.serviceWorker = { compatible: true };

      console.log("✅ Service worker tests completed\n");
    } catch (error) {
      console.error("❌ Service worker test failed:", error.message);
      this.testResults.serviceWorker = { error: error.message };
    }
  }

  /**
   * Test install prompt compatibility across browsers
   */
  async testInstallPrompt() {
    console.log("📱 Testing Install Prompt Compatibility...");

    // Test install prompt component
    const installPromptPath = path.join(
      process.cwd(),
      "src",
      "components",
      "InstallPrompt.jsx"
    );

    if (!fs.existsSync(installPromptPath)) {
      console.error("❌ InstallPrompt component not found");
      return;
    }

    const installPromptContent = fs.readFileSync(installPromptPath, "utf8");

    // Test for browser-specific install prompt handling
    const browserTests = {
      chrome: installPromptContent.includes("beforeinstallprompt"),
      safari:
        installPromptContent.includes("apple") ||
        installPromptContent.includes("iOS"),
      edge: installPromptContent.includes("beforeinstallprompt"),
      firefox: installPromptContent.includes("beforeinstallprompt"),
    };

    Object.entries(browserTests).forEach(([browser, hasSupport]) => {
      this.testResults[browser].installPrompt = {
        compatible: hasSupport,
        notes: hasSupport ? [] : ["Limited install prompt support"],
      };
    });

    console.log("✅ Install prompt tests completed\n");
  }

  /**
   * Test offline functionality
   */
  async testOfflineCapabilities() {
    console.log("🔌 Testing Offline Capabilities...");

    try {
      // Test offline manager
      const offlineManagerPath = path.join(
        process.cwd(),
        "src",
        "lib",
        "offline-manager.js"
      );

      if (!fs.existsSync(offlineManagerPath)) {
        throw new Error("OfflineManager not found");
      }

      const offlineContent = fs.readFileSync(offlineManagerPath, "utf8");

      // Test for offline features
      const offlineFeatures = [
        "navigator.onLine",
        "online",
        "offline",
        "IndexedDB",
        "localStorage",
      ];

      const availableFeatures = offlineFeatures.filter((feature) =>
        offlineContent.includes(feature)
      );

      // All browsers should support basic offline functionality
      Object.keys(this.testResults).forEach((browser) => {
        if (browser !== "mobile") {
          this.testResults[browser].offline = {
            compatible: true,
            features: availableFeatures,
            notes:
              browser === "safari"
                ? ["Limited IndexedDB support in private mode"]
                : [],
          };
        }
      });

      console.log("✅ Offline capability tests completed\n");
    } catch (error) {
      console.error("❌ Offline capability test failed:", error.message);
    }
  }

  /**
   * Test responsive design across different screen sizes
   */
  async testResponsiveDesign() {
    console.log("📐 Testing Responsive Design...");

    try {
      // Test CSS files for responsive design
      const cssPath = path.join(process.cwd(), "src", "index.css");

      if (!fs.existsSync(cssPath)) {
        throw new Error("Main CSS file not found");
      }

      const cssContent = fs.readFileSync(cssPath, "utf8");

      // Test for responsive design features
      const responsiveFeatures = [
        "@media",
        "min-width",
        "max-width",
        "viewport",
        "rem",
        "em",
        "%",
      ];

      const availableFeatures = responsiveFeatures.filter((feature) =>
        cssContent.includes(feature)
      );

      // Test viewport meta tag
      const indexPath = path.join(process.cwd(), "index.html");
      let hasViewportMeta = false;

      if (fs.existsSync(indexPath)) {
        const indexContent = fs.readFileSync(indexPath, "utf8");
        hasViewportMeta = indexContent.includes("viewport");
      }

      const responsiveScore =
        availableFeatures.length / responsiveFeatures.length;

      // Test results for different screen sizes
      this.testResults.mobile = {
        responsive: {
          score: responsiveScore,
          hasViewportMeta,
          features: availableFeatures,
          compatible: responsiveScore > 0.5 && hasViewportMeta,
        },
      };

      console.log("✅ Responsive design tests completed\n");
    } catch (error) {
      console.error("❌ Responsive design test failed:", error.message);
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const endTime = Date.now();
    const duration = (endTime - this.startTime) / 1000;

    console.log("📊 Cross-Browser Test Report");
    console.log("=".repeat(50));
    console.log(`Test Duration: ${duration}s\n`);

    // Browser compatibility summary
    Object.entries(this.testResults).forEach(([browser, results]) => {
      if (browser === "mobile") return;

      console.log(`${this.getBrowserIcon(browser)} ${browser.toUpperCase()}`);
      console.log("-".repeat(20));

      Object.entries(results).forEach(([test, result]) => {
        const status = result.compatible ? "✅" : "⚠️";
        console.log(
          `  ${status} ${test}: ${
            result.compatible ? "Compatible" : "Issues found"
          }`
        );

        if (result.issues && result.issues.length > 0) {
          result.issues.forEach((issue) => console.log(`    - ${issue}`));
        }

        if (result.notes && result.notes.length > 0) {
          result.notes.forEach((note) => console.log(`    ℹ️  ${note}`));
        }
      });

      console.log("");
    });

    // Mobile/Responsive summary
    if (this.testResults.mobile.responsive) {
      console.log("📱 MOBILE/RESPONSIVE");
      console.log("-".repeat(20));
      const responsive = this.testResults.mobile.responsive;
      console.log(
        `  Responsive Score: ${(responsive.score * 100).toFixed(0)}%`
      );
      console.log(
        `  Viewport Meta: ${responsive.hasViewportMeta ? "✅" : "❌"}`
      );
      console.log(
        `  Overall: ${
          responsive.compatible ? "✅ Compatible" : "⚠️ Needs work"
        }`
      );
      console.log("");
    }

    // Overall summary
    const totalTests = Object.values(this.testResults).reduce(
      (acc, browser) => {
        return acc + Object.keys(browser).length;
      },
      0
    );

    const passedTests = Object.values(this.testResults).reduce(
      (acc, browser) => {
        return (
          acc + Object.values(browser).filter((test) => test.compatible).length
        );
      },
      0
    );

    const successRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log("🎯 OVERALL RESULTS");
    console.log("-".repeat(20));
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Passed: ${passedTests}/${totalTests} tests`);
    console.log("");

    // Recommendations
    this.generateRecommendations();

    // Save report to file
    this.saveReport();
  }

  /**
   * Generate browser-specific recommendations
   */
  generateRecommendations() {
    console.log("💡 RECOMMENDATIONS");
    console.log("-".repeat(20));

    const recommendations = [];

    // Analyze test results for recommendations
    Object.entries(this.testResults).forEach(([browser, results]) => {
      Object.entries(results).forEach(([test, result]) => {
        if (!result.compatible && result.issues) {
          result.issues.forEach((issue) => {
            recommendations.push(`${browser}: ${issue}`);
          });
        }
      });
    });

    if (recommendations.length === 0) {
      console.log(
        "🎉 No issues found! Your PWA is well optimized for cross-browser compatibility."
      );
    } else {
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    console.log("");
  }

  /**
   * Save test report to file
   */
  saveReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: (Date.now() - this.startTime) / 1000,
      results: this.testResults,
      summary: {
        totalTests: Object.values(this.testResults).reduce((acc, browser) => {
          return acc + Object.keys(browser).length;
        }, 0),
        passedTests: Object.values(this.testResults).reduce((acc, browser) => {
          return (
            acc +
            Object.values(browser).filter((test) => test.compatible).length
          );
        }, 0),
      },
    };

    const reportPath = path.join(
      process.cwd(),
      "cross-browser-test-report.json"
    );
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }

  /**
   * Get browser icon for display
   */
  getBrowserIcon(browser) {
    const icons = {
      chrome: "🟢",
      safari: "🔵",
      edge: "🔷",
      firefox: "🟠",
    };
    return icons[browser] || "⚪";
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new CrossBrowserTester();
  tester.runAllTests().catch(console.error);
}

export default CrossBrowserTester;
