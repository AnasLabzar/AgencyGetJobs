/// ============================================================
/// Agent 4: Performance Analyst & Self-Improvement Strategy Agent
/// Responsibilities:
/// 1. Suivi des métriques: Taux de réponse, taux de conversion, scores
/// 2. A/B Testing des sujets d'e-mails et structure des lettres
/// 3. Retours vers le Chef Orchestrateur (ajustement mots-clés)
/// 4. Prompt Optimization automatique pour l'Agent Writer
/// ============================================================

import { JobOfferIntel, UserMasterProfile, ScoringResult } from "../types/schemas";
import { ScoringResult as ScoringType } from "../types/schemas";

// Métriques de suivi du système
export interface PerformanceMetrics {
  totalApplications: number;
  responsesReceived: number;
  interviewsScheduled: number;
  offerConversionRate: number; // % d'offres -> entretien
  emailOpenRate: number;
  emailClickRate: number;
  bounceRate: number; // Emails rebondus
  averageMatchScore: number;
  rejectionReasons: RejectionReason[];
  weeklyTrends: WeeklyTrend[];
}

// Types de raisons de rejet
export type RejectionReason = 
  | "MATCH_SCORE_TOO_LOW"
  | "SKILLS_MISMATCH"
  | "LOCATION_MISMATCH"
  | "ALREADY_APPLIED"
  | "COMPANY_CULTURE_MISMATCH";

// Tendances hebdomadaires
export interface WeeklyTrend {
  week: string; // "2026-W45"
  applications: number;
  responses: number;
  conversionRate: number;
  averageMatchScore: number;
}

// Rapport de performance complet
export interface PerformanceReport {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalApplications: number;
    responseRate: number;
    interviewRate: number;
    overallConversion: number;
  };
  metrics: PerformanceMetrics;
  insights: string[];
  recommendations: Recommendation[];
}

// Recommandations basées sur l'analyse
export type Recommendation = {
  id: string;
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  action: "ADJUST_KEYWORDS" | "CHANGE_STRATEGY" | "OPTIMIZE_PROMPT" | "ADJUST_THRESHOLDS";
};

// Analyse du score match et suggestions d'amélioration
export function analyzeMatchScoreTrends(
  historicalScores: Array<{ offerId: string; score: number; result: "approved" | "rejected" }>
): {
  averageScore: number;
  approvalRate: number;
  trend: "IMPROVING" | "STABLE" | "DECLINING";
  recommendations: string[];
} {
  if (historicalScores.length === 0) {
    return {
      averageScore: 0,
      approvalRate: 0,
      trend: "STABLE",
      recommendations: ["Aucune donnée historique disponible - démarrer le collecte de scores"],
    };
  }

  const totalScores = historicalScores.reduce((sum, item) => sum + item.score, 0);
  const averageScore = Math.round(totalScores / historicalScores.length);
  
  const approvedCount = historicalScores.filter(s => s.result === "approved").length;
  const approvalRate = Math.round((approvedCount / historicalScores.length) * 100);
  
  // Déterminer la tendance (comparer première moitié vs seconde moitié)
  const midPoint = Math.floor(historicalScores.length / 2);
  if (midPoint === 0) {
    return {
      averageScore,
      approvalRate,
      trend: "STABLE",
      recommendations: [],
    };
  }

  const firstHalf = historicalScores.slice(0, midPoint);
  const secondHalf = historicalScores.slice(midPoint);
  
  const firstHalfAvg = firstHalf.reduce((sum, s) => sum + s.score, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, s) => sum + s.score, 0) / secondHalf.length;
  
  let trend: "IMPROVING" | "STABLE" | "DECLINING";
  if (secondHalfAvg > firstHalfAvg * 1.1) {
    trend = "IMPROVING";
  } else if (secondHalfAvg < firstHalfAvg * 0.9) {
    trend = "DECLINING";
  } else {
    trend = "STABLE";
  }

  // Générer des recommandations
  const recommendations: string[] = [];
  
  if (approvalRate < 50) {
    recommendations.push(`Taux d'approbation faible (${approvalRate}%). Considérer l'augmentation du seuil de Match Score au-dessus de 75%.`);
  }
  
  if (averageScore < 60) {
    recommendations.push(`Score moyen faible (${averageScore}%). Revue du profil utilisateur ou assouplissement des filtres de recherche.`);
  }
  
  if (trend === "DECLINING") {
    recommendations.push("Tendance en baisse détectée - analyse des nouvelles plateformes de scraping nécessaires.");
  }
  
  if (trend === "IMPROVING") {
    recommendations.push("Tendance en amélioration - les ajustements récents portent leurs fruits. Maintenir la stratégie actuelle.");
  }

  return {
    averageScore,
    approvalRate,
    trend,
    recommendations,
  };
}

