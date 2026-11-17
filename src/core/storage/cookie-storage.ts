import type { StorageAdapter } from '../types.js';

export interface CookieStorageOptions {
  path?: string;
  maxAgeDays?: number;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Cookie-based storage adapter for web applications needing session persistence across subdomains or SSR requests.
 */
export class CookieStorageAdapter implements StorageAdapter {
  private options: CookieStorageOptions;

  constructor(options: CookieStorageOptions = {}) {
    this.options = {
      path: '/',
      maxAgeDays: 30,
      sameSite: 'Lax',
      ...options,
    };
  }

  getItem(key: string): string | null {
    if (typeof document === 'undefined') return null;
    const name = encodeURIComponent(key) + '=';
    const parts = document.cookie.split(';');
    for (let part of parts) {
      part = part.trim();
      if (part.startsWith(name)) {
        return decodeURIComponent(part.substring(name.length));
      }
    }
    return null;
  }

  setItem(key: string, value: string): void {
    if (typeof document === 'undefined') return;
    let cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; path=${this.options.path || '/'}`;
    if (this.options.maxAgeDays) {
      cookie += `; max-age=${this.options.maxAgeDays * 24 * 60 * 60}`;
    }
    if (this.options.secure) {
      cookie += '; Secure';
    }
    if (this.options.sameSite) {
      cookie += `; SameSite=${this.options.sameSite}`;
    }
    document.cookie = cookie;
  }

  removeItem(key: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${encodeURIComponent(key)}=; path=${this.options.path || '/'}; max-age=-1`;
  }
}
