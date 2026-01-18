const domain = process.env.SHOPIFY_STORE_DOMAIN;
const adminAccessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

// GraphQL endpoint for Shopify Admin API
const GRAPHQL_ENDPOINT = `https://${domain}/admin/api/2024-01/graphql.json`;

interface ShopifyAdminFetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  endpoint: string;
  body?: Record<string, unknown>;
}

export async function shopifyAdminFetch({
  method = "GET",
  endpoint,
  body,
}: ShopifyAdminFetchOptions) {
  if (!domain || !adminAccessToken) {
    throw new Error(
      "Shopify Admin credentials are not configured. Please set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in your environment variables."
    );
  }

  const url = `https://${domain}/admin/api/2024-01/${endpoint}`;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminAccessToken,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `Failed to fetch Shopify Admin data: ${res.status} ${res.statusText} - ${errorText}`
      );
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Shopify Admin fetch error:", error);
    throw error;
  }
}

// Normalize phone number for search (remove spaces, +, format variations)
function normalizePhoneNumber(phone: string): string[] {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, "");

  const variations: string[] = [];

  // Original query
  variations.push(phone);
  variations.push(cleaned);

  // If starts with 0, try with +84
  if (cleaned.startsWith("0")) {
    const withoutZero = cleaned.substring(1);
    variations.push(`+84${withoutZero}`);
    variations.push(`84${withoutZero}`);
    variations.push(withoutZero);
    // Also try with spaces: +84 7xx xxx xxx
    if (withoutZero.length >= 9) {
      const formatted = `+84 ${withoutZero.substring(
        0,
        1
      )} ${withoutZero.substring(1, 4)} ${withoutZero.substring(4)}`;
      variations.push(formatted);
    }
  }

  // If starts with +84, try with 0
  if (cleaned.startsWith("+84")) {
    const withoutPrefix = cleaned.substring(3);
    variations.push(`0${withoutPrefix}`);
    variations.push(withoutPrefix);
  }

  // If starts with 84, try with 0 and +84
  if (cleaned.startsWith("84") && !cleaned.startsWith("+84")) {
    const withoutPrefix = cleaned.substring(2);
    variations.push(`0${withoutPrefix}`);
    variations.push(`+84${withoutPrefix}`);
    variations.push(withoutPrefix);
  }

  // Remove duplicates
  return [...new Set(variations)];
}

