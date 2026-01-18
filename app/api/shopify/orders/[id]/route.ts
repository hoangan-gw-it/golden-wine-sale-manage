import { NextRequest, NextResponse } from "next/server";
import { updateOrder as updateOrderShopify, UpdateOrderInput } from "@/lib/shopify-admin";
import { updateOrder as updateOrderFirebase } from "@/lib/firebase/orders";

// PUT /api/shopify/orders/[id] - Cập nhật đơn hàng trong Shopify và Firebase
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

    // Update in Firebase first (since we're using Firebase for orders)
    const firebaseUpdates: any = {
      updatedAt: new Date(),
    };
    if (orderData.financial_status) {
      firebaseUpdates.financial_status = orderData.financial_status;
    }
    if (orderData.fulfillment_status) {
      firebaseUpdates.fulfillment_status = orderData.fulfillment_status;
    }
    if (orderData.note) {
      firebaseUpdates.note = orderData.note;
    }

    const firebaseResult = await updateOrderFirebase(id, firebaseUpdates);

    // Also try to update in Shopify if it exists (optional)
    let shopifyData = null;
    try {
      shopifyData = await updateOrderShopify(id, orderData);
    } catch (shopifyError) {
      // Ignore Shopify errors if order doesn't exist there
      console.warn("Failed to update Shopify order (may not exist):", shopifyError);
    }

    // Return Firebase order data
    return NextResponse.json(
      {
        order: {
          id: id,
          financial_status: firebaseUpdates.financial_status,
          fulfillment_status: firebaseUpdates.fulfillment_status,
          note: firebaseUpdates.note,
          ...(shopifyData?.order || {}),
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error updating order:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update order";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

