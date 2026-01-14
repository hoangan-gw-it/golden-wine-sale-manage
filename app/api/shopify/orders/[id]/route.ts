import { NextRequest, NextResponse } from "next/server";
import { updateOrder, UpdateOrderInput } from "@/lib/shopify-admin";

// PUT /api/shopify/orders/[id] - Cập nhật đơn hàng trong Shopify
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const orderData: UpdateOrderInput = {
      financial_status: body.financial_status,
      fulfillment_status: body.fulfillment_status,
      note: body.note,
    };

    const data = await updateOrder(id, orderData);

    return NextResponse.json(
      {
        order: data.order,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error updating Shopify order:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update order in Shopify";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

