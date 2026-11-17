import type {
  Product,
  Cart,
  StorefrontClientConfig,
  GraphQLResponse,
  CartLineItem,
  Money,
} from '../types.js';
import { MockStorefrontClient } from './mock-client.js';

const DEFAULT_API_VERSION = '2025-10';

export class ShopifyStorefrontClient {
  private storeDomain: string;
  private storefrontAccessToken: string;
  private apiVersion: string;
  private isMock: boolean;
  private mockClient: MockStorefrontClient;
  private fetchFn: typeof fetch;

  constructor(config: StorefrontClientConfig = {}) {
    this.storeDomain = config.storeDomain?.replace(/^https?:\/\//, '') || '';
    this.storefrontAccessToken = config.storefrontAccessToken || '';
    this.apiVersion = config.apiVersion || DEFAULT_API_VERSION;
    this.isMock =
      config.mode === 'mock' ||
      !this.storeDomain ||
      !this.storefrontAccessToken ||
      this.storeDomain.includes('your-store') ||
      this.storeDomain.includes('placeholder');
    this.mockClient = new MockStorefrontClient();
    this.fetchFn = config.customFetch || (typeof fetch !== 'undefined' ? fetch : (null as any));
  }

  isMockMode(): boolean {
    return this.isMock;
  }

  getMockClient(): MockStorefrontClient {
    return this.mockClient;
  }

  /**
   * Execute a raw Storefront GraphQL query / mutation.
   */
  async request<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    if (this.isMock) {
      throw new Error('Raw GraphQL query execution is only available in live mode.');
    }

    if (!this.fetchFn) {
      throw new Error('No fetch implementation found. Pass customFetch in client config.');
    }

    const endpoint = `https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`;
    const response = await this.fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': this.storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Shopify Storefront API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as GraphQLResponse<T>;

    if (result.errors && result.errors.length > 0) {
      const messages = result.errors.map((e) => e.message).join('; ');
      throw new Error(`GraphQL Errors: ${messages}`);
    }

    if (!result.data) {
      throw new Error('No data received from Shopify Storefront API.');
    }

    return result.data;
  }

  // --- High Level Commerce Methods ---

