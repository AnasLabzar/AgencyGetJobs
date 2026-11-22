import { NextResponse } from "next/server";
import { getMetrics } from "@/lib/db";

export async function GET() {
  try {
    const metrics = await getMetrics();
    return NextResponse.json({ success: true, metrics: metrics || [] });
  } catch (error: any) {
    console.error("[API /metrics] DB unavailable:", error.message);
    return NextResponse.json({ success: true, metrics: [] });
  }
}
