"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RecruiterMessage {
  id: string;
  uid: number;
  sender_name: string;
  sender_email: string;
  company_name: string;
  subject: string;
  date: string;
  is_unread: boolean;
  category: "INTERVIEW_INVITATION" | "POSITIVE_INTEREST" | "TECHNICAL_TEST" | "INFORMATION_REQUEST" | "REJECTION" | "GENERAL";
  importance_score: number;
  urgency_badge: "URGENT_INTERVIEW" | "ACTION_REQUIRED" | "FOLLOW_UP_NEEDED" | "INFO_ONLY";
  summary: string;
  body_snippet: string;
  full_body?: string;
  suggested_action: string;
  draft_reply: string;
  is_replied?: boolean;
  replied_at?: string;
}

export default function InboxIntelligencePage() {
  const [messages, setMessages] = useState<RecruiterMessage[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Filter state
  const [activeTab, setActiveTab] = useState<string>("ALL");

  // Reply Modal State
  const [activeMessage, setActiveMessage] = useState<RecruiterMessage | null>(null);
  const [editableReply, setEditableReply] = useState<string>("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

  useEffect(() => {
    fetchInboxData();
  }, []);

  const fetchInboxData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/inbox");
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        setStats(data.stats || {});
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleScanInbox = async () => {
    setScanning(true);
    setScanMessage(null);
    setScanError(null);

    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan", maxScan: 80, daysBack: 30 })
      });
      const data = await res.json();

      if (data.success) {
        setScanMessage(data.message || "Boîte Gmail analysée avec succès.");
        setMessages(data.messages || []);
        fetchInboxData();
      } else {
        setScanError(data.error || "Impossible d'analyser la boîte de réception.");
      }
    } catch (e: any) {
      setScanError(e.message || "Erreur de connexion.");
    } finally {
      setScanning(false);
    }
  };

  const handleOpenReplyModal = (msg: RecruiterMessage) => {
    setActiveMessage(msg);
    setEditableReply(msg.draft_reply);
    setReplySuccess(null);
    setReplyError(null);

    // Mark as read in background if unread
    if (msg.is_unread) {
      fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", messageId: msg.id })
      }).then(() => {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_unread: false } : m));
      });
    }
  };

  const handleSendReply = async () => {
    if (!activeMessage || !editableReply.trim()) return;

    setSendingReply(true);
    setReplySuccess(null);
    setReplyError(null);

    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          messageId: activeMessage.id,
          replyBody: editableReply
        })
      });
      const data = await res.json();

      if (data.success) {
        setReplySuccess("Réponse envoyée avec succès via votre Gmail SMTP !");
        setMessages(prev => prev.map(m => m.id === activeMessage.id ? { ...m, is_replied: true, is_unread: false } : m));
        setTimeout(() => {
          setActiveMessage(null);
        }, 1800);
      } else {
        setReplyError(data.error || "Échec de l'envoi de la réponse.");
      }
    } catch (e: any) {
      setReplyError(e.message || "Erreur de connexion.");
    } finally {
      setSendingReply(false);
    }
  };

  // Filter messages based on tab
  const filteredMessages = messages.filter(m => {
    if (activeTab === "ALL") return true;
    if (activeTab === "INTERVIEWS") return m.category === "INTERVIEW_INVITATION";
    if (activeTab === "INTEREST") return m.category === "POSITIVE_INTEREST" || m.category === "INTERVIEW_INVITATION";
    if (activeTab === "UNREAD") return m.is_unread || (!m.is_replied && m.category !== "REJECTION");
    if (activeTab === "TESTS") return m.category === "TECHNICAL_TEST";
    if (activeTab === "REPLIED") return m.is_replied;
    return true;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "INTERVIEW_INVITATION":
        return { label: "🎯 Entretien Proposé", bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
      case "POSITIVE_INTEREST":
        return { label: "⭐ Intérêt Marqué", bg: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
      case "TECHNICAL_TEST":
        return { label: "💻 Test Technique", bg: "bg-purple-500/20 text-purple-400 border-purple-500/30" };
      case "INFORMATION_REQUEST":
        return { label: "📋 Demande d'Infos", bg: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
      case "REJECTION":
        return { label: "⚪ Candidature Non Retenue", bg: "bg-slate-700/50 text-slate-400 border-slate-600" };
      default:
        return { label: "✉️ Message Recruteur", bg: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" };
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 md:p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>📬</span> Boîte RH & Détecteur de Réponses
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              IMAP Connecté
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Analyse intelligente de votre boîte Gmail • Filtrage du spam & newsletters • Extraction des invitations d'entretiens et retours recruteurs
          </p>
        </div>

        {/* Scan Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleScanInbox}
            disabled={scanning}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {scanning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Analyse Gmail en cours...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Scanner ma boîte Gmail</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {scanMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{scanMessage}</span>
          </div>
          <button onClick={() => setScanMessage(null)} className="text-emerald-300 hover:text-white">✕</button>
        </div>
      )}

      {scanError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{scanError}</span>
          </div>
          <button onClick={() => setScanError(null)} className="text-amber-300 hover:text-white">✕</button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Entretiens */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 shadow-lg shadow-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Entretiens Détectés</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-lg">🎯</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{stats.interviewsCount ?? 1}</span>
            <span className="text-xs text-emerald-400 font-medium">À planifier</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Recruteurs demandant un appel ou visio</p>
        </div>

        {/* Card 2: Intérêt marqué */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-500/30 shadow-lg shadow-blue-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Profils Retenus</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 text-lg">⭐</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{(stats.positiveInterestCount || 0) + (stats.interviewsCount || 0)}</span>
            <span className="text-xs text-blue-400 font-medium">Retours positifs</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Candidatures ayant suscité l'intérêt RH</p>
        </div>

        {/* Card 3: Non lus / En attente */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/30 shadow-lg shadow-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Messages Non Lus / En Attente</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 text-lg">📬</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{stats.unreadCount ?? 2}</span>
            <span className="text-xs text-amber-400 font-medium">À traiter</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Échanges prioritaires sans réponse</p>
        </div>

        {/* Card 4: Tests techniques */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 to-slate-900 border border-purple-500/30 shadow-lg shadow-purple-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Tests Techniques</span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 text-lg">💻</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{stats.technicalTestsCount ?? 1}</span>
            <span className="text-xs text-purple-400 font-medium">Évaluations</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Exercices d'architecture & coding</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: "ALL", label: "Tous les messages", count: messages.length },
          { id: "INTERVIEWS", label: "🎯 Entretiens (Prioritaires)", count: stats.interviewsCount },
          { id: "INTEREST", label: "⭐ Intérêt & Opportunités", count: (stats.positiveInterestCount || 0) + (stats.interviewsCount || 0) },
          { id: "UNREAD", label: "⚠️ Non lus / En attente", count: stats.unreadCount },
          { id: "TESTS", label: "💻 Tests techniques", count: stats.technicalTestsCount },
          { id: "REPLIED", label: "✉️ Réponses envoyées", count: messages.filter(m => m.is_replied).length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Message List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-slate-400 text-sm">Chargement des messages de recrutement...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl p-8 bg-slate-900/30">
            <span className="text-4xl block mb-3">📭</span>
            <p className="text-lg font-semibold text-white">Aucun message dans cette catégorie</p>
            <p className="text-slate-400 text-sm mt-1">
              Cliquez sur "Scanner ma boîte Gmail" pour actualiser vos échanges en direct.
            </p>
          </div>
        ) : (
          filteredMessages.map(msg => {
            const badge = getCategoryBadge(msg.category);
            return (
              <div
                key={msg.id}
                className={`p-6 rounded-2xl border transition-all ${
                  msg.is_unread
                    ? "bg-slate-900/90 border-indigo-500/40 shadow-lg shadow-indigo-950/20"
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    {/* Unread indicator */}
                    {msg.is_unread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" title="Non lu"></span>
                    )}
                    <span className="font-bold text-white text-base">
                      {msg.company_name}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      • {msg.sender_name} ({msg.sender_email})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Category pill */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}>
                      {badge.label}
                    </span>
                    {/* Urgency Badge */}
                    {msg.importance_score >= 9 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 uppercase">
                        Urgent
                      </span>
                    )}
                    {msg.is_replied && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ✓ Répondu
                      </span>
                    )}
                    <span className="text-xs text-slate-400 ml-2 whitespace-nowrap">
                      {formatDate(msg.date)}
                    </span>
                  </div>
                </div>

                {/* Subject */}
                <h3 className="text-sm font-semibold text-slate-200 mb-2">
                  {msg.subject}
                </h3>

                {/* AI Summary Box */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 mb-3 text-xs leading-relaxed">
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
                    <span>💡</span>
                    <span>Synthèse IA du message :</span>
                  </div>
                  <p className="text-slate-300">
                    {msg.summary}
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400">
                    <span>
                      🎯 <strong className="text-slate-300">Action recommandée :</strong> {msg.suggested_action}
                    </span>
                    <span className="text-[11px] font-mono text-indigo-400">
                      Score pertinence : {msg.importance_score}/10
                    </span>
                  </div>
                </div>

                {/* Snippet */}
                <p className="text-xs text-slate-400 line-clamp-2 italic mb-4">
                  "{msg.body_snippet}"
                </p>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <span className="text-xs text-slate-500 font-mono">
                    ID: {msg.id}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenReplyModal(msg)}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                    >
                      <span>✍️</span>
                      <span>{msg.is_replied ? "Renvoyer une réponse" : "Répondre avec l'IA"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================ */}
      {/* REPLY MODAL WITH AI PRE-DRAFTED RESPONSE */}
      {/* ============================================================ */}
      {activeMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-lg">
                  ✉️
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Répondre à {activeMessage.company_name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Destinataire : {activeMessage.sender_name} &lt;{activeMessage.sender_email}&gt;
                  </p>
                </div>
              </div>
              <button onClick={() => setActiveMessage(null)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Feedback messages */}
              {replySuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <span>✅</span> {replySuccess}
                </div>
              )}
              {replyError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <span>⚠️</span> {replyError}
                </div>
              )}

              {/* Original Message Excerpt */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Message reçu du recruteur
                </label>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs leading-relaxed max-h-40 overflow-y-auto font-mono whitespace-pre-wrap">
                  {activeMessage.full_body || activeMessage.body_snippet}
                </div>
              </div>

              {/* AI Draft Response Box */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Votre réponse (Générée par l'IA • 100% Modifiable)
                  </label>
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    Ton Professionnel & Humain
                  </span>
                </div>
                <textarea
                  rows={9}
                  value={editableReply}
                  onChange={(e) => setEditableReply(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none font-sans"
                />
              </div>

              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2">
                <span>🛡️</span>
                <span>L'email sera expédié directement via votre compte Gmail officiel avec authentification SPF/DKIM.</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-800 flex items-center justify-between bg-slate-900/90">
              <button
                onClick={() => setActiveMessage(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
              >
                Annuler
              </button>

              <button
                onClick={handleSendReply}
                disabled={sendingReply || !editableReply.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {sendingReply ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Envoi via Gmail SMTP...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Envoyer la réponse au recruteur</span>
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
