"use client";

import { useEffect, useState } from "react";

interface Job {
  offer_id: string;
  company_name: string;
  job_title: string;
  location: string;
  match_score: number;
  status: string;
  rh_contact_name: string | null;
  rh_contact_email: string | null;
  rh_contact_linkedin: string | null;
  tech_stack: string[];
  source_url: string;
  created_at: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  // HITL Review & Apply Modal State
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<"FR" | "EN">("FR");
  const [selectedVariant, setSelectedVariant] = useState<"A" | "B">("A");
  const [editableEmail, setEditableEmail] = useState("");
  const [editableSubject, setEditableSubject] = useState("");
  const [editableBody, setEditableBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // LinkedIn Modal State
  const [linkedInJob, setLinkedInJob] = useState<Job | null>(null);
  const [linkedInNote, setLinkedInNote] = useState<string>("");
  const [linkedInInMail, setLinkedInInMail] = useState<string>("");
  const [linkedInCopied, setLinkedInCopied] = useState(false);

  // Interview Prep Modal State
  const [prepJob, setPrepJob] = useState<Job | null>(null);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepSheet, setPrepSheet] = useState<any>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = () => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => {
        setJobs(data.jobs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleOpenReview = async (job: Job) => {
    setActiveJob(job);
    setEditableEmail(job.rh_contact_email || "");
    setPreviewLoading(true);
    setSendSuccess(null);
    setSendError(null);

    try {
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: job.offer_id,
          action: "preview",
          language: selectedLanguage,
          variant: selectedVariant,
        }),
      });
      const data = await res.json();
      if (data.success && data.preview) {
        setPreviewData(data.preview);
        setEditableSubject(data.preview.subject);
        setEditableBody(data.preview.emailBody);
        if (data.preview.recruiterEmail) {
          setEditableEmail(data.preview.recruiterEmail);
        }
      }
    } catch (e: any) {
      setSendError(e.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleLanguageChange = async (lang: "FR" | "EN") => {
    setSelectedLanguage(lang);
    if (!activeJob) return;
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: activeJob.offer_id,
          action: "preview",
          language: lang,
          variant: selectedVariant,
        }),
      });
      const data = await res.json();
      if (data.success && data.preview) {
        setPreviewData(data.preview);
        setEditableSubject(data.preview.subject);
        setEditableBody(data.preview.emailBody);
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendApplication = async () => {
    if (!activeJob) return;
    setSending(true);
    setSendSuccess(null);
    setSendError(null);

    try {
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: activeJob.offer_id,
          action: "send",
          language: selectedLanguage,
          variant: selectedVariant,
          customSubject: editableSubject,
          customBody: editableBody,
          customEmail: editableEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSendSuccess(data.message || "Candidature envoyée avec succès !");
        fetchJobs();
      } else {
        setSendError(data.error || "Une erreur est survenue lors de l'envoi.");
      }
    } catch (err: any) {
      setSendError(err.message || "Erreur de connexion.");
    } finally {
      setSending(false);
    }
  };

  const handleOpenLinkedIn = async (job: Job) => {
    setLinkedInJob(job);
    setLinkedInCopied(false);
    try {
      const res = await fetch("/api/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: job.offer_id, dryRun: true }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setLinkedInNote(data.result.connectionNote);
        setLinkedInInMail(data.result.inMailMessage);
      }
    } catch {
      // ignore
    }
  };

  const handleOpenInterviewPrep = async (job: Job) => {
    setPrepJob(job);
    setPrepLoading(true);
    try {
      const res = await fetch("/api/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: job.offer_id }),
      });
      const data = await res.json();
      if (data.success) {
        setPrepSheet(data.prep);
      }
    } catch {
      // ignore
    } finally {
      setPrepLoading(false);
    }
  };

  const filteredJobs = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  const statusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "REVIEW":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      default:
        return "bg-slate-700 text-slate-400 border border-slate-700/50";
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-indigo-500 mb-6"></div>
        <p className="text-slate-400 font-medium">Chargement des opportunités ciblées...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Pipeline des Opportunités</h1>
          <p className="text-slate-400 mt-1">
            {jobs.length} offres qualifiées & prêtes pour validation ou envoi
          </p>
        </div>
        <div className="flex gap-2">
          {["all", "APPROVED", "REVIEW", "REJECTED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
              }`}
            >
              {f === "all" ? "Toutes" : f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-1 backdrop-blur-sm shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Entreprise</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Poste & Stack</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Lieu</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Score Match</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Contact RH</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Statut</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase text-right">Actions HITL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <span className="text-4xl mb-4 block">🔍</span>
                    <p className="text-lg text-white">Aucune offre correspondante</p>
                    <p className="text-slate-400 mt-1">
                      Ajustez vos filtres ou lancez un nouveau cycle autonome
                    </p>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job: Job) => (
                  <tr key={job.offer_id} className="hover:bg-slate-800/30 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-sm font-bold text-indigo-400">
                          {job.company_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{job.company_name}</p>
                          <a
                            href={job.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-indigo-400 hover:underline inline-block truncate max-w-[180px]"
                          >
                            Voir l'annonce ↗
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">{job.job_title}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(job.tech_stack || []).slice(0, 4).map((tech, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="text-indigo-400">📍</span> {job.location}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusColor(
                          job.match_score >= 75
                            ? "APPROVED"
                            : job.match_score >= 50
                            ? "REVIEW"
                            : "REJECTED"
                        )}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            job.match_score >= 75
                              ? "bg-emerald-400"
                              : job.match_score >= 50
                              ? "bg-amber-400"
                              : "bg-red-400"
                          }`}
                        ></span>
                        {job.match_score}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {job.rh_contact_name || "Non identifié"}
                        </p>
                        {job.rh_contact_email && !job.rh_contact_email.includes("careers@") ? (
                          <p className="text-xs text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                            <span>✓</span> {job.rh_contact_email}
                          </p>
                        ) : job.rh_contact_email ? (
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            {job.rh_contact_email}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-400/90 font-mono mt-0.5 flex items-center gap-1">
                            <span>🌐</span> Lien officiel ATS / Web
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-semibold ${statusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* HITL Button: Review & Send */}
                        <button
                          onClick={() => handleOpenReview(job)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1"
                          title="Mode Approval: Prévisualiser & Envoyer"
                        >
                          <span>✉️</span> Postuler
                        </button>
                        {/* LinkedIn Outreach */}
                        <button
                          onClick={() => handleOpenLinkedIn(job)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-400 text-xs font-semibold transition-all"
                          title="Générer message d'approche LinkedIn (<300 caractères)"
                        >
                          in
                        </button>
                        {/* Interview Prep Generator */}
                        <button
                          onClick={() => handleOpenInterviewPrep(job)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-xs font-semibold transition-all"
                          title="Fiche de préparation d'entretien IA"
                        >
                          🎯
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: HITL Review & Approval (Approuver & Envoyer) */}
      {/* ============================================================ */}
      {activeJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div>
                <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
                  Human-in-the-Loop • Mode Approval
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Candidature : {activeJob.job_title} @ {activeJob.company_name}
                </h3>
              </div>
              <button
                onClick={() => setActiveJob(null)}
                className="text-slate-400 hover:text-white p-2 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Controls bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 uppercase font-bold">Langue du CV & Lettre :</span>
                  <div className="flex gap-1">
                    {(["FR", "EN"] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => handleLanguageChange(lang)}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                          selectedLanguage === lang
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        {lang === "FR" ? "🇫🇷 Français" : "🇨🇦 Anglais (Canadien)"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 uppercase font-bold">Variante A/B :</span>
                  <div className="flex gap-1">
                    {(["A", "B"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setSelectedVariant(v)}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                          selectedVariant === v
                            ? "bg-purple-600 text-white shadow-sm"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        Variante {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status Alert */}
              {sendSuccess && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
                  <span>✅</span> {sendSuccess}
                </div>
              )}
              {sendError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                  <span>⚠️</span> {sendError}
                </div>
              )}

              {previewLoading ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mb-3"></div>
                  <p className="text-slate-400 text-sm">Génération adaptative Anti-AI en cours...</p>
                </div>
              ) : (
                <>
                  {/* Recruiter info bar */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-400 uppercase">Destinataire RH</label>
                        {!editableEmail ? (
                          <span className="text-[11px] text-amber-400 font-medium">⚠️ Email non disponible</span>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-medium">✓ Adresse saisie</span>
                        )}
                      </div>
                      <input
                        type="email"
                        value={editableEmail}
                        onChange={(e) => setEditableEmail(e.target.value)}
                        placeholder="ex: recrutement@entreprise.com"
                        className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase">Pièce Jointe PDF</label>
                      <div className="mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 text-sm flex items-center gap-2">
                        <span>📄</span>
                        <span className="font-mono text-xs truncate">
                          {selectedLanguage === "FR"
                            ? "cv Anas Labzar - Fr (1).pdf"
                            : "CV EN CANADIEN _ ANAS LABZAR.pdf"}
                        </span>
                        <span className="ml-auto text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded">Joint</span>
                      </div>
                    </div>
                  </div>

                  {/* Deliverability Shield Notice */}
                  {!editableEmail && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🛡️</span>
                        <span>
                          <strong>Bouclier Anti-Bounce :</strong> Pour protéger votre compte Gmail contre les rejets (550), nous ne devinons plus d'email. Postulez directement sur l'annonce officielle ou renseignez l'email vérifié du recruteur ci-dessus.
                        </span>
                      </div>
                      <a
                        href={activeJob.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold whitespace-nowrap text-center transition-all"
                      >
                        Ouvrir l'annonce ↗
                      </a>
                    </div>
                  )}

                  {/* Subject input */}
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">Objet de l'e-mail</label>
                    <input
                      type="text"
                      value={editableSubject}
                      onChange={(e) => setEditableSubject(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>

                  {/* Body textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-400 uppercase">
                        Corps du message (Anti-AI Human Tone)
                      </label>
                      <span className="text-xs text-emerald-400 font-semibold">
                        Score Anti-AI : {previewData?.antiAiScore || 95}%
                      </span>
                    </div>
                    <textarea
                      rows={10}
                      value={editableBody}
                      onChange={(e) => setEditableBody(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none font-sans"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-900/90">
              <button
                onClick={() => setActiveJob(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all"
              >
                Fermer
              </button>
              <div className="flex gap-3">
                <button
                  onClick={handleSendApplication}
                  disabled={sending || previewLoading || !editableEmail || !editableEmail.includes("@")}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                  title={!editableEmail ? "Renseignez un email ou utilisez le lien officiel ci-dessus" : "Envoyer"}
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Envoi via Gmail SMTP...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Approuver & Envoyer l'Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: LinkedIn Direct Outreach & Note */}
      {/* ============================================================ */}
      {linkedInJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                  in
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">Approche Recruteur LinkedIn</h3>
                  <p className="text-xs text-slate-400">
                    {linkedInJob.rh_contact_name || "Recruteur"} • {linkedInJob.company_name}
                  </p>
                </div>
              </div>
              <button onClick={() => setLinkedInJob(null)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase">
                    Note d'invitation (Limite LinkedIn : 300 caractères)
                  </label>
                  <span className="text-xs font-mono text-indigo-400">
                    {linkedInNote.length} / 300 caractères
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={linkedInNote}
                  onChange={(e) => setLinkedInNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">
                  Message Direct / InMail étendu
                </label>
                <textarea
                  rows={6}
                  value={linkedInInMail}
                  onChange={(e) => setLinkedInInMail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-sans"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-between items-center">
              <button
                onClick={() => setLinkedInJob(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(linkedInNote);
                  setLinkedInCopied(true);
                  setTimeout(() => setLinkedInCopied(false), 2000);
                }}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-blue-500/20"
              >
                <span>{linkedInCopied ? "✓" : "📋"}</span>
                <span>{linkedInCopied ? "Copié dans le presse-papiers !" : "Copier la note LinkedIn"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: Interview Preparation Brief Sheet */}
      {/* ============================================================ */}
      {prepJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
                  🎯
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Fiche Prépa Entretien : {prepJob.job_title}
                  </h3>
                  <p className="text-xs text-slate-400">Entreprise : {prepJob.company_name}</p>
                </div>
              </div>
              <button onClick={() => setPrepJob(null)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-300">
              {prepLoading || !prepSheet ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-3"></div>
                  <p className="text-slate-400 text-sm">Génération de la stratégie d'entretien...</p>
                </div>
              ) : (
                <>
                  {/* Company overview */}
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                    <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                      <span>🏢</span> Synthèse Entreprise & Culture
                    </h4>
                    <p className="text-slate-300 text-xs mb-2">
                      {prepSheet.company_overview?.mission_statement}
                    </p>
                    <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                      {prepSheet.company_overview?.culture_highlights?.map((h: string, i: number) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Questions section */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <span>🧠</span> Questions Probables & Réponses Recommandées (Profil Anas Labzar)
                    </h4>
                    {prepSheet.questions?.map((q: any, i: number) => (
                      <div key={i} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                            {q.category}
                          </span>
                        </div>
                        <p className="font-semibold text-white text-sm">{q.question}</p>
                        <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                          <strong className="text-indigo-400">Réponse suggérée : </strong>
                          {q.suggested_answer}
                        </p>
                        <p className="text-[11px] text-emerald-400 italic">
                          💡 Accroche perso : {q.candidate_hook}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Closing questions */}
                  <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20">
                    <h4 className="font-bold text-indigo-300 text-xs uppercase mb-2">
                      Questions pertinentes à poser au recruteur à la fin de l'entretien :
                    </h4>
                    <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                      {prepSheet.closing_questions_to_ask?.map((q: string, i: number) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setPrepJob(null)}
                className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm"
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
