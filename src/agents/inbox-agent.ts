import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import dotenv from "dotenv";
import { loadStore, saveStore, RecruiterInboxMessage } from "../db/local-db";
import { sendEmail } from "../services/email";

dotenv.config();

export interface ScanResult {
  success: boolean;
  totalScanned: number;
  recruiterEmailsFound: number;
  interviewsCount: number;
  unreadCount: number;
  messages: RecruiterInboxMessage[];
  message?: string;
  error?: string;
}

// Patterns of automated / bulk / non-human senders to filter out
const SPAM_AND_BULK_SENDERS = [
  "newsletters-noreply@linkedin.com",
  "jobalert.indeed.com",
  "donotreply@jobalert.indeed.com",
  "jobrapidoalert.com",
  "alert@jobrapidoalert.com",
  "no-reply@n.dribbble.com",
  "contact@jsmastery.pro",
  "notifications@github.com",
  "support@github.com",
  "no-reply@accounts.google.com",
  "noreply@medium.com",
  "noreply@youtube.com",
  "billing@",
  "marketing@",
  "newsletter@",
  "promo@",
  "updates@",
  "digest@"
];

// Recruiter & Job Keywords (French & English)
const INTERVIEW_KEYWORDS = [
  "entretien", "visio", "rendez-vous", "disponibilité", "disponibilités",
  "échange téléphonique", "call téléphonique", "call", "meeting", "convocation",
  "suite à votre candidature", "nous aimerions échanger", "point d'échange",
  "interview", "schedule a call", "phone screen", "quick chat", "next steps"
];

const POSITIVE_INTEREST_KEYWORDS = [
  "profil intéressant", "votre parcours", "opportunité", "nous recrutons",
  "poste de développeur", "full stack", "impressionné par vos projets",
  "intéressé par votre profil", "talent acquisition", "lead developer",
  "great profile", "impressed by your background", "exciting opportunity"
];

const TECHNICAL_TEST_KEYWORDS = [
  "test technique", "coding test", "coding challenge", "hackerrank",
  "codility", "test en ligne", "exercice technique", "qcm technique",
  "technical assessment"
];

const INFO_REQUEST_KEYWORDS = [
  "prétentions salariales", "salaire souhaité", "tjm", "disponibilité pour démarrer",
  "date de disponibilité", "préavis", "mobilité", "salary expectations"
];

const REJECTION_KEYWORDS = [
  "ne pourrons pas donner suite", "autre candidature", "autres candidats",
  "profils plus en adéquation", "conservons vos coordonnées",
  "malheureusement", "unsuccessful", "unfortunately", "not moving forward",
  "pursuing other candidates"
];

/**
 * Creates an IMAP client connected to Gmail with user's App Password
 */
function createImapClient(): ImapFlow {
  const user = process.env.SMTP_USER || "";
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "").trim();

  return new ImapFlow({
    host: process.env.IMAP_HOST || "imap.gmail.com",
    port: parseInt(process.env.IMAP_PORT || "993", 10),
    secure: true,
    auth: { user, pass },
    logger: false
  });
}

/**
 * Determine whether a message comes from an automated marketing/bulk sender
 */
function isSpamOrBulk(fromAddress: string, subject: string): boolean {
  const lowerFrom = fromAddress.toLowerCase();
  const lowerSub = subject.toLowerCase();

  // Explicit bulk list
  if (SPAM_AND_BULK_SENDERS.some(spam => lowerFrom.includes(spam))) {
    return true;
  }

  // Generic no-reply patterns (unless it's an InMail message notification)
  if (lowerFrom.includes("no-reply") || lowerFrom.includes("noreply") || lowerFrom.includes("donotreply")) {
    const isHumanInMail = lowerSub.includes("message") || lowerSub.includes("inmail") || lowerSub.includes("candidature");
    if (!isHumanInMail) return true;
  }

  // Newsletter subjects
  if (lowerSub.startsWith("webinar:") || lowerSub.includes("weekly recap") || lowerSub.includes("newsletter") || lowerSub.includes("promo")) {
    return true;
  }

  return false;
}

/**
 * Analyze sentiment, category, urgency, and generate AI insights for a recruiter email
 */
