import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { createDemoServer } from '../src/demo/server.js';

describe('Demo Server & HTTP Storefront Endpoints', () => {
  it('starts server, serves frontend HTML, and handles complete cart API cycle', async () => {
    const server = createDemoServer();

    // Start on dynamic ephemeral port 0
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address() as { address: string; port: number };
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      // 1. Test GET / (HTML UI)
      const htmlRes = await fetch(`${baseUrl}/`);
      assert.strictEqual(htmlRes.status, 200);
      assert.ok(htmlRes.headers.get('content-type')?.includes('text/html'));
      const htmlBody = await htmlRes.text();
      assert.ok(htmlBody.includes('Shopify Storefront Lite'));
      assert.ok(htmlBody.includes('Shopping Cart'));

      // 2. Test GET /api/health
      const healthRes = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(healthRes.status, 200);
      const healthData = await healthRes.json() as any;
      assert.strictEqual(healthData.status, 'ok');
      assert.strictEqual(healthData.mode, 'mock');

      // 3. Test GET /api/products
      const prodsRes = await fetch(`${baseUrl}/api/products`);
      assert.strictEqual(prodsRes.status, 200);
      const prods = await prodsRes.json() as any[];
      assert.ok(prods.length >= 3);
      const targetVariantId = prods[0].variants[0].id;

      // 4. Test GET /api/cart
      const cartRes = await fetch(`${baseUrl}/api/cart`);
      assert.strictEqual(cartRes.status, 200);
      const cartData = await cartRes.json() as any;
      assert.ok(cartData.cart);
      assert.strictEqual(cartData.cart.lines.length, 0);

      // 5. Test POST /api/cart/add
      const addRes = await fetch(`${baseUrl}/api/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: targetVariantId, quantity: 2 }),
      });
      assert.strictEqual(addRes.status, 200);
      const addData = await addRes.json() as any;
      assert.strictEqual(addData.success, true);
      assert.strictEqual(addData.cart.lines.length, 1);
      assert.strictEqual(addData.cart.totalQuantity, 2);
      const lineId = addData.cart.lines[0].id;

      // 6. Test POST /api/cart/discount
      const discountRes = await fetch(`${baseUrl}/api/cart/discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'WELCOME10' }),
      });
      assert.strictEqual(discountRes.status, 200);
      const discountData = await discountRes.json() as any;
      assert.strictEqual(discountData.cart.discountCodes[0].code, 'WELCOME10');
      assert.strictEqual(discountData.cart.discountCodes[0].applicable, true);

      // 7. Test POST /api/cart/checkout
      const checkoutRes = await fetch(`${baseUrl}/api/cart/checkout`, {
        method: 'POST',
      });
      assert.strictEqual(checkoutRes.status, 200);
      const checkoutData = await checkoutRes.json() as any;
      assert.strictEqual(checkoutData.success, true);
      assert.ok(checkoutData.checkoutUrl.includes('mock.shopify.com/checkouts'));

      // 8. Test POST /api/cart/remove
      const removeRes = await fetch(`${baseUrl}/api/cart/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineId }),
      });
      assert.strictEqual(removeRes.status, 200);
      const removeData = await removeRes.json() as any;
      assert.strictEqual(removeData.cart.lines.length, 0);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
