import { NextRequest, NextResponse } from "next/server";
import { createOrder, CreateOrderInput } from "@/lib/shopify-admin";

// POST /api/shopify/orders/create - Tạo đơn hàng trong Shopify
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { line_items, customer, financial_status, fulfillment_status, note } = body;

    const orderData: CreateOrderInput = {
      line_items,
      customer,
      financial_status: financial_status || "paid",
      fulfillment_status: fulfillment_status || null,
      note,
    };

    const data = await createOrder(orderData);

    return NextResponse.json(
      {
        order: data.order,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating Shopify order:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create order in Shopify";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