function analyzeRecruiterEmail(
  subject: string,
  fromName: string,
  fromEmail: string,
  snippet: string,
  companyName: string
): {
  category: RecruiterInboxMessage["category"];
  importance_score: number;
  urgency_badge: RecruiterInboxMessage["urgency_badge"];
  summary: string;
  suggested_action: string;
  draft_reply: string;
} {
  const text = `${subject} ${snippet}`.toLowerCase();
  const lowerSub = subject.toLowerCase();

  // 0. Undeliverable / Postmaster Bounces
  if (lowerSub.includes("undeliverable") || fromEmail.toLowerCase().includes("postmaster")) {
    return {
      category: "REJECTION",
      importance_score: 2,
      urgency_badge: "INFO_ONLY",
      summary: `Avis de non-remise de votre message pour ${companyName} (adresse email invalide ou fermée).`,
      suggested_action: "Postuler directement via le lien de l'annonce ou rechercher le recruteur sur LinkedIn.",
      draft_reply: ""
    };
  }

  // 1. Application submission confirmations (LinkedIn, ATS)
  if (lowerSub.includes("votre candidature a été envoyée") || lowerSub.includes("votre candidature :")) {
    return {
      category: "GENERAL",
      importance_score: 6,
      urgency_badge: "INFO_ONLY",
      summary: `Confirmation de transmission de votre candidature pour ${companyName}. Votre dossier est en cours d'examen.`,
      suggested_action: "Conserver pour le suivi. Relance recommandée après 5 à 7 jours.",
      draft_reply: `Bonjour,\n\nJe confirme le bon envoi de ma candidature et reste à votre entière disposition pour tout échange complémentaire.\n\nBien cordialement,\nANAS LABZAR`
    };
  }

  // 2. Interview Invitation (Highest Priority - e.g. Emily Carter / YO HR Consultancy)
  if (INTERVIEW_KEYWORDS.some(kw => text.includes(kw)) || text.includes("next step") || text.includes("invite you")) {
    return {
      category: "INTERVIEW_INVITATION",
      importance_score: 10,
      urgency_badge: "URGENT_INTERVIEW",
      summary: `${fromName || "Le recruteur"} chez ${companyName} vous invite à l'étape suivante d'entretien pour échanger sur vos compétences.`,
      suggested_action: "Répondre sous 24h en proposant 2 à 3 créneaux horaires concrets pour la semaine en cours.",
      draft_reply: `Bonjour ${fromName || "l'équipe de recrutement"},\n\nJe vous remercie pour votre retour positif et votre invitation à échanger.\n\nCe serait avec grand plaisir. Je suis disponible cette semaine sur les créneaux suivants :\n- Jeudi entre 14h00 et 17h00\n- Vendredi entre 10h00 et 12h30 ou après 15h00\n\nN'hésitez pas à me confirmer le créneau qui vous convient le mieux ainsi que le lien (Google Meet / Teams) ou le numéro pour vous joindre.\n\nBien cordialement,\nANAS LABZAR\nDéveloppeur Full-Stack & Automatisation IA\nLinkedIn : https://linkedin.com/in/anas-labzar`
    };
  }

  // 3. Technical Test / Assessment
  if (TECHNICAL_TEST_KEYWORDS.some(kw => text.includes(kw))) {
    return {
      category: "TECHNICAL_TEST",
      importance_score: 9,
      urgency_badge: "ACTION_REQUIRED",
      summary: `${companyName} vous a transmis un test ou une évaluation technique à réaliser en ligne.`,
      suggested_action: "Bloquer 1h à 2h au calme pour réaliser le test dans le délai imparti (généralement 48h-72h).",
      draft_reply: `Bonjour ${fromName || "l'équipe de recrutement"},\n\nBien reçu, je vous remercie pour cette étape. Je vais réaliser le test technique attentivement d'ici demain soir et vous préviendrai dès que ce sera finalisé.\n\nBien cordialement,\nANAS LABZAR`
    };
  }

  // 4. Positive Interest / Recruiter Outreach
  if (POSITIVE_INTEREST_KEYWORDS.some(kw => text.includes(kw)) || lowerSub.startsWith("re:")) {
    return {
      category: "POSITIVE_INTEREST",
      importance_score: 8,
      urgency_badge: "ACTION_REQUIRED",
      summary: `${companyName} manifeste un intérêt clair pour votre profil et souhaite en savoir plus sur vos disponibilités.`,
      suggested_action: "Remercier chaleureusement et proposer un premier échange téléphonique informel de 15 minutes.",
      draft_reply: `Bonjour ${fromName || "l'équipe"},\n\nJe vous remercie pour votre message et l'intérêt porté à mon profil.\n\nFort de 4 ans d'expérience sur Next.js, Node.js et les architectures modernes, je serais ravi de découvrir plus en détail vos projets et les enjeux de ce poste.\n\nSeriez-vous disponible pour un court échange de 15 minutes par téléphone ou visio cette semaine ?\n\nBien cordialement,\nANAS LABZAR\nLinkedIn : https://linkedin.com/in/anas-labzar`
    };
  }

  // 5. Information Request
  if (INFO_REQUEST_KEYWORDS.some(kw => text.includes(kw))) {
    return {
      category: "INFORMATION_REQUEST",
      importance_score: 7,
      urgency_badge: "FOLLOW_UP_NEEDED",
      summary: `Le recruteur sollicite des précisions administratives (prétentions salariales, date de disponibilité ou mobilité).`,
      suggested_action: "Renseigner vos prétentions salariales et votre préavis/disponibilité immédiate.",
      draft_reply: `Bonjour ${fromName || "l'équipe"},\n\nJe vous remercie pour votre retour. Pour répondre à vos questions :\n- Disponibilité : Immédiate / Préavis d'un mois (négociable)\n- Prétentions salariales : Ouvert à la discussion selon l'organisation et le package proposé (fourchette de marché adaptée à 4 ans d'expérience)\n- Mobilité : Hybride ou Full-Remote\n\nRestant à votre disposition pour en discuter de vive voix.\n\nBien cordialement,\nANAS LABZAR`
    };
  }

  // 6. Rejection / Candidacy update
  if (REJECTION_KEYWORDS.some(kw => text.includes(kw)) || text.includes("did not align") || text.includes("not moving forward")) {
    return {
      category: "REJECTION",
      importance_score: 3,
      urgency_badge: "INFO_ONLY",
      summary: `${companyName} a fait le choix de poursuivre avec d'autres profils pour ce poste précis.`,
      suggested_action: "Archiver ou envoyer un court message courtois pour conserver un bon contact dans leur vivier.",
      draft_reply: `Bonjour ${fromName || "l'équipe"},\n\nJe vous remercie d'avoir pris le temps de me faire ce retour. Je vous souhaite une excellente continuation dans vos recrutements et reste ouvert pour de futures opportunités au sein de vos équipes.\n\nBien cordialement,\nANAS LABZAR`
    };
  }

  // 7. General Recruiter Inbound
  return {
    category: "GENERAL",
    importance_score: 6,
    urgency_badge: "FOLLOW_UP_NEEDED",
    summary: `Message en lien avec une opportunité de recrutement ou le suivi de votre candidature chez ${companyName}.`,
    suggested_action: "Prendre connaissance du contenu et répondre pour qualifier l'opportunité.",
    draft_reply: `Bonjour ${fromName || "l'équipe"},\n\nMerci pour votre prise de contact. Je serais ravi d'en savoir plus sur cette opportunité. Je me tiens à votre entière disposition pour un échange.\n\nBien cordialement,\nANAS LABZAR`
  };
}

