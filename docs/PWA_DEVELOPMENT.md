# PWA Development Guide

## Overview

This guide covers the PWA development environment setup for QR Guardian. The application is configured to be a fully compliant Progressive Web App with offline functionality, installability, and enhanced performance.

## Dependencies Installed

### Core PWA Dependencies

- `vite-plugin-pwa` - Vite plugin for PWA support
- `workbox-webpack-plugin` - Service worker generation
- `workbox-window` - Service worker registration utilities
- `workbox-core` - Core Workbox functionality
- `workbox-precaching` - Asset precaching
- `workbox-routing` - Request routing
- `workbox-strategies` - Caching strategies
- `workbox-expiration` - Cache expiration
- `workbox-background-sync` - Background sync
- `workbox-cacheable-response` - Response caching utilities

### Development Tools

- `lighthouse` - PWA auditing and testing

## Configuration

### Vite Configuration

The `vite.config.js` has been configured with:

- VitePWA plugin with auto-update registration
- Workbox configuration for caching strategies
- Enhanced web app manifest
- Build optimizations with manual chunks
- Development options enabled

### PWA Manifest

Enhanced manifest includes:

- Complete PWA metadata
- App shortcuts for quick actions
- Proper icon sets with maskable support
- Categories, orientation, and language settings

### Caching Strategies

- **Static Assets**: Cache First strategy
- **API Calls**: Network First with 5-minute expiration
- **Images**: Cache First with 24-hour expiration
- **Precaching**: All static assets precached during installation

## Development Scripts

### Available Commands

```bash
# Standard development
npm run dev                 # Start development server
npm run build              # Build for production
npm run preview            # Preview production build

# PWA-specific commands
npm run pwa:build          # Build with PWA optimizations
npm run pwa:preview        # Preview with host access
npm run lighthouse         # Run Lighthouse audit
npm run pwa:test           # Full PWA test (build + audit)
npm run pwa:dev-tools      # Access PWA development tools
```

### PWA Development Tools

Use the development tools script for various PWA tasks:

```bash
# Check PWA manifest
node scripts/pwa-dev-tools.js manifest

# Check service worker status
node scripts/pwa-dev-tools.js sw

# Run full PWA test
node scripts/pwa-dev-tools.js test

# Show help
node scripts/pwa-dev-tools.js help
```

## Testing PWA Functionality

### Local Testing

1. Build the application: `npm run build`
2. Start preview server: `npm run preview`
3. Open http://localhost:4173 in Chrome
4. Open DevTools > Application > Service Workers
5. Verify service worker is registered and active

### Lighthouse Auditing

Run automated PWA audits:

```bash
npm run lighthouse
```

This generates a `lighthouse-report.html` file with detailed PWA compliance results.

### Manual Testing Checklist

- [ ] Service worker registers successfully
- [ ] App works offline (disconnect network)
- [ ] Install prompt appears (Chrome DevTools > Application > Manifest)
- [ ] App can be installed and launched standalone
- [ ] Caching strategies work correctly
- [ ] Update mechanism functions properly

## Environment Variables

PWA-specific environment variables in `.env.pwa`:

- `VITE_PWA_ENABLED` - Enable PWA features
- `VITE_SW_ENABLED` - Enable service worker
- `VITE_SW_SKIP_WAITING` - Skip waiting for service worker updates
- `VITE_SW_CLIENT_CLAIM` - Claim clients immediately
- `VITE_CACHE_STATIC_ASSETS` - Enable static asset caching
- `VITE_CACHE_API_RESPONSES` - Enable API response caching

## File Structure

```
├── scripts/
│   └── pwa-dev-tools.js      # PWA development utilities
├── docs/
│   └── PWA_DEVELOPMENT.md    # This guide
├── pwa.config.js             # PWA configuration constants
├── .env.pwa                  # PWA environment variables
├── vite.config.js            # Vite configuration with PWA
└── dist/                     # Build output
    ├── sw.js                 # Generated service worker
    ├── manifest.webmanifest  # Generated PWA manifest
    └── registerSW.js         # Service worker registration
```

## Next Steps

After completing this setup, you can proceed with:

1. Enhancing the web app manifest (Task 2)
2. Implementing service worker with Workbox integration (Task 3)
3. Creating service worker manager for lifecycle handling (Task 4)

## Troubleshooting

### Common Issues

- **Service worker not registering**: Check HTTPS requirement and console errors
- **Build failures**: Verify all dependencies are installed correctly
- **Lighthouse errors**: Ensure preview server is running on correct port
- **Cache issues**: Clear browser cache and service worker in DevTools

### Debug Mode

Enable debug logging by setting `VITE_PWA_LOG_LEVEL=debug` in your environment.
