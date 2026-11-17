import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MemoryStorageAdapter } from '../src/core/storage/memory-storage.js';
import { LocalStorageAdapter } from '../src/core/storage/local-storage.js';

describe('Storage Adapters', () => {
  describe('MemoryStorageAdapter', () => {
    it('sets, gets, and removes values correctly', () => {
      const storage = new MemoryStorageAdapter();
      assert.strictEqual(storage.getItem('test_key'), null);

      storage.setItem('test_key', 'cart_123');
      assert.strictEqual(storage.getItem('test_key'), 'cart_123');

      storage.removeItem('test_key');
      assert.strictEqual(storage.getItem('test_key'), null);
    });

    it('clears all entries', () => {
      const storage = new MemoryStorageAdapter();
      storage.setItem('a', '1');
      storage.setItem('b', '2');
      storage.clear();
      assert.strictEqual(storage.getItem('a'), null);
      assert.strictEqual(storage.getItem('b'), null);
    });
  });

  describe('LocalStorageAdapter', () => {
    it('falls back gracefully to in-memory store in Node.js environment', () => {
      const storage = new LocalStorageAdapter();
      assert.strictEqual(storage.getItem('cart_id'), null);

      storage.setItem('cart_id', 'cart_999');
      assert.strictEqual(storage.getItem('cart_id'), 'cart_999');

      storage.removeItem('cart_id');
      assert.strictEqual(storage.getItem('cart_id'), null);
    });
  });
});
