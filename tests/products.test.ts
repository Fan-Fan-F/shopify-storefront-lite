import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatMoney,
  findVariantByOptions,
  calculateDiscount,
  filterProducts,
} from '../src/core/products/product-service.js';
import { MOCK_PRODUCTS } from '../src/core/client/mock-data.js';

describe('Product Service Utilities', () => {
  it('formats money to localized currency', () => {
    const formatted = formatMoney({ amount: 89, currencyCode: 'USD' });
    assert.ok(formatted.includes('89.00'));
    assert.ok(formatted.includes('$'));
  });

  it('matches variant by selected options', () => {
    const product = MOCK_PRODUCTS[0]; // Linen overshirt with Color and Size
    const match = findVariantByOptions(product, { Color: 'Sand', Size: 'M' });
    assert.ok(match !== null);
    assert.strictEqual(match?.id, 'gid://shopify/ProductVariant/2002');
    assert.strictEqual(match?.title, 'Sand / M');
  });

  it('returns null when selected options do not match any variant', () => {
    const product = MOCK_PRODUCTS[0];
    const match = findVariantByOptions(product, { Color: 'Neon Pink', Size: 'XXXL' });
    assert.strictEqual(match, null);
  });

  it('calculates discount percentage correctly', () => {
    const discount = calculateDiscount(
      { amount: 80, currencyCode: 'USD' },
      { amount: 100, currencyCode: 'USD' }
    );
    assert.strictEqual(discount.hasDiscount, true);
    assert.strictEqual(discount.saveAmount, 20);
    assert.strictEqual(discount.percentage, 20);

    const noDiscount = calculateDiscount(
      { amount: 100, currencyCode: 'USD' },
      { amount: 100, currencyCode: 'USD' }
    );
    assert.strictEqual(noDiscount.hasDiscount, false);
    assert.strictEqual(noDiscount.percentage, 0);
  });

  it('filters catalog products by tags and stock', () => {
    const apparel = filterProducts(MOCK_PRODUCTS, { tag: 'apparel' });
    assert.ok(apparel.length >= 1);
    assert.ok(apparel.every((p) => p.tags.includes('apparel')));

    const inStock = filterProducts(MOCK_PRODUCTS, { inStockOnly: true });
    assert.ok(inStock.every((p) => p.availableForSale));
  });
});
