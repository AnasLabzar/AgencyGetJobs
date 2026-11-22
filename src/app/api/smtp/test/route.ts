import { NextResponse } from "next/server";
import { verifySMTP } from "@/services/email";

export async function POST() {
  try {
    const result = await verifySMTP();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

