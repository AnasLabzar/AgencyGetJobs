import { NextResponse } from "next/server";
import { getJobById, getProfile } from "@/lib/db";
import { generateCoverLetter, tailorCV } from "@/agents/writer-agent";
import { sendApplicationEmail } from "@/agents/orchestrator";
import { query } from "@/db/index";
import { loadStore, saveStore } from "@/db/local-db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { offerId, action, language = "FR", customSubject, customBody, customEmail, variant = "A" } = body;

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
        name: String(job.rh_contact_name || "Recruteur"),
        email: customEmail || (typeof job.rh_contact_email === "string" ? job.rh_contact_email : ""),
        linkedin_profile: typeof job.rh_contact_linkedin === "string" ? job.rh_contact_linkedin : undefined,
        is_verified: !!(customEmail || (typeof job.rh_contact_email === "string" && !job.rh_contact_email.includes("careers@") && !job.rh_contact_email.includes("tech.com"))),
        channel_recommended: job.rh_contact_email ? "EMAIL" : "DIRECT_URL"
      },
      tech_stack_required: Array.isArray(job.tech_stack) ? job.tech_stack : [],
      match_score: Number(job.match_score) || 0,
      status: job.status,
      created_at: job.created_at
    };

    // ACTION: PREVIEW (Return tailored letter and subject for HITL modal)
    if (action === "preview") {
      const letter = generateCoverLetter(offerIntel, defaultProfile, language);
      const subject = language === "FR"
        ? `Candidature - ${offerIntel.job_title} - Anas Labzar`
        : `Application - ${offerIntel.job_title} - Anas Labzar`;

      return NextResponse.json({
        success: true,
        preview: {
          offerId: offerIntel.offer_id,
          companyName: offerIntel.company_name,
          jobTitle: offerIntel.job_title,
          recruiterEmail: offerIntel.rh_contact.email,
          recruiterName: offerIntel.rh_contact.name,
          isVerified: offerIntel.rh_contact.is_verified,
          channelRecommended: offerIntel.rh_contact.channel_recommended,
          sourceUrl: offerIntel.source_url,
          subject,
          emailBody: letter.emailBody,
          coverLetter: letter.coverLetter,
          antiAiScore: letter.antiAiScore,
          language
        }
      });
    }

    // ACTION: SEND (Approve & Send via Gmail SMTP with PDF attached)
    if (action === "send") {
      const destinationEmail = customEmail || offerIntel.rh_contact.email;
      if (!destinationEmail) {
        return NextResponse.json({
          success: false,
          error: "Aucune adresse email RH renseignée pour cette offre. Veuillez renseigner une adresse email ou postuler directement via le lien officiel."
        }, { status: 400 });
      }

      const emailResult = await sendApplicationEmail(
        offerIntel,
        defaultProfile,
        language,
        variant,
        customSubject,
        customBody,
        destinationEmail
      );

      if (!emailResult.success) {
        return NextResponse.json({
          success: false,
          error: emailResult.error || "Échec de l'envoi de l'email"
        }, { status: 500 });
      }

      // Record application in DB / Store
      const store = loadStore();
      const existingAppIndex = store.applications.findIndex((a) => a.offer_id === offerIntel.offer_id);
      const appRecord = {
        id: existingAppIndex >= 0 ? store.applications[existingAppIndex].id : store.applications.length + 1,
        offer_id: offerIntel.offer_id,
        company_name: offerIntel.company_name,
        job_title: offerIntel.job_title,
        cv_path: language === "EN" ? defaultProfile.cv_templates.en_pdf : defaultProfile.cv_templates.fr_pdf,
        cover_letter: customBody || emailResult.emailBody,
        email_subject: customSubject || emailResult.subject,
        email_body: customBody || emailResult.emailBody,
        email_sent: true,
        email_sent_at: new Date().toISOString(),
        email_status: "sent",
        response_received: false,
        response_date: null,
        interview_scheduled: false,
        match_score: offerIntel.match_score,
        ab_variant: variant,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingAppIndex >= 0) {
        store.applications[existingAppIndex] = appRecord;
      } else {
        store.applications.unshift(appRecord);
      }

      // Also log email
      store.email_logs.unshift({
        id: store.email_logs.length + 1,
        application_id: appRecord.id,
        recipient_email: offerIntel.rh_contact.email,
        recipient_name: offerIntel.rh_contact.name,
        subject: customSubject || emailResult.subject,
        status: "sent",
        error_message: null,
        sent_at: new Date().toISOString()
      });

      // Update offer status to APPROVED
      const offerIdx = store.job_offers.findIndex((j) => j.offer_id === offerIntel.offer_id);
      if (offerIdx >= 0) {
        store.job_offers[offerIdx].status = "APPROVED";
      }

      saveStore(store);

      return NextResponse.json({
        success: true,
        message: `Candidature envoyée avec succès à ${offerIntel.rh_contact.email} avec le CV PDF joint.`,
        application: appRecord
      });
    }

    return NextResponse.json({ success: false, error: "Action non reconnue" }, { status: 400 });
  } catch (err: any) {
    console.error("[API /jobs/apply] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

