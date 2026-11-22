import { NextResponse } from "next/server";
import { getApplications, getApplicationById } from "@/lib/db";

export async function GET() {
  try {
    const apps = await getApplications();
    return NextResponse.json({ success: true, applications: apps || [] });
  } catch (error: any) {
    console.error("[API /applications] DB unavailable:", error.message);
    return NextResponse.json({ success: true, applications: [] });
  }
}
