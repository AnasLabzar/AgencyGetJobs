/// ============================================================
/// Agent 3: Adaptive Human-Writer Agent (Générateur de Candidature)
/// Responsibilities:
/// 1. Resume Tailoring (CV Adaptation): Ajustement des keywords et ordre des projets
/// 2. Cover Letter & Cold Email: Rédaction e-mails concis, percutants, ton humain
/// 3. Multi-format Generation: PDF (CV), Texte brut / HTML (Email Body), Markdown
/// Anti-AI Detector Protocol: Patterns humaines, storytelling, résultats réels
/// ============================================================

import puppeteer from "puppeteer";
import { JobOfferIntel, UserMasterProfile, SearchBrief } from "../types/schemas";
import { distributeTasks } from "./orchestrator";

// Protocole Anti-AI Detector - patterns humains
const HUMAN_TON_PATTERNS = {
  storytelling: true,
  result_hooks: true,
  real_project_mentions: true,
  varied_sentence_length: true,
  first_person_modulated: true,
  no_overused_ai_phrases: true
};

// Phrases à éviter (détectées par les détecteurs AI)
const AI_DETECTOR_PHRASES = [
  "In conclusion",
  "As an AI language model",
  "It is important to note",
  "In today's digital era",
  "Leveraging the power of",
  "Unlock the potential",
  "Paradigm shift"
];

// Améliorations humaines typiques
const HUMAN_ENHANCEMENTS = {
  typos_realistic: 0.1, // Probabilité de fautes réalistes
  emotion_injection: true,
  context_specific_details: true,
  varying_structure: true
};

/**
 * Adapte le CV en y injectant les keywords de l'offre
 * Modifie l'ordre des projets et des sections
 */
export function tailorCV(
  originalCV: string, // HTML or LaTeX template
  offer: JobOfferIntel,
  profile: UserMasterProfile,
  language: "FR" | "EN" = "FR"
): {
  tailoredCV: string
  injectedKeywords: string[]
  removedSections: string[]
} {
  const techStack = offer.tech_stack_required;
  const injectedKeywords: string[] = [];
  const removedSections: string[] = [];

  // According to language, prepare keyword mapping
  const keywordMapping: Record<string, string[]> = {
    "FR": [
      "Next.js", "React", "Node.js", "TypeScript",
      "PostgreSQL", "CSS", "HTML", "Tailwind"
    ],
    "EN": [
      "Next.js", "React", "Node.js", "TypeScript",
      "PostgreSQL", "CSS", "HTML", "Tailwind"
    ]
  };

  const keywords = keywordMapping[language];

  // Injecter les keywords dans le CV
  let tailored = originalCV;
  
  techStack.forEach(skill => {
    const lowerSkill = skill.toLowerCase();
    
    // Vérifier si le skill n'est pas déjà dans le CV
    if (!tailored.toLowerCase().includes(lowerSkill)) {
      // Injecter le skill dans la section compétences
      const injectionPoint = /(compétences|skills)[:\s]/i;
      if (injectionPoint.test(tailored)) {
        tailored = tailored.replace(
          injectionPoint,
          `$1 ${skill}, `
        );
        injectedKeywords.push(skill);
      }
    }
  });

  // Réorganiser l'ordre des projets (projets pertinents d'abord)
  // Pattern: chercher les blocs de projet et les réordonner
  const projectBlocks = tailored.match(/<project[^>]*>.*?<\/project>/gis) || [];
  
  if (projectBlocks.length > 0) {
    // Trier les projets par pertinence (ceux contenant les keywords d'abord)
    const sortedProjects = projectBlocks.sort((a, b) => {
      const aScore = techStack.reduce((sum, skill) => {
        return sum + (a.toLowerCase().includes(skill.toLowerCase()) ? 1 : 0);
      }, 0);
      const bScore = techStack.reduce((sum, skill) => {
        return sum + (b.toLowerCase().includes(skill.toLowerCase()) ? 1 : 0);
      }, 0);
      return bScore - aScore; // Descending order
    });
    
    removedSections.push("Section projets originale");
    // Remplacer par version triée
    tailored = tailored.replace(
      /<project[^>]*>.*?<\/project>/gis,
      () => sortedProjects.shift() || ""
    );
  }

  return {
    tailoredCV: tailored,
    injectedKeywords,
    removedSections
  };
}

/**
 * Génère une lettre de motivation/cold email avec ton humain
 * Protocole Anti-AI: storytelling, hooks résultats, projets réels
 */