  async getProducts(options?: { limit?: number; query?: string }): Promise<Product[]> {
    if (this.isMock) {
      return this.mockClient.getProducts(options);
    }

    const query = `
      query getProducts($first: Int!, $query: String) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              handle
              title
              description
              availableForSale
              vendor
              tags
              featuredImage {
                url
                altText
                width
                height
              }
              images(first: 5) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              options {
                name
                values
              }
              variants(first: 20) {
                edges {
                  node {
                    id
                    title
                    sku
                    availableForSale
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    interface ShopifyProductsQuery {
      products: {
        edges: Array<{
          node: {
            id: string;
            handle: string;
            title: string;
            description: string;
            availableForSale: boolean;
            vendor: string;
            tags: string[];
            featuredImage?: { url: string; altText?: string; width?: number; height?: number };
            images: { edges: Array<{ node: { url: string; altText?: string } }> };
            priceRange: {
              minVariantPrice: { amount: string; currencyCode: string };
              maxVariantPrice: { amount: string; currencyCode: string };
            };
            options: Array<{ name: string; values: string[] }>;
            variants: {
              edges: Array<{
                node: {
                  id: string;
                  title: string;
                  sku?: string;
                  availableForSale: boolean;
                  price: { amount: string; currencyCode: string };
                  compareAtPrice?: { amount: string; currencyCode: string };
                  selectedOptions: Array<{ name: string; value: string }>;
                };
              }>;
            };
          };
        }>;
      };
    }

    const data = await this.request<ShopifyProductsQuery>(query, {
      first: options?.limit || 20,
      query: options?.query || null,
    });

    return data.products.edges.map((edge) => {
      const node = edge.node;
      return {
        id: node.id,
        handle: node.handle,
        title: node.title,
        description: node.description,
        availableForSale: node.availableForSale,
        vendor: node.vendor,
        tags: node.tags,
        featuredImage: node.featuredImage,
        images: node.images.edges.map((e) => e.node),
        priceRange: {
          min: {
            amount: parseFloat(node.priceRange.minVariantPrice.amount),
            currencyCode: node.priceRange.minVariantPrice.currencyCode,
          },
          max: {
            amount: parseFloat(node.priceRange.maxVariantPrice.amount),
            currencyCode: node.priceRange.maxVariantPrice.currencyCode,
          },
        },
        options: node.options,
        variants: node.variants.edges.map((v) => ({
          id: v.node.id,
          title: v.node.title,
          sku: v.node.sku,
          availableForSale: v.node.availableForSale,
          price: {
            amount: parseFloat(v.node.price.amount),
            currencyCode: v.node.price.currencyCode,
          },
          compareAtPrice: v.node.compareAtPrice
            ? {
                amount: parseFloat(v.node.compareAtPrice.amount),
                currencyCode: v.node.compareAtPrice.currencyCode,
              }
            : undefined,
          selectedOptions: v.node.selectedOptions,
        })),
      };
    });
  }

  async getProductByHandle(handle: string): Promise<Product | null> {
    if (this.isMock) {
      return this.mockClient.getProductByHandle(handle);
    }

    const query = `
      query getProductByHandle($handle: String!) {
        product(handle: $handle) {
          id
          handle
          title
          description
          availableForSale
          vendor
          tags
          featuredImage {
            url
            altText
            width
            height
          }
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          options {
            name
            values
          }
          variants(first: 20) {
            edges {
              node {
                id
                title
                sku
                availableForSale
                price {
                  amount
                  currencyCode
                }
                compareAtPrice {
                  amount
                  currencyCode
                }
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    `;

    interface SingleProductQuery {
      product: any | null;
    }

    const data = await this.request<SingleProductQuery>(query, { handle });
    if (!data.product) return null;
    const node = data.product;

    return {
      id: node.id,
      handle: node.handle,
      title: node.title,
      description: node.description,
      availableForSale: node.availableForSale,
      vendor: node.vendor,
      tags: node.tags,
      featuredImage: node.featuredImage,
      images: node.images.edges.map((e: any) => e.node),
      priceRange: {
        min: {
          amount: parseFloat(node.priceRange.minVariantPrice.amount),
          currencyCode: node.priceRange.minVariantPrice.currencyCode,
        },
        max: {
          amount: parseFloat(node.priceRange.maxVariantPrice.amount),
          currencyCode: node.priceRange.maxVariantPrice.currencyCode,
        },
      },
      options: node.options,
      variants: node.variants.edges.map((v: any) => ({
        id: v.node.id,
        title: v.node.title,
        sku: v.node.sku,
        availableForSale: v.node.availableForSale,
        price: {
          amount: parseFloat(v.node.price.amount),
          currencyCode: v.node.price.currencyCode,
        },
        compareAtPrice: v.node.compareAtPrice
          ? {
              amount: parseFloat(v.node.compareAtPrice.amount),
              currencyCode: v.node.compareAtPrice.currencyCode,
            }
          : undefined,
        selectedOptions: v.node.selectedOptions,
      })),
    };
  }

  // --- Cart Operations ---

  private transformShopifyCart(rawCart: any): Cart {
    const lines: CartLineItem[] = (rawCart.lines?.edges || []).map((e: any) => {
      const node = e.node;
      const merch = node.merchandise;
      return {
        id: node.id,
        variantId: merch.id,
        quantity: node.quantity,
        merchandise: {
          id: merch.id,
          title: merch.title,
          product: {
            title: merch.product?.title || '',
            handle: merch.product?.handle || '',
            featuredImage: merch.product?.featuredImage,
          },
          price: {
            amount: parseFloat(merch.price?.amount || '0'),
            currencyCode: merch.price?.currencyCode || 'USD',
          },
          compareAtPrice: merch.compareAtPrice
            ? {
                amount: parseFloat(merch.compareAtPrice.amount),
                currencyCode: merch.compareAtPrice.currencyCode,
              }
            : undefined,
          selectedOptions: merch.selectedOptions || [],
        },
        cost: {
          subtotal: {
            amount: parseFloat(node.cost?.subtotalAmount?.amount || '0'),
            currencyCode: node.cost?.subtotalAmount?.currencyCode || 'USD',
          },
          total: {
            amount: parseFloat(node.cost?.totalAmount?.amount || '0'),
            currencyCode: node.cost?.totalAmount?.currencyCode || 'USD',
          },
        },
      };
    });

    return {
      id: rawCart.id,
      checkoutUrl: rawCart.checkoutUrl,
      lines,
      cost: {
        subtotalAmount: {
          amount: parseFloat(rawCart.cost?.subtotalAmount?.amount || '0'),
          currencyCode: rawCart.cost?.subtotalAmount?.currencyCode || 'USD',
        },
        totalAmount: {
          amount: parseFloat(rawCart.cost?.totalAmount?.amount || '0'),
          currencyCode: rawCart.cost?.totalAmount?.currencyCode || 'USD',
        },
        totalTaxAmount: rawCart.cost?.totalTaxAmount
          ? {
              amount: parseFloat(rawCart.cost.totalTaxAmount.amount),
              currencyCode: rawCart.cost.totalTaxAmount.currencyCode,
            }
          : undefined,
      },
      totalQuantity: rawCart.totalQuantity || 0,
      discountCodes: (rawCart.discountCodes || []).map((d: any) => ({
        code: d.code,
        applicable: d.applicable,
      })),
      note: rawCart.note || '',
      createdAt: rawCart.createdAt,
      updatedAt: rawCart.updatedAt,
    };
  }

  async createCart(input?: {
    lines?: Array<{ merchandiseId: string; quantity: number; attributes?: Record<string, string> }>;
    discountCodes?: string[];
    note?: string;
  }): Promise<Cart> {
    if (this.isMock) {
      return this.mockClient.createCart(input);
    }

    const mutation = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
            totalQuantity
            note
            cost {
              subtotalAmount { amount currencyCode }
              totalAmount { amount currencyCode }
              totalTaxAmount { amount currencyCode }
            }
            discountCodes { code applicable }
            lines(first: 50) {
              edges {
                node {
                  id
                  quantity
                  cost {
                    subtotalAmount { amount currencyCode }
                    totalAmount { amount currencyCode }
                  }
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price { amount currencyCode }
                      compareAtPrice { amount currencyCode }
                      selectedOptions { name value }
                      product {
                        title
                        handle
                        featuredImage { url altText }
                      }
                    }
                  }
                }
              }
            }
          }
          userErrors { field message }
        }
      }
    `;

    const formattedLines = input?.lines?.map((line) => ({
      merchandiseId: line.merchandiseId,
      quantity: line.quantity,
      attributes: line.attributes
        ? Object.entries(line.attributes).map(([key, value]) => ({ key, value }))
        : undefined,
    }));

    const res = await this.request<any>(mutation, {
      input: {
        lines: formattedLines,
        discountCodes: input?.discountCodes,
        note: input?.note,
      },
    });

    if (res.cartCreate.userErrors?.length > 0) {
      throw new Error(res.cartCreate.userErrors.map((e: any) => e.message).join('; '));
    }

    return this.transformShopifyCart(res.cartCreate.cart);
  }

  async getCart(cartId: string): Promise<Cart | null> {
    if (this.isMock) {
      return this.mockClient.getCart(cartId);
    }

    const query = `
      query getCart($id: ID!) {
        cart(id: $id) {
          id
          checkoutUrl
          totalQuantity
          note
          cost {
            subtotalAmount { amount currencyCode }
            totalAmount { amount currencyCode }
            totalTaxAmount { amount currencyCode }
          }
          discountCodes { code applicable }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                cost {
                  subtotalAmount { amount currencyCode }
                  totalAmount { amount currencyCode }
                }
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price { amount currencyCode }
                    compareAtPrice { amount currencyCode }
                    selectedOptions { name value }
                    product {
                      title
                      handle
                      featuredImage { url altText }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const res = await this.request<any>(query, { id: cartId });
    if (!res.cart) return null;
    return this.transformShopifyCart(res.cart);
  }

  async addCartLines(
    cartId: string,
    lines: Array<{ merchandiseId: string; quantity: number; attributes?: Record<string, string> }>
  ): Promise<Cart> {
    if (this.isMock) {
      return this.mockClient.addCartLines(cartId, lines);
    }

    const mutation = `
      mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart {
            id
            checkoutUrl
            totalQuantity
            note
            cost {
              subtotalAmount { amount currencyCode }
              totalAmount { amount currencyCode }
              totalTaxAmount { amount currencyCode }
            }
            discountCodes { code applicable }
            lines(first: 50) {
              edges {
                node {
                  id
                  quantity
                  cost {
                    subtotalAmount { amount currencyCode }
                    totalAmount { amount currencyCode }
                  }
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price { amount currencyCode }
                      compareAtPrice { amount currencyCode }
                      selectedOptions { name value }
                      product {
                        title
                        handle
                        featuredImage { url altText }
                      }
                    }
                  }
                }
              }
            }
          }
          userErrors { field message }
        }
      }
    `;

    const formattedLines = lines.map((l) => ({
      merchandiseId: l.merchandiseId,
      quantity: l.quantity,
      attributes: l.attributes
        ? Object.entries(l.attributes).map(([key, value]) => ({ key, value }))
        : undefined,
    }));

    const res = await this.request<any>(mutation, { cartId, lines: formattedLines });
    if (res.cartLinesAdd.userErrors?.length > 0) {
      throw new Error(res.cartLinesAdd.userErrors.map((e: any) => e.message).join('; '));
    }
    return this.transformShopifyCart(res.cartLinesAdd.cart);
  }

  async updateCartLines(
    cartId: string,
    lines: Array<{ id: string; quantity: number; attributes?: Record<string, string> }>
  ): Promise<Cart> {
    if (this.isMock) {
      return this.mockClient.updateCartLines(cartId, lines);
    }

    const mutation = `
      mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) {
          cart {
            id
            checkoutUrl
            totalQuantity
            note
            cost {
              subtotalAmount { amount currencyCode }
              totalAmount { amount currencyCode }
              totalTaxAmount { amount currencyCode }
            }
            discountCodes { code applicable }
            lines(first: 50) {
              edges {
                node {
                  id
                  quantity
                  cost {
                    subtotalAmount { amount currencyCode }
                    totalAmount { amount currencyCode }
                  }
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price { amount currencyCode }
                      compareAtPrice { amount currencyCode }
                      selectedOptions { name value }
                      product {
                        title
                        handle
                        featuredImage { url altText }
                      }
                    }
                  }
                }
              }
            }
          }
          userErrors { field message }
        }
      }
    `;

    const formattedLines = lines.map((l) => ({
      id: l.id,
      quantity: l.quantity,
      attributes: l.attributes
        ? Object.entries(l.attributes).map(([key, value]) => ({ key, value }))
        : undefined,
    }));

    const res = await this.request<any>(mutation, { cartId, lines: formattedLines });
    if (res.cartLinesUpdate.userErrors?.length > 0) {
      throw new Error(res.cartLinesUpdate.userErrors.map((e: any) => e.message).join('; '));
    }
    return this.transformShopifyCart(res.cartLinesUpdate.cart);
  }

  async removeCartLines(cartId: string, lineIds: string[]): Promise<Cart> {
    if (this.isMock) {
      return this.mockClient.removeCartLines(cartId, lineIds);
    }

    const mutation = `
      mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
          cart {
            id
            checkoutUrl
            totalQuantity
            note
            cost {
              subtotalAmount { amount currencyCode }
              totalAmount { amount currencyCode }
              totalTaxAmount { amount currencyCode }
            }
            discountCodes { code applicable }
            lines(first: 50) {
              edges {
                node {
                  id
                  quantity
                  cost {
                    subtotalAmount { amount currencyCode }
                    totalAmount { amount currencyCode }
                  }
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price { amount currencyCode }
                      compareAtPrice { amount currencyCode }
                      selectedOptions { name value }
                      product {
                        title
                        handle
                        featuredImage { url altText }
                      }
                    }
                  }
                }
              }
            }
          }
          userErrors { field message }
        }
      }
    `;

    const res = await this.request<any>(mutation, { cartId, lineIds });
    if (res.cartLinesRemove.userErrors?.length > 0) {
      throw new Error(res.cartLinesRemove.userErrors.map((e: any) => e.message).join('; '));
    }
    return this.transformShopifyCart(res.cartLinesRemove.cart);
  }

  async updateCartDiscountCodes(cartId: string, discountCodes: string[]): Promise<Cart> {
    if (this.isMock) {
      return this.mockClient.updateCartDiscountCodes(cartId, discountCodes);
    }

    const mutation = `
      mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]) {
        cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
          cart {
            id
            checkoutUrl
            totalQuantity
            note
            cost {
              subtotalAmount { amount currencyCode }
              totalAmount { amount currencyCode }
              totalTaxAmount { amount currencyCode }
            }
            discountCodes { code applicable }
            lines(first: 50) {
              edges {
                node {
                  id
                  quantity
                  cost {
                    subtotalAmount { amount currencyCode }
                    totalAmount { amount currencyCode }
                  }
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price { amount currencyCode }
                      compareAtPrice { amount currencyCode }
                      selectedOptions { name value }
                      product {
                        title
                        handle
                        featuredImage { url altText }
                      }
                    }
                  }
                }
              }
            }
          }
          userErrors { field message }
        }
      }
    `;

    const res = await this.request<any>(mutation, { cartId, discountCodes });
    if (res.cartDiscountCodesUpdate.userErrors?.length > 0) {
      throw new Error(res.cartDiscountCodesUpdate.userErrors.map((e: any) => e.message).join('; '));
    }
    return this.transformShopifyCart(res.cartDiscountCodesUpdate.cart);
  }

  async updateCartNote(cartId: string, note: string): Promise<Cart> {
    if (this.isMock) {
      return this.mockClient.updateCartNote(cartId, note);
    }

    const mutation = `
      mutation cartNoteUpdate($cartId: ID!, $note: String) {
        cartNoteUpdate(cartId: $cartId, note: $note) {
          cart {
            id
            checkoutUrl
            totalQuantity
            note
            cost {
              subtotalAmount { amount currencyCode }
              totalAmount { amount currencyCode }
              totalTaxAmount { amount currencyCode }
            }
            discountCodes { code applicable }
            lines(first: 50) {
              edges {
                node {
                  id
                  quantity
                  cost {
                    subtotalAmount { amount currencyCode }
                    totalAmount { amount currencyCode }
                  }
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price { amount currencyCode }
                      compareAtPrice { amount currencyCode }
                      selectedOptions { name value }
                      product {
                        title
                        handle
                        featuredImage { url altText }
                      }
                    }
                  }
                }
              }
            }
          }
          userErrors { field message }
        }
      }
    `;

    const res = await this.request<any>(mutation, { cartId, note });
    if (res.cartNoteUpdate.userErrors?.length > 0) {
      throw new Error(res.cartNoteUpdate.userErrors.map((e: any) => e.message).join('; '));
    }
    return this.transformShopifyCart(res.cartNoteUpdate.cart);
  }
}
