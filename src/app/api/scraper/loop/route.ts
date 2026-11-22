import { NextRequest, NextResponse } from "next/server";
import { 
  startAutonomous30sLoop, 
  stopAutonomous30sLoop, 
  get30sLoopStatus, 
  runAutonomousCycle 
} from "@/agents/orchestrator";

export async function GET() {
  try {
    const status = get30sLoopStatus();
    return NextResponse.json({
      success: true,
      loop: status
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "status";

    if (action === "start") {
      const loop = await startAutonomous30sLoop();
      return NextResponse.json({
        success: true,
        message: "Boucle autonome 30s démarrée (Focus Marrakech & Casablanca)",
        loop
      });
    } else if (action === "stop") {
      const loop = stopAutonomous30sLoop();
      return NextResponse.json({
        success: true,
        message: "Boucle autonome 30s arrêtée",
        loop
      });
    } else if (action === "cycle_now") {
      // Lance un cycle unique immédiat
      const cycleStats = await runAutonomousCycle();
      const loop = get30sLoopStatus();
      return NextResponse.json({
        success: true,
        message: "Cycle immédiat exécuté avec succès",
        stats: cycleStats,
        loop
      });
    } else {
      const loop = get30sLoopStatus();
      return NextResponse.json({
        success: true,
        loop
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
