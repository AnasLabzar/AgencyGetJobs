/// ============================================================
// Agent 1: Orchestrator & Profile Master
// Responsibilities:
// 1. Generate Target Search Brief (dynamique depuis CV PDF)
// 2. Evaluate Match Score (0-100%) between scraped offer and user profile
// 3. Validate passage to writing phase (Decision Gate: Match Score >= 75%)
// 4. Distribute tasks between Scraping Agent and Writer Agent
// 5. Autonomous loop: scrape -> score -> apply -> track
// ============================================================

import fs from "fs";
import path from "path";
import { pool, query, initDB, closeDB } from "../db/index";
import { sendEmail, emailToHTML, verifySMTP } from "../services/email";
import { callLLM, quotaManager } from "../services/llm-provider";
import { canSendEmail, markCompanyContacted, getDedupStats, resetDedup, isValidRHEmail } from "../services/email-dedup";
import { 
  JobOfferIntel, 
  UserMasterProfile, 
  SearchBrief, 
  ScoringResult, 
  AgentDispatchBrief 
} from "../types/schemas";
import { 
  tokenize, 
  jaccardSimilarity, 
  weightedKeywordSimilarity, 
  comprehensiveMatching 
} from "../core/similarity";
import { scrapeJobs } from "./scraping-agent";
import { tailorCV, generateCoverLetter, generatePDF } from "./writer-agent";
import { 
  analyzeMatchScoreTrends, 
  analyzeEmailPerformance, 
  optimizeWriterPrompts,
  generatePerformanceReport,
  type PerformanceMetrics 
} from "./performance-agent";
import { checkDailyQuota, getEmailVariants, humanJitterDelay } from "../services/deliverability";
import { executeLinkedInOutreach } from "./linkedin-agent";
import { generateInterviewPrepSheet } from "./interview-prep-agent";
import { loadStore, saveStore } from "../db/local-db";

const CV_PDF_FR_PATH = path.resolve("public/pdf/cv Anas Labzar - Fr (1).pdf");
const CV_PDF_EN_PATH = path.resolve("public/pdf/CV EN CANADIEN _ ANAS LABZAR.pdf");
const CV_PDF_PATH = CV_PDF_FR_PATH;

// Default user profile - fallback when CV parsing fails
const DEFAULT_USER_PROFILE: UserMasterProfile = {
  profile_id: "user_master",
  full_name: "Anas Labzar",
  languages: ["FR", "EN", "AR"],
  core_competencies: [
    "Full-Stack Development (Next.js, React, Node.js)",
    "Digital Marketing & Brand Strategy",
    "Multi-Agent AI Automation Systems",
    "Event Project Management"
  ],
  experience_years: 4,
  cv_templates: {
    fr_pdf: "/assets/cv_template_fr.html",
    en_pdf: "/assets/cv_template_en.html"
  }
};

// Keywords database for different domains
const KEYWORD_DATABASE = {
  "full-stack": ["next.js", "react", "node.js", "typescript", "postgresql", "python", "express"],
  "digital-marketing": ["seo", "sem", "content marketing", "social media", "google analytics", "meta ads"],
  "project-management": ["agile", "scrum", "jira", "risk management", "stakeholder management", "budget"],
  "software-engineering": ["python", "java", "c++", "docker", "kubernetes", "microservices"]
};

// Platform mappings for scraping
const TARGET_PLATFORMS = {
  "linkedin": ["linkedin.com/jobs", "linkedin.com"],
  "indeed": ["indeed.com"],
  "welcome": ["welcometothejungle.com"],
  "remoteok": ["remoteok.com"],
  "apex": ["apexfwd.com", "apec.fr"]
};

/**
 * Extrait le texte d'un fichier PDF CV
 */
export async function extractCVTextFromPDF(cvPath: string = CV_PDF_PATH): Promise<string> {
  if (!fs.existsSync(cvPath)) {
    console.warn(`⚠️ CV PDF not found at: ${cvPath}. Using default profile.`);
    return "";
  }

  const pdfModule = await import("pdf-parse");
  const PDFParse = (pdfModule as any).PDFParse || (pdfModule as any).default || pdfModule;
  const dataBuffer = fs.readFileSync(cvPath);
  const uint8 = new Uint8Array(dataBuffer);
  const parser = new PDFParse(uint8);
  await parser.load();
  const result = await parser.getText();
  return result.text || "";
}

/**
 * Extrait le texte de plusieurs CVs et les fusionne
 */
export async function extractCVTextsFromPaths(cvPaths: string[]): Promise<string[]> {
  const texts: string[] = [];
  for (const cvPath of cvPaths) {
    const text = await extractCVTextFromPDF(cvPath);
    if (text && text.trim().length > 0) {
      texts.push(text);
    }
  }
  return texts;
}

/**
 * Parse les compétences techniques depuis le texte du CV
 */
function extractSkillsFromCVText(cvText: string): string[] {
  const techKeywords = [
    "next.js", "react", "node.js", "typescript", "javascript", "python",
    "postgresql", "mysql", "mongodb", "redis", "docker", "kubernetes",
    "aws", "azure", "gcp", "tailwind css", "html5", "css3", "graphql",
    "rest api", "ci/cd", "git", "jenkins", "github actions", "nginx",
    "linux", "ubuntu", "elasticsearch", "rabbitmq", "kafka",
    "seo", "sem", "google analytics", "meta ads", "content marketing",
    "social media", "agile", "scrum", "jira", "trello", "asana",
    "risk management", "stakeholder management", "budget management",
    "project management", "event management", "langchain", "langgraph",
    "autogen", "crewai", "puppeteer", "playwright", "openai", "anthropic",
    "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy",
    "express", "fastapi", "django", "flask", "spring", "laravel",
    "vue.js", "angular", "svelte", "nuxt", "gatsby",
    "développeur", "développement", "full stack", "développeur web",
    "développeur full stack", "ingénieur logiciel", "technical manager",
    "chef technique", "ui/ux", "graphic designer", "web designer",
    "mobile development", "responsive design", "apis", "databases",
    "security", "typography", "branding", "illustration", "print design",
    "motion graphics", "photo/video editing", "adobe premiere", "after effects",
    "photoshop", "figma", "adobe creative suite"
  ];

  const lowerText = cvText.toLowerCase();
  const found: string[] = [];

  techKeywords.forEach(kw => {
    if (lowerText.includes(kw)) {
      found.push(kw);
    }
  });

  return [...new Set(found)];
}

