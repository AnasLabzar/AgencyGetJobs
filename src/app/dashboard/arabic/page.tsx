/// ============================================================
/// Dashboard Arabic Jobs - Marrakech & Casablanca
/// Focus: Offres "30% off", opportunités d'entretien
/// ============================================================

"use client";

import { useState, useEffect } from "react";
import { JobOfferIntel } from "@/types/schemas";

interface ArabicJobsResponse {
  success: boolean;
  count: number;
  jobs: JobOfferIntel[];
  stats: {
    totalJobs: number;
    discountOffers: number;
    locations: string;
    platformsScanned: number;
    focusPoints: {
      "30% off detection": number;
      "Marrakech/Casablanca filter": boolean;
    };
  };
}

const ARABIC_LOCATIONS = [
  { id: "marrakech_casablanca", name: "Marrakech & Casablanca", icon: "📍" },
  { id: "marrakech", name: "Marrakech uniquement", icon: "🕌" },
  { id: "casablanca", name: "Casablanca uniquement", icon: "🏙️" }
];

const FILTER_MODES = [
  { id: "all", name: "Toutes offres", icon: "📋" },
  { id: "discounted", name: "30% Off", icon: "💰" },
  { id: "tech", name: "Tech", icon: "💻" },
  { id: "interviews", name: "Entretiens", icon: "👥" }
];

export default function ArabicJobsDashboard() {
  const [jobs, setJobs] = useState<JobOfferIntel[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("marrakech_casablanca");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [stats, setStats] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, [selectedLocation, selectedFilter]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("location", selectedLocation);
      params.set("discounted", selectedFilter !== "all" ? "true" : "true");
      params.set("interviews", selectedFilter === "interviews" ? "true" : "true");

      const response = await fetch(`/api/scraper/arabic?${params}`);
      const data: ArabicJobsResponse = await response.json();

      if (data.success) {
        // Appliquer le filtre sélectionné
        let filteredJobs = data.jobs;

        if (selectedFilter === "discounted") {
          filteredJobs = filteredJobs.filter(job =>
            hasDiscount30Off(job.job_title + job.company_name)
          );
        } else if (selectedFilter === "tech") {
          const techKeywords = ["react", "node.js", "typescript", "next.js", "full stack", "développeur", "programmeur"];
          filteredJobs = filteredJobs.filter(job =>
            techKeywords.some(kw =>
              (job.job_title + " " + job.company_name).toLowerCase().includes(kw)
            )
          );
        } else if (selectedFilter === "interviews") {
          filteredJobs = filteredJobs.filter(job =>
            job.match_score >= 75 && job.status === "APPROVED"
          );
        }

        setJobs(filteredJobs);
        setStats(data.stats);
        setLastUpdated(new Date().toLocaleString("fr-FR"));
      }
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasDiscount30Off = (text: string): boolean => {
    const patterns = [
      /30\s*%?\s*(off|réduction|rabais|خصم)/i,
      /30\s*off/i,
      /خصم\s*30/i,
      /30%\s*sold/i
    ];
    return patterns.some(pattern => pattern.test(text));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED": return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case "PENDING": return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
      case "REJECTED": return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
      default: return "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200";
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-gray-400";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          📊 Jobs Arabs - Marrakech & Casablanca
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Scraping en temps réel • Offres "30% off" • Opportunités d'entretien
        </p>
        {lastUpdated && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Dernière mise à jour: {lastUpdated}
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Offres</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {loading ? "..." : jobs.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">30% Off</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {loading ? "..." : jobs.filter(j => hasDiscount30Off(j.job_title + " " + j.company_name)).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Entretiens</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {loading ? "..." : jobs.filter(j => j.match_score >= 75).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-full">
              <span className="text-2xl">📍</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Localisation</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {selectedLocation.replace("_", " & ")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Location Filter */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Localisation</p>
            <div className="flex space-x-2">
              {ARABIC_LOCATIONS.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc.id)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedLocation === loc.id
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {loc.icon} {loc.name}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Mode */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type d'offres</p>
            <div className="flex space-x-2">
              {FILTER_MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedFilter(mode.id)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedFilter === mode.id
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {mode.icon} {mode.name}
                </button>
              ))}
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? "🔄 Chargement..." : "Actualiser"}
          </button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement des offres arabes...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">Aucune offre trouvée pour ce filtre</p>
          </div>
        ) : (
          jobs.map(job => (
            <div key={job.offer_id} className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={getStatusColor(job.status)}>
                      {job.status}
                    </span>
                    {hasDiscount30Off(job.job_title + job.company_name) && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                        💰 30% OFF
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {job.job_title}
                  </h2>

                  <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
                    {job.company_name}
                  </p>

                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    {job.location}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`text-sm font-medium ${getMatchScoreColor(job.match_score)}`}>
                      Score: {job.match_score}%
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {job.tech_stack_required.slice(0, 4).map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex-shrink-0">
                  <a
                    href={job.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg inline-block transition-colors"
                  >
                    Voir l'offre
                  </a>
                </div>
              </div>

              {job.rh_contact.email && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Contact RH:</span>{" "}
                    {job.rh_contact.name}
                    {job.rh_contact.email && (
                      <>
                        {" — "}
                        <a href={`mailto:${job.rh_contact.email}`} className="text-blue-600 hover:underline">
                          {job.rh_contact.email}
                        </a>
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer Stats */}
      {stats && (
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-500">
          <p>
            📊 {jobs.length} offres • 💰 {jobs.filter(j => hasDiscount30Off(j.job_title + " " + j.company_name)).length} avec 30% off •
            ⭐ {jobs.filter(j => j.match_score >= 75).length} opportunités qualifiées
          </p>
        </div>
      )}
    </div>
  );
}