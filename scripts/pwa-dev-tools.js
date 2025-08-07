#!/usr/bin/env node

/**
 * PWA Development Tools
 * Helper script for PWA development and testing
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const commands = {
  // Build and test PWA
  test: () => {
    console.log("🔧 Building PWA...");
    execSync("npm run build", { stdio: "inherit" });

    console.log("🚀 Starting preview server...");
    const preview = execSync("npm run preview &", { stdio: "inherit" });

    // Wait for server to start
    setTimeout(() => {
      console.log("🔍 Running Lighthouse audit...");
      execSync("npm run lighthouse", { stdio: "inherit" });

      console.log("✅ PWA test complete! Check lighthouse-report.html");
    }, 5000);
  },

  // Check PWA manifest
  manifest: () => {
    const manifestPath = path.join(process.cwd(), "public", "site.webmanifest");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      console.log("📱 PWA Manifest:");
      console.log(JSON.stringify(manifest, null, 2));
    } else {
      console.log("❌ No manifest found at public/site.webmanifest");
    }
  },

  // Check service worker
  sw: () => {
    const swPath = path.join(process.cwd(), "dist", "sw.js");
    if (fs.existsSync(swPath)) {
      console.log("✅ Service worker found at dist/sw.js");
      const stats = fs.statSync(swPath);
      console.log(`📊 Size: ${(stats.size / 1024).toFixed(2)} KB`);
    } else {
      console.log("❌ No service worker found. Run npm run build first.");
    }
  },

  // Help
  help: () => {
    console.log(`
🛠️  PWA Development Tools

Usage: node scripts/pwa-dev-tools.js <command>

Commands:
  test      - Build and run Lighthouse audit
  manifest  - Display PWA manifest
  sw        - Check service worker status
  help      - Show this help message

Examples:
  node scripts/pwa-dev-tools.js test
  node scripts/pwa-dev-tools.js manifest
    `);
  },
};

const command = process.argv[2];

if (commands[command]) {
  commands[command]();
} else {
  commands.help();
}