/**
 * Extract company name from email or subject
 */
function extractCompanyFromEmail(fromAddress: string, fromName: string, subject: string): string {
  const store = loadStore();

  // 1. Direct mappings
  const lowerFrom = fromAddress.toLowerCase();
  if (lowerFrom.includes("yohrconsulting")) return "YO HR Consultancy";
  if (lowerFrom.includes("micro1")) return "micro1";
  if (lowerFrom.includes("babelgroup")) return "Babel";
  if (lowerFrom.includes("jobgether")) return "Jobgether";

  // 2. Regex from subject: "votre candidature a été envoyée à Toreagle" / "chez Hanalytica GmbH"
  const envoyeeMatch = subject.match(/(?:envoyée à|chez|at)\s+([A-Za-z0-9\s™®]+)/i);
  if (envoyeeMatch && envoyeeMatch[1]) {
    const rawComp = envoyeeMatch[1].trim();
    if (rawComp && rawComp.length < 35 && !rawComp.toLowerCase().includes("developpeur")) {
      return rawComp;
    }
  }

  // 3. Check against tracked companies in our DB
  for (const app of store.applications) {
    if (app.company_name && (subject.toLowerCase().includes(app.company_name.toLowerCase()) || fromName.toLowerCase().includes(app.company_name.toLowerCase()))) {
      return app.company_name;
    }
  }

  for (const job of store.job_offers) {
    if (job.company_name && (subject.toLowerCase().includes(job.company_name.toLowerCase()) || fromName.toLowerCase().includes(job.company_name.toLowerCase()))) {
      return job.company_name;
    }
  }

  // 4. Domain fallback
  const domain = fromAddress.split("@")[1] || "";
  const cleanDomain = domain.split(".")[0] || "";
  if (cleanDomain && !["gmail", "yahoo", "hotmail", "outlook", "linkedin", "workflow"].includes(cleanDomain)) {
    return cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
  }

  return fromName && !fromName.toLowerCase().includes("noreply") && !fromName.toLowerCase().includes("alert") ? fromName : "Entreprise Recruteur";
}

