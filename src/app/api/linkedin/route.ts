import { NextResponse } from "next/server";
import { getLinkedInOutreach, getJobById } from "@/lib/db";
import { executeLinkedInOutreach } from "@/agents/linkedin-agent";

export async function GET() {
  try {
    const logs = await getLinkedInOutreach();
    return NextResponse.json({ success: true, outreach: logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { offerId, dryRun = true } = body;

    if (!offerId) {
      return NextResponse.json({ success: false, error: "offerId requis" }, { status: 400 });
    }

    const job = await getJobById(offerId);
    if (!job) {
      return NextResponse.json({ success: false, error: "Offre introuvable" }, { status: 404 });
    }

    const defaultProfile = {
      profile_id: "user_master",
      full_name: "Anas Labzar",
      languages: ["FR", "EN", "AR"],
      core_competencies: [
        "Full-Stack Development (Next.js, React, Node.js)",
        "Digital Marketing & Brand Strategy",
        "Multi-Agent AI Automation Systems",
        "Technical Project Management"
      ],
      experience_years: 4,
      cv_templates: {
        fr_pdf: "public/pdf/cv Anas Labzar - Fr (1).pdf",
        en_pdf: "public/pdf/CV EN CANADIEN _ ANAS LABZAR.pdf"
      }
    };

    const offerIntel: any = {
      offer_id: job.offer_id,
      source_url: job.source_url,
      company_name: job.company_name,
      job_title: job.job_title,
      location: job.location,
      rh_contact: {
        name: job.rh_contact_name || "Recruteur " + job.company_name,
        email: job.rh_contact_email || "",
        linkedin_profile: job.rh_contact_linkedin
      },
      tech_stack_required: Array.isArray(job.tech_stack) ? job.tech_stack : [],
      match_score: Number(job.match_score) || 80,
      status: job.status,
      created_at: job.created_at
    };

    const result = await executeLinkedInOutreach(offerIntel, defaultProfile, dryRun);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

