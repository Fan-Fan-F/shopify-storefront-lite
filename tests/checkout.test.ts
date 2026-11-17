import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CheckoutService } from '../src/core/checkout/checkout-service.js';
import { ShopifyStorefrontClient } from '../src/core/client/storefront-client.js';
import { CartManager } from '../src/core/cart/cart-manager.js';
import { MemoryStorageAdapter } from '../src/core/storage/memory-storage.js';

describe('CheckoutService', () => {
  it('rejects checkout validation on empty cart', () => {
    const emptyValidation = CheckoutService.validateCart(null);
    assert.strictEqual(emptyValidation.valid, false);
    assert.ok(emptyValidation.errors.length > 0);

    const emptyCartValidation = CheckoutService.validateCart({
      id: 'gid://shopify/Cart/test',
      checkoutUrl: 'https://test.shopify.com/checkouts/123',
      lines: [],
      cost: {
        subtotalAmount: { amount: 0, currencyCode: 'USD' },
        totalAmount: { amount: 0, currencyCode: 'USD' },
      },
      totalQuantity: 0,
      discountCodes: [],
    });
    assert.strictEqual(emptyCartValidation.valid, false);
    assert.ok(emptyCartValidation.errors[0].includes('Cart is empty'));
  });

  it('builds enhanced checkout URL with discounts and UTM tags', async () => {
    const client = new ShopifyStorefrontClient();
    const storage = new MemoryStorageAdapter();
    const manager = new CartManager({ client, storage });

    await manager.init();
    await manager.addItem('gid://shopify/ProductVariant/2001', 1);
    await manager.applyDiscount('SAVE20');

    const cart = manager.getState().cart!;
    const validation = CheckoutService.validateCart(cart);
    assert.strictEqual(validation.valid, true);

    const checkoutUrl = CheckoutService.buildCheckoutUrl(cart, {
      utmParams: {
        utm_source: 'newsletter',
        utm_campaign: 'spring_drop',
      },
      note: 'Gift wrap requested',
    });

    const parsed = new URL(checkoutUrl);
    assert.strictEqual(parsed.searchParams.get('discount'), 'SAVE20');
    assert.strictEqual(parsed.searchParams.get('utm_source'), 'newsletter');
    assert.strictEqual(parsed.searchParams.get('utm_campaign'), 'spring_drop');
    assert.strictEqual(parsed.searchParams.get('note'), 'Gift wrap requested');
  });
});
