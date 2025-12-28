import { NextRequest, NextResponse } from "next/server";
import { getDocuments, addDocument } from "@/lib/firebase/firestore";

// GET /api/example - Lấy tất cả items
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await getDocuments("items");
    
    if (error) {
      return NextResponse.json(
        { error: error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/example - Tạo item mới
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { id, error } = await addDocument("items", body);
    
    if (error) {
      return NextResponse.json(
        { error: error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ id, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}


