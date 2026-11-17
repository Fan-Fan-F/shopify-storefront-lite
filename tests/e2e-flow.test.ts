import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ShopifyStorefrontClient } from '../src/core/client/storefront-client.js';
import { CartManager } from '../src/core/cart/cart-manager.js';
import { MemoryStorageAdapter } from '../src/core/storage/memory-storage.js';
import { findVariantByOptions } from '../src/core/products/product-service.js';
import { CheckoutService } from '../src/core/checkout/checkout-service.js';

describe('End-to-End Storefront & Checkout Flow', () => {
  it('walks through complete shopper journey: browse -> select variant -> add to cart -> coupon -> checkout', async () => {
    // 1. Customer visits storefront (Client initializes)
    const client = new ShopifyStorefrontClient({ mode: 'mock' });
    const storage = new MemoryStorageAdapter();
    const cartManager = new CartManager({ client, storage });

    await cartManager.init();
    assert.strictEqual(cartManager.getState().cart?.lines.length, 0);

    // 2. Shopper browses catalog
    const products = await client.getProducts();
    assert.ok(products.length >= 2);
    const chosenProduct = products.find((p) => p.handle === 'minimal-linen-overshirt')!;
    assert.ok(chosenProduct);

    // 3. Shopper selects options (Olive / M)
    const variant = findVariantByOptions(chosenProduct, { Color: 'Olive', Size: 'M' });
    assert.ok(variant);
    assert.strictEqual(variant?.title, 'Olive / M');

    // 4. Shopper adds 2 units to cart
    await cartManager.addItem(variant!.id, 2);
    let state = cartManager.getState();
    assert.strictEqual(state.cart?.totalQuantity, 2);
    assert.strictEqual(state.cart?.cost.subtotalAmount.amount, 89 * 2);

    // 5. Shopper also adds an accessory (Canvas tote)
    const tote = products.find((p) => p.handle === 'everyday-canvas-tote')!;
    const toteVariant = tote.variants[0];
    await cartManager.addItem(toteVariant.id, 1);
    state = cartManager.getState();
    assert.strictEqual(state.cart?.lines.length, 2);
    assert.strictEqual(state.cart?.totalQuantity, 3);
    // Subtotal: 89*2 + 48 = 226
    assert.strictEqual(state.cart?.cost.subtotalAmount.amount, 226);

    // 6. Shopper applies discount code 'SAVE20' (20% off)
    await cartManager.applyDiscount('SAVE20');
    state = cartManager.getState();
    assert.strictEqual(state.cart?.discountCodes[0].applicable, true);
    // 226 - 45.20 = 180.80
    assert.strictEqual(state.cart?.cost.totalAmount.amount, 180.8);

    // 7. Shopper adds delivery instruction note
    await cartManager.setNote('Ring bell twice upon delivery');
    state = cartManager.getState();
    assert.strictEqual(state.cart?.note, 'Ring bell twice upon delivery');

    // 8. Checkout preparation & validation
    const cart = state.cart!;
    const validation = CheckoutService.validateCart(cart);
    assert.strictEqual(validation.valid, true);

    const checkoutUrl = CheckoutService.buildCheckoutUrl(cart, {
      utmParams: { utm_source: 'autumn_sale' },
    });
    assert.ok(checkoutUrl.includes('https://mock.shopify.com/checkouts'));
    assert.ok(checkoutUrl.includes('discount=SAVE20'));
    assert.ok(checkoutUrl.includes('utm_source=autumn_sale'));
  });
});
