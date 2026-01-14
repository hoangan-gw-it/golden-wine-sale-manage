import { NextRequest, NextResponse } from "next/server";
import { getCustomerById, updateCustomer } from "@/lib/shopify-admin";

// GET /api/shopify/customers/[id] - Lấy thông tin khách hàng
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

    const data = await getCustomerById(id);

    return NextResponse.json(
      {
        customer: data.customer,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error fetching Shopify customer:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch customer from Shopify";

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

    const data = await updateCustomer(id, body);

    return NextResponse.json(
      {
        customer: data.customer,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error updating Shopify customer:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update customer in Shopify";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

