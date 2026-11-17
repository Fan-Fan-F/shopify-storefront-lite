import { useSyncExternalStore, useCallback } from 'react';
import type { CartState, Cart } from '../../core/types.js';
import type { CartManager } from '../../core/cart/cart-manager.js';
import { CheckoutService } from '../../core/checkout/checkout-service.js';

export interface UseCartReturn extends CartState {
  addItem: (variantId: string, quantity?: number, attributes?: Record<string, string>) => Promise<Cart>;
  updateQuantity: (lineId: string, quantity: number, attributes?: Record<string, string>) => Promise<Cart>;
  removeItem: (lineId: string) => Promise<Cart>;
  applyDiscount: (code: string) => Promise<Cart>;
  removeDiscount: (code: string) => Promise<Cart>;
  setNote: (note: string) => Promise<Cart>;
  clearCart: () => Promise<Cart>;
  checkout: (options?: { target?: '_self' | '_blank' }) => void;
  checkoutUrl: string | null;
}

/**
 * React hook to consume reactive CartManager state with zero external state libraries.
 * Uses native React useSyncExternalStore.
 */
export function useCart(manager: CartManager): UseCartReturn {
  const subscribe = useCallback(
    (callback: () => void) => manager.subscribe(callback),
    [manager]
  );

  const getSnapshot = useCallback(() => manager.getState(), [manager]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const addItem = useCallback(
    (variantId: string, quantity = 1, attributes?: Record<string, string>) =>
      manager.addItem(variantId, quantity, attributes),
    [manager]
  );

  const updateQuantity = useCallback(
    (lineId: string, quantity: number, attributes?: Record<string, string>) =>
      manager.updateQuantity(lineId, quantity, attributes),
    [manager]
  );

  const removeItem = useCallback(
    (lineId: string) => manager.removeItem(lineId),
    [manager]
  );

  const applyDiscount = useCallback(
    (code: string) => manager.applyDiscount(code),
    [manager]
  );

  const removeDiscount = useCallback(
    (code: string) => manager.removeDiscount(code),
    [manager]
  );

  const setNote = useCallback(
    (note: string) => manager.setNote(note),
    [manager]
  );

  const clearCart = useCallback(
    () => manager.clearCart(),
    [manager]
  );

  const checkout = useCallback(
    (options?: { target?: '_self' | '_blank' }) => {
      if (!state.cart) return;
      CheckoutService.redirectToCheckout(state.cart, options);
    },
    [state.cart]
  );

  return {
    ...state,
    addItem,
    updateQuantity,
    removeItem,
    applyDiscount,
    removeDiscount,
    setNote,
    clearCart,
    checkout,
    checkoutUrl: state.cart?.checkoutUrl || null,
  };
}
