import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ShopifyStorefrontClient } from '../src/core/client/storefront-client.js';
import { MockStorefrontClient } from '../src/core/client/mock-client.js';

describe('ShopifyStorefrontClient & MockStorefrontClient', () => {
  it('initializes in mock mode when credentials are not supplied', () => {
    const client = new ShopifyStorefrontClient();
    assert.strictEqual(client.isMockMode(), true);
  });

  it('fetches products from mock catalog', async () => {
    const client = new ShopifyStorefrontClient();
    const products = await client.getProducts();
    assert.ok(Array.isArray(products));
    assert.ok(products.length >= 3);
    assert.ok(products[0].title);
    assert.ok(products[0].priceRange.min.amount > 0);
  });

  it('supports product search query filtering in mock mode', async () => {
    const mock = new MockStorefrontClient();
    const linenResults = await mock.getProducts({ query: 'linen' });
    assert.ok(linenResults.length >= 1);
    assert.ok(linenResults.every((p) => p.title.toLowerCase().includes('linen') || p.tags.includes('linen')));

    const nonExistent = await mock.getProducts({ query: 'nonexistent-xyz-product' });
    assert.strictEqual(nonExistent.length, 0);
  });

  it('fetches product by handle', async () => {
    const mock = new MockStorefrontClient();
    const product = await mock.getProductByHandle('minimal-linen-overshirt');
    assert.ok(product !== null);
    assert.strictEqual(product?.handle, 'minimal-linen-overshirt');
    assert.ok(product?.variants.length > 0);
  });

  it('returns null for non-existent product handle', async () => {
    const mock = new MockStorefrontClient();
    const product = await mock.getProductByHandle('unknown-handle-404');
    assert.strictEqual(product, null);
  });
});
