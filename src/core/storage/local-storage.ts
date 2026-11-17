import type { StorageAdapter } from '../types.js';
import { MemoryStorageAdapter } from './memory-storage.js';

/**
 * Browser LocalStorage adapter with safe fallback to memory storage
 * if running on server-side or if localStorage is restricted (private browsing / sandbox).
 */
export class LocalStorageAdapter implements StorageAdapter {
  private fallback: MemoryStorageAdapter = new MemoryStorageAdapter();

  private isAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  getItem(key: string): string | null {
    if (this.isAvailable()) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return this.fallback.getItem(key);
      }
    }
    return this.fallback.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (this.isAvailable()) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch {
        this.fallback.setItem(key, value);
        return;
      }
    }
    this.fallback.setItem(key, value);
  }

  removeItem(key: string): void {
    if (this.isAvailable()) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch {
        this.fallback.removeItem(key);
        return;
      }
    }
    this.fallback.removeItem(key);
  }
}