// GraphQL query to search customers by phone
export async function searchCustomersByPhoneGraphQL(phone: string) {
  if (!domain || !adminAccessToken) {
    throw new Error(
      "Shopify Admin credentials are not configured. Please set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in your environment variables."
    );
  }

  // Normalize phone number for GraphQL query
  const normalizedPhone = phone.trim().replace(/[^\d+]/g, "");
  const phoneQuery = normalizedPhone.startsWith("+")
    ? `phone:${normalizedPhone}`
    : `phone:+84${normalizedPhone.replace(/^0/, "")}`;

  const query = `
    query searchCustomers($query: String!) {
      customers(first: 50, query: $query) {
        edges {
          node {
            id
            firstName
            lastName
            phone
            email
            tags
            note
            numberOfOrders
            state
            defaultAddress {
              id
              firstName
              lastName
              phone
              address1
              address2
              city
              province
              country
              zip
              company
            }
            addresses(first: 10) {
              id
              firstName
              lastName
              phone
              address1
              address2
              city
              province
              country
              zip
              company
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminAccessToken,
      },
      body: JSON.stringify({
        query,
        variables: {
          query: phoneQuery,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch Shopify GraphQL data: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    // Transform GraphQL response to match REST API format
    const customers = data.data.customers.edges.map((edge: any) => {
      const node = edge.node;
      // addresses is an array, not a connection with edges
      const addressesArray = Array.isArray(node.addresses)
        ? node.addresses
        : node.addresses?.edges?.map((addrEdge: any) => addrEdge.node) || [];

      return {
        id: node.id.split("/").pop(), // Extract numeric ID from GID
        admin_graphql_api_id: node.id,
        email: node.email || null,
        phone: node.phone || null,
        first_name: node.firstName || null,
        last_name: node.lastName || null,
        company: node.defaultAddress?.company || null,
        tags: node.tags || "",
        note: node.note || "",
        total_spent: "0", // Calculate from orders if needed
        orders_count: node.numberOfOrders || 0,
        state: node.state || "enabled",
        default_address: node.defaultAddress
          ? {
              id: node.defaultAddress.id?.split("/").pop(),
              firstName: node.defaultAddress.firstName,
              lastName: node.defaultAddress.lastName,
              phone: node.defaultAddress.phone,
              address1: node.defaultAddress.address1,
              address2: node.defaultAddress.address2,
              city: node.defaultAddress.city,
              province: node.defaultAddress.province,
              country: node.defaultAddress.country,
              zip: node.defaultAddress.zip,
              company: node.defaultAddress.company,
            }
          : null,
        addresses: addressesArray.map((addr: any) => ({
          id: addr.id?.split("/").pop(),
          firstName: addr.firstName,
          lastName: addr.lastName,
          phone: addr.phone,
          address1: addr.address1,
          address2: addr.address2,
          city: addr.city,
          province: addr.province,
          country: addr.country,
          zip: addr.zip,
          company: addr.company,
        })),
      };
    });

    return { customers };
  } catch (error) {
    console.error("Shopify GraphQL fetch error:", error);
    throw error;
  }
}

// Get customer by ID using GraphQL
export async function getCustomerByIdGraphQL(customerId: string) {
  if (!domain || !adminAccessToken) {
    throw new Error(
      "Shopify Admin credentials are not configured. Please set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in your environment variables."
    );
  }

  // Convert numeric ID to GID format if needed
  const gid = customerId.includes("gid://")
    ? customerId
    : `gid://shopify/Customer/${customerId}`;

  const query = `
    query getCustomer($id: ID!) {
      customer(id: $id) {
        id
        firstName
        lastName
        phone
        email
        tags
        note
        numberOfOrders
        state
        defaultAddress {
          id
          firstName
          lastName
          phone
          address1
          address2
          city
          province
          country
          zip
          company
        }
        addresses(first: 10) {
          id
          firstName
          lastName
          phone
          address1
          address2
          city
          province
          country
          zip
          company
        }
      }
    }
  `;

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminAccessToken,
      },
      body: JSON.stringify({
        query,
        variables: {
          id: gid,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch Shopify GraphQL data: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    if (!data.data.customer) {
      throw new Error("Customer not found");
    }

    // Transform GraphQL response to match REST API format
    const node = data.data.customer;
    // addresses is an array, not a connection with edges
    const addressesArray = Array.isArray(node.addresses)
      ? node.addresses
      : node.addresses?.edges?.map((addrEdge: any) => addrEdge.node) || [];

    const customer = {
      id: node.id.split("/").pop(), // Extract numeric ID from GID
      admin_graphql_api_id: node.id,
      email: node.email || null,
      phone: node.phone || null,
      first_name: node.firstName || null,
      last_name: node.lastName || null,
      company: node.defaultAddress?.company || null,
      tags: node.tags || "",
      note: node.note || "",
      total_spent: "0", // Calculate from orders if needed
      orders_count: node.numberOfOrders || 0,
      state: node.state || "enabled",
      default_address: node.defaultAddress
        ? {
            id: node.defaultAddress.id?.split("/").pop(),
            firstName: node.defaultAddress.firstName,
            lastName: node.defaultAddress.lastName,
            phone: node.defaultAddress.phone,
            address1: node.defaultAddress.address1,
            address2: node.defaultAddress.address2,
            city: node.defaultAddress.city,
            province: node.defaultAddress.province,
            country: node.defaultAddress.country,
            zip: node.defaultAddress.zip,
            company: node.defaultAddress.company,
          }
        : null,
      addresses: addressesArray.map((addr: any) => ({
        id: addr.id?.split("/").pop(),
        firstName: addr.firstName,
        lastName: addr.lastName,
        phone: addr.phone,
        address1: addr.address1,
        address2: addr.address2,
        city: addr.city,
        province: addr.province,
        country: addr.country,
        zip: addr.zip,
        company: addr.company,
      })),
    };

    return { customer };
  } catch (error) {
    console.error("Shopify GraphQL fetch error:", error);
    throw error;
  }
}

// Search customers by query (email, phone, name)
export async function searchCustomers(query: string) {
  // If query looks like a phone number (contains only digits, +, spaces, parentheses, dashes)
  const isPhoneNumber = /^[\d\s+()-]+$/.test(query.trim());

  if (isPhoneNumber) {
    // Try multiple phone number formats
    const phoneVariations = normalizePhoneNumber(query);
    const allCustomers: Array<{ id: string; [key: string]: unknown }> = [];
    const seenIds = new Set<string>();

    // Search with each variation
    for (const phoneVar of phoneVariations) {
      try {
        const endpoint = `customers/search.json?query=${encodeURIComponent(
          phoneVar
        )}&limit=50`;
        const data = await shopifyAdminFetch({ endpoint });

        if (data.customers) {
          for (const customer of data.customers) {
            if (customer.id && !seenIds.has(customer.id)) {
              allCustomers.push(customer);
              seenIds.add(customer.id);
            }
          }
        }
      } catch {
        // Continue with next variation if one fails
        // Silently continue
      }
    }

    return { customers: allCustomers };
  } else {
    // Regular search for non-phone queries
    const endpoint = `customers/search.json?query=${encodeURIComponent(
      query
    )}&limit=50`;
    return await shopifyAdminFetch({ endpoint });
  }
}

// Get customer by ID
export async function getCustomerById(customerId: string) {
  const endpoint = `customers/${customerId}.json`;
  return await shopifyAdminFetch({ endpoint });
}

// Get customer info from Orders API (fallback when Customer API doesn't return PII)
export async function getCustomerInfoFromOrders(customerId: string) {
  try {
    // Search for orders by customer ID
    const endpoint = `orders.json?customer_id=${customerId}&limit=1&status=any`;
    const data = await shopifyAdminFetch({ endpoint });
    
    if (!data.orders || data.orders.length === 0) {
      return null; // No orders found
    }

    // Get the most recent order
    const order = data.orders[0];
    const billingAddress = order.billing_address || order.shipping_address || {};
    
    // Extract customer info from order
    const customerInfo: any = {
      id: customerId,
      email: order.email || billingAddress.email || null,
      phone: order.phone || billingAddress.phone || null,
      first_name: billingAddress.first_name || null,
      last_name: billingAddress.last_name || null,
      company: billingAddress.company || null,
      default_address: billingAddress ? {
        firstName: billingAddress.first_name,
        lastName: billingAddress.last_name,
        phone: billingAddress.phone,
        address1: billingAddress.address1,
        address2: billingAddress.address2,
        city: billingAddress.city,
        province: billingAddress.province,
        country: billingAddress.country,
        zip: billingAddress.zip,
        company: billingAddress.company,
      } : null,
      addresses: billingAddress ? [{
        firstName: billingAddress.first_name,
        lastName: billingAddress.last_name,
        phone: billingAddress.phone,
        address1: billingAddress.address1,
        address2: billingAddress.address2,
        city: billingAddress.city,
        province: billingAddress.province,
        country: billingAddress.country,
        zip: billingAddress.zip,
        company: billingAddress.company,
      }] : [],
    };

    return customerInfo;
  } catch (error) {
    console.error("Error fetching customer info from orders:", error);
    return null;
  }
}

// Create customer
export interface CreateCustomerInput {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  addresses?: Array<{
    address1?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
    phone?: string;
  }>;
  note?: string;
}

export async function createCustomer(customerData: CreateCustomerInput) {
  const endpoint = "customers.json";
  return await shopifyAdminFetch({
    method: "POST",
    endpoint,
    body: { customer: customerData },
  });
}

// Update customer
export async function updateCustomer(
  customerId: string,
  customerData: Partial<CreateCustomerInput>
) {
  const endpoint = `customers/${customerId}.json`;
  return await shopifyAdminFetch({
    method: "PUT",
    endpoint,
    body: { customer: customerData },
  });
}

// Create order (for saving sales to Shopify)
export interface CreateOrderInput {
  line_items: Array<{
    variant_id?: number;
    product_id?: number;
    title: string;
    quantity: number;
    price: string;
    sku?: string;
  }>;
  customer?: {
    id?: number;
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
  financial_status?:
    | "pending"
    | "authorized"
    | "partially_paid"
    | "paid"
    | "partially_refunded"
    | "refunded"
    | "voided";
  fulfillment_status?: "fulfilled" | "partial" | "restocked" | null;
  note?: string;
  discount_codes?: Array<{
    code: string;
    amount?: string;
    type?: "percentage" | "fixed_amount" | "shipping";
  }>;
}

export async function createOrder(orderData: CreateOrderInput) {
  const endpoint = "orders.json";
  return await shopifyAdminFetch({
    method: "POST",
    endpoint,
    body: { order: orderData },
  });
}

// Update order
export interface UpdateOrderInput {
  financial_status?:
    | "pending"
    | "authorized"
    | "partially_paid"
    | "paid"
    | "partially_refunded"
    | "refunded"
    | "voided";
  fulfillment_status?: "fulfilled" | "partial" | "restocked" | null;
  note?: string;
}

export async function updateOrder(
  orderId: string,
  orderData: UpdateOrderInput
) {
  const endpoint = `orders/${orderId}.json`;
  return await shopifyAdminFetch({
    method: "PUT",
    endpoint,
    body: { order: orderData },
  });
}

// Validate discount code
export async function validateDiscountCode(code: string) {
  const endpoint = `discount_codes/${encodeURIComponent(code)}.json`;
  try {
    return await shopifyAdminFetch({ endpoint });
  } catch (error) {
    // Try to get price rules instead (for discount codes created via Price Rules)
    try {
      const priceRulesEndpoint = `price_rules.json?status=active`;
      const priceRules = await shopifyAdminFetch({
        endpoint: priceRulesEndpoint,
      });
      // Search for matching discount code in price rules
      if (priceRules.price_rules) {
        for (const rule of priceRules.price_rules) {
          const discountCodesEndpoint = `price_rules/${rule.id}/discount_codes.json`;
          const discountCodes = await shopifyAdminFetch({
            endpoint: discountCodesEndpoint,
          });
          if (discountCodes.discount_codes) {
            const found = discountCodes.discount_codes.find(
              (dc: any) => dc.code === code
            );
            if (found) {
              return { discount_code: found, price_rule: rule };
            }
          }
        }
      }
    } catch (e) {
      // Ignore
    }
    throw error;
  }
}

// Get discount code details (alternative method using price rules)
export async function getDiscountCodeDetails(code: string) {
  try {
    // First try to get from discount codes
    const endpoint = `discount_codes/${encodeURIComponent(code)}.json`;
    return await shopifyAdminFetch({ endpoint });
  } catch (error) {
    // If not found, search in price rules
    const priceRulesEndpoint = `price_rules.json?status=active&limit=250`;
    const priceRules = await shopifyAdminFetch({
      endpoint: priceRulesEndpoint,
    });

    if (priceRules.price_rules) {
      for (const rule of priceRules.price_rules) {
        try {
          const discountCodesEndpoint = `price_rules/${rule.id}/discount_codes.json`;
          const discountCodes = await shopifyAdminFetch({
            endpoint: discountCodesEndpoint,
          });
          if (discountCodes.discount_codes) {
            const found = discountCodes.discount_codes.find(
              (dc: any) => dc.code === code
            );
            if (found) {
              return { discount_code: found, price_rule: rule };
            }
          }
        } catch (e) {
          continue;
        }
      }
    }

    throw new Error("Discount code not found");
  }
}