/**
 * Extrait le nombre d'années d'expérience depuis le texte du CV
 * Calcule la span totale du premier emploi au dernier (ou aujourd'hui)
 */
function extractExperienceYearsFromCVText(cvText: string): number {
  const ansMatch = cvText.match(/(\d+)\s*(ans|années|years|ans d'expérience)/i);
  if (ansMatch && ansMatch[1]) {
    return Math.min(parseInt(ansMatch[1], 10), 40);
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const monthNames = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "aout", "sep", "oct", "nov", "déc",
    "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
    "sept", "avril", "juillet"];
  const monthRegex = monthNames.join("|");

  const monthMap: Record<string, number> = {
    janv: 0, janvier: 0, févr: 1, février: 1, mars: 2, avr: 3, avril: 3, mai: 4, juin: 5,
    juil: 6, juillet: 6, août: 7, aout: 7, sep: 8, septembre: 8, oct: 9, octobre: 9,
    nov: 10, novembre: 10, déc: 11, décembre: 11,
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7,
    september: 8, october: 9, november: 10, december: 11,
    sept: 8, dec: 11
  };

  const ranges: Array<{ startYear: number; startMonth: number; endYear: number; endMonth: number }> = [];

  const rangeRegex = new RegExp(`(${monthRegex})\\s*(\\d{4})\\s*[-–—]\\s*(${monthRegex})\\s*(\\d{4})`, "gi");
  const monthRanges = cvText.match(rangeRegex);
  if (monthRanges) {
    monthRanges.forEach(range => {
      const match = range.match(new RegExp(`(${monthRegex})\\s*(\\d{4})\\s*[-–—]\\s*(${monthRegex})\\s*(\\d{4})`, "i"));
      if (match && match[1] && match[2] && match[3] && match[4]) {
        const startYear = parseInt(match[2], 10);
        const endYear = parseInt(match[4], 10);
        const startMonth = monthMap[match[1].toLowerCase()] ?? 0;
        const endMonth = monthMap[match[3].toLowerCase()] ?? 0;
        ranges.push({ startYear, startMonth, endYear, endMonth });
      }
    });
  }

  const presentRegex = new RegExp(`(${monthRegex})\\s*(\\d{4})\\s*[-–—]\\s*(présent|present|aujourd'hui|en cours|current)`, "gi");
  const presentRanges = cvText.match(presentRegex);
  if (presentRanges) {
    presentRanges.forEach(range => {
      const match = range.match(new RegExp(`(${monthRegex})\\s*(\\d{4})`, "i"));
      if (match && match[1] && match[2]) {
        const startYear = parseInt(match[2], 10);
        const startMonth = monthMap[match[1].toLowerCase()] ?? 0;
        ranges.push({ startYear, startMonth, endYear: currentYear, endMonth: currentMonth });
      }
    });
  }

  const yearRanges = cvText.match(/(\d{4})\s*[-–—]\s*(\d{4})/gi);
  if (yearRanges) {
    yearRanges.forEach(range => {
      const match = range.match(/(\d{4})\s*[-–—]\s*(\d{4})/i);
      if (match && match[1] && match[2]) {
        const startStr = match[1];
        const endStr = match[2];
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (start > 1900 && end > 1900 && end <= currentYear + 2) {
          ranges.push({ startYear: start, startMonth: 0, endYear: end, endMonth: 11 });
        }
      }
    });
  }

  if (ranges.length === 0) return 4;

  let earliestStartYear = currentYear;
  let earliestStartMonth = 0;
  let latestEndYear = 0;
  let latestEndMonth = 0;

  ranges.forEach(r => {
    if (r.startYear < earliestStartYear || (r.startYear === earliestStartYear && r.startMonth < earliestStartMonth)) {
      earliestStartYear = r.startYear;
      earliestStartMonth = r.startMonth;
    }
    if (r.endYear > latestEndYear || (r.endYear === latestEndYear && r.endMonth > latestEndMonth)) {
      latestEndYear = r.endYear;
      latestEndMonth = r.endMonth;
    }
  });

  let totalYears = latestEndYear - earliestStartYear;
  if (latestEndMonth < earliestStartMonth) totalYears -= 1;
  if (totalYears < 0) totalYears = 0;

  return Math.min(totalYears, 40);
}

/**
 * Extrait les langues depuis le texte du CV
 */
function extractLanguagesFromCVText(cvText: string): string[] {
  const langMap: Record<string, string> = {
    "français": "FR", "french": "FR",
    "anglais": "EN", "english": "EN",
    "arabe": "AR", "arabic": "AR",
    "espagnol": "ES", "spanish": "ES"
  };

  const lowerText = cvText.toLowerCase();
  const found: string[] = [];

  Object.entries(langMap).forEach(([kw, code]) => {
    if (lowerText.includes(kw) && !found.includes(code)) {
      found.push(code);
    }
  });

  return found.length > 0 ? found : ["FR", "EN", "AR"];
}

/**
 * Extrait le nom complet depuis le texte du CV
 */
function extractFullNameFromCVText(cvText: string): string {
  const lines = cvText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0) {
    let firstLine = (lines[0] ?? "") as string;
    firstLine = firstLine.replace(/\t/g, " ");
    let namePart = firstLine.trim();
    namePart = namePart.split(/\s{3,}|\||\•/)[0] ?? "";
    const cleaned = namePart
      .replace(/developpeur.*/i, "")
      .replace(/developer.*/i, "")
      .replace(/designer.*/i, "")
      .replace(/engineer.*/i, "")
      .replace(/manager.*/i, "")
      .replace(/specialist.*/i, "")
      .replace(/web.*/i, "")
      .replace(/mobile.*/i, "")
      .replace(/graphic.*/i, "")
      .replace(/ui\/ux.*/i, "")
      .replace(/full.?stack.*/i, "")
      .replace(/&.*/i, "")
      .trim()
      .replace(/\s+/g, " ");

    if (cleaned && cleaned.length > 2 && cleaned.length < 60) {
      return cleaned;
    }
    if (namePart && namePart.length > 2 && namePart.length < 60) {
      return namePart.trim().replace(/\s+/g, " ");
    }
  }
  return "Anas Labzar";
}

/**
 * Extrait les compétences de base depuis le texte du CV (pour core_competencies)
 */
function extractCoreCompetenciesFromCVText(cvText: string): string[] {
  const skills = extractSkillsFromCVText(cvText);
  const lowerText = cvText.toLowerCase();
  const competencies: string[] = [];

  const webSkills = skills.filter(s =>
    ["next.js", "react", "node.js", "typescript", "javascript", "développeur web", "développeur full stack", "full stack", "ingénieur logiciel", "php", "laravel", "express"].includes(s)
  );
  if (webSkills.length > 0) {
    competencies.push(`Full-Stack Development (${webSkills.slice(0, 5).join(", ")})`);
  }

  const marketingSkills = skills.filter(s =>
    ["seo", "sem", "google analytics", "meta ads", "content marketing", "social media", "marketing numérique", "marketing digital"].includes(s)
  );
  if (marketingSkills.length > 0) {
    competencies.push("Digital Marketing & Brand Strategy");
  }

  if (skills.some(s => ["langchain", "langgraph", "autogen", "crewai", "multi-agent", "intelligence artificielle", "ai automation"].includes(s)) || lowerText.includes("multi-agent")) {
    competencies.push("Multi-Agent AI Automation Systems");
  }

  const mgmtSkills = skills.filter(s =>
    ["agile", "scrum", "jira", "project management", "event management", "risk management", "stakeholder management", "technical manager", "chef technique", "team leadership", "technical strategy"].includes(s)
  );
  if (mgmtSkills.length > 0) {
    competencies.push("Technical Project Management");
  }

  if (competencies.length === 0) {
    competencies.push("Full-Stack Development", "Digital Marketing", "Project Management");
  }

  return competencies;
}

/**
 * Charge le profil utilisateur depuis plusieurs CVs (FR + EN) et fusionne les infos
 */
export async function loadUserProfileFromCVs(
  cvFrPath: string = CV_PDF_FR_PATH,
  cvEnPath: string = CV_PDF_EN_PATH
): Promise<UserMasterProfile> {
  const texts = await extractCVTextsFromPaths([cvFrPath, cvEnPath]);

  if (texts.length === 0) {
    console.warn("⚠️ No CV text extracted. Using default profile.");
    return DEFAULT_USER_PROFILE;
  }

  const combinedText = texts.join("\n");
  const skills = extractSkillsFromCVText(combinedText);
  const experienceYears = Math.max(
    extractExperienceYearsFromCVText(texts[0] || ""),
    extractExperienceYearsFromCVText(texts[1] || "")
  );
  const languages = extractLanguagesFromCVText(combinedText);
  const fullName = extractFullNameFromCVText(texts[0] || "");
  const coreCompetencies = extractCoreCompetenciesFromCVText(combinedText);

  return {
    profile_id: "user_master",
    full_name: fullName,
    languages,
    core_competencies: coreCompetencies,
    experience_years: experienceYears,
    cv_templates: {
      fr_pdf: cvFrPath,
      en_pdf: cvEnPath
    }
  };
}

/**
 * Génère le Brief de Recherche Target à partir du profil utilisateur
 */
export function generateTargetBrief(profile: UserMasterProfile): SearchBrief {
  const keywords: string[] = [];

  profile.core_competencies.forEach(comp => {
    const lowerComp = comp.toLowerCase();
    if (lowerComp.includes("next.js") || lowerComp.includes("react") || lowerComp.includes("node.js") || lowerComp.includes("full-stack") || lowerComp.includes("développeur web") || lowerComp.includes("ingénieur logiciel")) {
      keywords.push(...KEYWORD_DATABASE["full-stack"]);
    }
    if (lowerComp.includes("marketing") || lowerComp.includes("brand")) {
      keywords.push(...KEYWORD_DATABASE["digital-marketing"]);
    }
    if (lowerComp.includes("project") || lowerComp.includes("management")) {
      keywords.push(...KEYWORD_DATABASE["project-management"]);
    }
    if (lowerComp.includes("software") || lowerComp.includes("engineering")) {
      keywords.push(...KEYWORD_DATABASE["software-engineering"]);
    }
    if (lowerComp.includes("multi-agent") || lowerComp.includes("ai automation")) {
      keywords.push("ai automation", "multi-agent systems", "langchain", "langgraph");
    }
  });

  const uniqueKeywords = [...new Set(keywords)];

  // Priorité absolue : Marrakech et Casablanca d'abord
  const locations: string[] = ["Marrakech", "Casablanca", "Maroc", "Remote"];
  const remoteOk = true;

  const minYears = Math.max(1, profile.experience_years - 2);
  const maxYears = profile.experience_years + 6;

  return {
    profile_id: profile.profile_id,
    keywords: uniqueKeywords.slice(0, 20),
    target_platforms: Object.keys(TARGET_PLATFORMS),
    experience_filters: {
      min_years: minYears,
      max_years: maxYears,
      required_roles: ["Full-Stack Engineer", "Developer", "Project Manager", "AI Automation Engineer", "Technical Manager"]
    },
    geographic_preferences: {
      locations,
      remote_ok: remoteOk,
      mobility: "Mobilité nationale ou internationale"
    }
  };
}

/**
 * Génère le Brief de Recherche Target de manière dynamique depuis les CVs FR et EN
 */
export async function generateTargetBriefFromCVs(
  cvFrPath: string = CV_PDF_FR_PATH,
  cvEnPath: string = CV_PDF_EN_PATH
): Promise<{ brief: SearchBrief; profile: UserMasterProfile }> {
  const profile = await loadUserProfileFromCVs(cvFrPath, cvEnPath);
  const brief = generateTargetBrief(profile);
  return { brief, profile };
}

/**
 * Sauvegarde le profil utilisateur en DB
 */
export async function saveUserProfileToDB(profile: UserMasterProfile): Promise<void> {
  await query(
    `INSERT INTO user_profiles (profile_id, full_name, languages, core_competencies, experience_years, cv_template_fr, cv_template_en, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (profile_id) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       languages = EXCLUDED.languages,
       core_competencies = EXCLUDED.core_competencies,
       experience_years = EXCLUDED.experience_years,
       cv_template_fr = EXCLUDED.cv_template_fr,
       cv_template_en = EXCLUDED.cv_template_en,
       updated_at = NOW()`,
    [
      profile.profile_id,
      profile.full_name,
      JSON.stringify(profile.languages),
      JSON.stringify(profile.core_competencies),
      profile.experience_years,
      profile.cv_templates.fr_pdf,
      profile.cv_templates.en_pdf
    ]
  );
}

/**
 * Sauvegarde ou met à jour une offre d'emploi dans le magasin local persistant
 */
export function saveJobOfferToLocalStore(offer: JobOfferIntel): void {
  try {
    const store = loadStore();
    const existingIndex = store.job_offers.findIndex((j: any) => j.offer_id === offer.offer_id);
    const offerRecord = {
      id: existingIndex >= 0 ? store.job_offers[existingIndex].id : store.job_offers.length + 1,
      offer_id: offer.offer_id,
      source_url: offer.source_url,
      company_name: offer.company_name,
      job_title: offer.job_title,
      location: offer.location,
      rh_contact_name: offer.rh_contact.name,
      rh_contact_email: offer.rh_contact.email,
      rh_contact_linkedin: offer.rh_contact.linkedin_profile,
      tech_stack: offer.tech_stack_required,
      match_score: offer.match_score,
      status: offer.status,
      description: offer.tech_stack_required.join(", "),
      posted_date: offer.created_at || new Date().toISOString(),
      created_at: offer.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      store.job_offers[existingIndex] = { ...store.job_offers[existingIndex], ...offerRecord };
    } else {
      store.job_offers.unshift(offerRecord);
    }

    // Tri automatique : les annonces les plus récentes en haut
    store.job_offers.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    saveStore(store);
  } catch (err) {
    console.warn("[ORCHESTRATOR] Erreur de sauvegarde dans le store local:", err);
  }
}

/**
 * Sauvegarde une offre d'emploi en DB (PostgreSQL + Local Store)
 */
export async function saveJobOfferToDB(offer: JobOfferIntel): Promise<void> {
  // 1. Sauvegarde locale garantie dans tous les cas
  saveJobOfferToLocalStore(offer);

  // 2. Sauvegarde PostgreSQL si disponible
  await query(
    `INSERT INTO job_offers (offer_id, source_url, company_name, job_title, location, rh_contact_name, rh_contact_email, rh_contact_linkedin, tech_stack, match_score, status, description, posted_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
     ON CONFLICT (offer_id) DO UPDATE SET
       match_score = EXCLUDED.match_score,
       status = EXCLUDED.status,
       updated_at = NOW()`,
    [
      offer.offer_id,
      offer.source_url,
      offer.company_name,
      offer.job_title,
      offer.location,
      offer.rh_contact.name,
      offer.rh_contact.email,
      offer.rh_contact.linkedin_profile,
      JSON.stringify(offer.tech_stack_required),
      offer.match_score,
      offer.status,
      offer.tech_stack_required.join(", "),
      offer.created_at || new Date().toISOString()
    ]
  );
}

/**
 * Sauvegarde une candidature en DB (PostgreSQL + Local Store)
 */
export async function saveApplicationToDB(data: {
  offerId: string;
  cvPath?: string;
  coverLetter?: string;
  emailSubject?: string;
  emailBody?: string;
  emailSent: boolean;
  matchScore?: number;
}): Promise<void> {
  // Sauvegarde locale systématique
  try {
    const store = loadStore();
    const targetJob = store.job_offers.find((j: any) => j.offer_id === data.offerId);
    const newApp = {
      id: store.applications.length + 1,
      offer_id: data.offerId,
      company_name: targetJob?.company_name || "Entreprise",
      job_title: targetJob?.job_title || "Poste",
      location: targetJob?.location || "Maroc",
      cv_path: data.cvPath || null,
      cover_letter: data.coverLetter || null,
      email_subject: data.emailSubject || null,
      email_body: data.emailBody || null,
      email_sent: data.emailSent,
      email_sent_at: data.emailSent ? new Date().toISOString() : null,
      match_score: data.matchScore || targetJob?.match_score || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.applications.unshift(newApp);
    saveStore(store);
  } catch (err) {
    console.warn("[ORCHESTRATOR] Erreur de sauvegarde de candidature en local:", err);
  }

  // Sauvegarde PostgreSQL si connectée
  await query(
    `INSERT INTO applications (offer_id, cv_path, cover_letter, email_subject, email_body, email_sent, email_sent_at, match_score, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
    [
      data.offerId,
      data.cvPath || null,
      data.coverLetter || null,
      data.emailSubject || null,
      data.emailBody || null,
      data.emailSent,
      data.emailSent ? new Date().toISOString() : null,
      data.matchScore || null
    ]
  );
}

/**
 * Met à jour le statut d'envoi d'email
 */
export async function updateEmailStatus(applicationId: number, sent: boolean, messageId?: string): Promise<void> {
  await query(
    `UPDATE applications SET email_sent = $1, email_sent_at = $2, updated_at = NOW() WHERE id = $3`,
    [sent, sent ? new Date().toISOString() : null, applicationId]
  );

  await query(
    `INSERT INTO email_logs (application_id, recipient_email, subject, status, sent_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [applicationId, messageId || null, messageId || null, sent ? "sent" : "failed"]
  );
}

/**
 * Évalue le Match Score (0-100%) entre une offre scrapée et le profil utilisateur
 */
export function evaluateMatchScore(
  offer: JobOfferIntel, 
  profile: UserMasterProfile
): ScoringResult {
  const criteriaBreakdown: ScoringResult["criteria_breakdown"] = {
    skills_match: 0,
    experience_match: 0,
    location_match: 0,
    seniority_match: 0
  };

  const requiredSkills = new Set((offer.tech_stack_required || []).map(s => s.toLowerCase()));
  const profileSkills = new Set((profile.core_competencies || []).map(c => c.toLowerCase()));
  
  let matchedSkills = 0;
  let totalRequiredSkills = requiredSkills.size;

  requiredSkills.forEach(skill => {
    if (profileSkills && [...profileSkills].some((comp: string) => comp.includes(skill))) {
      matchedSkills++;
    }
  });

  criteriaBreakdown.skills_match = totalRequiredSkills > 0 
    ? Math.round((matchedSkills / totalRequiredSkills) * 40)
    : 0;

  const expRatio = Math.min(profile.experience_years / 5, 1);
  criteriaBreakdown.experience_match = Math.round(expRatio * 25);

  // Priorité absolue : Marrakech (+25 pts) & Casablanca (+22 pts)
  const offerLocationLower = (offer.location || "").toLowerCase();
  let locationScore = 0;

  if (offerLocationLower.includes("marrakech")) {
    locationScore = 25; // Priorité #1 utilisateur : Marrakech
  } else if (offerLocationLower.includes("casablanca")) {
    locationScore = 22; // Priorité #2 utilisateur : Casablanca
  } else if (offerLocationLower.includes("maroc") || offerLocationLower.includes("morocco") || offerLocationLower.includes("rabat")) {
    locationScore = 18; // Maroc national
  } else if (offerLocationLower.includes("remote") || offerLocationLower.includes("télétravail")) {
    locationScore = 15; // International / Remote
  } else if (offerLocationLower.includes("paris") || offerLocationLower.includes("lyon") || offerLocationLower.includes("france")) {
    locationScore = 12; // France
  } else {
    locationScore = 5;
  }

  criteriaBreakdown.location_match = locationScore;

  const seniorityKeywords = ["lead", "senior", "junior", "manager"];
  const titleLower = (offer.job_title || "").toLowerCase();
  let seniorityMatch = 0;
  
  seniorityKeywords.forEach(kw => {
    if (titleLower.includes(kw)) {
      seniorityMatch = 1;
    }
  });
  
  criteriaBreakdown.seniority_match = Math.round(seniorityMatch * 15);

  const totalScore = criteriaBreakdown.skills_match + 
                     criteriaBreakdown.experience_match + 
                     criteriaBreakdown.location_match + 
                     criteriaBreakdown.seniority_match;

  const recommendations: string[] = [];
  
  if (locationScore >= 22) {
    recommendations.push("⭐ Opportunité locale hautement prioritaire (Marrakech / Casablanca)");
  }
  if (criteriaBreakdown.skills_match < 30) {
    recommendations.push("Considérer de renforcer le profile avec des compétences supplémentaires");
  }
  if (criteriaBreakdown.experience_match < 20) {
    recommendations.push("Vérifier l'adéquation des années d'expérience");
  }
  if (criteriaBreakdown.location_match <= 5) {
    recommendations.push("L'emplacement ne correspond pas aux préférences locales (Marrakech / Casablanca)");
  }

  return {
    offer_id: offer.offer_id,
    match_score: totalScore,
    criteria_breakdown: criteriaBreakdown,
    recommendations
  };
}

/**
 * Gate de décision: Valide le passage à la phase de rédaction
 * Decision Gate: Match Score >= 75%
 */
export function validateWritingPhase(matchScore: number): {
  approved: boolean
  gate_status: "APPROVED" | "REJECTED" | "REVIEW"
  message: string
} {
  let status: "APPROVED" | "REJECTED" | "REVIEW";
  let approved: boolean;

  if (matchScore >= 75) {
    status = "APPROVED";
    approved = true;
    return {
      approved,
      gate_status: status,
      message: `✅ Match Score ${matchScore}% - APPROUVÉ. Passage à la phase de rédaction automatique.`
    };
  } else if (matchScore >= 50) {
    status = "REVIEW";
    approved = false;
    return {
      approved,
      gate_status: status,
      message: `⚠️ Match Score ${matchScore}% - EN ATTENTE. Revue manuelle recommandée.`
    };
  } else {
    status = "REJECTED";
    approved = false;
    return {
      approved,
      gate_status: status,
      message: `❌ Match Score ${matchScore}% - REJETÉ. L'offre ne correspond pas au profil.`
    };
  }
}

/**
 * Répartit les tâches entre l'Agent Scraping et l'Agent Writer
 */
export function distributeTasks(
  brief: SearchBrief,
  matchResult: ScoringResult,
  offer: JobOfferIntel
): AgentDispatchBrief {
  const approval = validateWritingPhase(matchResult.match_score);

  let agent2Tasks: string[] = [];
  let agent3Tasks: string[] = [];
  let writerFocusAreas: string[] = [];

  if (approval.approved) {
    agent2Tasks = [
      "Continuer le scraping des nouvelles offres avec les mots-clés ciblés",
      "Mettre à jour le hash des descriptions pour déduplication",
      "Extraire les contacts RH enrichis via Clearbit/Hunter API",
      "Valider l'unicité de l'offre (déjà traitée ?)"
    ];

    agent3Tasks = [
      "Adapter le CV avec les keywords de l'offre",
      "Générer la lettre de motivation personnalisée (ton humain, storytelling)",
      "Produire CV PDF (FR) et CV PDF (EN)",
      "Rédiger l'email froid avec hooks orientés résultats"
    ];

    writerFocusAreas = [
      "Keywords de l'offre: " + offer.tech_stack_required.join(", "),
      "Entreprise: " + offer.company_name,
      "Titre: " + offer.job_title,
      "Contact RH: " + (offer.rh_contact.name || "Non identifié")
    ];
  } else if (approval.gate_status === "REVIEW") {
    agent2Tasks = ["Attente décision utilisateur sur cette offre"];
    agent3Tasks = ["Préparer deux variantes de lettre (automatique + manuelle)"];
    writerFocusAreas = [`Score ${matchResult.match_score}%: attendre validation`];
  } else {
    agent2Tasks = ["Filtrer cette offre - ne pas retraiter"];
    agent3Tasks = [];
    writerFocusAreas = ["Offre non correspondante - pas de génération"];
  }

  return {
    search_brief: brief,
    matched_offer: offer,
    approval_status: approval.gate_status === "APPROVED" ? "APPROVE" : approval.gate_status === "REJECTED" ? "REJECT" : "REVIEW",
    dispatch_instructions: {
      agent2_tasks: agent2Tasks,
      agent3_tasks: agent3Tasks,
      writer_focus_areas: writerFocusAreas
    }
  };
}

/**
 * Construit le prompt LLM pour générer une lettre de motivation / cold email
 * ton humain, storytelling, hooks orientés résultats, anti-détection IA
 */
function buildCoverLetterPrompt(
  offer: JobOfferIntel,
  profile: UserMasterProfile,
  language: "FR" | "EN",
  variant: "A" | "B"
): string {
  const techStack = offer.tech_stack_required?.slice(0, 5).join(", ") || "Next.js, React, TypeScript, Node.js";
  const companyName = offer.company_name;
  const jobTitle = offer.job_title;
  const rhName = offer.rh_contact.name || "l'équipe recrutement";
  const isFR = language === "FR";

  const styleVariant = variant === "A"
    ? (isFR ? "ton direct, concis, orienté résultats" : "direct, concise, results-oriented tone")
    : (isFR ? "ton narratif, storytelling avec projet concret" : "narrative, storytelling with concrete project");

  return isFR
    ? `
Rôle: Rédacteur de candidatures humaines (anti-détection IA).
Objectif: Rédiger le CORPS D'EMAIL de candidature uniquement (pas d'objet, pas de signature "Cordialement" dupliquée).

Contexte:
- Candidat: ${profile.full_name}, ${profile.experience_years} ans d'expérience
- Compétences: ${profile.core_competencies.join(", ")}
- Langues: ${profile.languages.join(", ")}
- Poste: ${jobTitle} chez ${companyName}
- Destinataire: ${rhName}
- Stack requis: ${techStack}
- Variante de style: ${styleVariant}

Contraintes:
- Email FR, court (120-180 mots), percutant, humain
- Pas de phrases génériques IA ("Je vous écris pour exprimer mon intérêt...")
- Hook d'accroche avec un résultat concret ou projet réel
- Mentionner le stack technique de l'offre
- Appel à l'action clair (entretien 10-15 min)
- Signature: ${profile.full_name} à la fin

Génère uniquement le corps de l'email, rien d'autre.
    `.trim()
    : `
Role: Human-sounding cover letter writer (anti-AI detection).
Objective: Write the EMAIL BODY only (no subject line, no duplicated "Best regards" signature).

Context:
- Candidate: ${profile.full_name}, ${profile.experience_years} years experience
- Skills: ${profile.core_competencies.join(", ")}
- Languages: ${profile.languages.join(", ")}
- Position: ${jobTitle} at ${companyName}
- Recipient: ${rhName}
- Required stack: ${techStack}
- Style variant: ${styleVariant}

Constraints:
- Email EN, short (120-180 words), punchy, human
- No generic AI phrases ("I am writing to express my interest...")
- Hook with concrete result or real project
- Mention the offer's tech stack
- Clear call to action (10-15 min interview)
- Sign-off: ${profile.full_name} at the end

Generate only the email body, nothing else.
    `.trim();
}

/**
 * Envoie une candidature par email via SMTP (Gmail) avec LLM + déduplication entreprise
 */
export async function sendApplicationEmail(
  offer: JobOfferIntel,
  profile: UserMasterProfile,
  language: "FR" | "EN" = "FR",
  variantOverride?: "A" | "B",
  customSubject?: string,
  customBody?: string,
  customEmail?: string
): Promise<{ success: boolean; emailBody?: string; subject?: string; variant?: "A" | "B"; error?: string }> {
  try {
    const toEmail = (customEmail || offer.rh_contact.email || "").trim();
    const toName = offer.rh_contact.name || "Équipe Recrutement";

    if (!toEmail) {
      return { 
        success: false, 
        error: `Aucune adresse email RH certifiée pour ${offer.company_name}. Utilisez la postulation directe via l'URL de l'offre ou la messagerie LinkedIn pour éviter les rebonds.` 
      };
    }

    // 1. Déduplication par entreprise : pas d'email double même société
    const dedup = await canSendEmail(offer.offer_id, offer.company_name);
    if (!dedup.allowed) {
      console.warn(`[DEDUP] ${dedup.reason}`);
      return { success: false, error: dedup.reason };
    }

    // 2. Vérification quota warm-up journalier (max 20/jour)
    const quota = checkDailyQuota(20);
    if (!quota.allowed) {
      console.warn(`[WARM-UP] ${quota.message}`);
      return { success: false, error: quota.message };
    }

    // 3. Sélection variante A/B testing et génération de l'objet via LLM
    const variant: "A" | "B" = variantOverride || (Math.random() > 0.5 ? "B" : "A");
    const variantIntel = getEmailVariants(offer.job_title, offer.company_name, offer.rh_contact.name, variant);

    const subject = (customSubject || "").trim() || variantIntel.subject;

    // 4. Corps d'email généré par LLM (Gemini avec rotation provider)
    let finalEmailBody: string;
    if (customBody && customBody.trim().length > 0) {
      finalEmailBody = customBody.trim();
    } else {
      try {
        const llmResult = await callLLM(buildCoverLetterPrompt(offer, profile, language, variant), {
          temperature: 0.7,
          maxTokens: 600,
        });
        finalEmailBody = llmResult.text.trim();
        console.log(`[LLM] Lettre générée par ${llmResult.provider} (~${llmResult.tokens} tokens)`);
      } catch (llmErr) {
        console.warn(`[LLM] Échec LLM, fallback template statique: ${llmErr instanceof Error ? llmErr.message : String(llmErr)}`);
        const letterResult = generateCoverLetter(offer, profile, language);
        finalEmailBody = letterResult.emailBody.trim();
      }
    }

    // Formatage HTML propre (sans bloc de signature supplémentaire dupliqué)
    const htmlBody = emailToHTML(subject, finalEmailBody);
    const textBody = finalEmailBody;

    // Chemin du vrai CV PDF selon la langue
    const cvPath = language === "EN"
      ? path.resolve(process.cwd(), "public/pdf/CV EN CANADIEN _ ANAS LABZAR.pdf")
      : path.resolve(process.cwd(), "public/pdf/cv Anas Labzar - Fr (1).pdf");

    const attachmentFilename = language === "EN" ? "CV_Anas_Labzar_EN.pdf" : "CV_Anas_Labzar_FR.pdf";

    // Jitter aléatoire anti-détection bot
    await humanJitterDelay(500, 1500);

    const result = await sendEmail(toEmail, toName, subject, htmlBody, textBody, cvPath, attachmentFilename);

    if (result.success) {
      // Marquer l'entreprise comme contactée (anti-doublon futur)
      try {
        await markCompanyContacted(offer.offer_id, offer.company_name);
      } catch {
        // ignore dedup marking errors
      }
      return { 
        success: true, 
        emailBody: finalEmailBody, 
        subject,
        variant
      };
    }

    return { success: false, error: result.error ?? "" };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

/**
 * Boucle autonome du Chef Orchestrateur
 * Scrape -> Score -> Gate -> Write -> Send Email -> Track
 */
export async function runAutonomousCycle(): Promise<{
  jobsScraped: number;
  jobsScored: number;
  jobsApproved: number;
  emailsSent: number;
  errors: string[];
}> {
  const stats = { jobsScraped: 0, jobsScored: 0, jobsApproved: 0, emailsSent: 0, errors: [] as string[] };
  let dbAvailable = false;

  try {
    await initDB();
    dbAvailable = true;
  } catch (e) {
    console.warn("[ORCHESTRATOR] PostgreSQL unavailable, running in-memory mode:", e instanceof Error ? e.message : String(e));
    dbAvailable = false;
  }

  let smtpAvailable = false;
  try {
    await verifySMTP();
    smtpAvailable = true;
  } catch (e) {
    console.warn("[ORCHESTRATOR] SMTP unavailable, emails will not be sent:", e instanceof Error ? e.message : String(e));
    smtpAvailable = false;
  }

  // Reset du déduplication si demandé (permet de renvoyer des emails après nettoyage du store)
  if (process.env.RESET_DEDUP === "true") {
    try {
      await resetDedup();
      console.warn("[ORCHESTRATOR] RESET_DEDUP activé : historique des emails envoyés effacé");
    } catch (e) {
      console.warn("[ORCHESTRATOR] Échec RESET_DEDUP:", e instanceof Error ? e.message : String(e));
    }
  }

  try {
    const { brief, profile } = await generateTargetBriefFromCVs();

    if (dbAvailable) {
      try {
        await saveUserProfileToDB(profile);
      } catch (e) {
        console.warn("[ORCHESTRATOR] Failed to save profile to DB:", e instanceof Error ? e.message : String(e));
      }
    }

    console.log(`\n[ORCHESTRATOR] Starting autonomous cycle`);
    console.log(`[ORCHESTRATOR] Profile: ${profile.full_name} (${profile.experience_years} ans)`);
    console.log(`[ORCHESTRATOR] Keywords: ${brief.keywords.join(", ")}`);
    console.log(`[ORCHESTRATOR] Threshold: >= 75% match score\n`);

    // Step 1: Scrape jobs
    console.log("[STEP 1] Scraping jobs...");
    let scrapedJobs: JobOfferIntel[] = [];
    try {
      scrapedJobs = await scrapeJobs(brief);
      stats.jobsScraped = scrapedJobs.length;
      console.log(`[STEP 1] Scraped ${scrapedJobs.length} jobs`);
    } catch (e) {
      const msg = `Scraping error: ${e instanceof Error ? e.message : String(e)}`;
      console.error(msg);
      stats.errors.push(msg);
    }

    // Step 2: Score each job and save to DB
    console.log("\n[STEP 2] Scoring jobs...");
    for (const offer of scrapedJobs) {
      try {
        const scoringResult = evaluateMatchScore(offer, profile);
        const offerWithScore: JobOfferIntel = { ...offer, match_score: scoringResult.match_score };

        // Sauvegarde systématique (Store local + DB PostgreSQL)
        try {
          if (dbAvailable) {
            await saveJobOfferToDB(offerWithScore);
          } else {
            saveJobOfferToLocalStore(offerWithScore);
          }
        } catch (e) {
          saveJobOfferToLocalStore(offerWithScore);
        }
        stats.jobsScored++;

        const gate = validateWritingPhase(scoringResult.match_score);
        console.log(`  ${offer.job_title} @ ${offer.company_name} - Score: ${scoringResult.match_score}% - ${gate.gate_status}`);

        if (gate.approved) {
          stats.jobsApproved++;

          // Step 3: Send application email
          // Force validation: block fake/bad email addresses
          const rhEmail = offerWithScore.rh_contact.email?.trim().toLowerCase();

          if (!rhEmail) {
            console.log(`  --> No RH email found for ${offer.company_name}`);
            try {
              await saveApplicationToDB({
                offerId: offerWithScore.offer_id,
                emailSent: false,
                matchScore: scoringResult.match_score
              });
            } catch (e) {
              // non-blocking
            }
            continue;
          }

          // Validate email format and TLD
          if (!isValidRHEmail(rhEmail)) {
            console.log(`  --> Invalid/blocked email for ${offer.company_name}: ${rhEmail}`);
            try {
              await saveApplicationToDB({
                offerId: offerWithScore.offer_id,
                emailSent: false,
                matchScore: scoringResult.match_score
              });
            } catch (e) {
              // non-blocking
            }
            continue;
          }

          // Deduplication check by company domain
          const dedupCheck = await canSendEmail(offerWithScore.offer_id, offerWithScore.company_name);
          if (!dedupCheck.allowed) {
            console.log(`  --> Deduplication: ${dedupCheck.reason}`);
            continue;
          }

          if (!smtpAvailable) {
            console.log(`  --> SMTP unavailable, email not sent to ${rhEmail}`);
            try {
              await saveApplicationToDB({
                offerId: offerWithScore.offer_id,
                emailSent: false,
                matchScore: scoringResult.match_score
              });
            } catch (e) {
              console.warn("[ORCHESTRATOR] Failed to save application:", e instanceof Error ? e.message : String(e));
            }
          } else {
            console.log(`  --> Sending application to ${rhEmail}...`);
            const emailResult = await sendApplicationEmail(offerWithScore, profile, "FR");

            if (emailResult.success) {
              stats.emailsSent++;
              const appData: {
                offerId: string;
                emailSubject?: string;
                emailBody?: string;
                emailSent: boolean;
                matchScore?: number;
              } = {
                offerId: offerWithScore.offer_id,
                emailSent: true,
                matchScore: scoringResult.match_score
              };
              if (emailResult.subject) appData.emailSubject = emailResult.subject;
              if (emailResult.emailBody) appData.emailBody = emailResult.emailBody;

              try {
                await saveApplicationToDB(appData);
                if (dbAvailable) await updateEmailStatus(0, true, "sent");
              } catch (e) {
                console.warn("[ORCHESTRATOR] Failed to save application:", e instanceof Error ? e.message : String(e));
              }
              console.log(`  --> Email sent successfully`);
            } else {
              console.log(`  --> Email failed: ${emailResult.error}`);
              try {
                await saveApplicationToDB({
                  offerId: offerWithScore.offer_id,
                  emailSent: false,
                  matchScore: scoringResult.match_score
                });
              } catch (e) {
                console.warn("[ORCHESTRATOR] Failed to save failed application:", e instanceof Error ? e.message : String(e));
              }
            }
          }

          // Step 4: Advance feature - Automated LinkedIn connection note (Dry run / queue)
          try {
            await executeLinkedInOutreach(offerWithScore, profile, true);
          } catch (liErr) {
            // non-blocking
          }

          // Step 5: Advance feature - Generate Interview Prep Sheet for high matches (>= 80%)
          if (scoringResult.match_score >= 80) {
            try {
              await generateInterviewPrepSheet(offerWithScore, profile);
              console.log(`  --> Fiche de préparation d'entretien générée pour ${offer.company_name}`);
            } catch (prepErr) {
              // non-blocking
            }
          }
        }
      } catch (e) {
        const msg = `Error processing offer ${offer.offer_id}: ${e instanceof Error ? e.message : String(e)}`;
        console.error(msg);
        stats.errors.push(msg);
      }
    }

    console.log(`\n[ORCHESTRATOR] Cycle complete: ${stats.jobsScraped} scraped, ${stats.jobsScored} scored, ${stats.jobsApproved} approved, ${stats.emailsSent} emails sent`);
  } catch (e) {
    const msg = `Cycle error: ${e instanceof Error ? e.message : String(e)}`;
    console.error(msg);
    stats.errors.push(msg);
  } finally {
    if (dbAvailable) {
      try {
        await closeDB();
      } catch {
        // ignore close errors
      }
    }
  }

  return stats;
}

/**
 * Start the autonomous loop (runs every X minutes)
 */
export function startAutonomousLoop(intervalMinutes: number = 60): NodeJS.Timeout {
  console.log(`[ORCHESTRATOR] Autonomous loop started - interval: ${intervalMinutes} minutes`);

  // Run immediately once
  runAutonomousCycle();

  // Then run on interval
  const interval = setInterval(() => {
    runAutonomousCycle().catch(e => {
      console.error("[ORCHESTRATOR] Loop error:", e);
    });
  }, intervalMinutes * 60 * 1000);

  return interval;
}

// ============================================================
// Boucle Autonome 30 Secondes (Scraper 30s off & repeat)
// Focus prioritaire: Marrakech & Casablanca
// ============================================================

export interface Autonomous30sLoopState {
  isRunning: boolean;
  intervalSeconds: number;
  currentCycle: number;
  lastCycleStartedAt: string | null;
  lastCycleFinishedAt: string | null;
  lastCycleJobsScraped: number;
  lastCycleJobsScored: number;
  status: "IDLE" | "SCRAPING" | "WAITING_30S" | "STOPPED";
  message: string;
  focusLocations: string[];
}

let is30sLoopActive = false;
let loopTimeoutRef: NodeJS.Timeout | null = null;
const loopState: Autonomous30sLoopState = {
  isRunning: false,
  intervalSeconds: 30,
  currentCycle: 0,
  lastCycleStartedAt: null,
  lastCycleFinishedAt: null,
  lastCycleJobsScraped: 0,
  lastCycleJobsScored: 0,
  status: "IDLE",
  message: "En attente de démarrage — Focus Marrakech & Casablanca (Pause 30s)",
  focusLocations: ["Marrakech", "Casablanca", "Maroc"]
};

export function get30sLoopStatus(): Autonomous30sLoopState {
  return { ...loopState };
}

export function stopAutonomous30sLoop(): Autonomous30sLoopState {
  is30sLoopActive = false;
  loopState.isRunning = false;
  loopState.status = "STOPPED";
  loopState.message = `Boucle 30s arrêtée après ${loopState.currentCycle} cycle(s).`;
  if (loopTimeoutRef) {
    clearTimeout(loopTimeoutRef);
    loopTimeoutRef = null;
  }
  console.log(`[ORCHESTRATOR 30S] ⏹️ Boucle autonome arrêtée par l'utilisateur.`);
  return { ...loopState };
}

export async function startAutonomous30sLoop(): Promise<Autonomous30sLoopState> {
  if (is30sLoopActive) {
    return { ...loopState };
  }

  is30sLoopActive = true;
  loopState.isRunning = true;
  console.log(`[ORCHESTRATOR 30S] 🟢 Démarrage de la boucle autonome continue (Cycle -> 30s off -> Repeat)`);

  // Exécution en arrière-plan asynchrone non-bloquante
  (async () => {
    while (is30sLoopActive) {
      loopState.currentCycle++;
      loopState.status = "SCRAPING";
      loopState.lastCycleStartedAt = new Date().toISOString();
      loopState.message = `Cycle #${loopState.currentCycle} en cours : scraping des annonces récentes (Marrakech & Casablanca)...`;
      console.log(`\n======================================================`);
      console.log(`[ORCHESTRATOR 30S] 🚀 Cycle #${loopState.currentCycle} démarré (${new Date().toLocaleTimeString("fr-FR")})`);
      console.log(`======================================================`);

      try {
        const stats = await runAutonomousCycle();
        loopState.lastCycleFinishedAt = new Date().toISOString();
        loopState.lastCycleJobsScraped = stats.jobsScraped;
        loopState.lastCycleJobsScored = stats.jobsScored;
        console.log(`[ORCHESTRATOR 30S] Cycle #${loopState.currentCycle} terminé : ${stats.jobsScraped} offres scrapées, ${stats.jobsScored} scorées.`);
      } catch (cycleErr) {
        console.error(`[ORCHESTRATOR 30S] Erreur durant le cycle #${loopState.currentCycle}:`, cycleErr);
      }

      if (!is30sLoopActive) break;

      loopState.status = "WAITING_30S";
      loopState.message = `Pause de 30 secondes en cours avant le prochain cycle (Cycle #${loopState.currentCycle} terminé)...`;
      console.log(`[ORCHESTRATOR 30S] ⏳ Pause de 30 secondes en cours avant le prochain cycle (Cycle #${loopState.currentCycle} OK)...`);

      // Attente 30 secondes (30s off)
      await new Promise<void>((resolve) => {
        loopTimeoutRef = setTimeout(() => {
          loopTimeoutRef = null;
          resolve();
        }, 30000);
      });
    }

    loopState.isRunning = false;
    loopState.status = "STOPPED";
    loopState.message = `Boucle 30s arrêtée. Total cycles exécutés: ${loopState.currentCycle}`;
  })();

  return { ...loopState };
}
