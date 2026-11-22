import { NextResponse } from "next/server";
import { getAgentConfig, updateAgentConfig } from "@/lib/db";

export async function GET() {
  try {
    const config = await getAgentConfig();
    return NextResponse.json({ success: true, config: config || [] });
  } catch (error: any) {
    console.error("[API /config] DB unavailable:", error.message);
    return NextResponse.json({
      success: true,
      config: [
        { config_key: "autonomous_mode", config_value: "true" },
        { config_key: "match_score_threshold", config_value: "75" },
        { config_key: "max_applications_per_day", config_value: "20" },
        { config_key: "scraping_interval_minutes", config_value: "60" },
      ],
    });
  }
}

export async function POST(request: Request) {
  try {
    const { key, value } = await request.json();
    await updateAgentConfig(key, value);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
