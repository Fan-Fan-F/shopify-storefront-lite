import type { Cart, CheckoutOptions } from '../types.js';

export interface CheckoutValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Checkout Orchestrator Service.
 * Handles checkout URL enhancement, tracking attribution parameters,
 * pre-flight cart validation, and redirect navigation.
 */
export class CheckoutService {
  /**
   * Build an enhanced checkout URL with query parameters (discounts, note, UTM tags).
   */
  static buildCheckoutUrl(cart: Cart, options: CheckoutOptions = {}): string {
    if (!cart.checkoutUrl) {
      throw new Error('Cart does not contain a checkoutUrl.');
    }

    try {
      const url = new URL(cart.checkoutUrl);

      // Attach discount code if present
      const discount =
        options.discountCode ||
        cart.discountCodes.find((d) => d.applicable)?.code;
      if (discount) {
        url.searchParams.set('discount', discount);
      }

      // Attach cart note if specified in options or cart
      const note = options.note || cart.note;
      if (note) {
        url.searchParams.set('note', note);
      }

      // Attach UTM tracking parameters
      if (options.utmParams) {
        for (const [key, value] of Object.entries(options.utmParams)) {
          url.searchParams.set(key, value);
        }
      }

      // Attach custom attributes
      if (options.customAttributes) {
        for (const [key, value] of Object.entries(options.customAttributes)) {
          url.searchParams.set(`attributes[${key}]`, value);
        }
      }

      return url.toString();
    } catch {
      // Fallback if URL parsing fails on custom mock protocols
      return cart.checkoutUrl;
    }
  }

  /**
   * Validate cart before redirecting to checkout.
   */
  static validateCart(cart: Cart | null): CheckoutValidationResult {
    const errors: string[] = [];

    if (!cart) {
      errors.push('Cart is not initialized.');
      return { valid: false, errors };
    }

    if (!cart.lines || cart.lines.length === 0) {
      errors.push('Cart is empty. Please add at least one item before checkout.');
    }

    if (cart.totalQuantity <= 0) {
      errors.push('Total cart quantity must be greater than zero.');
    }

    for (const line of cart.lines || []) {
      if (!line.merchandise?.id) {
        errors.push(`Invalid line item merchandise: ${line.id}`);
      }
      if (line.quantity <= 0) {
        errors.push(`Line item ${line.merchandise?.title || line.id} has invalid quantity.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Browser-safe redirect to Shopify Checkout.
   */
  static redirectToCheckout(
    cart: Cart,
    options: CheckoutOptions & { target?: '_self' | '_blank' } = {}
  ): void {
    const validation = this.validateCart(cart);
    if (!validation.valid) {
      throw new Error(`Checkout validation failed: ${validation.errors.join('; ')}`);
    }

    const url = this.buildCheckoutUrl(cart, options);

    if (typeof window !== 'undefined' && window.location) {
      if (options.target === '_blank') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = url;
      }
    }
  }
}
