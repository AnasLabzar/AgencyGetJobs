import { NextRequest, NextResponse } from "next/server";
import { getJobs } from "@/lib/db";

// Patterns pour détecter les offres 30% off
const DISCOUNT_PATTERNS = [
  /30\s*%?\s*(off|réduction|rabais|خصم)/i,
  /30\s*off/i,
  /خصم\s*30/i,
  /30%\s*sold/i
];

function hasDiscount30Off(text: string): boolean {
  return DISCOUNT_PATTERNS.some(pattern => pattern.test(text));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationParam = (searchParams.get("location") || "").toLowerCase().trim();
    const discountParam = searchParams.get("discount") === "true";
    const arabicParam = searchParams.get("arabic") === "true";
    const techParam = searchParams.get("tech") === "true";
    const minScore = parseInt(searchParams.get("minScore") || "0", 10);

    let jobs = await getJobs();

    // Tri garanti par fraîcheur (annonces les plus récentes d'abord)
    jobs.sort((a: any, b: any) => {
      const timeA = new Date(a.created_at || a.posted_date || 0).getTime();
      const timeB = new Date(b.created_at || b.posted_date || 0).getTime();
      return timeB - timeA;
    });

    // Filtre optionnel par ville
    if (locationParam && locationParam !== "all") {
      if (locationParam === "marrakech_casablanca" || locationParam === "arabic") {
        jobs = jobs.filter((j: any) => {
          const loc = (j.location || "").toLowerCase();
          return loc.includes("marrakech") || loc.includes("casablanca");
        });
      } else {
        jobs = jobs.filter((j: any) => {
          const loc = (j.location || "").toLowerCase();
          return loc.includes(locationParam);
        });
      }
    }

    // Filtre 30% off
    if (discountParam) {
      jobs = jobs.filter((j: any) => {
        const title = j.job_title || "";
        const company = j.company_name || "";
        return hasDiscount30Off(title + " " + company);
      });
    }

    // Filtre tech
    if (techParam) {
      const techKeywords = ["react", "node.js", "typescript", "next.js", "vue.js", "angular",
                           "java", "python", "docker", "kubernetes", "devops", "aws", "azure"];
      jobs = jobs.filter((j: any) => {
        const allText = `${j.job_title || ""} ${j.company_name || ""} ${j.tech_stack || ""}`.toLowerCase();
        return techKeywords.some(kw => allText.includes(kw));
      });
    }

    // Filtre score minimum
    if (minScore > 0) {
      jobs = jobs.filter((j: any) => {
        const score = parseInt(j.match_score || "0", 10);
        return score >= minScore;
      });
    }

    return NextResponse.json({
      success: true,
      count: jobs.length,
      jobs: jobs || [],
      filters: {
        location: locationParam,
        discount: discountParam,
        arabic: arabicParam,
        tech: techParam,
        minScore
      }
    });
  } catch (error: any) {
    console.error("[API /jobs] DB unavailable:", error.message);
    return NextResponse.json({ success: true, count: 0, jobs: [] });
  }
}
