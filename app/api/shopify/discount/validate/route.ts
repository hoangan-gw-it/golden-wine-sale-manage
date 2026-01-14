import { NextRequest, NextResponse } from "next/server";
import { getDiscountCodeDetails } from "@/lib/shopify-admin";

// POST /api/shopify/discount/validate - Validate discount code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Discount code is required" },
        { status: 400 }
      );
    }

    const data = await getDiscountCodeDetails(code);

    return NextResponse.json(
      {
        valid: true,
        discount: data,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error validating discount code:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to validate discount code";

    return NextResponse.json(
      { valid: false, error: errorMessage },
      { status: 200 }
    );
  }
}

