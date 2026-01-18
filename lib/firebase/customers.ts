import {
  addDocument,
  getDocuments,
  getDocument,
  updateDocument,
  setDocument,
  where,
  orderBy,
  Timestamp,
} from "./firestore";

const CUSTOMERS_COLLECTION = "customers";

export interface FirebaseCustomer {
  id: string; // Shopify customer ID
  shopify_id?: string; // Alias for id
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  tags?: string;
  note?: string;
  total_spent?: string;
  orders_count?: number;
  state?: string;
  addresses?: Array<{
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  }>;
  default_address?: {
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Create or update customer in Firebase (using Shopify ID as document ID)
export const saveCustomer = async (customer: Omit<FirebaseCustomer, "createdAt" | "updatedAt">) => {
  const customerId = customer.id || customer.shopify_id || "";
  if (!customerId) {
    return { id: null, error: "Customer ID is required" };
  }

  try {
    // Use setDocument to create or update with Shopify ID as document ID
    const result = await setDocument<Omit<FirebaseCustomer, "createdAt" | "updatedAt">>(
      CUSTOMERS_COLLECTION,
      customerId,
      {
        ...customer,
        id: customerId,
        shopify_id: customerId,
      }
    );

    if (result.error) {
      return { id: null, error: result.error };
    }

    return { id: customerId, error: null };
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

// Get customer by ID from Firebase
export const getCustomerById = async (customerId: string) => {
  return await getDocument<FirebaseCustomer>(CUSTOMERS_COLLECTION, customerId);
};

// Search customers by phone
export const searchCustomersByPhone = async (phone: string) => {
  // Normalize phone number - try different formats
  const normalizedPhones = [
    phone.trim(),
    phone.trim().replace(/[^\d+]/g, ""),
    phone.trim().replace(/^0/, "+84"),
    phone.trim().replace(/^84/, "+84"),
  ];

  const allCustomers: FirebaseCustomer[] = [];
  const seenIds = new Set<string>();

  for (const phoneVar of normalizedPhones) {
    if (!phoneVar) continue;
    
    try {
      const result = await getDocuments<FirebaseCustomer>(CUSTOMERS_COLLECTION, [
        where("phone", "==", phoneVar),
        limit(50),
      ]);

      if (result.data) {
        for (const customer of result.data) {
          if (customer.id && !seenIds.has(customer.id)) {
            allCustomers.push(customer);
            seenIds.add(customer.id);
          }
        }
      }
    } catch (error: any) {
      // Continue with next variation
      console.warn(`Error searching with phone ${phoneVar}:`, error.message);
    }
  }

  return { data: allCustomers, error: null };
};

// Search customers by email
export const searchCustomersByEmail = async (email: string) => {
  try {
    const result = await getDocuments<FirebaseCustomer>(CUSTOMERS_COLLECTION, [
      where("email", "==", email.toLowerCase().trim()),
      limit(50),
    ]);

    return result;
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};

// Search customers by name
export const searchCustomersByName = async (name: string) => {
  const searchTerm = name.toLowerCase().trim();
  
  try {
    // Get all customers and filter by name (Firestore doesn't support case-insensitive search)
    const result = await getDocuments<FirebaseCustomer>(CUSTOMERS_COLLECTION, [
      limit(200), // Limit to avoid too many reads
    ]);

    if (result.data) {
      const filtered = result.data.filter((customer) => {
        const firstName = (customer.first_name || "").toLowerCase();
        const lastName = (customer.last_name || "").toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        
        return (
          firstName.includes(searchTerm) ||
          lastName.includes(searchTerm) ||
          fullName.includes(searchTerm)
        );
      });

      return { data: filtered, error: null };
    }

    return { data: [], error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};

// General search (tries phone, email, and name)
export const searchCustomers = async (query: string) => {
  const trimmedQuery = query.trim();
  
  // Check if it's a phone number
  const isPhoneNumber = /^[\d\s+()-]+$/.test(trimmedQuery);
  
  // Check if it's an email
  const isEmail = trimmedQuery.includes("@");

  if (isPhoneNumber) {
    return await searchCustomersByPhone(trimmedQuery);
  } else if (isEmail) {
    return await searchCustomersByEmail(trimmedQuery);
  } else {
    return await searchCustomersByName(trimmedQuery);
  }
};
