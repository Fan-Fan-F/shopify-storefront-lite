import type { Product, CartDiscountCode } from '../types.js';

export const MOCK_DISCOUNT_CODES: Record<string, { percentage: number; description: string }> = {
  WELCOME10: { percentage: 10, description: '10% off new customer discount' },
  SAVE20: { percentage: 20, description: '20% seasonal promotion' },
  FREESHIP: { percentage: 0, description: 'Free expedited shipping' },
};

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'gid://shopify/Product/1001',
    handle: 'minimal-linen-overshirt',
    title: 'Minimalist Linen Overshirt',
    description: 'Crafted from 100% organic European flax linen. Breathable, durable, and tailored for effortless layering across seasons.',
    availableForSale: true,
    vendor: 'Studio Nord',
    tags: ['apparel', 'linen', 'featured', 'new'],
    priceRange: {
      min: { amount: 89.0, currencyCode: 'USD' },
      max: { amount: 95.0, currencyCode: 'USD' },
    },
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&auto=format&fit=crop&q=80',
      altText: 'Minimalist Linen Overshirt in Natural Beige',
      width: 800,
      height: 1000,
    },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&auto=format&fit=crop&q=80',
        altText: 'Front View',
      },
      {
        url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
        altText: 'Fabric detail',
      },
    ],
    options: [
      { name: 'Color', values: ['Sand', 'Olive', 'Midnight Navy'] },
      { name: 'Size', values: ['S', 'M', 'L', 'XL'] },
    ],
    variants: [
      {
        id: 'gid://shopify/ProductVariant/2001',
        title: 'Sand / S',
        sku: 'LINEN-SND-S',
        availableForSale: true,
        price: { amount: 89.0, currencyCode: 'USD' },
        compareAtPrice: { amount: 110.0, currencyCode: 'USD' },
        selectedOptions: [
          { name: 'Color', value: 'Sand' },
          { name: 'Size', value: 'S' },
        ],
      },
      {
        id: 'gid://shopify/ProductVariant/2002',
        title: 'Sand / M',
        sku: 'LINEN-SND-M',
        availableForSale: true,
        price: { amount: 89.0, currencyCode: 'USD' },
        compareAtPrice: { amount: 110.0, currencyCode: 'USD' },
        selectedOptions: [
          { name: 'Color', value: 'Sand' },
          { name: 'Size', value: 'M' },
        ],
      },
      {
        id: 'gid://shopify/ProductVariant/2003',
        title: 'Olive / M',
        sku: 'LINEN-OLV-M',
        availableForSale: true,
        price: { amount: 89.0, currencyCode: 'USD' },
        selectedOptions: [
          { name: 'Color', value: 'Olive' },
          { name: 'Size', value: 'M' },
        ],
      },
      {
        id: 'gid://shopify/ProductVariant/2004',
        title: 'Midnight Navy / L',
        sku: 'LINEN-NAV-L',
        availableForSale: true,
        price: { amount: 95.0, currencyCode: 'USD' },
        selectedOptions: [
          { name: 'Color', value: 'Midnight Navy' },
          { name: 'Size', value: 'L' },
        ],
      },
    ],
  },
  {
    id: 'gid://shopify/Product/1002',
    handle: 'everyday-canvas-tote',
    title: 'Everyday Heavy Canvas Tote',
    description: 'Heavyweight 16oz organic cotton duck canvas with reinforced cross-stitching and an internal zippered valuables pocket.',
    availableForSale: true,
    vendor: 'Studio Nord',
    tags: ['accessories', 'bags', 'bestseller'],
    priceRange: {
      min: { amount: 48.0, currencyCode: 'USD' },
      max: { amount: 48.0, currencyCode: 'USD' },
    },
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
      altText: 'Everyday Canvas Tote in Ecru',
      width: 800,
      height: 1000,
    },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
        altText: 'Everyday Canvas Tote',
      },
    ],
    options: [{ name: 'Color', values: ['Natural Ecru', 'Washed Black'] }],
    variants: [
      {
        id: 'gid://shopify/ProductVariant/2011',
        title: 'Natural Ecru',
        sku: 'TOTE-ECRU-ONE',
        availableForSale: true,
        price: { amount: 48.0, currencyCode: 'USD' },
        compareAtPrice: { amount: 60.0, currencyCode: 'USD' },
        selectedOptions: [{ name: 'Color', value: 'Natural Ecru' }],
      },
      {
        id: 'gid://shopify/ProductVariant/2012',
        title: 'Washed Black',
        sku: 'TOTE-BLK-ONE',
        availableForSale: true,
        price: { amount: 48.0, currencyCode: 'USD' },
        selectedOptions: [{ name: 'Color', value: 'Washed Black' }],
      },
    ],
  },
  {
    id: 'gid://shopify/Product/1003',
    handle: 'matte-ceramic-mug-set',
    title: 'Artisan Matte Ceramic Mug (Set of 2)',
    description: 'Hand-thrown stoneware with a soothing tactile matte finish and comfortable ergonomic handle. Microwave and dishwasher safe.',
    availableForSale: true,
    vendor: 'Nordic Clay Lab',
    tags: ['homeware', 'kitchen', 'gift'],
    priceRange: {
      min: { amount: 36.0, currencyCode: 'USD' },
      max: { amount: 36.0, currencyCode: 'USD' },
    },
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
      altText: 'Artisan Matte Ceramic Mug Set',
      width: 800,
      height: 1000,
    },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
        altText: 'Ceramic mugs on table',
      },
    ],
    options: [{ name: 'Glaze', values: ['Chalk White', 'Charcoal Slate'] }],
    variants: [
      {
        id: 'gid://shopify/ProductVariant/2021',
        title: 'Chalk White',
        sku: 'MUG-WHT-2PK',
        availableForSale: true,
        price: { amount: 36.0, currencyCode: 'USD' },
        selectedOptions: [{ name: 'Glaze', value: 'Chalk White' }],
      },
      {
        id: 'gid://shopify/ProductVariant/2022',
        title: 'Charcoal Slate',
        sku: 'MUG-CHR-2PK',
        availableForSale: false,
        price: { amount: 36.0, currencyCode: 'USD' },
        selectedOptions: [{ name: 'Glaze', value: 'Charcoal Slate' }],
      },
    ],
  },
  {
    id: 'gid://shopify/Product/1004',
    handle: 'merino-wool-beanie',
    title: 'Ribbed Merino Wool Beanie',
    description: '100% extra-fine Australian Merino wool. Ultra-soft rib knit that retains warmth without itching.',
    availableForSale: true,
    vendor: 'Studio Nord',
    tags: ['accessories', 'winter', 'wool'],
    priceRange: {
      min: { amount: 32.0, currencyCode: 'USD' },
      max: { amount: 32.0, currencyCode: 'USD' },
    },
    featuredImage: {
      url: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&auto=format&fit=crop&q=80',
      altText: 'Ribbed Merino Wool Beanie',
      width: 800,
      height: 1000,
    },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&auto=format&fit=crop&q=80',
        altText: 'Beanie',
      },
    ],
    options: [{ name: 'Color', values: ['Heather Grey', 'Rust', 'Forest Green'] }],
    variants: [
      {
        id: 'gid://shopify/ProductVariant/2031',
        title: 'Heather Grey',
        sku: 'BEANIE-GRY',
        availableForSale: true,
        price: { amount: 32.0, currencyCode: 'USD' },
        selectedOptions: [{ name: 'Color', value: 'Heather Grey' }],
      },
      {
        id: 'gid://shopify/ProductVariant/2032',
        title: 'Rust',
        sku: 'BEANIE-RST',
        availableForSale: true,
        price: { amount: 32.0, currencyCode: 'USD' },
        selectedOptions: [{ name: 'Color', value: 'Rust' }],
      },
    ],
  },
];
