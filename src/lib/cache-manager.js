/**
 * Cache Manager
 * Handles cache operations and strategies
 */

class CacheManager {
  constructor() {
    this.cacheNames = {
      static: 'static-assets-cache',
      api: 'api-cache',
      pages: 'pages-cache',
      images: 'images-cache',
      offline: 'offline-cache'
    };
  }

  /**
   * Precache essential assets
   */
  async precacheAssets(assets = []) {
    if (!('caches' in window)) {
      console.warn('Cache API not supported');
      return false;
    }

    try {
      const cache = await caches.open(this.cacheNames.static);
      
      const essentialAssets = [
        '/',
        '/offline.html',
        ...assets
      ];

      await cache.addAll(essentialAssets);
      console.log('Assets precached successfully');
      return true;
    } catch (error) {
      console.error('Failed to precache assets:', error);
      return false;
    }
  }

  /**
   * Cache a response
   */
  async cacheResponse(request, response, cacheName = this.cacheNames.static) {
    if (!('caches' in window)) {
      return false;
    }

    try {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
      return true;
    } catch (error) {
      console.error('Failed to cache response:', error);
      return false;
    }
  }

  /**
   * Get cached response
   */
  async getCachedResponse(request, cacheName = null) {
    if (!('caches' in window)) {
      return null;
    }

    try {
      if (cacheName) {
        const cache = await caches.open(cacheName);
        return await cache.match(request);
      } else {
        return await caches.match(request);
      }
    } catch (error) {
      console.error('Failed to get cached response:', error);
      return null;
    }
  }

  /**
   * Clear specific cache
   */
  async clearCache(cacheName) {
    if (!('caches' in window)) {
      return false;
    }

    try {
      const deleted = await caches.delete(cacheName);
      console.log(`Cache ${cacheName} cleared:`, deleted);
      return deleted;
    } catch (error) {
      console.error(`Failed to clear cache ${cacheName}:`, error);
      return false;
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches() {
    if (!('caches' in window)) {
      return false;
    }

    try {
      const cacheNames = await caches.keys();
      const deletePromises = cacheNames.map(name => caches.delete(name));
      await Promise.all(deletePromises);
      console.log('All caches cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear all caches:', error);
      return false;
    }
  }

  /**
   * Get cache storage usage
   */
  async getCacheUsage() {
    if (!('caches' in window) || !('storage' in navigator) || !('estimate' in navigator.storage)) {
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota,
        usage: estimate.usage,
        usageDetails: estimate.usageDetails
      };
    } catch (error) {
      console.error('Failed to get cache usage:', error);
      return null;
    }
  }

  /**
   * Check if request should be cached
   */
  shouldCache(request) {
    // Don't cache non-GET requests
    if (request.method !== 'GET') {
      return false;
    }

    // Don't cache requests with no-cache header
    if (request.headers.get('cache-control') === 'no-cache') {
      return false;
    }

    // Cache static assets
    const url = new URL(request.url);
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2'];
    
    return staticExtensions.some(ext => url.pathname.endsWith(ext));
  }

  /**
   * Get appropriate cache name for request
   */
  getCacheNameForRequest(request) {
    const url = new URL(request.url);

    // API requests
    if (url.pathname.startsWith('/api/') || url.hostname.includes('api.')) {
      return this.cacheNames.api;
    }

    // Images
    if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(url.pathname)) {
      return this.cacheNames.images;
    }

    // HTML pages
    if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
      return this.cacheNames.pages;
    }

    // Default to static assets
    return this.cacheNames.static;
  }

  /**
   * Implement cache-first strategy
   */
  async cacheFirst(request) {
    try {
      // Try to get from cache first
      const cachedResponse = await this.getCachedResponse(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, fetch from network
      const networkResponse = await fetch(request);
      
      // Cache the response if it's successful
      if (networkResponse.ok) {
        const cacheName = this.getCacheNameForRequest(request);
        await this.cacheResponse(request, networkResponse, cacheName);
      }

      return networkResponse;
    } catch (error) {
      console.error('Cache-first strategy failed:', error);
      throw error;
    }
  }

  /**
   * Implement network-first strategy
   */
  async networkFirst(request) {
    try {
      // Try network first
      const networkResponse = await fetch(request);
      
      // Cache successful responses
      if (networkResponse.ok) {
        const cacheName = this.getCacheNameForRequest(request);
        await this.cacheResponse(request, networkResponse, cacheName);
      }

      return networkResponse;
    } catch (error) {
      // If network fails, try cache
      console.warn('Network failed, trying cache:', error);
      const cachedResponse = await this.getCachedResponse(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }

      throw error;
    }
  }

  /**
   * Implement stale-while-revalidate strategy
   */
  async staleWhileRevalidate(request) {
    try {
      // Get from cache immediately
      const cachedResponse = await this.getCachedResponse(request);
      
      // Fetch from network in background
      const networkPromise = fetch(request).then(async (networkResponse) => {
        if (networkResponse.ok) {
          const cacheName = this.getCacheNameForRequest(request);
          await this.cacheResponse(request, networkResponse, cacheName);
        }
        return networkResponse;
      }).catch(error => {
        console.warn('Background fetch failed:', error);
      });

      // Return cached response if available, otherwise wait for network
      if (cachedResponse) {
        // Don't await the network promise, let it run in background
        networkPromise;
        return cachedResponse;
      } else {
        return await networkPromise;
      }
    } catch (error) {
      console.error('Stale-while-revalidate strategy failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

export default cacheManager;