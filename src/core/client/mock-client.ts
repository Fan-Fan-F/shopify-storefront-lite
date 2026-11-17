import type {
  Product,
  Cart,
  CartLineItem,
  Money,
  CartDiscountCode,
  ProductVariant,
} from '../types.js';
import { MOCK_PRODUCTS, MOCK_DISCOUNT_CODES } from './mock-data.js';

/**
 * In-memory mock Shopify Storefront client.
 * Simulates complete Storefront GraphQL query and mutation responses offline.
 */
export class MockStorefrontClient {
  private products: Product[] = [...MOCK_PRODUCTS];
  private carts: Map<string, Cart> = new Map();
  private nextCartId = 1000;
  private nextLineId = 5000;

  async getProducts(options?: { limit?: number; query?: string }): Promise<Product[]> {
    let result = [...this.products];
    if (options?.query) {
      const q = options.query.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (options?.limit && options.limit > 0) {
      result = result.slice(0, options.limit);
    }
    return result;
  }

  async getProductByHandle(handle: string): Promise<Product | null> {
    const product = this.products.find((p) => p.handle === handle);
    return product || null;
  }

  async getProductById(id: string): Promise<Product | null> {
    const product = this.products.find((p) => p.id === id);
    return product || null;
  }

  private findVariant(variantId: string): { product: Product; variant: ProductVariant } | null {
    for (const product of this.products) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (variant) {
        return { product, variant };
      }
    }
    return null;
  }

  private recalculateCart(cart: Cart): Cart {
    let subtotalAmount = 0;
    let totalQuantity = 0;
    let currency = 'USD';

    for (const line of cart.lines) {
      subtotalAmount += line.cost.total.amount;
      totalQuantity += line.quantity;
      currency = line.cost.total.currencyCode;
    }

    let discountAmount = 0;
    const activeDiscounts = cart.discountCodes.filter((d) => d.applicable);
    for (const d of activeDiscounts) {
      const info = MOCK_DISCOUNT_CODES[d.code.toUpperCase()];
      if (info && info.percentage > 0) {
        discountAmount += (subtotalAmount * info.percentage) / 100;
      }
    }

    const totalAmount = Math.max(0, subtotalAmount - discountAmount);

    cart.totalQuantity = totalQuantity;
    cart.cost = {
      subtotalAmount: {
        amount: Math.round(subtotalAmount * 100) / 100,
        currencyCode: currency,
      },
      totalAmount: {
        amount: Math.round(totalAmount * 100) / 100,
        currencyCode: currency,
      },
      totalTaxAmount: {
        amount: 0,
        currencyCode: currency,
      },
    };
    cart.updatedAt = new Date().toISOString();
    return cart;
  }

