const domain = process.env.SHOPIFY_STORE_DOMAIN;
const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

interface ShopifyFetchOptions {
  query: string;
  variables?: Record<string, unknown>;
}

export async function shopifyFetch({ query, variables = {} }: ShopifyFetchOptions) {
  if (!domain || !storefrontAccessToken) {
    throw new Error("Shopify credentials are not configured. Please set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN in your environment variables.");
  }

  const endpoint = `https://${domain}/api/2024-01/graphql.json`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 3600 }, // Cache trong 1 giờ (ISR)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch Shopify data: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();

    // Check for GraphQL errors
    if (data.errors) {
      throw new Error(`Shopify GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data;
  } catch (error) {
    console.error("Shopify fetch error:", error);
    throw error;
  }
}

// GraphQL queries
export const PRODUCTS_QUERY = `
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          handle
          description
          descriptionHtml
          images(first: 5) {
            edges {
              node {
                id
                url
                altText
                width
                height
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
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                availableForSale
                sku
              }
            }
          }
          tags
          productType
          vendor
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = `
  query getProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      images(first: 10) {
        edges {
          node {
            id
            url
            altText
            width
            height
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
      variants(first: 50) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            availableForSale
            sku
            selectedOptions {
              name
              value
            }
          }
        }
      }
      tags
      productType
      vendor
      createdAt
      updatedAt
    }
  }
`;

