import { JobOfferIntel, UserMasterProfile } from "../types/schemas";
import { saveInterviewPrep } from "../lib/db";

export interface InterviewPrepQuestion {
  question: string;
  category: "TECHNICAL" | "BEHAVIORAL" | "TRICKY" | "CLOSING";
  key_points: string[];
  suggested_answer: string;
  candidate_hook: string;
}

export interface InterviewPrepSheet {
  id?: number;
  offer_id: string;
  company_name: string;
  job_title: string;
  candidate_name: string;
  generated_at: string;
  company_overview: {
    sector: string;
    mission_statement: string;
    culture_highlights: string[];
  };
  technical_focus: {
    primary_stack: string[];
    core_concepts_to_master: string[];
  };
  questions: InterviewPrepQuestion[];
  closing_questions_to_ask: string[];
}

/**
 * Generates an end-to-end interview briefing sheet tailored to the job offer and Anas Labzar's CV.
 */
export async function generateInterviewPrepSheet(
  offer: JobOfferIntel,
  profile: UserMasterProfile
): Promise<InterviewPrepSheet> {
  const stack = offer.tech_stack_required.length > 0
    ? offer.tech_stack_required
    : ["Next.js", "TypeScript", "Node.js", "PostgreSQL"];

  const primaryTech = stack[0] || "Next.js";
  const secondaryTech = stack[1] || "TypeScript";

  const sheet: InterviewPrepSheet = {
    offer_id: offer.offer_id,
    company_name: offer.company_name,
    job_title: offer.job_title,
    candidate_name: profile.full_name,
    generated_at: new Date().toISOString(),
    company_overview: {
      sector: "Technologies de l'Information & Produits Numériques",
      mission_statement: `Développer des solutions digitales à fort impact pour les clients de ${offer.company_name}.`,
      culture_highlights: [
        "Culture produit orientée vélocité et excellence technique",
        "Collaboration transversale (équipes produit, design, ingénierie)",
        "Autonomie, rigueur architecturale et proactivité"
      ]
    },
    technical_focus: {
      primary_stack: stack,
      core_concepts_to_master: [
        `Architecture & cycle de vie des composants ${primaryTech}`,
        `Typage strict et patterns asynchrones avancés avec ${secondaryTech}`,
        "Optimisation des performances (Core Web Vitals, SSR caching, TTFB)",
        "Conception d'APIs résilientes et modélisation relationnelle de données"
      ]
    },
    questions: [
      {
        question: `Comment structurez-vous une application ${primaryTech} pour garantir sa scalabilité et sa maintenabilité ?`,
        category: "TECHNICAL",
        key_points: [
          "Séparation nette des couches (UI, Business Logic, Data Access)",
          "Utilisation des Server Actions et Suspense boundaries",
          "Gestion unifiée des états et réutilisation modulaire"
        ],
        suggested_answer: `J'applique une architecture modulaire basée sur le découpage par domaines. Dans ${primaryTech}, je maximise le recours aux Server Components pour alléger le bundle client, tout en encapsulant la logique métier dans des modules réutilisables et testables.`,
        candidate_hook: `Faire référence aux 4 ans d'expérience sur Next.js et aux dashboards à haute disponibilité développés récemment.`
      },
      {
        question: `Quelle est votre méthodologie pour détecter et corriger les goulots d'étranglement de performance ?`,
        category: "TECHNICAL",
        key_points: [
          "Profilage mémoire et requêtes réseau avec Chrome DevTools & Lighthouse",
          "Optimisation des requêtes DB (indexation, explain analyze)",
          "Mise en cache intelligente (Redis / HTTP cache-control)"
        ],
        suggested_answer: `Je commence systématiquement par mesurer plutôt que deviner, en utilisant Lighthouse et les profilers d'exécution. J'analyse ensuite les requêtes lentes de la base de données et optimise les re-renders inutiles au niveau de l'interface.`,
        candidate_hook: `Citer l'optimisation des temps de réponse sur les workflows automatisés.`
      },
      {
        question: `Parlez-moi d'une situation où vous avez fait face à un désaccord technique au sein d'une équipe. (Méthode STAR)`,
        category: "BEHAVIORAL",
        key_points: [
          "Situation : Choix d'une librairie ou architecture",
          "Action : Réalisation d'un benchmark objectif (POC)",
          "Résultat : Décision alignée et zéro friction"
        ],
        suggested_answer: `Lors d'une divergence sur le choix d'un framework d'état, j'ai proposé de monter un prototype rapide de 24h comparant les métriques clés (taille bundle, courbe d'apprentissage, maintenance). Les faits chiffrés ont permis à toute l'équipe de converger sereinement.`,
        candidate_hook: `Souligner votre posture collaborative et axée sur les faits démontrables.`
      },
      {
        question: `Question piège : Pourquoi souhaitez-vous rejoindre ${offer.company_name} en particulier plutôt qu'une autre entreprise ?`,
        category: "TRICKY",
        key_points: [
          "Preuve de recherche sur l'entreprise",
          "Adéquation avec les défis techniques actuels",
          "Alignement sur les valeurs d'innovation"
        ],
        suggested_answer: `Ce qui m'attire chez ${offer.company_name}, c'est votre ambition claire sur ${stack.slice(0, 2).join(" et ")} et l'exigence de qualité de vos livrables. Je cherche un environnement où mes compétences d'automatisation et de développement Full-Stack peuvent démultiplier l'impact de l'équipe dès le premier mois.`,
        candidate_hook: `Mentionner 1 fait marquant ou l'actualité de l'entreprise tirée de l'offre.`
      },
      {
        question: `Question piège : Quelles sont vos prétentions salariales / TJM ?`,
        category: "TRICKY",
        key_points: [
          "Fourchette réaliste du marché",
          "Priorité au périmètre du projet et aux perspectives d'évolution",
          "Flexibilité selon le package global (Remote, avantages)"
        ],
        suggested_answer: `Au vu de mes 4 années d'expertise et des responsabilités du poste, mes prétentions se situent dans la moyenne supérieure du marché pour un profil ${offer.job_title}. Je reste néanmoins ouvert à la discussion en fonction du package global et des perspectives d'évolution au sein de ${offer.company_name}.`,
        candidate_hook: `Montrer une assurance professionnelle sans bloquer la négociation.`
      }
    ],
    closing_questions_to_ask: [
      `Quels sont les objectifs prioritaires que vous aimeriez que la personne recrutée valide dans ses 90 premiers jours ?`,
      `Comment s'organisent actuellement vos cycles de release et vos revues de code ?`,
      `Quelle est votre vision de l'évolution technique de la plateforme d'ici la fin de l'année ?`
    ]
  };

  // Persist the generated prep sheet
  await saveInterviewPrep(sheet);

  return sheet;
}

