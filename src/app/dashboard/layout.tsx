"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "Tableau de bord", href: "/dashboard", icon: "📊" },
  { name: "Offres d'emploi", href: "/dashboard/jobs", icon: "💼" },
  { name: "Offres Arabs", href: "/dashboard/arabic", icon: "🇦🇷" },
  { name: "Candidatures", href: "/dashboard/applications", icon: "📧" },
  { name: "Boîte RH & Réponses", href: "/dashboard/inbox", icon: "📬" },
  { name: "Métriques", href: "/dashboard/metrics", icon: "📈" },
  { name: "Paramètres", href: "/dashboard/settings", icon: "⚙️" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [stats, setStats] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setStats(data.stats || null))
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 selection:bg-indigo-500/30">
      {/* Sidebar */}
      <aside
        className={`w-72 bg-slate-950/80 backdrop-blur-md border-r border-slate-800 flex flex-col z-20 transition-all duration-300 ${
          collapsed ? "w-16" : ""
        }`}
      >
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-xl">🤖</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight">AgencyGetJobs</h1>
              <p className="text-xs text-slate-500 font-medium">Recruitment Engine</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                pathname === item.href
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <span className="text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
              {!collapsed && <span className="font-medium">{item.name}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
            onClick={() => setCollapsed(!collapsed)}
          >
            <span className="text-lg">{collapsed ? "▶" : "◀"}</span>
            {!collapsed && <span className="font-medium">Réduire</span>}
          </button>
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className={collapsed ? "hidden" : "text-xs text-slate-400 font-medium"}>
              Système en ligne
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-slate-900 p-8 relative">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1920&q=80')] opacity-5 pointer-events-none z-0"></div>
        
        <div className="relative z-10">
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Tableau de bord</h1>
                <p className="text-slate-400 mt-1">Vue d'ensemble de votre moteur de recrutement autonome</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-all flex items-center gap-2">
                  <span>🔄</span>
                  <span className="hidden md:inline">Actualiser</span>
                </button>
                <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2">
                  <span>▶</span>
                  <span className="hidden md:inline">Lancer le cycle</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats ? (
              [
                { label: "Offres trouvées", value: stats.totalJobs, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", icon: "💼", gradient: "from-indigo-500 to-purple-600" },
                { label: "Candidatures", value: stats.totalApplications, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "📧", gradient: "from-emerald-400 to-teal-600" },
                { label: "Emails envoyés", value: stats.emailsSent, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20", icon: "✉️", gradient: "from-fuchsia-500 to-pink-600" },
                { label: "Réponses", value: stats.responsesReceived, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "💬", gradient: "from-amber-500 to-orange-600" },
              ].map((card, i) => (
                <div
                  key={card.label}
                  className={`group relative p-6 rounded-2xl bg-slate-800/50 border ${card.border} backdrop-blur-sm hover:border-${card.color.split('-')[1]}-400/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-${card.color.split('-')[1]}-500/20`}
                >
                  <div className="absolute top-6 right-6 w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {card.icon}
                  </div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
                  <p className="text-3xl font-bold text-white mt-2">{card.value}</p>
                  <div className="mt-4 h-1 w-full bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r ${card.gradient} w-3/4 rounded-full"></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-4 p-6 rounded-2xl bg-slate-800/50 border border-slate-700 backdrop-blur-sm">
                <div className="flex items-center gap-3 text-slate-400">
                  <div className="animate-pulse w-6 h-6 rounded-full bg-slate-700"></div>
                  <span>Chargement des statistiques...</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
