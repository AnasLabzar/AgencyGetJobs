import { NextResponse } from "next/server";
import { quotaManager, PROVIDER_CONFIGS } from "@/services/llm-provider";

export async function GET() {
  try {
    const status = quotaManager.getStatus();
    return NextResponse.json({ success: true, providers: status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
