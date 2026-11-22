"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "Tableau de bord", href: "/dashboard", icon: "📊", badge: null },
  { name: "Pipeline Offres", href: "/dashboard/jobs", icon: "💼", badge: "Live" },
  { name: "Boîte RH & Réponses", href: "/dashboard/inbox", icon: "📬", badge: "IMAP" },
  { name: "Candidatures", href: "/dashboard/applications", icon: "📧", badge: null },
  { name: "Marché Arabe (MENA)", href: "/dashboard/arabic", icon: "🌍", badge: null },
  { name: "Métriques & Analytics", href: "/dashboard/metrics", icon: "📈", badge: null },
  { name: "Studio Paramètres", href: "/dashboard/settings", icon: "⚙️", badge: "Config" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loopState, setLoopState] = useState<any>(null);

  useEffect(() => {
    // Fetch profile and loop status
    Promise.all([
      fetch("/api/config").then((r) => r.json()),
      fetch("/api/scraper/loop").then((r) => r.json()),
    ])
      .then(([configData, loopData]) => {
        if (configData.success && configData.profile) {
          setCurrentUser(configData.profile);
        }
        if (loopData.success && loopData.loop) {
          setLoopState(loopData.loop);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const getPageTitle = () => {
    switch (pathname) {
      case "/dashboard":
        return { title: "Centre de Contrôle Multi-Agents", subtitle: "Supervision en direct de la prospection, du scoring et des entretiens" };
      case "/dashboard/jobs":
        return { title: "Pipeline des Opportunités Qualifiées", subtitle: "Offres scrapées en direct, scoring prédictif et revue HITL" };
      case "/dashboard/inbox":
        return { title: "Boîte Réception Recruteurs (IMAP)", subtitle: "Détection automatique des convocations en entretien et réponses IA" };
      case "/dashboard/applications":
        return { title: "Candidatures & Suivi d'Envoi", subtitle: "Historique des candidatures générées et journal d'envoi SMTP" };
      case "/dashboard/arabic":
        return { title: "Chasse aux Opportunités Région MENA", subtitle: "Scraping ciblé sur les hubs technologiques arabophones et bilingues" };
      case "/dashboard/metrics":
        return { title: "Métriques & Performances", subtitle: "Taux de réponse, adéquation des profils et délivrabilité des emails" };
      case "/dashboard/settings":
        return { title: "Studio Paramètres & Profil Multi-Utilisateur", subtitle: "Personnalisation du profil, villes cibles, seuils et intelligence des agents" };
      default:
        return { title: "AgencyGetJobs", subtitle: "Recruitment Multi-Agent Engine" };
    }
  };

  const pageInfo = getPageTitle();

  return (
    <div className="flex h-screen bg-[#0B0F19] text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden">
      {/* Sleek SaaS Sidebar */}
      <aside
        className={`${
          collapsed ? "w-20" : "w-72"
        } bg-[#0D1322]/95 backdrop-blur-xl border-r border-slate-800/80 flex flex-col z-30 transition-all duration-300 relative shadow-2xl`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/70 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 group-hover:scale-105 transition-all">
              <span className="text-xl">⚡</span>
            </div>
            {!collapsed && (
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-base text-white tracking-tight">AgencyGetJobs</h1>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">PRO</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Autonomous MAS v2.0</p>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/50 transition-colors hidden lg:block"
            title={collapsed ? "Déplier le menu" : "Replier le menu"}
          >
            <span className="text-sm">{collapsed ? "❯" : "❮"}</span>
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {!collapsed && (
            <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navigation Principale
            </p>
          )}
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-indigo-400/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
                title={collapsed ? item.name : undefined}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-base transition-transform group-hover:scale-110 ${isActive ? "text-white" : "opacity-80"}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.name}</span>}
                </div>
                {!collapsed && item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-800 text-slate-400 border border-slate-700/60"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Persona & Agent Heartbeat */}
        <div className="p-4 border-t border-slate-800/70 bg-[#0B0F19]/50">
          {!collapsed && (
            <div className="mb-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
                {(currentUser?.full_name || "A").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {currentUser?.full_name || "Utilisateur Configuré"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {currentUser?.title || "Profil Multi-Agents"}
                </p>
              </div>
              <Link href="/dashboard/settings" className="text-slate-400 hover:text-indigo-400 text-xs" title="Modifier profil">
                ✎
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse ring-4 ring-emerald-500/20"></span>
              {!collapsed && (
                <span className="text-[11px] font-medium text-slate-300">
                  4 Agents Actifs
                </span>
              )}
            </div>
            {!collapsed && loopState?.isRunning && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                Boucle 30s ON
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Modern Topbar */}
        <header className="h-16 bg-[#0D1322]/80 backdrop-blur-md border-b border-slate-800/80 px-6 md:px-8 flex items-center justify-between shrink-0 z-20">
          <div>
            <h2 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>{pageInfo.title}</span>
            </h2>
            <p className="text-xs text-slate-400 hidden sm:block">
              {pageInfo.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Agent Status Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
              <span className="text-slate-400">Scraping Loop :</span>
              {loopState?.isRunning ? (
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Active (30s)
                </span>
              ) : (
                <span className="font-semibold text-slate-400">En pause</span>
              )}
            </div>

            <Link
              href="/dashboard/settings"
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Paramètres</span>
            </Link>

            <Link
              href="/dashboard/jobs"
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              <span>💼</span>
              <span>Voir Offres</span>
            </Link>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-gradient-to-b from-[#0B0F19] to-[#0D1322]">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
