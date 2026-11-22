"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "targeting" | "agents" | "smtp">("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Profile state (Dynamic for ANY user)
  const [profile, setProfile] = useState<any>({
    full_name: "",
    title: "",
    email: "",
    phone: "",
    linkedin_url: "",
    experience_years: 4,
    core_competencies: [] as string[],
    languages: [] as string[],
    bio: ""
  });

  // Config state (Dynamic agent settings)
  const [config, setConfig] = useState<Record<string, string>>({
    autonomous_mode: "false",
    hitl_approval_mode: "true",
    match_score_threshold: "75",
    max_applications_per_day: "20",
    scraping_interval_seconds: "30",
    target_locations: "Marrakech, Casablanca, Maroc, Remote",
    target_roles: "Full-Stack Engineer, Web Developer, AI Automation Engineer, Project Manager",
    ab_testing_enabled: "true",
    anti_ai_protocol: "true",
    preferred_cv_language: "AUTO"
  });

  // Raw skill tag input helper
  const [competenciesInput, setCompetenciesInput] = useState("");

  // SMTP test state
  const [testingSMTP, setTestingSMTP] = useState(false);
  const [smtpResult, setSmtpResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          if (data.profile) {
            setProfile(data.profile);
            setCompetenciesInput(
              Array.isArray(data.profile.core_competencies)
                ? data.profile.core_competencies.join(", ")
                : ""
            );
          }
          if (data.configMap) {
            setConfig((prev) => ({ ...prev, ...data.configMap }));
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveSuccess(null);

    // Parse competencies
    const parsedCompetencies = competenciesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedProfile = {
      ...profile,
      core_competencies: parsedCompetencies
    };

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          profile: updatedProfile
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(updatedProfile);
        setSaveSuccess("✅ Paramètres et profil utilisateur enregistrés avec succès !");
        setTimeout(() => setSaveSuccess(null), 4000);
      }
    } catch (err: any) {
      alert("Erreur lors de l'enregistrement : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSMTP = async () => {
    setTestingSMTP(true);
    setSmtpResult(null);
    try {
      const res = await fetch("/api/smtp/test", { method: "POST" });
      const data = await res.json();
      setSmtpResult(data);
    } catch (err: any) {
      setSmtpResult({ success: false, message: err.message || "Erreur de connexion SMTP" });
    } finally {
      setTestingSMTP(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[450px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-slate-400 font-medium text-sm">Chargement du Studio de Configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Save Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0D1322]/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Configuration Multi-Utilisateur</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Studio des Paramètres & Personas</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Adaptez les agents IA à n'importe quel profil, ville cible, seuil et stratégie de recrutement.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
              <span>Enregistrement...</span>
            </>
          ) : (
            <>
              <span>💾 Enregistrer les Paramètres</span>
            </>
          )}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center gap-2 animate-in fade-in">
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Tabs bar */}
      <div className="flex border-b border-slate-800 space-x-1 sm:space-x-2 overflow-x-auto pb-1">
        {[
          { id: "profile", label: "👤 Profil & Persona", desc: "Identité & Compétences" },
          { id: "targeting", label: "📍 Villes & Ciblage", desc: "Priorités géographiques" },
          { id: "agents", label: "🤖 Intelligence Agents", desc: "Seuil Match & HITL" },
          { id: "smtp", label: "🛡️ Délivrabilité & Mail", desc: "SMTP, IMAP & Quotas" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 rounded-t-xl text-xs sm:text-sm font-bold transition-all text-left flex flex-col ${
              activeTab === tab.id
                ? "bg-slate-800/80 text-white border-t-2 border-indigo-500 shadow-lg"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] font-normal text-slate-500">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: Profil Utilisateur */}
      {activeTab === "profile" && (
        <div className="p-6 md:p-8 rounded-2xl bg-[#0D1322]/80 border border-slate-800/80 shadow-xl space-y-6">
          <div className="border-b border-slate-800/80 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>👤</span> Informations Personnelles de Candidature
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Ces données sont injectées dans les briefs de recherche, l'adaptation du CV et la signature des e-mails d'approche.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Nom & Prénom Complet</label>
              <input
                type="text"
                value={profile.full_name || ""}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Ex: Anas Labzar, Sarah Bennani..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Titre Professionnel Actuel</label>
              <input
                type="text"
                value={profile.title || ""}
                onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                placeholder="Ex: Développeur Full-Stack, AI Automation Engineer..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Email Professionnel (Expéditeur)</label>
              <input
                type="email"
                value={profile.email || ""}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="Ex: mon_email@gmail.com"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Numéro de Téléphone</label>
              <input
                type="text"
                value={profile.phone || ""}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="Ex: +212 6 XX XX XX XX"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Profil LinkedIn ou Portfolio</label>
              <input
                type="text"
                value={profile.linkedin_url || ""}
                onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/votre-profil"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Années d'Expérience Clés</label>
              <input
                type="number"
                min="0"
                max="30"
                value={profile.experience_years || 4}
                onChange={(e) => setProfile({ ...profile, experience_years: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold text-slate-300">Compétences Techniques & Stack (séparées par des virgules)</label>
            <textarea
              rows={3}
              value={competenciesInput}
              onChange={(e) => setCompetenciesInput(e.target.value)}
              placeholder="Next.js, React, Node.js, TypeScript, PostgreSQL, Python, Docker, Tailwind CSS, GraphQL..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-indigo-500 focus:outline-none font-mono text-xs"
            />
            <p className="text-[11px] text-slate-500">
              L'Agent Orchestrateur utilise cette liste pour calculer le Match Score et l'adéquation technique avec les offres scrapées.
            </p>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold text-slate-300">Bio & Pitch d'accroche personnalisé</label>
            <textarea
              rows={2}
              value={profile.bio || ""}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Courte présentation résumant vos points forts..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* TAB 2: Villes & Ciblage */}
      {activeTab === "targeting" && (
        <div className="p-6 md:p-8 rounded-2xl bg-[#0D1322]/80 border border-slate-800/80 shadow-xl space-y-6">
          <div className="border-b border-slate-800/80 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>📍</span> Stratégie Géographique & Rôles Cibles
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configurez vos priorités de recherche. Le système adapte automatiquement les scores et le scraping en direct.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Villes et Localisations Cibles (par ordre de priorité)</span>
                <span className="text-indigo-400 text-[11px]">Ville #1 (+25 pts) • Ville #2 (+22 pts)</span>
              </label>
              <input
                type="text"
                value={config.target_locations || ""}
                onChange={(e) => setConfig({ ...config, target_locations: e.target.value })}
                placeholder="Ex: Marrakech, Casablanca, Rabat, Paris, Remote"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-indigo-500 focus:outline-none font-mono"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {(config.target_locations || "")
                  .split(",")
                  .map((c, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                        i === 0
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : i === 1
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {i === 0 ? "⭐ #1 " : i === 1 ? "🏢 #2 " : "📍 "} {c.trim()}
                    </span>
                  ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-300">Postes et Titres de Postes Ciblés</label>
              <input
                type="text"
                value={config.target_roles || ""}
                onChange={(e) => setConfig({ ...config, target_roles: e.target.value })}
                placeholder="Ex: Full-Stack Engineer, Développeur Web, AI Automation Engineer, Project Manager"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                Ces mots-clés alimentent la recherche LinkedIn Live et les requêtes vers les APIs d'offres d'emploi.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800/80">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Cadence de la Boucle de Scraping Autonome</span>
                <span className="text-emerald-400 font-bold">{config.scraping_interval_seconds || "30"} secondes</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                {[
                  { label: "⚡ 30 Secondes", value: "30" },
                  { label: "⏱️ 60 Secondes", value: "60" },
                  { label: "☕ 5 Minutes", value: "300" },
                  { label: "🕐 15 Minutes", value: "900" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setConfig({ ...config, scraping_interval_seconds: opt.value })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      config.scraping_interval_seconds === opt.value
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Intelligence Agents & Decision Gate */}
      {activeTab === "agents" && (
        <div className="p-6 md:p-8 rounded-2xl bg-[#0D1322]/80 border border-slate-800/80 shadow-xl space-y-6">
          <div className="border-b border-slate-800/80 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🤖</span> Paramètres de l'IA & Décisions Autonomes
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Contrôlez le degré d'autonomie des agents et les règles de validation avant rédaction et envoi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Mode Human-in-the-Loop (HITL)</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Les candidatures sont préparées par l'IA mais nécessitent votre clic d'approbation avant l'envoi.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.hitl_approval_mode === "true"}
                  onChange={(e) => setConfig({ ...config, hitl_approval_mode: e.target.checked ? "true" : "false" })}
                  className="w-5 h-5 accent-indigo-500 rounded cursor-pointer shrink-0 ml-4"
                />
              </div>
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                config.hitl_approval_mode === "true" ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-slate-500"
              }`}>
                {config.hitl_approval_mode === "true" ? "Activé (Sécurité maximale)" : "Désactivé"}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Mode 100% Autonome</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Envoi automatique direct si l'adresse RH est certifiée et le score dépasse le seuil minimal.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.autonomous_mode === "true"}
                  onChange={(e) => setConfig({ ...config, autonomous_mode: e.target.checked ? "true" : "false" })}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer shrink-0 ml-4"
                />
              </div>
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                config.autonomous_mode === "true" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"
              }`}>
                {config.autonomous_mode === "true" ? "Mode Robot Actif" : "Inactif"}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
                <span>Seuil Minimal de Match Score (Decision Gate)</span>
                <span className="text-indigo-400 font-extrabold text-sm">{config.match_score_threshold || "75"}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={config.match_score_threshold || "75"}
                onChange={(e) => setConfig({ ...config, match_score_threshold: e.target.value })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Les opportunités avec un score inférieur à {config.match_score_threshold || "75"}% ne déclenchent pas de rédaction.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Protocole Anti-Détection IA</p>
                  <p className="text-[11px] text-slate-400">Stylométrie humaine et storytelling fluide</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.anti_ai_protocol === "true"}
                  onChange={(e) => setConfig({ ...config, anti_ai_protocol: e.target.checked ? "true" : "false" })}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">A/B Testing des Emails</p>
                  <p className="text-[11px] text-slate-400">Variante A (Technique) & Variante B (Impact)</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.ab_testing_enabled === "true"}
                  onChange={(e) => setConfig({ ...config, ab_testing_enabled: e.target.checked ? "true" : "false" })}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SMTP, IMAP & Deliverability Shield */}
      {activeTab === "smtp" && (
        <div className="p-6 md:p-8 rounded-2xl bg-[#0D1322]/80 border border-slate-800/80 shadow-xl space-y-6">
          <div className="border-b border-slate-800/80 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🛡️</span> Deliverability Shield & Connecteurs Email
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Surveillance de la réputation de domaine, warm-up journalier et test de connectivité.
            </p>
          </div>

          {smtpResult && (
            <div
              className={`p-4 rounded-xl border text-sm flex items-center gap-2 font-medium ${
                smtpResult.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              }`}
            >
              <span>{smtpResult.success ? "✅" : "⚠️"}</span>
              <span>{smtpResult.message}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
                <span>Plafond Journalier de Warm-Up (Max candidatures / 24h)</span>
                <span className="text-indigo-400 font-extrabold text-sm">{config.max_applications_per_day || "20"} / jour</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={config.max_applications_per_day || "20"}
                onChange={(e) => setConfig({ ...config, max_applications_per_day: e.target.value })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Recommandation pour Gmail Personnel : 15 à 25 envois maximum par jour pour éviter les restrictions de distribution.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-xs font-bold text-white mb-1">Serveur Sortant (SMTP)</p>
                <p className="text-xs text-emerald-400 font-mono">smtp.gmail.com:465 (SSL)</p>
                <p className="text-[11px] text-slate-500 mt-1">Authentification sécurisée par mot de passe d'application</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-xs font-bold text-white mb-1">Serveur Entrant (IMAP Boîte RH)</p>
                <p className="text-xs text-indigo-400 font-mono">imap.gmail.com:993 (SSL)</p>
                <p className="text-[11px] text-slate-500 mt-1">Surveillance continue des convocations et tests</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestSMTP}
                disabled={testingSMTP}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {testingSMTP ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    <span>Test de connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Tester la Poignée de Main SMTP</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
