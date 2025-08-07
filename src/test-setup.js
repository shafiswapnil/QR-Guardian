// Test setup file
import { vi } from 'vitest'

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    reload: vi.fn()
  },
  writable: true
})