  async createCart(input?: {
    lines?: Array<{ merchandiseId: string; quantity: number; attributes?: Record<string, string> }>;
    discountCodes?: string[];
    note?: string;
  }): Promise<Cart> {
    const cartId = `gid://shopify/Cart/mock_${++this.nextCartId}`;
    const checkoutUrl = `https://mock.shopify.com/checkouts/c/${this.nextCartId}?cart_token=mock_tok_${this.nextCartId}`;

    const cart: Cart = {
      id: cartId,
      checkoutUrl,
      lines: [],
      cost: {
        subtotalAmount: { amount: 0, currencyCode: 'USD' },
        totalAmount: { amount: 0, currencyCode: 'USD' },
      },
      totalQuantity: 0,
      discountCodes: [],
      note: input?.note || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (input?.lines && input.lines.length > 0) {
      for (const item of input.lines) {
        const found = this.findVariant(item.merchandiseId);
        if (found) {
          const lineCost: Money = {
            amount: found.variant.price.amount * item.quantity,
            currencyCode: found.variant.price.currencyCode,
          };
          const line: CartLineItem = {
            id: `gid://shopify/CartLine/${++this.nextLineId}`,
            variantId: found.variant.id,
            quantity: item.quantity,
            merchandise: {
              id: found.variant.id,
              title: found.variant.title,
              product: {
                title: found.product.title,
                handle: found.product.handle,
                featuredImage: found.product.featuredImage,
              },
              price: found.variant.price,
              compareAtPrice: found.variant.compareAtPrice,
              selectedOptions: found.variant.selectedOptions,
            },
            attributes: item.attributes,
            cost: {
              subtotal: lineCost,
              total: lineCost,
            },
          };
          cart.lines.push(line);
        }
      }
    }

    if (input?.discountCodes) {
      for (const code of input.discountCodes) {
        const applicable = Boolean(MOCK_DISCOUNT_CODES[code.toUpperCase()]);
        cart.discountCodes.push({ code, applicable });
      }
    }

    this.recalculateCart(cart);
    this.carts.set(cartId, cart);
    return cart;
  }

  async getCart(cartId: string): Promise<Cart | null> {
    const cart = this.carts.get(cartId);
    return cart || null;
  }

  async addCartLines(
    cartId: string,
    lines: Array<{ merchandiseId: string; quantity: number; attributes?: Record<string, string> }>
  ): Promise<Cart> {
    let cart = this.carts.get(cartId);
    if (!cart) {
      cart = await this.createCart({ lines });
      return cart;
    }

    for (const item of lines) {
      const existingLine = cart.lines.find((l) => l.variantId === item.merchandiseId);
      if (existingLine) {
        existingLine.quantity += item.quantity;
        existingLine.cost.subtotal.amount = existingLine.merchandise.price.amount * existingLine.quantity;
        existingLine.cost.total.amount = existingLine.cost.subtotal.amount;
      } else {
        const found = this.findVariant(item.merchandiseId);
        if (found) {
          const lineCost: Money = {
            amount: found.variant.price.amount * item.quantity,
            currencyCode: found.variant.price.currencyCode,
          };
          const newLine: CartLineItem = {
            id: `gid://shopify/CartLine/${++this.nextLineId}`,
            variantId: found.variant.id,
            quantity: item.quantity,
            merchandise: {
              id: found.variant.id,
              title: found.variant.title,
              product: {
                title: found.product.title,
                handle: found.product.handle,
                featuredImage: found.product.featuredImage,
              },
              price: found.variant.price,
              compareAtPrice: found.variant.compareAtPrice,
              selectedOptions: found.variant.selectedOptions,
            },
            attributes: item.attributes,
            cost: {
              subtotal: lineCost,
              total: lineCost,
            },
          };
          cart.lines.push(newLine);
        }
      }
    }

    this.recalculateCart(cart);
    return cart;
  }

  async updateCartLines(
    cartId: string,
    lines: Array<{ id: string; quantity: number; attributes?: Record<string, string> }>
  ): Promise<Cart> {
    const cart = this.carts.get(cartId);
    if (!cart) {
      throw new Error(`Cart not found: ${cartId}`);
    }

    for (const update of lines) {
      const index = cart.lines.findIndex((l) => l.id === update.id);
      if (index !== -1) {
        if (update.quantity <= 0) {
          cart.lines.splice(index, 1);
        } else {
          cart.lines[index].quantity = update.quantity;
          if (update.attributes) {
            cart.lines[index].attributes = update.attributes;
          }
          cart.lines[index].cost.subtotal.amount =
            cart.lines[index].merchandise.price.amount * update.quantity;
          cart.lines[index].cost.total.amount = cart.lines[index].cost.subtotal.amount;
        }
      }
    }

    this.recalculateCart(cart);
    return cart;
  }

  async removeCartLines(cartId: string, lineIds: string[]): Promise<Cart> {
    const cart = this.carts.get(cartId);
    if (!cart) {
      throw new Error(`Cart not found: ${cartId}`);
    }

    const removeSet = new Set(lineIds);
    cart.lines = cart.lines.filter((l) => !removeSet.has(l.id));

    this.recalculateCart(cart);
    return cart;
  }

  async updateCartDiscountCodes(cartId: string, discountCodes: string[]): Promise<Cart> {
    const cart = this.carts.get(cartId);
    if (!cart) {
      throw new Error(`Cart not found: ${cartId}`);
    }

    cart.discountCodes = discountCodes.map((code) => ({
      code,
      applicable: Boolean(MOCK_DISCOUNT_CODES[code.toUpperCase()]),
    }));

    this.recalculateCart(cart);
    return cart;
  }

  async updateCartNote(cartId: string, note: string): Promise<Cart> {
    const cart = this.carts.get(cartId);
    if (!cart) {
      throw new Error(`Cart not found: ${cartId}`);
    }

    cart.note = note;
    cart.updatedAt = new Date().toISOString();
    return cart;
  }
}
