import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/db";

export async function GET() {
  try {
    const stats = await getDashboardStats();
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error("[API /stats] DB unavailable:", error.message);
    return NextResponse.json({
      success: true,
      stats: {
        totalJobs: 0,
        totalApplications: 0,
        emailsSent: 0,
        responsesReceived: 0,
        averageMatchScore: "0",
      },
    });
  }
}
