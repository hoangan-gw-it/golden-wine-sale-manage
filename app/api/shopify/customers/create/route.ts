import { NextRequest, NextResponse } from "next/server";
import { createCustomer, CreateCustomerInput } from "@/lib/shopify-admin";
import { saveCustomer } from "@/lib/firebase/customers";

// POST /api/shopify/customers/create - Tạo khách hàng mới
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, first_name, last_name, addresses, note, company } = body;

    const customerData: CreateCustomerInput = {
      email,
      phone,
      first_name,
      last_name,
      addresses,
      note,
    };

    // Try to create in Shopify first
    let shopifyCustomer;
    try {
      const data = await createCustomer(customerData);
      shopifyCustomer = data.customer;
    } catch (error) {
      console.warn("Failed to create customer in Shopify, continuing with Firebase only:", error);
      shopifyCustomer = null;
    }

    // Always save to Firebase
    const customerId = shopifyCustomer?.id?.toString() || `temp_${Date.now()}`;
    const saveResult = await saveCustomer({
      id: customerId,
      email: shopifyCustomer?.email || email,
      phone: shopifyCustomer?.phone || phone,
      first_name: shopifyCustomer?.first_name || first_name,
      last_name: shopifyCustomer?.last_name || last_name,
      company: shopifyCustomer?.company || company,
      note: shopifyCustomer?.note || note,
      addresses: shopifyCustomer?.addresses || addresses,
      default_address: shopifyCustomer?.default_address || addresses?.[0],
    });

    if (saveResult.error) {
      console.error("Failed to save customer to Firebase:", saveResult.error);
    }

    const finalCustomer = shopifyCustomer || {
      id: customerId,
      email,
      phone,
      first_name,
      last_name,
      company,
      note,
      addresses,
      default_address: addresses?.[0],
    };

    return NextResponse.json(
      {
        customer: finalCustomer,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating customer:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create customer";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

