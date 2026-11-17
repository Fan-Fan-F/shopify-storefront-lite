import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { ShopifyStorefrontClient } from '../../core/client/storefront-client.js';
import { CartManager } from '../../core/cart/cart-manager.js';
import type { StorefrontClientConfig } from '../../core/types.js';

export interface ShopifyContextValue {
  client: ShopifyStorefrontClient;
  cartManager: CartManager;
}

const ShopifyContext = createContext<ShopifyContextValue | null>(null);

export interface ShopifyProviderProps {
  clientConfig?: StorefrontClientConfig;
  client?: ShopifyStorefrontClient;
  cartManager?: CartManager;
  children: ReactNode;
}

export function ShopifyProvider({
  clientConfig,
  client: providedClient,
  cartManager: providedCartManager,
  children,
}: ShopifyProviderProps) {
  const client = useMemo(() => {
    return providedClient || new ShopifyStorefrontClient(clientConfig);
  }, [providedClient, clientConfig]);

  const cartManager = useMemo(() => {
    return providedCartManager || new CartManager({ client });
  }, [providedCartManager, client]);

  const value = useMemo(
    () => ({ client, cartManager }),
    [client, cartManager]
  );

  return React.createElement(ShopifyContext.Provider, { value }, children);
}

export function useShopify(): ShopifyContextValue {
  const context = useContext(ShopifyContext);
  if (!context) {
    throw new Error('useShopify must be used within a <ShopifyProvider />');
  }
  return context;
}
