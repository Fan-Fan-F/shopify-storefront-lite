import type { Product, ProductVariant, Money, SelectedOption } from '../types.js';

/**
 * Format a Money object to localized currency string.
 */
export function formatMoney(money: Money, locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(money.amount);
  } catch {
    return `${money.currencyCode} ${money.amount.toFixed(2)}`;
  }
}

/**
 * Find the variant that matches all selected option pairs (e.g. { Color: 'Sand', Size: 'M' }).
 */
export function findVariantByOptions(
  product: Product,
  selectedOptions: Record<string, string>
): ProductVariant | null {
  const targetKeys = Object.keys(selectedOptions);
  if (targetKeys.length === 0) {
    return product.variants[0] || null;
  }

  return (
    product.variants.find((variant) => {
      return targetKeys.every((key) => {
        const option = variant.selectedOptions.find(
          (o) => o.name.toLowerCase() === key.toLowerCase()
        );
        return option && option.value.toLowerCase() === selectedOptions[key].toLowerCase();
      });
    }) || null
  );
}

/**
 * Calculate discount details between current price and compareAtPrice.
 */
export function calculateDiscount(
  price: Money,
  compareAtPrice?: Money
): {
  hasDiscount: boolean;
  saveAmount: number;
  percentage: number;
} {
  if (!compareAtPrice || compareAtPrice.amount <= price.amount) {
    return { hasDiscount: false, saveAmount: 0, percentage: 0 };
  }

  const saveAmount = Math.max(0, compareAtPrice.amount - price.amount);
  const percentage = Math.round((saveAmount / compareAtPrice.amount) * 100);

  return {
    hasDiscount: true,
    saveAmount: Math.round(saveAmount * 100) / 100,
    percentage,
  };
}

/**
 * Filter catalog products by search query, tag, max price, or availability.
 */
export function filterProducts(
  products: Product[],
  filters: {
    query?: string;
    tag?: string;
    maxPrice?: number;
    inStockOnly?: boolean;
  }
): Product[] {
  return products.filter((product) => {
    if (filters.inStockOnly && !product.availableForSale) {
      return false;
    }

    if (filters.tag && !product.tags.includes(filters.tag)) {
      return false;
    }

    if (filters.maxPrice && product.priceRange.min.amount > filters.maxPrice) {
      return false;
    }

    if (filters.query) {
      const q = filters.query.toLowerCase().trim();
      const matchTitle = product.title.toLowerCase().includes(q);
      const matchDesc = product.description.toLowerCase().includes(q);
      const matchTag = product.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTag) {
        return false;
      }
    }

    return true;
  });
}
