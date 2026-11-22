"use client";

import { useEffect, useState } from "react";

interface ConfigItem {
  config_key: string;
  config_value: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingSMTP, setTestingSMTP] = useState(false);
  const [smtpResult, setSmtpResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data.config || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updateConfig = async (key: string, value: string) => {
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setConfig((prev) =>
      prev.map((item) => (item.config_key === key ? { ...item, config_value: value } : item))
    );
  };

  const handleTestSMTP = async () => {
    setTestingSMTP(true);
    setSmtpResult(null);
    try {
      const res = await fetch("/api/smtp/test", { method: "POST" });
      const data = await res.json();
      setSmtpResult(data);
    } catch (err: any) {
      setSmtpResult({ success: false, message: err.message || "Erreur de test SMTP" });
    } finally {
      setTestingSMTP(false);
    }
  };

  const getConfigVal = (key: string, fallback: string = "") => {
    const found = config.find((c) => c.config_key === key);
    return found ? found.config_value : fallback;
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-indigo-500 mb-6"></div>
        <p className="text-slate-400 font-medium">Chargement des paramètres...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Paramètres & Stratégies</h1>
        <p className="text-slate-400 mt-1">
          Supervision des agents, mode d'approbation et politiques de délivrabilité
        </p>
      </div>

      {/* Human in the loop & Automation Modes */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>🛡️</span> Mode de Postulation & Human-in-the-Loop (HITL)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Mode Approbation Obligatoire (HITL)</span>
                <input
                  type="checkbox"
                  checked={getConfigVal("hitl_approval_mode", "true") === "true"}
                  onChange={(e) => updateConfig("hitl_approval_mode", e.target.checked ? "true" : "false")}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Les candidatures sont qualifiées par l'IA et stockées en statut APPROUVÉ, mais nécessitent votre clic de validation avant l'envoi réel de l'email.
              </p>
            </div>
            <div className="mt-4">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                getConfigVal("hitl_approval_mode", "true") === "true"
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "bg-slate-800 text-slate-500"
              }`}>
                {getConfigVal("hitl_approval_mode", "true") === "true" ? "Actif (Recommandé)" : "Désactivé"}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Mode 100% Autonome</span>
                <input
                  type="checkbox"
                  checked={getConfigVal("autonomous_mode", "false") === "true"}
                  onChange={(e) => updateConfig("autonomous_mode", e.target.checked ? "true" : "false")}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                L'agent envoie automatiquement les candidatures sans intervention si le score dépasse le seuil minimal de 75%.
              </p>
            </div>
            <div className="mt-4">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                getConfigVal("autonomous_mode", "false") === "true"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-slate-800 text-slate-500"
              }`}>
                {getConfigVal("autonomous_mode", "false") === "true" ? "Actif" : "Inactif"}
              </span>
            </div>
          </div>
        </div>

        {/* Deliverability & Warmup Slider */}
        <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-semibold text-slate-300 flex items-center justify-between">
              <span>Seuil de Match Score minimal (%)</span>
              <span className="text-indigo-400 font-bold">{getConfigVal("match_score_threshold", "75")}%</span>
            </label>
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              defaultValue={getConfigVal("match_score_threshold", "75")}
              onChange={(e) => updateConfig("match_score_threshold", e.target.value)}
              className="w-full mt-2 accent-indigo-500 cursor-pointer"
            />
            <p className="text-xs text-slate-500 mt-1">
              Les offres avec un score inférieur à ce seuil sont rejetées automatiquement.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300 flex items-center justify-between">
              <span>Warm-up Quota (Max candidatures / jour)</span>
              <span className="text-indigo-400 font-bold">{getConfigVal("max_applications_per_day", "20")} / jour</span>
            </label>
            <input
              type="range"
              min="10"
              max="30"
              step="1"
              defaultValue={getConfigVal("max_applications_per_day", "20")}
              onChange={(e) => updateConfig("max_applications_per_day", e.target.value)}
              className="w-full mt-2 accent-indigo-500 cursor-pointer"
            />
            <p className="text-xs text-slate-500 mt-1">
              Recommandation anti-spam : 15 à 25 candidatures par jour max pour préserver la réputation de l'adresse Gmail.
            </p>
          </div>
        </div>
      </div>

      {/* SMTP Gmail Live Card */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>✉️</span> Service d'Envoi SMTP (Gmail)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Envoi d'e-mails professionnels human-like avec pièce jointe PDF réelle.
          </p>
        </div>

        {smtpResult && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${
              smtpResult.success
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            <span>{smtpResult.success ? "✅" : "⚠️"}</span>
            <span>{smtpResult.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase">Compte Gmail</label>
            <input
              type="email"
              value="principeanas80@gmail.com"
              readOnly
              className="w-full px-3 py-2 border border-slate-700 rounded-lg text-sm bg-slate-900 text-slate-300 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase">Mot de passe d'application</label>
            <input
              type="text"
              value="•••• •••• •••• •••• (Configuré)"
              readOnly
              className="w-full px-3 py-2 border border-slate-700 rounded-lg text-sm bg-slate-900 text-emerald-400 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase">Serveur SMTP</label>
            <input
              type="text"
              value="smtp.gmail.com:465 (SSL Sécurisé)"
              readOnly
              className="w-full px-3 py-2 border border-slate-700 rounded-lg text-sm bg-slate-900 text-slate-300 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase">Expéditeur Affiché</label>
            <input
              type="text"
              value="Anas Labzar <principeanas80@gmail.com>"
              readOnly
              className="w-full px-3 py-2 border border-slate-700 rounded-lg text-sm bg-slate-900 text-slate-300 font-mono"
            />
          </div>
        </div>

        <button
          onClick={handleTestSMTP}
          disabled={testingSMTP}
          className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {testingSMTP ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Test de poignée de main SMTP en cours...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Tester la connexion SMTP Gmail</span>
            </>
          )}
        </button>
      </div>

      {/* Profile & Document Intel Card */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white mb-4">📋 CVs & Intelligence Profil Utilisateur</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <p className="font-bold text-white text-sm mb-1">🇫🇷 CV Principal (Français)</p>
            <p className="text-slate-400 font-mono truncate">public/pdf/cv Anas Labzar - Fr (1).pdf</p>
            <p className="text-emerald-400 mt-2">✓ Prêt pour l'envoi en pièce jointe automatique</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <p className="font-bold text-white text-sm mb-1">🇨🇦 CV International (Anglais Canadien)</p>
            <p className="text-slate-400 font-mono truncate">public/pdf/CV EN CANADIEN _ ANAS LABZAR.pdf</p>
            <p className="text-emerald-400 mt-2">✓ Prêt pour les candidatures anglophones et remote</p>
          </div>
        </div>
      </div>
    </div>
  );
}
