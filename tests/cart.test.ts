import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ShopifyStorefrontClient } from '../src/core/client/storefront-client.js';
import { CartManager } from '../src/core/cart/cart-manager.js';
import { MemoryStorageAdapter } from '../src/core/storage/memory-storage.js';

describe('CartManager Core Lifecycle', () => {
  it('creates and initializes a fresh cart', async () => {
    const client = new ShopifyStorefrontClient();
    const storage = new MemoryStorageAdapter();
    const manager = new CartManager({ client, storage, autoInit: false });

    assert.strictEqual(manager.getState().cart, null);
    const cart = await manager.init();

    assert.ok(cart);
    assert.ok(cart.id.startsWith('gid://shopify/Cart/'));
    assert.strictEqual(cart.lines.length, 0);
    assert.strictEqual(cart.totalQuantity, 0);
    assert.strictEqual(storage.getItem('shopify_storefront_cart_id'), cart.id);
  });

  it('adds items, updates line quantities, and removes items', async () => {
    const client = new ShopifyStorefrontClient();
    const storage = new MemoryStorageAdapter();
    const manager = new CartManager({ client, storage });

    await manager.init();

    // Add variant (Minimalist Linen Overshirt Sand/M, price $89)
    const variantId = 'gid://shopify/ProductVariant/2002';
    const cartAfterAdd = await manager.addItem(variantId, 2);

    assert.strictEqual(cartAfterAdd.lines.length, 1);
    assert.strictEqual(cartAfterAdd.totalQuantity, 2);
    assert.strictEqual(cartAfterAdd.cost.subtotalAmount.amount, 178);
    const lineId = cartAfterAdd.lines[0].id;

    // Update quantity to 3
    const cartAfterUpdate = await manager.updateQuantity(lineId, 3);
    assert.strictEqual(cartAfterUpdate.lines[0].quantity, 3);
    assert.strictEqual(cartAfterUpdate.totalQuantity, 3);
    assert.strictEqual(cartAfterUpdate.cost.subtotalAmount.amount, 267);

    // Update quantity to 0 removes line
    const cartAfterZero = await manager.updateQuantity(lineId, 0);
    assert.strictEqual(cartAfterZero.lines.length, 0);
    assert.strictEqual(cartAfterZero.totalQuantity, 0);
  });

  it('applies and removes promo discount codes', async () => {
    const client = new ShopifyStorefrontClient();
    const storage = new MemoryStorageAdapter();
    const manager = new CartManager({ client, storage });

    await manager.init();
    await manager.addItem('gid://shopify/ProductVariant/2002', 1); // $89

    // Apply WELCOME10 (10% off)
    const cartDiscounted = await manager.applyDiscount('WELCOME10');
    assert.strictEqual(cartDiscounted.discountCodes.length, 1);
    assert.strictEqual(cartDiscounted.discountCodes[0].applicable, true);
    // 89 - 8.9 = 80.10
    assert.strictEqual(cartDiscounted.cost.totalAmount.amount, 80.1);

    // Remove discount
    const cartRestored = await manager.removeDiscount('WELCOME10');
    assert.strictEqual(cartRestored.discountCodes.length, 0);
    assert.strictEqual(cartRestored.cost.totalAmount.amount, 89);
  });

  it('notifies subscribers on state mutations', async () => {
    const client = new ShopifyStorefrontClient();
    const storage = new MemoryStorageAdapter();
    const manager = new CartManager({ client, storage });

    let notificationCount = 0;
    const unsubscribe = manager.subscribe((state) => {
      notificationCount++;
    });

    await manager.init();
    await manager.addItem('gid://shopify/ProductVariant/2011', 1);
    await manager.setNote('Please leave at front door');

    assert.ok(notificationCount >= 3);
    unsubscribe();

    const previousCount = notificationCount;
    await manager.clearCart();
    // After unsubscribe, subscriber should not receive new calls
    assert.strictEqual(notificationCount, previousCount);
  });

  it('persists and restores cart across manager instances sharing storage', async () => {
    const client = new ShopifyStorefrontClient();
    const sharedStorage = new MemoryStorageAdapter();

    // Instance 1
    const manager1 = new CartManager({ client, storage: sharedStorage });
    await manager1.init();
    await manager1.addItem('gid://shopify/ProductVariant/2031', 2);
    const initialCartId = manager1.getState().cart?.id;

    // Instance 2 (simulate page reload with same storage)
    const manager2 = new CartManager({ client, storage: sharedStorage });
    await manager2.init();
    const restoredCart = manager2.getState().cart;

    assert.strictEqual(restoredCart?.id, initialCartId);
    assert.strictEqual(restoredCart?.totalQuantity, 2);
    assert.strictEqual(restoredCart?.lines[0].variantId, 'gid://shopify/ProductVariant/2031');
  });
});
