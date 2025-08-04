// PWA Development Configuration
export const PWAConfig = {
  // Cache names
  CACHE_NAME: 'qr-guardian-v1',
  STATIC_CACHE: 'qr-guardian-static-v1',
  DYNAMIC_CACHE: 'qr-guardian-dynamic-v1',
  
  // Cache strategies
  CACHE_STRATEGIES: {
    STATIC_ASSETS: 'CacheFirst',
    API_CALLS: 'NetworkFirst',
    IMAGES: 'CacheFirst',
    FONTS: 'CacheFirst'
  },
  
  // Cache expiration settings
  CACHE_EXPIRATION: {
    STATIC_ASSETS: 86400 * 30, // 30 days
    API_CALLS: 300, // 5 minutes
    IMAGES: 86400 * 7, // 7 days
    FONTS: 86400 * 365 // 1 year
  },
  
  // Development settings
  DEV_OPTIONS: {
    ENABLE_SW_IN_DEV: true,
    LOG_LEVEL: 'info',
    SKIP_WAITING: true,
    CLIENT_CLAIM: true
  },
  
  // Lighthouse audit thresholds
  LIGHTHOUSE_THRESHOLDS: {
    PWA: 100,
    PERFORMANCE: 90,
    ACCESSIBILITY: 95,
    BEST_PRACTICES: 90,
    SEO: 90
  }
};

export default PWAConfig;