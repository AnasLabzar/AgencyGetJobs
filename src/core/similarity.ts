/// ============================================================
/// Core Similarity & Embedding Utilities
/// ============================================================

// Note: En production, ceci utiliserais des embeddings OpenAI/Pinecone/Crdb
// Pour l'instant, implémentation de similarité de base basée sur le token overlap

/**
 * Tokenize une chaîne de caractères en mots uniques (lowercase)
 */
export function tokenize(text: string): Set<string> {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .split(/\s+/) // Split on whitespace
      .filter(word => word.length > 2) // Filter short words
  );
}

/**
 * Calcule la similarité de Jaccard entre deux ensembles de tokens
 */
export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  
  if (union.size === 0) return 0;
  return Math.round((intersection.size / union.size) * 100);
}

/**
 * Calcule la similarité de mots-overlap pondérée
 * Donne plus de poids aux compétences techniques exactes
 */
export function weightedKeywordSimilarity(
  offerSkills: string[],
  profileSkills: string[]
): number {
  if (!offerSkills.length || !profileSkills.length) return 0;
  
  const offerSet = new Set(offerSkills.map(s => s.toLowerCase()));
  const profileSet = new Set(profileSkills.map(s => s.toLowerCase()));
  
  // Competer les skills en commun
  let matched = 0;
  let totalOffer = offerSet.size;
  
  offerSet.forEach(skill => {
    // Vérifier correspondance exacte ou partielle
    if (profileSet.has(skill)) {
      matched++;
    } else {
      // Vérifier correspondance partielle (ex: "next.js" contient "next")
      const baseSkill = skill.replace(/\./g, "").replace(/\-/g, "");
      profileSet.forEach(profile => {
        if (profile.includes(baseSkill) || baseSkill.includes(profile.replace(/\./g, "").replace(/\-/g, ""))) {
          matched++;
        }
      });
    }
  });
  
  return totalOffer > 0 ? Math.round((matched / totalOffer) * 100) : 0;
}

/**
 * Évaluation sémantique complète d'un matching offre-profil
 * Combine: skills, experience, location, seniority
 */
export function comprehensiveMatching(
  offer: {
    tech_stack_required: string[]
    location: string
    job_title: string
  },
  profile: {
    core_competencies: string[]
    experience_years: number
    languages: string[]
  }
): {
  overallScore: number // 0-100
  breakdown: {
    skills: number
    experience: number
    location: number
    seniority: number
  }
  matchAnalysis: {
    presentSkills: string[]
    missingSkills: string[]
    experienceGap: number
    locationCompatibility: string
  }
} {
  // 1. Skills matching (40% of final score)
  const skillsScore = weightedKeywordSimilarity(offer.tech_stack_required, profile.core_competencies);
  
  // 2. Experience matching (25% of final score)
  const expRatio = Math.min(profile.experience_years / 5, 1);
  const experienceScore = Math.round(expRatio * 25);
  
  // 3. Location matching (20% of final score)
  const locationLower = offer.location.toLowerCase();
  let locationScore = 0;
  
  const locationKeywords = ["remote", "paris", "lyon", "casablanca", "marrakech", "france"];
  locationKeywords.forEach(kw => {
    if (locationLower.includes(kw)) {
      locationScore = 20;
    }
  });
  
  // 4. Seniority/Title matching (15% of final score)
  const titleLower = offer.job_title.toLowerCase();
  let seniorityScore = 0;
  
  const seniorityKeywords = ["lead", "senior", "junior", "manager", "directeur"];
  seniorityKeywords.forEach(kw => {
    if (titleLower.includes(kw)) {
      seniorityScore = 15;
    }
  });
  
  // Score total pondéré
  const overallScore = skillsScore + experienceScore + locationScore + seniorityScore;
  
  // Analyse détaillée
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  
  const offerSet = new Set(offer.tech_stack_required.map(s => s.toLowerCase()));
  profile.core_competencies.forEach(comp => {
    if (offerSet.has(comp.toLowerCase())) {
      matchedSkills.push(comp);
    } else {
      missingSkills.push(comp);
    }
  });
  
  const experienceGap = profile.experience_years < 2 ? 5 - profile.experience_years : 0;
  const locationCompatibility = locationKeywords.some(kw => locationLower.includes(kw))
    ? "Compatible"
    : "À vérifier (remote possible?)";
  
  return {
    overallScore,
    breakdown: {
      skills: skillsScore,
      experience: experienceScore,
      location: locationScore,
      seniority: seniorityScore
    },
    matchAnalysis: {
      presentSkills: matchedSkills,
      missingSkills: missingSkills.length > 0 ? missingSkills.slice(0, 10) : [],
      experienceGap,
      locationCompatibility
    }
  };
}

