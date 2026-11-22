"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [inboxStats, setInboxStats] = useState<any>(null);
  const [topInterview, setTopInterview] = useState<any>(null);
  const [llmProviders, setLlmProviders] = useState<any[]>([]);
  const [dedupStats, setDedupStats] = useState<any>(null);
  const [userConfig, setUserConfig] = useState<any>({
    target_locations: "Marrakech, Casablanca, Maroc, Remote"
  });
  const [loading, setLoading] = useState(true);

  // 30s Loop state
  const [loopState, setLoopState] = useState<any>({
    isRunning: false,
    intervalSeconds: 30,
    currentCycle: 0,
    status: "IDLE",
    message: "Boucle de scraping prête",
    focusLocations: ["Marrakech", "Casablanca", "Maroc"]
  });
  const [loopActionLoading, setLoopActionLoading] = useState(false);

  const fetchDashboardData = () => {
    Promise.all([
      fetch("/api/jobs").then((r) => r.json()),
      fetch("/api/applications").then((r) => r.json()),
      fetch("/api/inbox").then((r) => r.json()),
      fetch("/api/scraper/loop").then((r) => r.json()),
      fetch("/api/llm").then((r) => r.json()),
      fetch("/api/dedup").then((r) => r.json()),
      fetch("/api/config").then((r) => r.json()),
    ])
      .then(([jobsData, appsData, inboxData, loopData, llmData, dedupData, configData]) => {
        setRecentJobs(jobsData.jobs || []);
        setRecentApps(appsData.applications || []);
        if (inboxData.success) {
          setInboxStats(inboxData.stats || {});
          const interviews = (inboxData.messages || []).filter(
            (m: any) => m.category === "INTERVIEW_INVITATION"
          );
          setTopInterview(interviews[0] || (inboxData.messages || [])[0] || null);
        }
        if (loopData.success && loopData.loop) {
          setLoopState(loopData.loop);
        }
        if (llmData.success) {
          setLlmProviders(llmData.providers || []);
        }
        if (dedupData.success) {
          setDedupStats(dedupData);
        }
        if (configData.success && configData.configMap) {
          setUserConfig(configData.configMap);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();

    // Poll loop status every 4 seconds to reflect real-time 30s changes
    const timer = setInterval(() => {
      fetch("/api/scraper/loop")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.loop) {
            setLoopState(data.loop);
          }
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const handleToggleLoop = async (action: "start" | "stop" | "cycle_now") => {
    setLoopActionLoading(true);
    try {
      const res = await fetch("/api/scraper/loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success && data.loop) {
        setLoopState(data.loop);
      }
      fetchDashboardData();
    } catch (e) {
      console.error("Erreur boucle scraper:", e);
    } finally {
      setLoopActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-slate-400 font-medium">Chargement des données temps réel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 0. KPI STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <div className="p-5 rounded-2xl bg-[#0D1322]/90 border border-slate-800 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-indigo-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Opportunités Détectées</span>
            <span className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-sm font-bold">💼</span>
          </div>
          <p className="text-3xl font-black text-white mt-2">{recentJobs.length}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400 font-semibold">
            <span>↑ Live Scraping</span>
            <span className="text-slate-500">• LinkedIn & RemoteOK</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D1322]/90 border border-slate-800 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entretiens Détectés</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-sm font-bold">🎯</span>
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-2">{inboxStats?.interviewsCount || (topInterview ? 1 : 0)}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400 font-semibold">
            <span>✓ IMAP Vérifié</span>
            <span className="text-slate-500">• Boîte Gmail</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D1322]/90 border border-slate-800 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-purple-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Candidatures Générées</span>
            <span className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center text-sm font-bold">📄</span>
          </div>
          <p className="text-3xl font-black text-white mt-2">{recentApps.length}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-indigo-400 font-semibold">
            <span>🛡️ Deliverability Shield</span>
            <span className="text-slate-500">• Anti-AI</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D1322]/90 border border-slate-800 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Villes Ciblées</span>
            <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-sm font-bold">📍</span>
          </div>
          <p className="text-sm font-extrabold text-white mt-2 truncate">
            {userConfig.target_locations ? userConfig.target_locations.split(",").slice(0, 2).join(", ") : "Marrakech, Casa"}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-400 font-semibold">
            <span>Priorité Scoring Dynamique</span>
          </div>
        </div>
      </div>

      {/* 1. HERO SPOTLIGHT : Focus sur le plus proche entretien (100% réel) */}
      {topInterview && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-500/50 p-6 md:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-slate-950 uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping"></span>
                  🎯 Entretien Prioritaire Détecté
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Score pertinence : {topInterview.importance_score || 10}/10
                </span>
                <span className="text-xs text-slate-400">
                  Reçu le {new Date(topInterview.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                {topInterview.sender_name} ({topInterview.company_name})
              </h2>

              <p className="text-sm md:text-base text-slate-200 leading-relaxed font-medium">
                {topInterview.subject}
              </p>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-xs md:text-sm text-slate-300">
                <p className="font-semibold text-emerald-400 mb-1 flex items-center gap-2">
                  <span>💡 Synthèse IA :</span>
                </p>
                <p>{topInterview.summary}</p>
                <p className="mt-2 text-slate-400 font-mono text-[11px]">
                  Action conseillée : {topInterview.suggested_action}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              {topInterview.full_body && topInterview.full_body.includes("jobs.micro1.ai") && (
                <a
                  href="https://jobs.micro1.ai/post/526b27c6-df46-441e-b04d-97dbeb4f5904?referralCode=11bf6530-35c5-40d7-9ae0-55c5d05f2da2&utm_source=referral&utm_medium=share&utm_campaign=job_referral"
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold shadow-lg shadow-emerald-500/30 transition-all text-center flex items-center justify-center gap-2"
                >
                  <span>🚀 Passer l'entretien AI Micro1 ($70-$100/h)</span>
                  <span>↗</span>
                </a>
              )}
              <Link
                href="/dashboard/inbox"
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all text-center flex items-center justify-center gap-2"
              >
                <span>📬 Répondre avec l'IA dans l'Inbox</span>
                <span>➔</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2. BARRE DE CONTRÔLE : Scraper Autonome 30s Loop (Pause 30s & Repeat) */}
      <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${loopState.isRunning ? "bg-emerald-400 animate-pulse ring-4 ring-emerald-500/20" : "bg-slate-500"}`}></span>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Boucle Autonome 30s :</span>
                <span className={loopState.isRunning ? "text-emerald-400" : "text-slate-400"}>
                  {loopState.isRunning ? "🟢 Active (Cycle -> 30s off -> Repeat)" : "⏸️ En Pause"}
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              <span className="text-amber-400 font-semibold">📍 Focus Villes :</span> {userConfig.target_locations || "Marrakech & Casablanca"} (Dernières annonces triées par date)
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              {loopState.message} • Cycles achevés : <span className="text-white font-bold">{loopState.currentCycle || 0}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {loopState.isRunning ? (
              <button
                onClick={() => handleToggleLoop("stop")}
                disabled={loopActionLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20 flex items-center gap-2"
              >
                <span>⏹️ Arrêter la boucle</span>
              </button>
            ) : (
              <button
                onClick={() => handleToggleLoop("start")}
                disabled={loopActionLoading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                <span>▶️ Lancer la boucle ({loopState.intervalSeconds || 30}s off)</span>
              </button>
            )}

            <button
              onClick={() => handleToggleLoop("cycle_now")}
              disabled={loopActionLoading}
              className="px-4 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold transition-all border border-indigo-500/30 flex items-center gap-2"
            >
              <span>⚡ Cycle immédiat</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. OFFRES RÉCENTES & CANDIDATURES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>💼</span> Dernières opportunités ({userConfig.target_locations ? userConfig.target_locations.split(",").slice(0, 2).join(" & ") : "Cibles"})
            </h3>
            <Link
              href="/dashboard/jobs"
              className="text-xs font-medium px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20"
            >
              Voir tout ({recentJobs.length}) ➔
            </Link>
          </div>
          {recentJobs.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-500 rounded-xl border-2 border-dashed border-slate-700">
              <span className="text-3xl mb-2">🔍</span>
              <p>Aucune offre trouvée</p>
              <p className="text-xs text-slate-500 mt-1">Lancez un cycle de scraping</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentJobs.slice(0, 6).map((job: any) => {
                const targetCities = (userConfig.target_locations || "Marrakech, Casablanca")
                  .split(",")
                  .map((s: string) => s.trim().toLowerCase());
                const jobLoc = (job.location || "").toLowerCase();
                const isCity1 = targetCities[0] && jobLoc.includes(targetCities[0]);
                const isCity2 = targetCities[1] && jobLoc.includes(targetCities[1]);

                return (
                  <li key={job.offer_id} className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:bg-slate-700/30 transition-all group">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{job.job_title}</p>
                          {isCity1 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              ⭐ {targetCities[0].toUpperCase()}
                            </span>
                          )}
                          {isCity2 && !isCity1 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {targetCities[1].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400">{job.company_name}</p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <span>📍</span> {job.location}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded ${
                          job.match_score >= 75
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : job.match_score >= 50
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {job.match_score}% match
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {job.created_at ? new Date(job.created_at).toLocaleDateString("fr-FR") : "Récent"}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>📧</span> Dernières candidatures
            </h3>
            <span className="text-xs font-medium px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {recentApps.length} enregistrées
            </span>
          </div>
          {recentApps.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-500 rounded-xl border-2 border-dashed border-slate-700">
              <span className="text-3xl mb-2">📭</span>
              <p>Aucune candidature</p>
              <p className="text-xs text-slate-500 mt-1">Les candidatures apparaîtront ici</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentApps.slice(0, 6).map((app: any) => (
                <li key={app.id} className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:bg-slate-700/30 transition-all group">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-white">{app.job_title || "N/A"}</p>
                      <p className="text-sm text-slate-400">{app.company_name || "N/A"}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded ${
                        app.email_sent ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700 text-slate-400"
                      }`}>
                        {app.email_sent ? "Envoyé" : "Prêt (HITL)"}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        {app.created_at ? new Date(app.created_at).toLocaleDateString("fr-FR") : "Aujourd'hui"}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 4. ACTIONS RAPIDES */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <span>🚀</span> Accès Direct & Intelligence RH
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/inbox" className="group relative p-5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-emerald-500/50 transition-all flex flex-col items-center gap-3 overflow-hidden text-center">
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="text-2xl">🎯</span>
            <span className="text-sm font-medium text-white group-hover:text-emerald-400">Entretiens & Boîte RH</span>
            <span className="text-xs text-slate-500">Réponses Gmail vérifiées</span>
          </Link>
          <Link href="/dashboard/jobs" className="group relative p-5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-indigo-500/50 transition-all flex flex-col items-center gap-3 overflow-hidden text-center">
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="text-2xl">📍</span>
            <span className="text-sm font-medium text-white group-hover:text-indigo-400">Marrakech & Casablanca</span>
            <span className="text-xs text-slate-500">Pipeline des offres</span>
          </Link>
          <button 
            onClick={() => handleToggleLoop("cycle_now")}
            className="group relative p-5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-amber-500/50 transition-all flex flex-col items-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="text-2xl">🔄</span>
            <span className="text-sm font-medium text-white group-hover:text-amber-400">Scraping Immédiat</span>
            <span className="text-xs text-slate-500">Nouveaux leads locaux</span>
          </button>
          <Link href="/dashboard/metrics" className="group relative p-5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-purple-500/50 transition-all flex flex-col items-center gap-3 overflow-hidden text-center">
            <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="text-2xl">📊</span>
            <span className="text-sm font-medium text-white group-hover:text-purple-400">Métriques de Recrutement</span>
            <span className="text-xs text-slate-500">Taux de conversion</span>
          </Link>
        </div>
      </div>

      {/* 5. LLM PROVIDERS & QUOTA ROTATION */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <span>🧠</span> Providers LLM & Rotation de Quota
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
{llmProviders.length > 0 ? (
            llmProviders.map((p: any) => {
              const isAvailable = p.available;
              const icon = p.name === "gemini" ? "✨" : "🔷";
              const iconColor = p.name === "gemini" ? "text-blue-400" : "text-indigo-400";
              const statusColor = isAvailable
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-rose-500/20 text-rose-400";
              const statusText = isAvailable ? "Disponible" : "Indisponible";
              const barColor = isAvailable ? "bg-emerald-500" : "bg-slate-600";
              const cardClass = isAvailable
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-slate-700/30 border-slate-700/50";
              const rpmPct = Math.min((p.requestsLastMinute / p.rpmLimit) * 100, 100);

              return (
                <div key={p.name} className={`p-4 rounded-xl border transition-all ${cardClass}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`${iconColor} text-lg`}>{icon}</span>
                      <span className="font-semibold text-white capitalize">{p.name}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusColor}`}>
                        {statusText}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {p.requestsLastMinute}/{p.rpmLimit} RPM
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${rpmPct}%"` }}></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Échecs consécutifs: {p.consecutiveFailures} •{" "}
                    {p.blockedUntil > Date.now() ? "Bloqué temporairement" : "OK"}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 text-center py-8 text-slate-500">
              <span className="text-3xl mb-2">⚠️</span>
              <p className="text-sm font-medium">Aucun provider LLM configuré</p>
              <p className="text-xs text-slate-500 mt-1">Ajoutez GEMINI_API_KEY dans .env</p>
            </div>
          )}
        </div>
      </div>

      {/* 6. DÉDUPLICATION ENTREPRISE (ANTI-DOUBLON EMAIL) */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <span>🛡️</span> Déduplication Entreprise (Anti-Doublon Email)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl bg-slate-700/30 border border-slate-700/50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Entreprises Contactées</p>
            <p className="text-2xl font-bold text-white mt-1">{dedupStats?.totalCompaniesContacted || 0}</p>
            <p className="text-xs text-slate-500 mt-1">Sociétés uniques contactées (7j)</p>
          </div>
          <div className="p-5 rounded-xl bg-slate-700/30 border border-slate-700/50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Emails Envoyés</p>
            <p className="text-2xl font-bold text-white mt-1">{dedupStats?.totalOffersEmailed || 0}</p>
            <p className="text-xs text-slate-500 mt-1">Candidatures par email envoyées</p>
          </div>
          <div className="p-5 rounded-xl bg-slate-700/30 border border-slate-700/50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Doublons Bloqués</p>
            <p className="text-2xl font-bold text-white mt-1">{dedupStats?.blockedDuplicates || 0}</p>
            <p className="text-xs text-slate-500 mt-1">Offres même société non renvoyées</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Règle : un email par entreprise sur 7 jours. Si plusieurs offres d'une même société, seule la première reçoit un email automatique. Les autres sont prêtes pour postulation directe (HITL).
        </p>
      </div>
    </div>
  );
}
