import { NextRequest, NextResponse } from "next/server";
import { searchCustomers } from "@/lib/shopify-admin";

// GET /api/shopify/customers/search?q=query - Tìm kiếm khách hàng
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

    const data = await searchCustomers(query);

    return NextResponse.json(
      {
        customers: data.customers || [],
        total: data.customers?.length || 0,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error searching Shopify customers:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to search customers from Shopify";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

