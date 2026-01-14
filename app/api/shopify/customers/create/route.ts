import { NextRequest, NextResponse } from "next/server";
import { createCustomer, CreateCustomerInput } from "@/lib/shopify-admin";

// POST /api/shopify/customers/create - Tạo khách hàng mới
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, first_name, last_name, addresses, note } = body;

    const customerData: CreateCustomerInput = {
      email,
      phone,
      first_name,
      last_name,
      addresses,
      note,
    };

    const data = await createCustomer(customerData);

    return NextResponse.json(
      {
        customer: data.customer,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating Shopify customer:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create customer in Shopify";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

