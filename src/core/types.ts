/**
 * Core Type Definitions for shopify-storefront-lite
 * Framework-agnostic headless commerce primitives for Shopify Storefront.
 */

export type CurrencyCode =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'CAD'
  | 'AUD'
  | 'JPY'
  | 'CNY'
  | 'HKD'
  | 'SGD'
  | string;

export interface Money {
  amount: number;
  currencyCode: CurrencyCode;
}

export interface SelectedOption {
  name: string;
  value: string;
}

export interface ProductOption {
  name: string;
  values: string[];
}

export interface ProductImage {
  url: string;
  altText?: string;
  width?: number;
  height?: number;
}

export interface ProductVariant {
  id: string;
  title: string;
  sku?: string;
  availableForSale: boolean;
  price: Money;
  compareAtPrice?: Money;
  selectedOptions: SelectedOption[];
  image?: ProductImage;
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  availableForSale: boolean;
  featuredImage?: ProductImage;
  images: ProductImage[];
  options: ProductOption[];
  variants: ProductVariant[];
  tags: string[];
  vendor?: string;
  priceRange: {
    min: Money;
    max: Money;
  };
}

export interface CartLineMerchandise {
  id: string;
  title: string;
  product: {
    title: string;
    handle: string;
    featuredImage?: ProductImage;
  };
  price: Money;
  compareAtPrice?: Money;
  selectedOptions: SelectedOption[];
}

export interface CartLineItem {
  id: string;
  variantId: string;
  quantity: number;
  merchandise: CartLineMerchandise;
  attributes?: Record<string, string>;
  cost: {
    subtotal: Money;
    total: Money;
  };
}

export interface CartDiscountCode {
  code: string;
  applicable: boolean;
}

export interface CartDiscountAllocation {
  discountedAmount: Money;
  code?: string;
}

export interface CartBuyerIdentity {
  email?: string;
  phone?: string;
  countryCode?: string;
}

export interface CartCost {
  subtotalAmount: Money;
  totalAmount: Money;
  totalTaxAmount?: Money;
  totalDutyAmount?: Money;
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  lines: CartLineItem[];
  cost: CartCost;
  totalQuantity: number;
  discountCodes: CartDiscountCode[];
  discountAllocations?: CartDiscountAllocation[];
  buyerIdentity?: CartBuyerIdentity;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
}

export interface StorefrontClientConfig {
  storeDomain?: string;
  storefrontAccessToken?: string;
  apiVersion?: string;
  mode?: 'live' | 'mock';
  customFetch?: typeof fetch;
}

export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export interface CheckoutOptions {
  discountCode?: string;
  note?: string;
  utmParams?: Record<string, string>;
  customAttributes?: Record<string, string>;
}
