import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ShopifyStorefrontClient } from '../core/client/storefront-client.js';
import { CartManager } from '../core/cart/cart-manager.js';
import { MemoryStorageAdapter } from '../core/storage/memory-storage.js';
import { CheckoutService } from '../core/checkout/checkout-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize client & cart manager
const client = new ShopifyStorefrontClient({
  mode: (process.env.SHOPIFY_STORE_MODE as 'live' | 'mock') || 'mock',
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN,
  storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
  apiVersion: process.env.SHOPIFY_STOREFRONT_API_VERSION,
});

const storage = new MemoryStorageAdapter();
const cartManager = new CartManager({
  client,
  storage,
});

// Helper to parse JSON request body
async function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Cap at 1MB
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

export function createDemoServer() {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    try {
      // API: Health check
      if (pathname === '/api/health' && req.method === 'GET') {
        sendJson(res, 200, {
          status: 'ok',
          mode: client.isMockMode() ? 'mock' : 'live',
          uptime: process.uptime(),
        });
        return;
      }

      // API: Get products
      if (pathname === '/api/products' && req.method === 'GET') {
        const query = parsedUrl.searchParams.get('query') || undefined;
        const limit = parsedUrl.searchParams.get('limit')
          ? parseInt(parsedUrl.searchParams.get('limit')!, 10)
          : undefined;
        const products = await client.getProducts({ query, limit });
        sendJson(res, 200, products);
        return;
      }

      // API: Get single product
      if (pathname.startsWith('/api/products/') && req.method === 'GET') {
        const handle = pathname.replace('/api/products/', '');
        const product = await client.getProductByHandle(handle);
        if (!product) {
          sendJson(res, 404, { error: 'Product not found' });
          return;
        }
        sendJson(res, 200, product);
        return;
      }

      // API: Get active cart
      if (pathname === '/api/cart' && req.method === 'GET') {
        await cartManager.init();
        sendJson(res, 200, cartManager.getState());
        return;
      }

      // API: Add item to cart
      if (pathname === '/api/cart/add' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.variantId) {
          sendJson(res, 400, { error: 'variantId is required' });
          return;
        }
        const cart = await cartManager.addItem(body.variantId, body.quantity || 1, body.attributes);
        sendJson(res, 200, { success: true, cart });
        return;
      }

      // API: Update line quantity
      if (pathname === '/api/cart/update' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.lineId || typeof body.quantity !== 'number') {
          sendJson(res, 400, { error: 'lineId and numeric quantity are required' });
          return;
        }
        const cart = await cartManager.updateQuantity(body.lineId, body.quantity, body.attributes);
        sendJson(res, 200, { success: true, cart });
        return;
      }

      // API: Remove line item
      if (pathname === '/api/cart/remove' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.lineId) {
          sendJson(res, 400, { error: 'lineId is required' });
          return;
        }
        const cart = await cartManager.removeItem(body.lineId);
        sendJson(res, 200, { success: true, cart });
        return;
      }

      // API: Apply discount code
      if (pathname === '/api/cart/discount' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.code) {
          sendJson(res, 400, { error: 'code is required' });
          return;
        }
        const cart = await cartManager.applyDiscount(body.code);
        sendJson(res, 200, { success: true, cart });
        return;
      }

      // API: Update cart note
      if (pathname === '/api/cart/note' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const cart = await cartManager.setNote(body.note || '');
        sendJson(res, 200, { success: true, cart });
        return;
      }

      // API: Checkout orchestration
      if (pathname === '/api/cart/checkout' && req.method === 'POST') {
        const state = cartManager.getState();
        const validation = CheckoutService.validateCart(state.cart);
        if (!validation.valid) {
          sendJson(res, 400, { error: 'Cart is invalid for checkout', details: validation.errors });
          return;
        }
        const checkoutUrl = CheckoutService.buildCheckoutUrl(state.cart!);
        sendJson(res, 200, { success: true, checkoutUrl });
        return;
      }

      // Serve UI Static Assets
      if (pathname === '/' || pathname === '/index.html') {
        const candidates = [
          path.join(__dirname, 'public', 'index.html'),
          path.join(__dirname, '..', '..', 'src', 'demo', 'public', 'index.html'),
          path.join(process.cwd(), 'src', 'demo', 'public', 'index.html'),
        ];
        const htmlPath = candidates.find((p) => fs.existsSync(p));
        if (htmlPath) {
          const htmlContent = fs.readFileSync(htmlPath, 'utf8');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(htmlContent);
          return;
        }
      }

      // 404
      sendJson(res, 404, { error: 'Not Found' });
    } catch (err) {
      console.error('Server error:', err);
      sendJson(res, 500, {
        error: err instanceof Error ? err.message : 'Internal Server Error',
      });
    }
  });

  return server;
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const server = createDemoServer();
  server.listen(PORT, () => {
    console.log(`\n🛍  Shopify Storefront Lite Demo Server`);
    console.log(`👉 Running at: http://localhost:${PORT}`);
    console.log(`⚡ Mode: ${client.isMockMode() ? 'MOCK (Instant Offline Mode)' : 'LIVE'}`);
    console.log(`📦 Ready for cart & checkout testing.\n`);
  });
}
