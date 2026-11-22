import { NextResponse } from "next/server";
import { getAgentConfig, updateAgentConfig, getProfile, updateUserProfile } from "@/lib/db";
import { loadStore } from "@/db/local-db";

export async function GET() {
  try {
    const config = await getAgentConfig();
    const profile = await getProfile();
    const store = loadStore();

    // Default configuration keys ensure clean fallback
    const configMap: Record<string, string> = {
      autonomous_mode: "false",
      match_score_threshold: "75",
      max_applications_per_day: "20",
      scraping_interval_seconds: "30",
      warmup_enabled: "true",
      ab_testing_enabled: "true",
      anti_ai_protocol: "true",
      hitl_approval_mode: "true",
      preferred_cv_language: "AUTO",
      target_locations: "Marrakech, Casablanca, Maroc, Remote",
      target_roles: "Full-Stack Engineer, Web Developer, AI Automation Engineer, Project Manager",
      ...(store.agent_config || {})
    };

    const formattedConfig = Object.entries(configMap).map(([config_key, config_value]) => ({
      config_key,
      config_value
    }));

    return NextResponse.json({
      success: true,
      config: formattedConfig,
      configMap,
      profile: profile || store.user_profiles?.[0] || {
        profile_id: "user_master",
        full_name: "Utilisateur",
        title: "Développeur Full-Stack & Automatisation IA",
        email: "",
        phone: "",
        linkedin_url: "",
        languages: ["FR", "EN"],
        core_competencies: ["Next.js", "React", "TypeScript", "Node.js", "PostgreSQL"],
        experience_years: 4,
        bio: "Développeur passionné par la conception d'architectures web et l'automatisation par agents IA."
      }
    });
  } catch (error: any) {
    console.error("[API /config GET] Error:", error.message);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Single config key-value update
    if (body.key && body.value !== undefined) {
      await updateAgentConfig(body.key, String(body.value));
    }

    // 2. Batch config updates
    if (body.config && typeof body.config === "object") {
      for (const [k, v] of Object.entries(body.config)) {
        await updateAgentConfig(k, String(v));
      }
    }

    // 3. User Profile update
    let updatedProfile = null;
    if (body.profile && typeof body.profile === "object") {
      updatedProfile = await updateUserProfile(body.profile);
    }

    return NextResponse.json({
      success: true,
      message: "Paramètres enregistrés avec succès",
      profile: updatedProfile
    });
  } catch (error: any) {
    console.error("[API /config POST] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
