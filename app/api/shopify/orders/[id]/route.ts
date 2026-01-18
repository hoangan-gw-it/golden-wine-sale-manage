import { NextRequest, NextResponse } from "next/server";
import { updateOrder as updateOrderShopify, UpdateOrderInput } from "@/lib/shopify-admin";
import { updateOrder as updateOrderFirebase, getOrderById } from "@/lib/firebase/orders";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      console.warn(
        "Failed to update Shopify order (may not exist):",
        shopifyError
      );
    }

    // If status is being updated to "paid", send invoice email to admin
    if (orderData.financial_status === "paid") {
      try {
        // Get order details
        const orderDetails = await getOrderById(id);
        if (orderDetails && !orderDetails.error) {
          // Send invoice email to admin in background (don't wait for it)
          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL ||
            (process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : "http://localhost:3000");
          fetch(`${baseUrl}/api/orders/${id}/send-invoice`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderData: orderDetails,
            }),
          }).catch((emailError) => {
            console.error("Failed to send invoice email to admin:", emailError);
            // Don't fail the request if email fails
          });
        }
      } catch (emailError) {
        console.error("Error sending invoice email to admin:", emailError);
        // Don't fail the request if email fails
      }
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

