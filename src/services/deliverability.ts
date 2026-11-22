import { loadStore } from "../db/local-db";

export interface WarmupConfig {
  maxDailyApplications: number;
  minDelaySeconds: number;
  maxDelaySeconds: number;
}

export const DEFAULT_WARMUP_CONFIG: WarmupConfig = {
  maxDailyApplications: 20,
  minDelaySeconds: 45,
  maxDelaySeconds: 120,
};

/**
 * Checks how many emails were sent today to enforce the warm-up threshold (15-25/day).
 */
export function checkDailyQuota(maxPerDay: number = 20): {
  allowed: boolean;
  sentToday: number;
  remainingToday: number;
  message: string;
} {
  const store = loadStore();
  const todayStr = new Date().toISOString().split("T")[0];

  const sentToday = store.applications.filter((a) => {
    if (!a.email_sent || !a.email_sent_at) return false;
    return a.email_sent_at.startsWith(todayStr);
  }).length;

  const remaining = Math.max(0, maxPerDay - sentToday);
  const allowed = sentToday < maxPerDay;

  return {
    allowed,
    sentToday,
    remainingToday: remaining,
    message: allowed
      ? `Quota journalier respecté: ${sentToday}/${maxPerDay} envoyées aujourd'hui (${remaining} restantes).`
      : `⚠️ Quota journalier de warm-up atteint (${sentToday}/${maxPerDay}). Les prochains envois sont différés à demain pour protéger la délivrabilité.`,
  };
}

/**
 * Generates human variations of subjects & email hooks to prevent repetitive spam filtering.
 */
export function getEmailVariants(
  jobTitle: string,
  companyName: string,
  rhName: string = "",
  variant: "A" | "B" = "A"
): {
  subject: string;
  hookIntro: string;
  variantType: "A" | "B";
} {
  const salutation = rhName && rhName !== "Recruteur" ? `Bonjour ${rhName}` : "Bonjour";

  if (variant === "A") {
    // Variant A: Direct Impact & Technical Alignment
    const subjectsA = [
      `Candidature - ${jobTitle} chez ${companyName}`,
      `Profil Développeur Full-Stack - ${jobTitle} (${companyName})`,
      `Intérêt pour le poste de ${jobTitle} - ${companyName}`
    ];
    const chosenSubject = subjectsA[Math.floor(Math.random() * subjectsA.length)] ?? `Candidature - ${jobTitle}`;

    return {
      variantType: "A",
      subject: chosenSubject,
      hookIntro: `${salutation},\n\nJ'ai suivi avec beaucoup d'attention vos récentes réalisations chez ${companyName} et votre recherche d'un ${jobTitle}. Fort de 4 années d'expérience dans la conception d'architectures web et de systèmes automatisés, je souhaite vous proposer une contribution directe et immédiatement opérationnelle.`
    };
  } else {
    // Variant B: Problem-Solving & Concrete Project Results
    const subjectsB = [
      `${jobTitle} - Proposition de collaboration (${companyName})`,
      `Expérience Full-Stack & Automatisation - Candidature ${jobTitle}`,
      `${companyName} x Anas Labzar - Candidature au poste de ${jobTitle}`
    ];
    const chosenSubject = subjectsB[Math.floor(Math.random() * subjectsB.length)] ?? `Candidature - ${jobTitle}`;

    return {
      variantType: "B",
      subject: chosenSubject,
      hookIntro: `${salutation},\n\nVotre offre pour le poste de ${jobTitle} a immédiatement retenu mon attention, notamment vos enjeux techniques autour de la robustesse logicielle et de la scalabilité. Mon parcours m'a amené à piloter des projets critiques alliant Next.js, Node.js et intégration d'agents IA avec des résultats concrets et mesurables.`
    };
  }
}

/**
 * Sleep with randomized jitter to emulate authentic human sending patterns.
 */
export async function humanJitterDelay(minMs: number = 1000, maxMs: number = 3000): Promise<number> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise((resolve) => setTimeout(resolve, delay));
  return delay;
}
