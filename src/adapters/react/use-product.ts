import { useState, useMemo, useCallback } from 'react';
import type { Product, ProductVariant } from '../../core/types.js';
import {
  findVariantByOptions,
  formatMoney,
  calculateDiscount,
} from '../../core/products/product-service.js';

export interface UseProductReturn {
  selectedOptions: Record<string, string>;
  selectedVariant: ProductVariant | null;
  selectOption: (name: string, value: string) => void;
  resetOptions: () => void;
  formattedPrice: string;
  formattedCompareAtPrice?: string;
  discount: { hasDiscount: boolean; saveAmount: number; percentage: number };
  isAvailable: boolean;
}

/**
 * React hook to manage product option selections, active variant determination,
 * formatted pricing, and discount calculations.
 */
export function useProduct(product: Product): UseProductReturn {
  // Initialize with first variant's options if available
  const initialOptions = useMemo(() => {
    const map: Record<string, string> = {};
    const first = product.variants[0];
    if (first) {
      for (const opt of first.selectedOptions) {
        map[opt.name] = opt.value;
      }
    }
    return map;
  }, [product]);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(initialOptions);

  const selectOption = useCallback((name: string, value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const resetOptions = useCallback(() => {
    setSelectedOptions(initialOptions);
  }, [initialOptions]);

  const selectedVariant = useMemo(() => {
    return findVariantByOptions(product, selectedOptions);
  }, [product, selectedOptions]);

  const price = selectedVariant?.price || product.priceRange.min;
  const compareAtPrice = selectedVariant?.compareAtPrice;

  const formattedPrice = useMemo(() => formatMoney(price), [price]);
  const formattedCompareAtPrice = useMemo(
    () => (compareAtPrice ? formatMoney(compareAtPrice) : undefined),
    [compareAtPrice]
  );

  const discount = useMemo(
    () => calculateDiscount(price, compareAtPrice),
    [price, compareAtPrice]
  );

  const isAvailable = selectedVariant ? selectedVariant.availableForSale : product.availableForSale;

  return {
    selectedOptions,
    selectedVariant,
    selectOption,
    resetOptions,
    formattedPrice,
    formattedCompareAtPrice,
    discount,
    isAvailable,
  };
}