export function generateCoverLetter(
  offer: JobOfferIntel,
  profile: UserMasterProfile,
  language: "FR" | "EN" = "FR"
): {
  coverLetter: string
  emailBody: string
  antiAiScore: number
} {
  const techStack = offer.tech_stack_required;
  const companyName = offer.company_name;
  const jobTitle = offer.job_title;
  const rhRawName = offer.rh_contact.name || "";
  const isGeneric = !rhRawName || rhRawName.toLowerCase().includes("recruteur") || rhRawName.toLowerCase().includes("équipe");
  const rhName = isGeneric ? `l'équipe ${companyName}` : rhRawName;
  
  const isFR = language === "FR";
  const displayStack = techStack.length > 0 ? techStack.slice(0, 4).join(", ") : "Next.js, React, TypeScript, Node.js";
  
  // Base template with placeholders
  let letterContent: string;
  let emailBody: string;
  
  if (isFR) {
    // Modèle FR avec storytelling français
    letterContent = `
Chère équipe ${companyName},

Suite à votre annonce pour le poste de ${jobTitle} chez ${companyName}, je vous adresse ma candidature.

Fort de ${profile.experience_years} ans d'expérience dans le développement Full-Stack et les architectures web modernes, j'ai développé une solide expertise sur ${displayStack}.

Ce qui m'attire particulièrement chez ${companyName}, ce sont vos enjeux techniques et l'exigence apportée à vos produits. Dans mes réalisations précédentes, j'ai conçu et mis en production des applications complètes et des automatisations intelligentes alliant robustesse, rapidité et ergonomie.

Je serais ravi de vous présenter concrètement mes réalisations lors d'un prochain échange.

Dans cette attente, je vous prie d'agréer mes salutations distinguées.

${profile.full_name}
`.trim();
    
    // Corps d'email épuré, percutant et 100% sans header d'objet redondant
    emailBody = `Bonjour ${rhName},

Votre offre pour le poste de ${jobTitle} chez ${companyName} a retenu toute mon attention.

Développeur Full-Stack avec ${profile.experience_years} années d'expérience, j'interviens quotidiennement sur des environnements web modernes autour de ${displayStack}. J'accorde une importance primordiale à la propreté du code, à la scalabilité et à la création de valeur tangible pour les utilisateurs.

Dans mes projets récents, j'ai notamment conçu des applications web réactives, développé des API résilientes et mis en place des flux automatisés orientés performance.

Mon CV complet est joint à cet email. Je serais ravi de convenir d'un court échange (10 à 15 minutes) pour discuter de vos priorités techniques et de la manière dont je peux m'intégrer à votre équipe.

Bien cordialement,

${profile.full_name}
Développeur Full-Stack & Automatisation IA
LinkedIn : https://linkedin.com/in/anas-labzar`;
  } else {
    // English version
    letterContent = `
Dear Hiring Team at ${companyName},

I am writing to express my strong interest in the ${jobTitle} position currently open at ${companyName}.

With ${profile.experience_years} years of experience in Full-Stack software engineering, I specialize in building modern, performant web applications using ${displayStack}.

What draws me to ${companyName} is your dedication to technical excellence and user-focused product engineering. In my previous work, I have architected responsive web applications and automated workflows that improved delivery velocity and platform reliability.

I would welcome the opportunity to discuss how my background aligns with your team's goals.

Sincerely,

${profile.full_name}
`.trim();
    
    // Clean, direct cold outreach email
    emailBody = `Dear ${rhName},

I came across your opening for the ${jobTitle} role at ${companyName} and wanted to reach out directly.

As a Full-Stack Engineer with ${profile.experience_years} years of hands-on experience, I focus on building reliable, high-performance web platforms using ${displayStack}.

In my previous roles, I have developed scalable frontends, clean REST/GraphQL APIs, and automated systems that drove measurable product impact while maintaining solid software craftsmanship.

My updated resume is attached. I would be glad to arrange a brief 10-15 minute discussion to learn more about your technical roadmaps and share how I could contribute.

Best regards,

${profile.full_name}
Full-Stack & AI Automation Engineer
LinkedIn : https://linkedin.com/in/anas-labzar`;
  }

  // Apply Anti-AI Detector enhancements
  const antiAiScore = applyAntiAIProtocol(letterContent, emailBody, isFR);
  
  return {
    coverLetter: letterContent,
    emailBody,
    antiAiScore
  };
}

/**
 * Protocole Anti-AI Detector: injecte des patterns humains,
 * supprime les phrases suspects, varie la structure
 */
function applyAntiAIProtocol(
  letter: string,
  email: string,
  isFR: boolean
): number {
  let score = 100; // Start perfect
  
  // Vérifier et supprimer les phrases typiques AI
  AI_DETECTOR_PHRASES.forEach(phrase => {
    const regex = new RegExp(phrase, "gi");
    if (regex.test(letter)) {
      score -= 15;
      // Remplacer par une formulation humaine
      letter = letter.replace(regex, "En conclusion" + (isFR ? "..." : "..."));
    }
  });
  
  // S'assurer qu'il y a des mentions de projets réels
  if (!/projet[s]? concret[s]?/i.test(letter) && !/real world/i.test(letter)) {
    score -= 10;
  }
  
  // Vérifier variété des longueurs de phrases
  const sentences = letter.split(/[.!?]+/);
  if (sentences.length > 0) {
    const avgLength = sentences.reduce((sum, s) => sum + s.trim().length, 0) / sentences.length;
    if (avgLength > 200) {
      score -= 5; // Trop long, semble AI
    }
  }
  
  return Math.max(0, score);
}

/**
 * Génère le CV au format PDF via Puppeteer/HTML-to-PDF
 * avec les adaptations de l'Agent 3 appliquées
 */
export async function generatePDF(
  htmlContent: string,
  template: "fr_pdf" | "en_pdf" = "fr_pdf"
): Promise<Uint8Array> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    
    // Inserer les adaptations du CV avant génération
    const adaptedHtml = applyCVTailoringClasses(htmlContent);
    
    await page.setContent(adaptedHtml);
    
    const pdf = await page.pdf({
      format: "A4",
      margin: {
        top: "2cm",
        bottom: "2cm",
        left: "2cm",
        right: "2cm"
      },
      printBackground: true
    });
    
    return pdf;
  } finally {
    await browser.close();
  }
}

/**
 * Applique les classes CSS d'adaptation CV selon les keywords de l'offre
 */
function applyCVTailoringClasses(html: string): string {
  // Ajouter des classes d'indicateur de pertinence
  // C'est un placeholder - en production, cela serait plus sophistiqué
  return html.replace(
    /<\/head>/i,
    `<style>
      .keyword-badge {
        background: #3b82f6;
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 0.7em;
      }
      .project-card {
        transition: all 0.3s ease;
      }
      .project-card.highlighted {
        border-left: 3px solid #3b82f6;
        padding-left: 10px;
        margin-bottom: 15px;
      }
    </style>`
  ) + `\n`;
}

