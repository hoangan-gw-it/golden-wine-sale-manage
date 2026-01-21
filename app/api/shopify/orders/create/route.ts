import { NextRequest, NextResponse } from "next/server";
import { createOrder as createOrderFirebase } from "@/lib/firebase/orders";

// POST /api/shopify/orders/create - Tạo đơn hàng trong Firebase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      line_items, 
      customer, 
      financial_status, 
      fulfillment_status, 
      note,
      discount_codes,
      payment_method,
      cash_received,
      created_by,
      created_by_name,
    } = body;

    // Validate required fields
    if (!line_items || line_items.length === 0) {
      return NextResponse.json(
        { error: "line_items is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Customer is optional now - can be empty or guest

    // Calculate totals
    let subtotal = 0;
    for (const item of line_items) {
      const price = parseFloat(item.price || "0");
      const quantity = parseInt(item.quantity || "0");
      subtotal += price * quantity;
    }

    // Apply discount if any
    let totalPrice = subtotal;
    if (discount_codes && discount_codes.length > 0) {
      for (const discount of discount_codes) {
        if (discount.type === "percentage") {
          const percentage = parseFloat(discount.amount.replace("%", ""));
          totalPrice = totalPrice * (1 - percentage / 100);
        } else if (discount.type === "fixed" || discount.type === "fixed_amount") {
          const amount = parseFloat(discount.amount || "0");
          totalPrice = Math.max(0, totalPrice - amount);
        }
      }
    }

    // Helper function to remove undefined values
    const removeUndefined = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return null;
      }
      if (Array.isArray(obj)) {
        return obj.map(removeUndefined).filter((item) => item !== undefined);
      }
      if (typeof obj === "object") {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            cleaned[key] = removeUndefined(value);
          }
        }
        return cleaned;
      }
      return obj;
    };

    // Prepare Firebase order data
    const firebaseOrderDataRaw: any = {
      customer_id: customer?.id?.toString() || "guest",
      line_items: line_items.map((item: any) => {
        // Extract product_id and variant_id
        let productId = "";
        let variantId = "";
        
        if (item.product_id) {
          productId = item.product_id.toString();
        } else if (item.variant_id) {
          variantId = item.variant_id.toString();
          // If only variant_id, use it as product_id reference
          productId = item.variant_id.toString();
        }

        const lineItem: any = {
          product_id: productId,
          quantity: parseInt(item.quantity || "0"),
          price: parseFloat(item.price || "0").toString(),
          title: item.title || "",
        };

        // Only add variant_id if it exists
        if (variantId) {
          lineItem.variant_id = variantId;
        }

        return lineItem;
      }),
      total_price: totalPrice.toString(),
      subtotal_price: subtotal.toString(),
      currency: "VND",
      financial_status: financial_status || "pending",
      note: note || "",
      payment_method: payment_method || undefined,
      cash_received:
        payment_method === "cash" && cash_received !== undefined
          ? cash_received?.toString()
          : undefined,
      created_by: created_by || "",
      created_by_name: created_by_name || "",
    };

    // Add discount_codes only if they exist
    if (discount_codes && discount_codes.length > 0) {
      firebaseOrderDataRaw.discount_codes = discount_codes.map((dc: any) => ({
        code: dc.code || "",
        amount: dc.amount || "0",
        type: (dc.type === "percentage" ? "percentage" : "fixed") as "percentage" | "fixed",
      }));
    }

    // Add fulfillment_status only if it exists
    if (fulfillment_status) {
      firebaseOrderDataRaw.fulfillment_status = fulfillment_status;
    }

    // Remove all undefined values
    const firebaseOrderData = removeUndefined(firebaseOrderDataRaw);

    // Create order in Firebase
    const firebaseResult = await createOrderFirebase(firebaseOrderData);

    if (firebaseResult.error) {
      console.error("Failed to create order in Firebase:", firebaseResult.error);
      return NextResponse.json(
        { error: `Failed to create order: ${firebaseResult.error}` },
        { status: 500 }
      );
    }

    if (!firebaseResult.id) {
      return NextResponse.json(
        { error: "Failed to create order: No ID returned" },
        { status: 500 }
      );
    }

    // Return order in similar format to Shopify for compatibility
    const orderResponse = {
      id: firebaseResult.id,
      order_number: firebaseResult.id, // Use Firebase ID as order number
      ...firebaseOrderData,
      customer: customer, // Include customer data in response
    };

    return NextResponse.json(
      {
        order: orderResponse,
        firebase_order_id: firebaseResult.id,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating order:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create order";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

