/// ============================================================
// Multi-Provider LLM Service with Quota Rotation
// Providers: Google AI Studio (Gemini), OpenAI-compatible fallback
// ============================================================

import dotenv from "dotenv";

dotenv.config();

export type LLMProvider = "gemini" | "openai";

export interface ProviderConfig {
  name: LLMProvider;
  apiKey: string | undefined;
  baseUrl: string | undefined;
  model: string;
  rpmLimit: number; // requests per minute
  tpmLimit: number; // tokens per minute
  priority: number; // lower = higher priority
  enabled: boolean;
}

export interface ProviderUsage {
  requestsLastMinute: number;
  tokensLastMinute: number;
  lastRequestTime: number;
  blockedUntil: number;
  consecutiveFailures: number;
}

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash-exp";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    name: "gemini",
    apiKey: process.env.GEMINI_API_KEY,
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    rpmLimit: 15, // Gemini free tier ~15 RPM
    tpmLimit: 32000,
    priority: 1,
    enabled: !!process.env.GEMINI_API_KEY,
  },
  {
    name: "openai",
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL,
    model: process.env.DEFAULT_MODEL || DEFAULT_OPENAI_MODEL,
    rpmLimit: 60,
    tpmLimit: 120000,
    priority: 2,
    enabled: !!process.env.OPENAI_API_KEY,
  },
];

class QuotaManager {
  private usage: Map<LLMProvider, ProviderUsage> = new Map();

  constructor() {
    PROVIDER_CONFIGS.forEach((p) => {
      this.usage.set(p.name, {
        requestsLastMinute: 0,
        tokensLastMinute: 0,
        lastRequestTime: 0,
        blockedUntil: 0,
        consecutiveFailures: 0,
      });
    });
  }

  /**
   * Sélectionne le meilleur provider disponible selon les quotas et priorité
   */
  selectProvider(): LLMProvider | null {
    const now = Date.now();
    const available = PROVIDER_CONFIGS
      .filter((p) => p.enabled && p.apiKey)
      .filter((p) => {
        const u = this.usage.get(p.name)!;
        return now > u.blockedUntil; // pas bloqué
      })
      .sort((a, b) => a.priority - b.priority);

    if (available.length === 0) return null;

    // Vérifier les limites RPM pour chaque provider par ordre de priorité
    for (const p of available) {
      const u = this.usage.get(p.name)!;
      // Reset fenêtre d'1 minute si nécessaire
      if (now - u.lastRequestTime > 60000) {
        u.requestsLastMinute = 0;
        u.tokensLastMinute = 0;
        u.lastRequestTime = now;
      }
      if (u.requestsLastMinute < p.rpmLimit) {
        return p.name;
      }
    }

    // Tous les providers sont à leur limite RPM, retourner celui avec priorité la plus haute
    return available[0]?.name ?? null;
  }

  /**
   * Enregistre une requête réussie
   */
  recordSuccess(provider: LLMProvider, tokens: number = 0): void {
    const u = this.usage.get(provider)!;
    const now = Date.now();
    if (now - u.lastRequestTime > 60000) {
      u.requestsLastMinute = 0;
      u.tokensLastMinute = 0;
      u.lastRequestTime = now;
    }
    u.requestsLastMinute += 1;
    u.tokensLastMinute += tokens;
    u.consecutiveFailures = 0;
  }

  /**
   * Enregistre une erreur (quota exceeded, 429, etc.)
   */
  recordFailure(provider: LLMProvider, isQuota: boolean = false): void {
    const u = this.usage.get(provider)!;
    u.consecutiveFailures += 1;
    if (isQuota) {
      // Bloquer ce provider pendant 2 minutes en cas de quota dépassé
      u.blockedUntil = Date.now() + 120000;
      console.warn(`[LLM] Provider ${provider} bloqué 2min (quota dépassé)`);
    }
    // Si trop d'échecs consécutifs, bloquer temporairement
    if (u.consecutiveFailures >= 3) {
      u.blockedUntil = Date.now() + 60000;
      console.warn(`[LLM] Provider ${provider} bloqué 1min (échecs répétés)`);
    }
  }

  /**
   * Retourne le statut de tous les providers pour le dashboard
   */
  getStatus(): Array<{
    name: LLMProvider;
    enabled: boolean;
    available: boolean;
    requestsLastMinute: number;
    rpmLimit: number;
    consecutiveFailures: number;
    blockedUntil: number;
  }> {
    const now = Date.now();
    return PROVIDER_CONFIGS.map((p) => {
      const u = this.usage.get(p.name)!;
      return {
        name: p.name,
        enabled: p.enabled,
        available: p.enabled && !!p.apiKey && now > u.blockedUntil && u.requestsLastMinute < p.rpmLimit,
        requestsLastMinute: u.requestsLastMinute,
        rpmLimit: p.rpmLimit,
        consecutiveFailures: u.consecutiveFailures,
        blockedUntil: u.blockedUntil,
      };
    });
  }
}

export const quotaManager = new QuotaManager();

/**
 * Appelle le LLM via le meilleur provider disponible avec rotation automatique
 */
export async function callLLM(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number; preferredProvider?: LLMProvider }
): Promise<{ text: string; provider: LLMProvider; tokens?: number }> {
  const provider = options?.preferredProvider || quotaManager.selectProvider();

  if (!provider) {
    throw new Error("Aucun provider LLM disponible (quota épuisé ou clé API manquante)");
  }

  const config = PROVIDER_CONFIGS.find((p) => p.name === provider)!;

  try {
    let text: string;
    let tokens = 0;

    if (provider === "gemini") {
      const result = await callGemini(config, prompt, options);
      text = result.text;
      tokens = result.tokens ?? 0;
    } else {
      const result = await callOpenAICompatible(config, prompt, options);
      text = result.text;
      tokens = result.tokens ?? 0;
    }

    quotaManager.recordSuccess(provider, tokens);
    return { text, provider, tokens };
  } catch (error: unknown) {
    const isQuota =
      error instanceof Error &&
      (error.message.includes("429") ||
        error.message.includes("quota") ||
        error.message.includes("rate limit"));
    quotaManager.recordFailure(provider, isQuota);

    // Essayer le provider suivant en fallback
    const fallback = PROVIDER_CONFIGS
      .filter((p) => p.enabled && p.apiKey && p.name !== provider)
      .sort((a, b) => a.priority - b.priority)[0];

    if (fallback) {
      console.warn(`[LLM] Fallback vers ${fallback.name} après échec de ${provider}`);
      return callLLM(prompt, { ...options, preferredProvider: fallback.name });
    }

    throw error;
  }
}

async function callGemini(
  config: ProviderConfig,
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<{ text: string; tokens?: number }> {
  const url = `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;
  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 2048,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const tokens = data.usageMetadata?.totalTokenCount || 0;

  return { text, tokens };
}

async function callOpenAICompatible(
  config: ProviderConfig,
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<{ text: string; tokens?: number }> {
  const url = `${config.baseUrl}/chat/completions`;
  const body: any = {
    model: config.model,
    messages: [{ role: "user", content: prompt }],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  const tokens = data.usage?.total_tokens || 0;

  return { text, tokens };
}