/**
 * Analyse des taux de réponse des e-mails et optimisation des sujets
 */
export function analyzeEmailPerformance(
  emailRecords: Array<{
    subject: string;
    opened: boolean;
    clicked: boolean;
    responded: boolean;
    matchScore: number;
  }>
): {
  openRate: number;
  clickRate: number;
  responseRate: number;
  bestPerformingSubjects: string[];
  optimizationSuggestions: string[];
} {
  const total = emailRecords.length;
  if (total === 0) {
    return {
      openRate: 0,
      clickRate: 0,
      responseRate: 0,
      bestPerformingSubjects: [],
      optimizationSuggestions: ["Aucune donnée d'e-mail disponible"],
    };
  }

  const opened = emailRecords.filter(r => r.opened).length;
  const clicked = emailRecords.filter(r => r.clicked).length;
  const responded = emailRecords.filter(r => r.responded).length;

  const openRate = Math.round((opened / total) * 100);
  const clickRate = Math.round((clicked / total) * 100);
  const responseRate = Math.round((responded / total) * 100);

  // Trouver les sujets les plus performants
  // Regrouper par suffixe/caractéristique du sujet
  const subjectGroups: Map<string, { count: number; responses: number }> = new Map();
  
  emailRecords.forEach(record => {
    // Extraire le pattern du sujet (enlever les variables dynamiques)
    const pattern = record.subject.replace(/[\d]/g, "").replace(/{[^}]+}/g, "").trim();
    const group = subjectGroups.get(pattern) || { count: 0, responses: 0 };
    group.count++;
    if (record.responded) group.responses++;
    subjectGroups.set(pattern, group);
  });

  const bestPerformingSubjects: string[] = [];
  subjectGroups.forEach((group, pattern) => {
    const rate = (group.responses / group.count) * 100;
    if (rate > responseRate * 1.2) { // Better than average by 20%
      bestPerformingSubjects.push(pattern);
    }
  });

  // Suggestions d'optimisation
  const optimizationSuggestions: string[] = [];

  if (openRate < 30) {
    optimizationSuggestions.push(`Taux d'ouverture faible (${openRate}%). Considérer de tester des sujets plus percutants ou personnalisés.`);
  }

  if (clickRate < 15) {
    optimizationSuggestions.push(`Taux de clic faible (${clickRate}%). L'e-mail pourrait manquer d'appel à l'action clair ou de valeur immédiate.`);
  }

  if (responseRate < 10) {
    optimizationSuggestions.push(`Taux de réponse faible (${responseRate}%). Les hooks résultats ou stories de projets pourraient être renforcés.`);
  }

  // Analyser la correlation entre matchScore et réponse
  const highScoreResponses = emailRecords.filter(r => r.matchScore >= 80 && r.responded).length;
  const lowScoreResponses = emailRecords.filter(r => r.matchScore < 60 && r.responded).length;
  
  if (highScoreResponses > lowScoreResponses * 2) {
    optimizationSuggestions.push("Les e-mails avec des scores de match supérieurs à 80% ont beaucoup plus de chances de réponse. Considérer un seuil minimum de 75% pour l'envoi.");
  }

  return {
    openRate,
    clickRate,
    responseRate,
    bestPerformingSubjects,
    optimizationSuggestions,
  };
}

