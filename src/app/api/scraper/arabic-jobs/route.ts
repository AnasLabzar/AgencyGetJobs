import { NextRequest, NextResponse } from "next/server";
import { JobOfferIntel } from "@/types/schemas";

/**
 * API endpoint spécialisé pour les offres arabes
 * Focus: Marrakech & Casablanca, filtres 30% off
 * GET /api/scraper/arabic-jobs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = (searchParams.get("city") || "").toLowerCase().trim();
    const discountOnly = searchParams.get("discount") === "true";
    const techOnly = searchParams.get("tech") === "true";
    const minScore = parseInt(searchParams.get("minScore") || "50", 10);

    console.log(`[API ARABIC-JOBS] Requête filtrée - Ville: ${city}, Discount: ${discountOnly}, Tech: ${techOnly}`);

    // Simuler les offres arabes pour Marrakech et Casablanca
    const arabicOffers: JobOfferIntel[] = [
      {
        offer_id: "arabic_marrakech_001",
        source_url: "https://jobs.maroc-30off.ma/marrakech/react-dev",
        company_name: "Tech Solutions Maroc",
        job_title: "ويب مطور متكامل - خصم 30% خاص | Web Developer Full Stack - 30% Off Special",
        location: "Marrakech, Maroc",
        rh_contact: {
          name: "فريق التوظيف - مركز مدراس",
          email: "recrutement@tech-solutions.ma",
          is_verified: true,
          channel_recommended: "EMAIL"
        },
        tech_stack_required: ["React", "Node.js", "TypeScript", "Next.js", "PostgreSQL"],
        match_score: 92,
        status: "APPROVED",
        created_at: new Date().toISOString()
      },
      {
        offer_id: "arabic_casablanca_001",
        source_url: "https://casablanca.30off.jobs/senior-dev",
        company_name: "Orange Business Morocco",
        job_title: "مطور سينير أكاديمي - باقة 30% مميزة | Senior Developer - 30% Off Package",
        location: "Casablanca, Maroc",
        rh_contact: {
          name: "الفريق الاحتياطي - أورينج",
          email: "recrutement.obs@orange.com",
          is_verified: true,
          channel_recommended: "EMAIL"
        },
        tech_stack_required: ["Java", "Spring Boot", "Microservices", "AWS", "Docker"],
        match_score: 88,
        status: "APPROVED",
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        offer_id: "arabic_marrakech_002",
        source_url: "https://marrakech.jobs.dev/fullstack",
        company_name: "SQLI Maroc",
        job_title: "مطور فرنسط متكامل - عرض 30% خصم | Full Stack Developer - 30% Off Offer",
        location: "Marrakech, Maroc",
        rh_contact: {
          name: "الموارد البشرية - SQLI",
          email: "recrutement-maroc@sqli.com",
          is_verified: true,
          channel_recommended: "EMAIL"
        },
        tech_stack_required: ["Next.js", "React", "Node.js", "TypeScript", "GraphQL"],
        match_score: 95,
        status: "APPROVED",
        created_at: new Date(Date.now() - 7200000).toISOString()
      },
      {
        offer_id: "arabic_casablanca_002",
        source_url: "https://casablanca.jobs.capgemini/devops",
        company_name: "Capgemini Engineering",
        job_title: "مهندس DevOps - باقة تشمل خصم 30% | DevOps Engineer - 30% Off Package",
        location: "Casablanca, Maroc",
        rh_contact: {
          name: "فريق التوظيف - كابجميني",
          email: "recrutement.maroc@capgemini.com",
          is_verified: true,
          channel_recommended: "EMAIL"
        },
        tech_stack_required: ["Azure", "Kubernetes", "CI/CD", "Docker", "Terraform"],
        match_score: 87,
        status: "APPROVED",
        created_at: new Date(Date.now() - 10800000).toISOString()
      }
    ];

    // Appliquer les filtres
    let filteredOffers = arabicOffers;

    // Filtre par ville
    if (city === "marrakech") {
      filteredOffers = filteredOffers.filter(o =>
        (o.location || "").toLowerCase().includes("marrakech")
      );
    } else if (city === "casablanca") {
      filteredOffers = filteredOffers.filter(o =>
        (o.location || "").toLowerCase().includes("casablanca")
      );
    }

    // Filtre 30% off
    const discountPattern = /30\s*%?\s*(off|réduction|خصم)/i;
    if (discountOnly) {
      filteredOffers = filteredOffers.filter(o =>
        discountPattern.test(o.job_title + o.company_name)
      );
    }

    // Filtre tech
    const techKeywords = ["react", "node.js", "typescript", "next.js", "java", "docker", "kubernetes", "devops", "aws", "azure"];
    if (techOnly) {
      filteredOffers = filteredOffers.filter(o =>
        o.tech_stack_required.some(tech =>
          techKeywords.some(kw => tech.toLowerCase().includes(kw))
        )
      );
    }

    // Filtre par score minimum
    filteredOffers = filteredOffers.filter(o => o.match_score >= minScore);

    // Trier par score décroissant
    filteredOffers.sort((a, b) => b.match_score - a.match_score);

    return NextResponse.json({
      success: true,
      count: filteredOffers.length,
      totalFound: arabicOffers.length,
      filters: {
        city: city || "all",
        discountOnly: discountOnly || false,
        techOnly: techOnly || false,
        minScore
      },
      jobs: filteredOffers,
      metadata: {
        platforms: ["bonjaune.ma", "carriere-arabe.com", "ajrum.com", "maroctravail.com"],
        focusAreas: ["Marrakech", "Casablanca"],
        hasDiscountDetection: true
      }
    });

  } catch (error: any) {
    console.error("[API ARABIC-JOBS] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message, jobs: [] },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint pour déclencher un scraping 30% off
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = (body.action || "scrape") as string;

    if (action === "scrape_discounted") {
      // Scraping des offres 30% off
      const { scrapeDiscountedOffers } = await import("@/agents/arabic-scraper");
      const jobs = await scrapeDiscountedOffers(body.minDiscountPercent || 30);

      return NextResponse.json({
        success: true,
        action: "scrape_discounted",
        count: jobs.length,
        jobs: jobs,
        message: `Scraping 30% OFF terminé - ${jobs.length} offres trouvées`
      });
    }

    if (action === "scrape_marrakech" || action === "scrape_casablanca") {
      const { scrapeMarrakechCasablancaOffers } = await import("@/agents/arabic-scraper");
      const location = action === "scrape_marrakech" ? "Marrakech" : "Casablanca";
      const jobs = await scrapeMarrakechCasablancaOffers(true, true);

      const filtered = jobs.filter((j: JobOfferIntel) =>
        (j.location || "").toLowerCase().includes(location.toLowerCase())
      );

      return NextResponse.json({
        success: true,
        action,
        location,
        count: filtered.length,
        jobs: filtered,
        message: `Scraping ${location} terminé - ${filtered.length} offres trouvées`
      });
    }

    return NextResponse.json({
      success: true,
      message: "Action prise en compte",
      availableActions: ["scrape_discounted", "scrape_marrakech", "scrape_casablanca"]
    });

  } catch (error: any) {
    console.error("[API ARABIC-JOBS POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}