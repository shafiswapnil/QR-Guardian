import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "csp-headers",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Add CSP headers in development
          if (req.url && req.url.endsWith(".html")) {
            res.setHeader(
              "Content-Security-Policy",
              "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* https://cdn.jsdelivr.net https://unpkg.com; " +
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                "font-src 'self' https://fonts.gstatic.com; " +
                "img-src 'self' data: blob: https:; " +
                "media-src 'self' blob:; " +
                "connect-src 'self' https: wss: ws: http://localhost:* ws://localhost:*; " +
                "worker-src 'self' blob:; " +
                "manifest-src 'self'; " +
                "base-uri 'self'; " +
                "form-action 'self'; " +
                "frame-ancestors 'none'; " +
                "upgrade-insecure-requests;"
            );
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("X-Frame-Options", "DENY");
            res.setHeader("X-XSS-Protection", "1; mode=block");
          }
          next();
        });
      },
    },
    VitePWA({
      registerType: "autoUpdate",
      srcDir: "public",
      filename: "sw.js",
      strategies: "injectManifest",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
        globIgnores: ["**/sw.js", "**/offline.html"],
        maximumFileSizeToCacheInBytes: 5000000, // 5MB
      },
      manifest: {
        name: "QR Guardian - Safe QR Code Scanner & Generator",
        short_name: "QR Guardian",
        description:
          "Scan QR codes safely with built-in security checking. Generate QR codes and protect yourself from malicious links.",
        theme_color: "#3b82f6",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        categories: ["utilities", "productivity", "security"],
        lang: "en",
        dir: "ltr",
        icons: [
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        shortcuts: [
          {
            name: "Scan QR Code",
            short_name: "Scan",
            description: "Quickly scan a QR code",
            url: "/?action=scan",
            icons: [
              {
                src: "/android-chrome-192x192.png",
                sizes: "192x192",
              },
            ],
          },
          {
            name: "Generate QR Code",
            short_name: "Generate",
            description: "Generate a new QR code",
            url: "/?action=generate",
            icons: [
              {
                src: "/android-chrome-192x192.png",
                sizes: "192x192",
              },
            ],
          },
        ],
      },
      devOptions: {
        enabled: false, // Disable VitePWA dev service worker to avoid conflicts
        type: "module",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          qr: ["qrcode", "html5-qrcode"],
          ui: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-tabs",
            "@radix-ui/react-slot",
          ],
        },
      },
    },
  },
});
