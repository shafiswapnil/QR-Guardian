/**
 * Encryption utilities for sensitive data storage
 * Uses Web Crypto API for secure client-side encryption
 */

class EncryptionManager {
  constructor() {
    this.algorithm = "AES-GCM";
    this.keyLength = 256;
    this.ivLength = 12; // 96 bits for GCM
    this.tagLength = 128; // 128 bits for GCM
  }

  /**
   * Generate a new encryption key
   * @returns {Promise<CryptoKey>}
   */
  async generateKey() {
    return await crypto.subtle.generateKey(
      {
        name: this.algorithm,
        length: this.keyLength,
      },
      true, // extractable
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Derive key from password using PBKDF2
   * @param {string} password
   * @param {Uint8Array} salt
   * @returns {Promise<CryptoKey>}
   */
  async deriveKeyFromPassword(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );

    return await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      {
        name: this.algorithm,
        length: this.keyLength,
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Generate random salt
   * @returns {Uint8Array}
   */
  generateSalt() {
    return crypto.getRandomValues(new Uint8Array(16));
  }

  /**
   * Generate random IV
   * @returns {Uint8Array}
   */
  generateIV() {
    return crypto.getRandomValues(new Uint8Array(this.ivLength));
  }

  /**
   * Encrypt data
   * @param {string} data - Data to encrypt
   * @param {CryptoKey} key - Encryption key
   * @returns {Promise<{encrypted: ArrayBuffer, iv: Uint8Array}>}
   */
  async encrypt(data, key) {
    const encoder = new TextEncoder();
    const iv = this.generateIV();

    const encrypted = await crypto.subtle.encrypt(
      {
        name: this.algorithm,
        iv: iv,
        tagLength: this.tagLength,
      },
      key,
      encoder.encode(data)
    );

    return {
      encrypted,
      iv,
    };
  }

  /**
   * Decrypt data
   * @param {ArrayBuffer} encryptedData
   * @param {Uint8Array} iv
   * @param {CryptoKey} key
   * @returns {Promise<string>}
   */
  async decrypt(encryptedData, iv, key) {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: this.algorithm,
        iv: iv,
        tagLength: this.tagLength,
      },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Export key to raw format for storage
   * @param {CryptoKey} key
   * @returns {Promise<ArrayBuffer>}
   */
  async exportKey(key) {
    return await crypto.subtle.exportKey("raw", key);
  }

  /**
   * Import key from raw format
   * @param {ArrayBuffer} keyData
   * @returns {Promise<CryptoKey>}
   */
  async importKey(keyData) {
    return await crypto.subtle.importKey(
      "raw",
      keyData,
      {
        name: this.algorithm,
        length: this.keyLength,
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encrypt and encode data for storage
   * @param {string} data
   * @param {CryptoKey} key
   * @returns {Promise<string>} Base64 encoded encrypted data with IV
   */
  async encryptForStorage(data, key) {
    const { encrypted, iv } = await this.encrypt(data, key);

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypt data from storage format
   * @param {string} encryptedData Base64 encoded data with IV
   * @param {CryptoKey} key
   * @returns {Promise<string>}
   */
  async decryptFromStorage(encryptedData, key) {
    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedData)
        .split("")
        .map((char) => char.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, this.ivLength);
    const encrypted = combined.slice(this.ivLength);

    return await this.decrypt(encrypted.buffer, iv, key);
  }
}

// Singleton instance
export const encryptionManager = new EncryptionManager();

/**
 * Key management utilities
 */
export class KeyManager {
  constructor() {
    this.keyStorageKey = "qr-guardian-encryption-key";
    this.saltStorageKey = "qr-guardian-salt";
  }

  /**
   * Initialize encryption key (generate or retrieve)
   * @param {string} userPassword Optional user password for key derivation
   * @returns {Promise<CryptoKey>}
   */
  async initializeKey(userPassword = null) {
    try {
      // Try to load existing key
      const existingKey = await this.loadKey(userPassword);
      if (existingKey) {
        return existingKey;
      }
    } catch (error) {
      console.warn("Could not load existing key, generating new one:", error);
    }

    // Generate new key
    let key;
    if (userPassword) {
      const salt = encryptionManager.generateSalt();
      key = await encryptionManager.deriveKeyFromPassword(userPassword, salt);
      localStorage.setItem(
        this.saltStorageKey,
        btoa(String.fromCharCode(...salt))
      );
    } else {
      key = await encryptionManager.generateKey();
    }

    // Store key
    await this.storeKey(key);
    return key;
  }

  /**
   * Store encryption key securely
   * @param {CryptoKey} key
   */
  async storeKey(key) {
    const keyData = await encryptionManager.exportKey(key);
    const keyArray = new Uint8Array(keyData);
    const keyString = btoa(String.fromCharCode(...keyArray));
    localStorage.setItem(this.keyStorageKey, keyString);
  }

  /**
   * Load encryption key
   * @param {string} userPassword Optional user password for key derivation
   * @returns {Promise<CryptoKey|null>}
   */
  async loadKey(userPassword = null) {
    if (userPassword) {
      const saltString = localStorage.getItem(this.saltStorageKey);
      if (!saltString) return null;

      const salt = new Uint8Array(
        atob(saltString)
          .split("")
          .map((char) => char.charCodeAt(0))
      );

      return await encryptionManager.deriveKeyFromPassword(userPassword, salt);
    } else {
      const keyString = localStorage.getItem(this.keyStorageKey);
      if (!keyString) return null;

      const keyArray = new Uint8Array(
        atob(keyString)
          .split("")
          .map((char) => char.charCodeAt(0))
      );

      return await encryptionManager.importKey(keyArray.buffer);
    }
  }

  /**
   * Clear stored keys
   */
  clearKeys() {
    localStorage.removeItem(this.keyStorageKey);
    localStorage.removeItem(this.saltStorageKey);
  }
}

export const keyManager = new KeyManager();
