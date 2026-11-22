import { NextResponse } from "next/server";
import { getDedupStats } from "@/services/email-dedup";

export async function GET() {
  try {
    const stats = await getDedupStats();
    return NextResponse.json({ success: true, ...stats });
  } catch (error: any) {
    return NextResponse.json(
      { success: true, totalCompaniesContacted: 0, totalOffersEmailed: 0, blockedDuplicates: 0 },
      { status: 200 }
    );
  }
}
