import { NextRequest, NextResponse } from "next/server";
import { searchCustomers as searchCustomersFirebase } from "@/lib/firebase/customers";
import {
  searchCustomers,
  searchCustomersByPhoneGraphQL,
} from "@/lib/shopify-admin";

// GET /api/shopify/customers/search?q=query - Tìm kiếm khách hàng
// Tìm trong Firebase trước, fallback sang Shopify nếu không tìm thấy
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // Try Firebase first
    const firebaseResult = await searchCustomersFirebase(query);

    if (firebaseResult.data && firebaseResult.data.length > 0) {
      console.log(
        `✅ Found ${firebaseResult.data.length} customers in Firebase`
      );
      // Convert Firebase customer format to Shopify format for compatibility
      const customers = firebaseResult.data.map((fbCustomer) => ({
        id: fbCustomer.id,
        email: fbCustomer.email,
        phone: fbCustomer.phone,
        first_name: fbCustomer.first_name,
        last_name: fbCustomer.last_name,
        company: fbCustomer.company,
        tags: fbCustomer.tags,
        note: fbCustomer.note,
        total_spent: fbCustomer.total_spent,
        orders_count: fbCustomer.orders_count,
        state: fbCustomer.state,
        default_address: fbCustomer.default_address,
        addresses: fbCustomer.addresses,
      }));

      return NextResponse.json(
        {
          customers: customers,
          total: customers.length,
          source: "firebase",
        },
        { status: 200 }
      );
    }

    // Fallback to Shopify if not found in Firebase
    console.log("⚠️ No customers found in Firebase, trying Shopify...");
    const isPhoneNumber = /^[\d\s+()-]+$/.test(query.trim());

    let data;
    if (isPhoneNumber) {
      try {
        data = await searchCustomersByPhoneGraphQL(query);
      } catch (graphqlError) {
        console.error(
          "GraphQL search failed, falling back to REST:",
          graphqlError
        );
        data = await searchCustomers(query);
      }
    } else {
      data = await searchCustomers(query);
    }

    return NextResponse.json(
      {
        customers: data.customers || [],
        total: data.customers?.length || 0,
        source: "shopify",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error searching customers:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to search customers";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
