/// ============================================================
// Email Deduplication (minimal)
// Seule l'offre exacte (offer_id) déjà contactée est bloquée.
// Supporte PostgreSQL ET Local Store (data/recruitment_store.json)
// ============================================================

import { pool, query } from "../db/index";
import { loadStore, saveStore } from "../db/local-db";

type DBRow = Record<string, unknown>;

/**
 * Vérifie si une offre spécifique a déjà reçu un email (PostgreSQL + Local Store)
 */
export async function hasOfferBeenEmailed(offerId: string): Promise<boolean> {
  // 1. Essayer PostgreSQL
  try {
    const rows = (await query(
      `SELECT id FROM applications WHERE offer_id = $1 AND email_sent = true LIMIT 1`,
      [offerId]
    )) as DBRow[];
    if (rows.length > 0) return true;
  } catch {
    // PostgreSQL indisponible, on continue avec le local store
  }

  // 2. Vérifier le local store
  try {
    const store = loadStore();
    return store.applications.some(
      (a: any) => a.offer_id === offerId && a.email_sent === true
    );
  } catch {
    return false;
  }
}

/**
 * Démarrage d'un système de déduplication par Domain robuste
 * Bloque les entreprises déjà contactées (Domain Match, pas juste Offer ID)
 * Évite le spam des mêmes entreprises
 */
export async function canSendEmail(
  offerId: string,
  companyName: string = ""
): Promise<{ allowed: boolean; reason: string }> {
  // 1. Vérifier si l'offre exacte a déjà reçu un email
  const alreadyEmailed = await hasOfferBeenEmailed(offerId);
  if (alreadyEmailed) {
    return { allowed: false, reason: `Offre déjà contactée: ${offerId}` };
  }

  // 2. Vérifier si le DOMAINE de l'entreprise a déjà été contacté
  // Cela empêche de spammer plusieurs fois la même entreprise (ex: sqli.com)
  const domain = extractDomain(companyName);
  if (domain) {
    const store = loadStore();
    const alreadyContactedDomain = store.applications.some(
      (a: any) => a.email_sent === true &&
      a.rh_contact_email &&
      extractDomain(a.rh_contact_email) === domain
    );
    if (alreadyContactedDomain) {
      return { allowed: false, reason: `Entreprise déjà contactée (Domain Match): ${domain}` };
    }
  }

  return { allowed: true, reason: "Autorisé" };
}

/**
 * Extrait le domaine d'une URL ou email
 */
function extractDomain(input: string): string | null {
  try {
    const urlPart = input.replace(/^(https?:\/\/)?/, "").split("/")[0];
    return urlPart.replace(/^www\./, "").split(":")[0];
  } catch {
    return null;
  }
}

/**
 * Marque une offre comme contactée (PostgreSQL + Local Store)
 */
export async function markCompanyContacted(
  offerId: string,
  companyName: string
): Promise<void> {
  // 1. PostgreSQL
  try {
    await query(
      `INSERT INTO applications (offer_id, company_name, email_sent, email_sent_at, created_at, updated_at)
       VALUES ($1, $2, true, NOW(), NOW(), NOW())
       ON CONFLICT (offer_id) DO UPDATE SET
         email_sent = true,
         email_sent_at = NOW(),
         updated_at = NOW()`,
      [offerId, companyName]
    );
  } catch {
    // PostgreSQL indisponible, on continue avec le local store
  }

  // 2. Local Store
  try {
    const store = loadStore();
    const existingIdx = store.applications.findIndex(
      (a: any) => a.offer_id === offerId
    );
    const appData: any = {
      id: store.applications.length + 1,
      offer_id: offerId,
      company_name: companyName,
      job_title: "Poste",
      location: "Maroc",
      cv_path: null,
      cover_letter: null,
      email_subject: null,
      email_body: null,
      email_sent: true,
      email_sent_at: new Date().toISOString(),
      email_status: "sent",
      match_score: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (existingIdx >= 0) {
      store.applications[existingIdx] = { ...store.applications[existingIdx], ...appData };
    } else {
      store.applications.push(appData);
    }
    saveStore(store);
  } catch {
    // ignore
  }
}

/**
 * Retourne les stats de déduplication
 */
export async function getDedupStats(): Promise<{
  totalCompaniesContacted: number;
  totalOffersEmailed: number;
  blockedDuplicates: number;
}> {
  // 1. Essayer PostgreSQL
  try {
    const companies = (await query(
      `SELECT COUNT(DISTINCT LOWER(company_name)) as c FROM applications WHERE email_sent = true`
    )) as DBRow[];
    const offers = (await query(
      `SELECT COUNT(*) as c FROM applications WHERE email_sent = true`
    )) as DBRow[];

    return {
      totalCompaniesContacted: parseInt(String(companies[0]?.c || "0"), 10),
      totalOffersEmailed: parseInt(String(offers[0]?.c || "0"), 10),
      blockedDuplicates: 0,
    };
  } catch {
    // PostgreSQL indisponible, on utilise le local store
  }

  // 2. Local Store
  try {
    const store = loadStore();
    const sentApps = store.applications.filter((a: any) => a.email_sent === true);
    const companies = new Set(sentApps.map((a: any) => a.company_name?.toLowerCase()).filter(Boolean));
    return {
      totalCompaniesContacted: companies.size,
      totalOffersEmailed: sentApps.length,
      blockedDuplicates: 0,
    };
  } catch {
    return { totalCompaniesContacted: 0, totalOffersEmailed: 0, blockedDuplicates: 0 };
  }
}

/**
 * Validation des emails RH - Bloque les adresses "fake" ou non valides
 * Email accepted only if it ends with .com, .ma, or valid TLD
 */
export function isValidRHEmail(email?: string): boolean {
  if (!email || typeof email !== 'string') return false;

  const cleanEmail = email.trim().toLowerCase();

  // Must not be empty
  if (cleanEmail.length === 0) return false;

  // Must be a valid email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) return false;

  // Must be from a valid TLD (.com, .ma, .net, etc.)
  const validTLDs = ['.com', '.ma', '.net', '.fr', '.org', '.io', '.tech'];
  const hasValidTLD = validTLDs.some(tld => cleanEmail.endsWith(tld));
  if (!hasValidTLD) return false;

  // Block disposable/temporary emails
  const blockedPatterns = ['noreply', 'no-reply', 'donotreply', 'support', 'billing', 'marketing', 'info@linkedin.com'];
  const localPart = cleanEmail.split('@')[0]?.toLowerCase() || '';
  const isBlocked = blockedPatterns.some(pattern => localPart.includes(pattern));
  if (isBlocked) return false;

  return true;
}

/**
 * Réinitialise tout le store de déduplication (PostgreSQL + Local Store)
 */
export async function resetDedup(): Promise<void> {
  // 1. PostgreSQL
  try {
    await query(`DELETE FROM applications WHERE email_sent = true`);
  } catch {
    // ignore
  }

  // 2. Local Store
  try {
    const store = loadStore();
    store.applications = store.applications.filter((a: any) => a.email_sent !== true);
    saveStore(store);
  } catch {
    // ignore
  }
}