/**
 * Optimise les prompts de l'Agent Writer basés sur les retours de performance
 */
export function optimizeWriterPrompts(
  performanceData: {
    lowResponseRate: boolean;
    lowConversionRate: boolean;
    avgMatchScore: number;
    rejectionReasons: string[];
  }
): {
  promptAdjustments: string[];
  newFocusAreas: string[];
  avoidedPhrases: string[];
} {
  const adjustments: string[] = [];
  const focusAreas: string[] = [];
  const avoided: string[] = [];

  // Si faible taux de réponse, optimiser le storytelling
  if (performanceData.lowResponseRate) {
    adjustments.push("Renforcer les hooks d'ouverture avec des résultats concrets mesurables");
    adjustments.push("Ajouter des stories de projets plus spécifiques et moins génériques");
    focusAreas.push("personnalisation_approfondie");
    avoided.push("phrases_generiques_type_nous_recherchons");
  }

  // Si faible taux de conversion, ajuster les attentes
  if (performanceData.lowConversionRate) {
    adjustments.push("Rajouter des questions d'engagement à la fin des e-mails");
    adjustments.push("Inclure des disponibilités horaires précises dans le premier e-mail");
    focusAreas.push("engagement_direct");
  }

  // Si scores de match moyens bas, ajuster le ciblage
  if (performanceData.avgMatchScore < 70) {
    adjustments.push("S'assurer que seuls les offres > 75% match soient envoyées");
    focusAreas.push("filtre_rigueur");
  }

  // Phases à éviter dans les prompts
  avoided.push("In conclusion");
  avoided.push("As an AI language model");
  avoided.push("Leveraging the power of");

  return {
    promptAdjustments: adjustments,
    newFocusAreas: focusAreas,
    avoidedPhrases: avoided,
  };
}

/**
 * Génère un rapport de performance complet à envoyer au Chef Orchestrateur
 */
export function generatePerformanceReport(
  metrics: PerformanceMetrics,
  periodStart: string,
  periodEnd: string
): PerformanceReport {
  // Calculer les insights et recommandations basés sur les métriques
  const insights: string[] = [];
  const recommendations: Recommendation[] = [];

  // exemple d'analyse simple
  const responseRate = metrics.totalApplications > 0 ? Math.round((metrics.responsesReceived / metrics.totalApplications) * 100) : 0;
  if (responseRate > 0) {
    const interviewRate = metrics.interviewsScheduled / responseRate * 100;
    insights.push(`Taux de réponse: ${responseRate}% - Taux de conversion entretien: ${interviewRate.toFixed(1)}%`);
  }

  // Recommandations basées sur le bounce rate
  if (metrics.bounceRate > 10) {
    recommendations.push({
      id: "bounce_reduction",
      title: "Réduction du taux de rebond",
      description: `Taux de rebond élevé (${metrics.bounceRate}%). Rotater les adresses email et nettoyer la base.`,
      priority: "HIGH",
      action: "CHANGE_STRATEGY",
    });
  }

  // Recommandations basées sur le match score
  if (metrics.averageMatchScore < 75) {
    recommendations.push({
      id: "match_score_threshold",
      title: "Ajuster le seuil de Match Score",
      description: `Score moyen ${metrics.averageMatchScore}% en dessous de la porte d'entrée de 75%. Considérer un filtrage plus strict.`,
      priority: "HIGH",
      action: "ADJUST_THRESHOLDS",
    });
  }

  return {
    period: {
      start: periodStart,
      end: periodEnd,
    },
    summary: {
      totalApplications: metrics.totalApplications,
      responseRate: Math.round((metrics.responsesReceived / metrics.totalApplications) * 100),
      interviewRate: metrics.interviewsScheduled > 0 ? Math.round((metrics.interviewsScheduled / metrics.totalApplications) * 100) : 0,
      overallConversion: metrics.totalApplications > 0 
        ? Math.round((metrics.interviewsScheduled / metrics.totalApplications) * 100)
        : 0,
    },
    metrics,
    insights,
    recommendations,
  };
}