/**
 * Scan Gmail INBOX via IMAP and extract only real recruiter emails & responses
 */
export async function scanGmailInbox(options: { maxScan?: number; daysBack?: number } = {}): Promise<ScanResult> {
  const maxScan = options.maxScan || 80;
  const daysBack = options.daysBack || 30;

  const store = loadStore();
  const existingMap = new Map<string, RecruiterInboxMessage>();
  (store.inbox_messages || []).forEach(m => existingMap.set(m.id, m));

  const client = createImapClient();
  const foundMessages: RecruiterInboxMessage[] = [];
  let totalScanned = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    const totalInBox = (client.mailbox && typeof client.mailbox === "object" ? client.mailbox.exists : 0) || 0;
    if (totalInBox === 0) {
      lock.release();
      await client.logout();
      return {
        success: true,
        totalScanned: 0,
        recruiterEmailsFound: 0,
        interviewsCount: 0,
        unreadCount: 0,
        messages: store.inbox_messages || []
      };
    }

    // Sequence range for newest messages
    const startSeq = Math.max(1, totalInBox - maxScan + 1);
    const range = `${startSeq}:${totalInBox}`;

    // Fetch message headers & envelopes
    for await (const msg of client.fetch(range, { envelope: true, flags: true, internalDate: true, source: true })) {
      totalScanned++;

      const subject = msg.envelope?.subject || "Sans objet";
      const fromObj = msg.envelope?.from?.[0];
      const fromAddress = fromObj?.address || "";
      const fromName = fromObj?.name || "";
      const dateStr = msg.internalDate ? new Date(msg.internalDate).toISOString() : new Date().toISOString();
      const isUnread = !msg.flags || !msg.flags.has("\\Seen");

      // Filter out spam, newsletters, automated digests
      if (isSpamOrBulk(fromAddress, subject)) {
        continue;
      }

      // Check if it's recruitment-related
      const companyName = extractCompanyFromEmail(fromAddress, fromName, subject);
      const isReply = subject.toLowerCase().startsWith("re:") || subject.toLowerCase().startsWith("fwd:");
      const hasRecruitingKeywords = [
        ...INTERVIEW_KEYWORDS,
        ...POSITIVE_INTEREST_KEYWORDS,
        ...TECHNICAL_TEST_KEYWORDS,
        ...INFO_REQUEST_KEYWORDS,
        ...REJECTION_KEYWORDS,
        "candidature", "poste", "recrutement", "anas labzar", "developpeur"
      ].some(kw => subject.toLowerCase().includes(kw) || fromName.toLowerCase().includes(kw));

      const isKnownCompany = store.applications.some(a => 
        a.company_name.toLowerCase() === companyName.toLowerCase() ||
        (a.rh_contact_email && fromAddress.toLowerCase().includes(a.rh_contact_email.toLowerCase()))
      );

      // Only retain genuine recruiter communications
      if (!isReply && !hasRecruitingKeywords && !isKnownCompany) {
        continue;
      }

      // Parse message text content
      let textBody = "";
      try {
        if (msg.source) {
          const parsed = await simpleParser(msg.source);
          textBody = (parsed.text || parsed.html || "").trim();
        }
      } catch {
        textBody = subject;
      }

      const snippet = textBody.slice(0, 300).replace(/\s+/g, " ");
      const analysis = analyzeRecruiterEmail(subject, fromName, fromAddress, textBody, companyName);

      // Check matching application in DB
      const matchedApp = store.applications.find(a => 
        a.company_name.toLowerCase() === companyName.toLowerCase()
      );

      const messageId = `msg_${msg.uid || msg.seq}`;
      const existing = existingMap.get(messageId);

      const analyzedMsg: RecruiterInboxMessage = {
        id: messageId,
        uid: msg.uid || msg.seq,
        sender_name: fromName || "Recruteur",
        sender_email: fromAddress,
        company_name: companyName,
        subject,
        date: dateStr,
        is_unread: isUnread,
        category: analysis.category,
        importance_score: analysis.importance_score,
        urgency_badge: analysis.urgency_badge,
        summary: analysis.summary,
        body_snippet: snippet,
        full_body: textBody,
        suggested_action: analysis.suggested_action,
        draft_reply: analysis.draft_reply,
        matched_application_id: matchedApp?.id,
        is_replied: existing?.is_replied ?? false,
        replied_at: existing?.replied_at
      };

      foundMessages.push(analyzedMsg);
      existingMap.set(messageId, analyzedMsg);

      // Automatically sync with applications table!
      if (matchedApp) {
        matchedApp.response_received = true;
        matchedApp.response_date = dateStr;
        if (analyzedMsg.category === "INTERVIEW_INVITATION") {
          matchedApp.interview_scheduled = true;
        }
      }
    }

    lock.release();
    await client.logout();

    // Sort messages: Unread first, then by importance score descending, then by date
    const allMessages = Array.from(existingMap.values()).sort((a, b) => {
      if (a.is_unread !== b.is_unread) return a.is_unread ? -1 : 1;
      if (b.importance_score !== a.importance_score) return b.importance_score - a.importance_score;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Save into store
    store.inbox_messages = allMessages;
    saveStore(store);

    const interviewsCount = allMessages.filter(m => m.category === "INTERVIEW_INVITATION").length;
    const unreadCount = allMessages.filter(m => m.is_unread).length;

    return {
      success: true,
      totalScanned,
      recruiterEmailsFound: allMessages.length,
      interviewsCount,
      unreadCount,
      messages: allMessages,
      message: `Scan réussi : ${allMessages.length} échanges recruteurs identifiés (${interviewsCount} invitations d'entretien, ${unreadCount} non lus).`
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[INBOX_AGENT] Erreur lors du scan IMAP:", errorMsg);

    // Fallback: return existing stored messages
    const stored = store.inbox_messages || [];
    return {
      success: false,
      totalScanned: 0,
      recruiterEmailsFound: stored.length,
      interviewsCount: stored.filter(m => m.category === "INTERVIEW_INVITATION").length,
      unreadCount: stored.filter(m => m.is_unread).length,
      messages: stored,
      error: `Impossible de contacter le serveur IMAP Gmail : ${errorMsg}. Données en cache affichées.`
    };
  }
}

/**
 * Sends a direct reply to a recruiter via Gmail SMTP
 */
export async function sendReplyToRecruiter(
  messageId: string,
  replyBody: string,
  customSubject?: string
): Promise<{ success: boolean; error?: string }> {
  const store = loadStore();
  const msgIndex = (store.inbox_messages || []).findIndex(m => m.id === messageId);

  if (msgIndex === -1) {
    return { success: false, error: "Message introuvable dans la boîte RH" };
  }

  const msg = store.inbox_messages![msgIndex]!;
  const toEmail = msg.sender_email;
  const toName = msg.sender_name;
  const subject = customSubject || (msg.subject.toLowerCase().startsWith("re:") ? msg.subject : `Re: ${msg.subject}`);

  const htmlBody = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px 0;">
    ${replyBody.split("\n\n").map(p => `<p style="margin: 0 0 14px 0;">${p.replace(/\n/g, "<br>")}</p>`).join("")}
  </div>
</body>
</html>`;

  const result = await sendEmail(toEmail, toName, subject, htmlBody, replyBody);

  if (result.success) {
    msg.is_replied = true;
    msg.replied_at = new Date().toISOString();
    msg.is_unread = false;
    saveStore(store);
    return { success: true };
  }

  return { success: false, error: result.error || "Échec de l'envoi de la réponse" };
}
