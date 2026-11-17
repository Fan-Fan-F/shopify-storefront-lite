import type {
  Cart,
  CartState,
  StorageAdapter,
} from '../types.js';
import { ShopifyStorefrontClient } from '../client/storefront-client.js';
import { LocalStorageAdapter } from '../storage/local-storage.js';
import { DEFAULT_CART_STORAGE_KEY } from '../storage/storage-adapter.js';

export type CartListener = (state: CartState) => void;

export interface CartManagerOptions {
  client: ShopifyStorefrontClient;
  storage?: StorageAdapter;
  storageKey?: string;
  autoInit?: boolean;
}

/**
 * Framework-Agnostic Reactive Cart Manager.
 * Orchestrates all cart mutations, optimistic state updates, persistence, and event subscriptions.
 */
export class CartManager {
  private client: ShopifyStorefrontClient;
  private storage: StorageAdapter;
  private storageKey: string;
  private listeners: Set<CartListener> = new Set();
  private state: CartState = {
    cart: null,
    isLoading: false,
    error: null,
  };
  private initPromise: Promise<Cart | null> | null = null;

  constructor(options: CartManagerOptions) {
    this.client = options.client;
    this.storage = options.storage || new LocalStorageAdapter();
    this.storageKey = options.storageKey || DEFAULT_CART_STORAGE_KEY;

    if (options.autoInit !== false) {
      this.init().catch((err) => {
        this.setError(err instanceof Error ? err.message : String(err));
      });
    }
  }

  /**
   * Get the current snapshot of cart state.
   */
  getState(): CartState {
    return this.state;
  }

  /**
   * Subscribe to cart state updates. Returns unsubscribe function.
   */
  subscribe(listener: CartListener): () => void {
    this.listeners.add(listener);
    // Emit immediate current state
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const currentState = { ...this.state };
    for (const listener of this.listeners) {
      try {
        listener(currentState);
      } catch (err) {
        console.error('Error in CartManager listener:', err);
      }
    }
  }

  private setLoading(isLoading: boolean): void {
    this.state = { ...this.state, isLoading };
    this.notify();
  }

  private setError(error: string | null): void {
    this.state = { ...this.state, error, isLoading: false };
    this.notify();
  }

  private setCart(cart: Cart): void {
    this.state = {
      cart,
      isLoading: false,
      error: null,
    };
    if (cart.id) {
      try {
        this.storage.setItem(this.storageKey, cart.id);
      } catch {
        // Ignore storage write issues
      }
    }
    this.notify();
  }

  /**
   * Initialize or restore an existing cart from persistent storage.
   */
  async init(): Promise<Cart | null> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      this.setLoading(true);
      try {
        const storedCartId = await this.storage.getItem(this.storageKey);
        if (storedCartId) {
          const existingCart = await this.client.getCart(storedCartId);
          if (existingCart) {
            this.setCart(existingCart);
            return existingCart;
          }
        }

        // If no stored cart or expired, create fresh cart
        const newCart = await this.client.createCart();
        this.setCart(newCart);
        return newCart;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize cart';
        this.setError(message);
        return null;
      }
    })();

    return this.initPromise;
  }

  private async ensureCart(): Promise<Cart> {
    if (this.state.cart) {
      return this.state.cart;
    }
    const cart = await this.init();
    if (!cart) {
      throw new Error(this.state.error || 'Cart initialization failed');
    }
    return cart;
  }

  /**
   * Add item to cart by variant ID.
   */
  async addItem(
    variantId: string,
    quantity = 1,
    attributes?: Record<string, string>
  ): Promise<Cart> {
    this.setLoading(true);
    try {
      const currentCart = await this.ensureCart();
      const updatedCart = await this.client.addCartLines(currentCart.id, [
        { merchandiseId: variantId, quantity, attributes },
      ]);
      this.setCart(updatedCart);
      return updatedCart;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add item to cart';
      this.setError(message);
      throw err;
    }
  }

  /**
   * Update quantity of an existing line item.
   * If quantity <= 0, the line item is removed.
   */
  async updateQuantity(
    lineId: string,
    quantity: number,
    attributes?: Record<string, string>
  ): Promise<Cart> {
    this.setLoading(true);
    try {
      const currentCart = await this.ensureCart();
      if (quantity <= 0) {
        return this.removeItem(lineId);
      }
      const updatedCart = await this.client.updateCartLines(currentCart.id, [
        { id: lineId, quantity, attributes },
      ]);
      this.setCart(updatedCart);
      return updatedCart;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update line quantity';
      this.setError(message);
      throw err;
    }
  }

  /**
   * Remove line item from cart.
   */
  async removeItem(lineId: string): Promise<Cart> {
    this.setLoading(true);
    try {
      const currentCart = await this.ensureCart();
      const updatedCart = await this.client.removeCartLines(currentCart.id, [lineId]);
      this.setCart(updatedCart);
      return updatedCart;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove line item';
      this.setError(message);
      throw err;
    }
  }

  /**
   * Apply promotional discount code to cart.
   */
  async applyDiscount(code: string): Promise<Cart> {
    this.setLoading(true);
    try {
      const currentCart = await this.ensureCart();
      const trimmed = code.trim().toUpperCase();
      const existingCodes = currentCart.discountCodes.map((d) => d.code);
      if (!existingCodes.includes(trimmed)) {
        existingCodes.push(trimmed);
      }
      const updatedCart = await this.client.updateCartDiscountCodes(currentCart.id, existingCodes);
      this.setCart(updatedCart);
      return updatedCart;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to apply discount code';
      this.setError(message);
      throw err;
    }
  }

  /**
   * Remove discount code from cart.
   */
  async removeDiscount(code: string): Promise<Cart> {
    this.setLoading(true);
    try {
      const currentCart = await this.ensureCart();
      const trimmed = code.trim().toUpperCase();
      const remainingCodes = currentCart.discountCodes
        .filter((d) => d.code.toUpperCase() !== trimmed)
        .map((d) => d.code);
      const updatedCart = await this.client.updateCartDiscountCodes(currentCart.id, remainingCodes);
      this.setCart(updatedCart);
      return updatedCart;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove discount code';
      this.setError(message);
      throw err;
    }
  }

  /**
   * Update cart note / special buyer instructions.
   */
  async setNote(note: string): Promise<Cart> {
    this.setLoading(true);
    try {
      const currentCart = await this.ensureCart();
      const updatedCart = await this.client.updateCartNote(currentCart.id, note);
      this.setCart(updatedCart);
      return updatedCart;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update cart note';
      this.setError(message);
      throw err;
    }
  }

  /**
   * Clear all items in cart.
   */
  async clearCart(): Promise<Cart> {
    this.setLoading(true);
    try {
      const currentCart = await this.ensureCart();
      const lineIds = currentCart.lines.map((l) => l.id);
      let updatedCart = currentCart;
      if (lineIds.length > 0) {
        updatedCart = await this.client.removeCartLines(currentCart.id, lineIds);
      }
      this.setCart(updatedCart);
      return updatedCart;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear cart';
      this.setError(message);
      throw err;
    }
  }

  /**
   * Reset local cart and clear persisted storage key.
   */
  async reset(): Promise<void> {
    await this.storage.removeItem(this.storageKey);
    this.state = {
      cart: null,
      isLoading: false,
      error: null,
    };
    this.initPromise = null;
    this.notify();
  }

  /**
   * Retrieve the checkout web URL.
   */
  getCheckoutUrl(): string | null {
    return this.state.cart?.checkoutUrl || null;
  }
}
