"use client";

import { useEffect, useState } from "react";

interface Application {
  id: number;
  offer_id: string;
  company_name: string | null;
  job_title: string | null;
  cover_letter?: string;
  email_subject?: string;
  email_body?: string;
  cv_path?: string;
  email_sent: boolean;
  email_sent_at: string | null;
  response_received: boolean;
  interview_scheduled: boolean;
  match_score: number | null;
  ab_variant?: string;
  created_at: string;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((data) => {
        setApplications(data.applications || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-indigo-500 mb-6"></div>
        <p className="text-slate-400 font-medium">Chargement des candidatures...</p>
      </div>
    );
  }

  const sentCount = applications.filter((a) => a.email_sent).length;
  const responseCount = applications.filter((a) => a.response_received).length;
  const interviewCount = applications.filter((a) => a.interview_scheduled).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Candidatures Transmises</h1>
          <p className="text-slate-400 mt-1">
            Suivi des envois, accusés de réception et entretiens générés
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700 backdrop-blur-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase">Total Envoyées</p>
          <p className="text-3xl font-bold text-white mt-1">{sentCount}</p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700 backdrop-blur-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase">Réponses Reçues</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1">{responseCount}</p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700 backdrop-blur-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase">Entretiens Décrochés</p>
          <p className="text-3xl font-bold text-indigo-400 mt-1">{interviewCount}</p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700 backdrop-blur-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase">Taux de Conversion</p>
          <p className="text-3xl font-bold text-purple-400 mt-1">
            {sentCount > 0 ? Math.round((interviewCount / sentCount) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-1 backdrop-blur-sm shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900/50 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Entreprise</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Poste</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Score Match</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Variante A/B</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Statut Email</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Retour RH</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase text-right">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {applications.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  <span className="text-4xl mb-4 block">📭</span>
                  <p className="text-lg text-white">Aucune candidature enregistrée</p>
                  <p className="text-slate-400 mt-1">
                    Sélectionnez une offre dans l'onglet Offres pour postuler
                  </p>
                </td>
              </tr>
            ) : (
              applications.map((app: Application) => (
                <tr key={app.id} className="hover:bg-slate-800/30 transition-all group">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-white">{app.company_name || "N/A"}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{app.job_title || "N/A"}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300">
                      {app.match_score?.toFixed(0) || "-"}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-purple-500/20 text-purple-300">
                      Variante {app.ab_variant || "A"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${
                        app.email_sent
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      <span>{app.email_sent ? "✓ Envoyé via SMTP" : "○ En attente"}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold ${
                        app.interview_scheduled
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : app.response_received
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {app.interview_scheduled ? "🎯 Entretien Programmé" : app.response_received ? "✓ Réponse Reçue" : "○ En cours"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedApp(app)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-semibold transition-all border border-slate-700"
                    >
                      Voir Email ↗
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal View Application Email */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Détails de la Candidature Transmise</h3>
                <p className="text-xs text-slate-400">
                  {selectedApp.job_title} @ {selectedApp.company_name}
                </p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Objet de l'envoi :</span>
                <p className="text-sm font-semibold text-white mt-0.5">{selectedApp.email_subject || "N/A"}</p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">CV Attaché en PDF :</span>
                <p className="text-xs font-mono text-emerald-400 mt-0.5">
                  ✓ {selectedApp.cv_path || "CV_Anas_Labzar.pdf"}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Contenu du message :</span>
                <div className="mt-1 p-4 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-200 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedApp.email_body || selectedApp.cover_letter || "Contenu non disponible"}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
