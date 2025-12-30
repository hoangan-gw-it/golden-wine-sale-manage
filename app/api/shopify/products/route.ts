import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch, PRODUCTS_QUERY } from "@/lib/shopify";

// GET /api/shopify/products - Lấy danh sách sản phẩm từ Shopify
export async function GET(request: NextRequest) {
  try {
    // Lấy query parameters
    const searchParams = request.nextUrl.searchParams;
    const first = parseInt(searchParams.get("first") || "10", 10);
    const after = searchParams.get("after") || undefined;

    // Validate first parameter
    if (first < 1 || first > 250) {
      return NextResponse.json(
        { error: "Parameter 'first' must be between 1 and 250" },
        { status: 400 }
      );
    }

    // Fetch products from Shopify
    const data = await shopifyFetch({
      query: PRODUCTS_QUERY,
      variables: {
        first,
        after: after || null,
      },
    });

    // Transform data to a more usable format
    const products = data.data.products.edges.map((edge: { node: unknown }) => edge.node);
    const pageInfo = data.data.products.pageInfo;

    return NextResponse.json(
      {
        products,
        pageInfo: {
          hasNextPage: pageInfo.hasNextPage,
          endCursor: pageInfo.endCursor,
        },
        total: products.length,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error fetching Shopify products:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch products from Shopify";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

