/**
 * Service Worker Manager Tests
 */

// Mock service worker API
const mockServiceWorker = {
  register: jest.fn(),
  addEventListener: jest.fn(),
  controller: null
};

const mockRegistration = {
  installing: null,
  waiting: null,
  active: { postMessage: jest.fn() },
  addEventListener: jest.fn(),
  unregister: jest.fn(),
  update: jest.fn()
};

// Mock navigator
Object.defineProperty(global.navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true
});

describe('ServiceWorkerManager', () => {
  let swManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module cache to get fresh instance
    jest.resetModules();
    swManager = require('../sw-manager.js').default;
  });

  describe('register', () => {
    it('should register service worker successfully', async () => {
      mockServiceWorker.register.mockResolvedValue(mockRegistration);

      const result = await swManager.register();

      expect(result).toBe(true);
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js', {
        scope: '/'
      });
    });

    it('should return false when service worker is not supported', async () => {
      const originalServiceWorker = global.navigator.serviceWorker;
      delete global.navigator.serviceWorker;

      const result = await swManager.register();

      expect(result).toBe(false);

      // Restore
      global.navigator.serviceWorker = originalServiceWorker;
    });

    it('should handle registration errors', async () => {
      mockServiceWorker.register.mockRejectedValue(new Error('Registration failed'));

      const result = await swManager.register();

      expect(result).toBe(false);
    });
  });

  describe('skipWaiting', () => {
    it('should send skip waiting message to service worker', async () => {
      swManager.registration = {
        ...mockRegistration,
        waiting: { postMessage: jest.fn() }
      };

      const result = await swManager.skipWaiting();

      expect(result).toBe(true);
    });

    it('should return false when no waiting service worker', async () => {
      swManager.registration = mockRegistration;

      const result = await swManager.skipWaiting();

      expect(result).toBe(false);
    });
  });

  describe('checkForUpdates', () => {
    it('should check for updates successfully', async () => {
      swManager.registration = mockRegistration;
      mockRegistration.update.mockResolvedValue();

      const result = await swManager.checkForUpdates();

      expect(result).toBe(true);
      expect(mockRegistration.update).toHaveBeenCalled();
    });

    it('should return false when no registration', async () => {
      swManager.registration = null;

      const result = await swManager.checkForUpdates();

      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return correct status for different states', () => {
      // Not registered
      swManager.registration = null;
      expect(swManager.getStatus()).toBe('not-registered');

      // Installing
      swManager.registration = { ...mockRegistration, installing: {} };
      expect(swManager.getStatus()).toBe('installing');

      // Waiting
      swManager.registration = { ...mockRegistration, waiting: {} };
      expect(swManager.getStatus()).toBe('waiting');

      // Active
      swManager.registration = { ...mockRegistration, active: {} };
      expect(swManager.getStatus()).toBe('active');
    });
  });

  describe('event handling', () => {
    it('should add and remove event listeners', () => {
      const callback = jest.fn();

      swManager.on('test', callback);
      swManager.emit('test', 'data');

      expect(callback).toHaveBeenCalledWith('data');

      swManager.off('test', callback);
      swManager.emit('test', 'data2');

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});