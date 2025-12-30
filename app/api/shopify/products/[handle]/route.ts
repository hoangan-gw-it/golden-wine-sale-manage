import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch, PRODUCT_BY_HANDLE_QUERY } from "@/lib/shopify";

// GET /api/shopify/products/[handle] - Lấy thông tin chi tiết sản phẩm theo handle
export async function GET(
  request: NextRequest,
  { params }: { params: { handle: string } }
) {
  try {
    const { handle } = params;

    if (!handle) {
      return NextResponse.json(
        { error: "Product handle is required" },
        { status: 400 }
      );
    }

    // Fetch product from Shopify
    const data = await shopifyFetch({
      query: PRODUCT_BY_HANDLE_QUERY,
      variables: {
        handle,
      },
    });

    if (!data.data.product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        product: data.data.product,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error fetching Shopify product:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch product from Shopify";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

