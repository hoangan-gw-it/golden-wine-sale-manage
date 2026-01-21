import {
  addDocument,
  getDocuments,
  getDocument,
  updateDocument,
  where,
  orderBy,
  limit,
  Timestamp,
} from "./firestore";

const ORDERS_COLLECTION = "orders";

export interface FirebaseOrder {
  id: string; // Firebase document ID
  shopify_order_id?: string; // Shopify order ID if synced
  customer_id: string; // Shopify customer ID
  line_items: Array<{
    product_id: string; // Shopify product ID
    variant_id?: string; // Shopify variant ID
    quantity: number;
    price: string; // Price as string to preserve precision
    title?: string; // Product title for display (optional, can query from Shopify)
  }>;
  total_price: string;
  subtotal_price?: string;
  total_tax?: string;
  discount_codes?: Array<{
    code: string;
    amount: string;
    type: "percentage" | "fixed";
  }>;
  currency?: string;
  financial_status?: string;
  fulfillment_status?: string;
  note?: string;
  payment_method?: "transfer" | "cash";
  cash_received?: string;
  created_by?: string; // User ID who created the order
  created_by_name?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create order in Firebase
export const createOrder = async (
  order: Omit<FirebaseOrder, "id" | "createdAt" | "updatedAt">
) => {
  try {
    const result = await addDocument<
      Omit<FirebaseOrder, "id" | "createdAt" | "updatedAt">
    >(ORDERS_COLLECTION, order);

    return result;
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

// Get order by ID
export const getOrderById = async (orderId: string) => {
  return await getDocument<FirebaseOrder>(ORDERS_COLLECTION, orderId);
};

// Get orders by customer ID
export const getOrdersByCustomerId = async (customerId: string) => {
  try {
    const result = await getDocuments<FirebaseOrder>(ORDERS_COLLECTION, [
      where("customer_id", "==", customerId),
      orderBy("createdAt", "desc"),
      limit(100),
    ]);

    return result;
  } catch (error: any) {
    // If index error, try without orderBy
    if (error.message && error.message.includes("index")) {
      return await getDocuments<FirebaseOrder>(ORDERS_COLLECTION, [
        where("customer_id", "==", customerId),
        limit(100),
      ]);
    }
    return { data: [], error: error.message };
  }
};

// Get orders by date range
export const getOrdersByDateRange = async (startDate: Date, endDate: Date) => {
  try {
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    const result = await getDocuments<FirebaseOrder>(ORDERS_COLLECTION, [
      where("createdAt", ">=", startTimestamp),
      where("createdAt", "<=", endTimestamp),
      orderBy("createdAt", "desc"),
    ]);

    return result;
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};

// Update order
export const updateOrder = async (
  orderId: string,
  updates: Partial<Omit<FirebaseOrder, "id" | "createdAt" | "updatedAt">>
) => {
  return await updateDocument(ORDERS_COLLECTION, orderId, updates);
};
