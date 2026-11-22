import { NextRequest, NextResponse } from "next/server";
import {
  scrapeMarrakechCasablancaOffers,
  scrapeDiscountedOffers,
  hasDiscount30Off,
  getArabicScrapingStats
} from "@/agents/arabic-scraper";
import { JobOfferIntel } from "@/types/schemas";

/**
 * API endpoint pour le scraping arabe
 * Focus: Marrakech & Casablanca, offres "30% off"
 * GET /api/scraper/arabic
 * POST /api/scraper/arabic (action: scrape, discounted, interviews)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = (searchParams.get("location") || "marrakech,casablanca").toLowerCase();
    const includeDiscounted = searchParams.get("discounted") !== "false";
    const includeInterviews = searchParams.get("interviews") !== "false";
    const minDiscountPercent = parseInt(searchParams.get("minDiscount") || "30", 10);

    console.log(`[API ARABIC] GET /api/scraper/arabic`);
    console.log(`[API ARABIC] Location: ${location}`);
    console.log(`[API ARABIC] Include discounted: ${includeDiscounted}`);
    console.log(`[API ARABIC] Include interviews: ${includeInterviews}`);

    // Scraper les offres
    const jobs = await scrapeMarrakechCasablancaOffers(includeDiscounted, includeInterviews);

    // Filtrer par localisation si spécifiée
    let filteredJobs = jobs;
    if (location && location !== "all") {
      filteredJobs = jobs.filter((job: JobOfferIntel) => {
        const loc = (job.location || "").toLowerCase();
        if (location === "marrakech") return loc.includes("marrakech");
        if (location === "casablanca") return loc.includes("casablanca");
        return loc.includes(location);
      });
    }

    // Calculer les statistiques
    const discountOffers = filteredJobs.filter((job: JobOfferIntel) =>
      hasDiscount30Off(job.job_title + job.company_name)
    );

    return NextResponse.json({
      success: true,
      count: filteredJobs.length,
      jobs: filteredJobs,
      stats: {
        totalJobs: filteredJobs.length,
        discountOffers: discountOffers.length,
        locations: location.split(",").join("/"),
        platformsScanned: 4,
        focusPoints: {
          "30% off detection": discountOffers.length,
          "Marrakech/Casablanca filter": location.includes("marrakech") || location.includes("casablanca")
        }
      }
    });
  } catch (error: any) {
    console.error("[API ARABIC] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message, jobs: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = (body.action || "scrape") as string;

    let jobs: JobOfferIntel[] = [];
    let message = "";

    if (action === "scrape") {
      // Scraping standard avec filtres
      const includeDiscounted = body.discounted !== false;
      const includeInterviews = body.interviews !== false;
      jobs = await scrapeMarrakechCasablancaOffers(includeDiscounted, includeInterviews);
      message = `Scraping ARABIC terminé - ${jobs.length} offres trouvées`;

    } else if (action === "discounted") {
      // Scraping uniquement les offres 30% off
      jobs = await scrapeDiscountedOffers(body.minDiscountPercent || 30);
      message = `Scraping 30% OFF terminé - ${jobs.length} offres avec réduction trouvées`;

    } else if (action === "interviews") {
      // Scraping les opportunités d'entretien
      const { scrapeInterviewOpportunities } = await import("@/agents/arabic-scraper");
      jobs = await scrapeInterviewOpportunities(body.industry || "tech");
      message = `Scraping entretiens terminé - ${jobs.length} opportunités trouvées`;

    } else if (action === "stats") {
      // Obtenir les statistiques
      const stats = getArabicScrapingStats();
      return NextResponse.json({
        success: true,
        stats,
        message: "Statistiques du scraping arabe"
      });
    } else {
      message = `Action inconnue: ${action}`;
    }

    // Filtrer par localisation si demandé
    if (body.location) {
      const loc = body.location.toLowerCase();
      jobs = jobs.filter((job: JobOfferIntel) => {
        const jLocation = (job.location || "").toLowerCase();
        if (loc === "marrakech") return jLocation.includes("marrakech");
        if (loc === "casablanca") return jLocation.includes("casablanca");
        return jLocation.includes(loc);
      });
    }

    // Trier par score décroissant
    jobs.sort((a: JobOfferIntel, b: JobOfferIntel) => b.match_score - a.match_score);

    return NextResponse.json({
      success: true,
      message,
      action,
      count: jobs.length,
      jobs: jobs.slice(0, 100) // Limiter à 100 pour performance
    });

  } catch (error: any) {
    console.error("[API ARABIC POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}