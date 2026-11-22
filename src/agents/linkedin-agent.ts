import puppeteer from "puppeteer";
import { JobOfferIntel, UserMasterProfile } from "../types/schemas";
import { saveLinkedInOutreach } from "../lib/db";

export interface LinkedInOutreachResult {
  success: boolean;
  recruiterName: string;
  recruiterProfileUrl?: string;
  connectionNote: string;
  inMailMessage: string;
  status: "SENT" | "QUEUED" | "DRY_RUN" | "SKIPPED";
  error?: string;
  sentAt: string;
}

/**
 * Generates a concise LinkedIn connection request note (< 300 chars limit).
 */
export function generateLinkedInConnectionNote(
  offer: JobOfferIntel,
  profile: UserMasterProfile
): string {
  const rhFirstName = (offer.rh_contact.name || "").split(" ")[0] || "Bonjour";
  const primarySkill = offer.tech_stack_required[0] || "Full-Stack";

  // Strict LinkedIn 300-char note template
  let note = `Bonjour ${rhFirstName}, j'ai découvert avec grand intérêt l'opportunité ${offer.job_title} chez ${offer.company_name}. Spécialisé en ${primarySkill} et Next.js (4 ans d'exp.), je serais ravi d'échanger sur vos projets actuels. Anas Labzar.`;

  if (note.length > 295) {
    note = `Bonjour ${rhFirstName}, intéressé par le poste ${offer.job_title} chez ${offer.company_name}. Profil Full-Stack (Next.js, ${primarySkill}), ravi d'échanger avec vous ! Anas Labzar.`;
  }

  return note;
}

/**
 * Generates a full LinkedIn Direct / InMail message.
 */
export function generateLinkedInInMail(
  offer: JobOfferIntel,
  profile: UserMasterProfile
): string {
  const rhName = offer.rh_contact.name || "Bonjour";
  const techStack = offer.tech_stack_required.slice(0, 3).join(", ") || "Next.js, Node.js";

  return `Bonjour ${rhName},

J'espère que vous allez bien.

Je me permets de vous contacter suite à la publication du poste de ${offer.job_title} chez ${offer.company_name}.

Développeur Full-Stack avec 4 ans d'expérience, j'ai piloté la conception de plateformes performantes et de systèmes automatisés (${techStack}). Votre positionnement et les enjeux techniques de ${offer.company_name} font particulièrement écho à mes récentes réalisations.

Seriez-vous ouvert à un court échange informel de 10 minutes cette semaine afin de faire connaissance et d'évoquer comment je pourrais apporter une valeur immédiate à votre équipe ?

Bien cordialement,
${profile.full_name}
Portfolio / Profil : https://linkedin.com/in/anas-labzar`.trim();
}

/**
 * Executes or queues LinkedIn Outreach.
 */
export async function executeLinkedInOutreach(
  offer: JobOfferIntel,
  profile: UserMasterProfile,
  dryRun: boolean = true
): Promise<LinkedInOutreachResult> {
  const note = generateLinkedInConnectionNote(offer, profile);
  const inMail = generateLinkedInInMail(offer, profile);
  const recruiterUrl = offer.rh_contact.linkedin_profile || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(offer.company_name + " recruteur")}`;

  const result: LinkedInOutreachResult = {
    success: true,
    recruiterName: offer.rh_contact.name || "Recruteur " + offer.company_name,
    recruiterProfileUrl: recruiterUrl,
    connectionNote: note,
    inMailMessage: inMail,
    status: dryRun ? "DRY_RUN" : "QUEUED",
    sentAt: new Date().toISOString()
  };

  // If live run without credentials, queue safely
  if (!dryRun) {
    console.log(`[LINKEDIN] Outreach queued for ${offer.rh_contact.name} (${offer.company_name})`);
    result.status = "QUEUED";
  } else {
    console.log(`[LINKEDIN] Dry-run note generated (${note.length}/300 chars): "${note}"`);
  }

  // Persist outreach log
  await saveLinkedInOutreach({
    offer_id: offer.offer_id,
    company_name: offer.company_name,
    recruiter_name: offer.rh_contact.name,
    linkedin_profile: recruiterUrl,
    connection_note: note,
    inmail_message: inMail,
    status: result.status,
    sent_at: result.sentAt
  });

  return result;
}

