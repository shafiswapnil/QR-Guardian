import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300, // 5 minutes
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 86400, // 24 hours
              },
            },
          },
        ],
      },
      manifest: {
        name: 'QR Guardian - Safe QR Code Scanner & Generator',
        short_name: 'QR Guardian',
        description: 'Scan QR codes safely with built-in security checking. Generate QR codes and protect yourself from malicious links.',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['utilities', 'productivity', 'security'],
        lang: 'en',
        dir: 'ltr',
        icons: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Scan QR Code',
            short_name: 'Scan',
            description: 'Quickly scan a QR code',
            url: '/?action=scan',
            icons: [
              {
                src: '/android-chrome-192x192.png',
                sizes: '192x192'
              }
            ]
          },
          {
            name: 'Generate QR Code',
            short_name: 'Generate',
            description: 'Generate a new QR code',
            url: '/?action=generate',
            icons: [
              {
                src: '/android-chrome-192x192.png',
                sizes: '192x192'
              }
            ]
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
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
          vendor: ['react', 'react-dom'],
          qr: ['qrcode', 'html5-qrcode'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-tabs', '@radix-ui/react-slot']
        }
      }
    }
  }
})