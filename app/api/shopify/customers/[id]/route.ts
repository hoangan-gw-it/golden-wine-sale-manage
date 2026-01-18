import { NextRequest, NextResponse } from "next/server";
import { getCustomerById as getCustomerByIdFirebase, saveCustomer } from "@/lib/firebase/customers";
import { getCustomerById, getCustomerByIdGraphQL, updateCustomer, getCustomerInfoFromOrders } from "@/lib/shopify-admin";

// GET /api/shopify/customers/[id] - Lấy thông tin khách hàng
// Đọc từ Firebase trước, fallback sang Shopify nếu không tìm thấy
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Try Firebase first
    const firebaseResult = await getCustomerByIdFirebase(id);
    
    if (firebaseResult.data && !firebaseResult.error) {
      console.log("✅ Found customer in Firebase");
      const fbCustomer = firebaseResult.data;
      
      // Convert Firebase format to Shopify format for compatibility
      const customer = {
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
      };

      return NextResponse.json(
        {
          customer: customer,
          source: "firebase",
        },
        { status: 200 }
      );
    }

    // Fallback to Shopify if not found in Firebase
    console.log("⚠️ Customer not found in Firebase, trying Shopify...");
    let data;
    try {
      data = await getCustomerByIdGraphQL(id);
      console.log("✅ Using GraphQL API for customer data");
    } catch (graphqlError) {
      console.error("GraphQL fetch failed, falling back to REST:", graphqlError);
      data = await getCustomerById(id);
      console.log("✅ Using REST API for customer data");
    }

    const customer = data.customer;
    
    // Save to Firebase for future use (async, don't wait)
    saveCustomer({
      id: customer.id?.toString() || id,
      email: customer.email,
      phone: customer.phone,
      first_name: customer.first_name,
      last_name: customer.last_name,
      company: customer.company,
      tags: customer.tags,
      note: customer.note,
      total_spent: customer.total_spent,
      orders_count: customer.orders_count,
      state: customer.state,
      default_address: customer.default_address,
      addresses: customer.addresses,
    }).catch((err) => {
      console.error("Failed to save customer to Firebase:", err);
    });

    // Check if customer data is missing PII
    const hasPII = customer.email || customer.phone || customer.first_name || customer.last_name;
    
    // If PII is missing, try to get it from Orders API
    if (!hasPII && customer.id) {
      console.log("⚠️ Customer data missing PII, trying to fetch from Orders API...");
      const orderCustomerInfo = await getCustomerInfoFromOrders(customer.id);
      
      if (orderCustomerInfo) {
        customer.email = customer.email || orderCustomerInfo.email || null;
        customer.phone = customer.phone || orderCustomerInfo.phone || null;
        customer.first_name = customer.first_name || orderCustomerInfo.first_name || null;
        customer.last_name = customer.last_name || orderCustomerInfo.last_name || null;
        customer.company = customer.company || orderCustomerInfo.company || null;
        
        if (!customer.default_address && orderCustomerInfo.default_address) {
          customer.default_address = orderCustomerInfo.default_address;
        }
        if ((!customer.addresses || customer.addresses.length === 0) && orderCustomerInfo.addresses) {
          customer.addresses = orderCustomerInfo.addresses;
        }
        
        console.log("✅ Successfully enriched customer data from Orders API");
      }
    }

    return NextResponse.json(
      {
        customer: customer,
        source: "shopify",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error fetching customer:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch customer";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PUT /api/shopify/customers/[id] - Cập nhật khách hàng
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Try to update in Shopify first
    let shopifyCustomer;
    try {
      const data = await updateCustomer(id, body);
      shopifyCustomer = data.customer;
    } catch (error) {
      console.warn("Failed to update customer in Shopify, continuing with Firebase only:", error);
      shopifyCustomer = null;
    }

    // Always save to Firebase
    const customerData = shopifyCustomer || { id, ...body };
    const saveResult = await saveCustomer({
      id: customerData.id?.toString() || id,
      email: customerData.email || body.email,
      phone: customerData.phone || body.phone,
      first_name: customerData.first_name || body.first_name,
      last_name: customerData.last_name || body.last_name,
      company: customerData.company || body.company,
      tags: customerData.tags || body.tags,
      note: customerData.note || body.note,
      addresses: customerData.addresses || body.addresses,
      default_address: customerData.default_address || body.default_address,
    });

    if (saveResult.error) {
      console.error("Failed to save customer to Firebase:", saveResult.error);
    }

    const finalCustomer = shopifyCustomer || {
      id,
      ...body,
    };

    return NextResponse.json(
      {
        customer: finalCustomer,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error updating customer:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update customer";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

