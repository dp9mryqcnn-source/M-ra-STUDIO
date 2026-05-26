"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface TrendSound {
  titre: string;
  artiste: string;
  utilisations: string;
  statut: "montant" | "viral" | "peak";
  genre: string;
  bpm?: string;
}
interface TrendHashtag {
  hashtag: string;
  vues: string;
  croissance: string;
  niche: string;
}
interface ContentIdea {
  titre: string;
  format: string;
  hook: string;
  hashtags: string[];
  meilleur_moment: string;
  duree: string;
  difficulte: "facile" | "moyen" | "avancé";
  son_recommande?: string;
}
interface PlanSlot {
  jour: string;
  date_iso: string;
  heure: string;
  contenu: string;
  type: string;
  hashtags: string[];
}
interface PeakHour {
  jour: string;
  heure: string;
  score: number;
}
interface TrendData {
  sons_tendance: TrendSound[];
  hashtags_tendance: TrendHashtag[];
  idees_contenu: ContentIdea[];
  planning_semaine: PlanSlot[];
  heures_peak: PeakHour[];
  resume_strategique: string;
}
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
interface ParsedProposal {
  titre: string;
  format?: string;
  hook?: string;
  caption?: string;
  hashtags?: string;
  canva?: { template: string; description: string };
  planning?: { date: string; heure: string; type: string };
  raw: string;
}

type Tab = "tendances" | "chat" | "planning";

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function statusBadge(s: TrendSound["statut"]) {
  if (s === "viral") return { label: "VIRAL 🔥", bg: "#ff004433", color: "#ff4466" };
  if (s === "peak") return { label: "PEAK ⚡", bg: "#f59e0b33", color: "#f59e0b" };
  return { label: "MONTANT 📈", bg: "#10b98133", color: "#10b981" };
}
function diffBadge(d: ContentIdea["difficulte"]) {
  if (d === "facile") return { bg: "#10b98122", color: "#10b981" };
  if (d === "avancé") return { bg: "#ef444422", color: "#ef4444" };
  return { bg: "#f59e0b22", color: "#f59e0b" };
}

function buildCanvaLink(template: string, desc: string) {
  const query = encodeURIComponent(`${template} ${desc} TikTok vertical`);
  return `https://www.canva.com/search/templates?q=${query}`;
}

function buildCalendarLink(slot: PlanSlot) {
  const dt = slot.date_iso.replace(/-/g, "");
  const [h, m] = slot.heure.split(":");
  const start = `${dt}T${h}${m}00`;
  const endH = String(Number(h) + 1).padStart(2, "0");
  const end = `${dt}T${endH}${m}00`;
  const text = encodeURIComponent(`TikTok: ${slot.contenu}`);
  const details = encodeURIComponent(`Type: ${slot.type}\nHashtags: ${slot.hashtags.join(" ")}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`;
}

function parseProposals(text: string): ParsedProposal[] {
  const blocks = text.split("━━━━━━━━━━━━━━━━━━━━━━━━").filter(b => b.trim() && b.includes("📱"));
  return blocks.map(block => {
    const lines = block.trim().split("\n");
    const titreMatch = lines[0]?.match(/📱\s*(.+)/);
    const formatMatch = block.match(/Format\s*:\s*(.+)/);
    const hookMatch = block.match(/Hook\s*:\s*(.+)/);
    const captionMatch = block.match(/Caption\s*:\s*(.+)/);
    const hashtagsMatch = block.match(/Hashtags\s*:\s*(.+)/);
    const canvaMatch = block.match(/\[CANVA:([^|]+)\|([^\]]+)\]/);
    const planMatch = block.match(/\[PLANNING:([^|]+)\|([^|]+)\|([^\]]+)\]/);
    return {
      titre: titreMatch?.[1]?.trim() ?? "Proposition",
      format: formatMatch?.[1]?.trim(),
      hook: hookMatch?.[1]?.trim(),
      caption: captionMatch?.[1]?.trim(),
      hashtags: hashtagsMatch?.[1]?.trim(),
      canva: canvaMatch ? { template: canvaMatch[1], description: canvaMatch[2] } : undefined,
      planning: planMatch ? { date: planMatch[1], heure: planMatch[2], type: planMatch[3] } : undefined,
      raw: block,
    };
  });
}

/* ─── Sub-components ─────────────────────────────────────────────────────────── */
function SoundCard({ s }: { s: TrendSound }) {
  const badge = statusBadge(s.statut);
  return (
    <div className="rounded-2xl p-3.5" style={{ background: "#13131a", border: "1px solid #1e1e2e" }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate">{s.titre}</p>
          <p className="text-xs mt-0.5 truncate" style={{ color: "#6a6a82" }}>{s.artiste} · {s.genre}{s.bpm ? ` · ${s.bpm} BPM` : ""}</p>
        </div>
        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: "#9090a8" }}>🎵</span>
        <span className="text-xs font-semibold" style={{ color: "#9090a8" }}>{s.utilisations}</span>
      </div>
    </div>
  );
}

function HashtagCard({ h }: { h: TrendHashtag }) {
  const isRising = h.croissance.includes("+");
  return (
    <div className="rounded-2xl p-3.5" style={{ background: "#13131a", border: "1px solid #1e1e2e" }}>
      <p className="font-bold text-sm mb-1" style={{ color: "#a78bfa" }}>#{h.hashtag.replace(/^#/, "")}</p>
      <p className="text-xs mb-1.5" style={{ color: "#6a6a82" }}>{h.niche}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "#5a5a72" }}>{h.vues} vues</span>
        <span className="text-xs font-bold" style={{ color: isRising ? "#10b981" : "#ef4444" }}>{h.croissance}</span>
      </div>
    </div>
  );
}

function IdeaCard({ idea, onAddToChat }: { idea: ContentIdea; onAddToChat: (msg: string) => void }) {
  const diff = diffBadge(idea.difficulte);
  const canvaLink = buildCanvaLink(idea.format, idea.titre);
  return (
    <div className="rounded-2xl p-4" style={{ background: "#13131a", border: "1px solid #1e1e2e" }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-bold text-sm text-white flex-1">{idea.titre}</p>
        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: diff.bg, color: diff.color }}>{idea.difficulte}</span>
      </div>
      <p className="text-xs mb-2 italic" style={{ color: "#6a6a8a" }}>"{idea.hook}"</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#1e1e2e", color: "#9090a8" }}>⏱ {idea.duree}</span>
        <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#1e1e2e", color: "#9090a8" }}>📅 {idea.meilleur_moment}</span>
        {idea.son_recommande && <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#1e1e2e", color: "#9090a8" }}>🎵 {idea.son_recommande}</span>}
      </div>
      <div className="flex gap-2">
        <a href={canvaLink} target="_blank" rel="noopener noreferrer"
          className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg,#8b3aed,#ec4899)", color: "white" }}>
          <span>🎨</span> Canva
        </a>
        <button onClick={() => onAddToChat(`Développe cette idée : "${idea.titre}". Hook: "${idea.hook}". Donne-moi le script complet, la caption, les hashtags et un planning précis.`)}
          className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-transform"
          style={{ background: "#1e1e2e", color: "#9090a8", border: "1px solid #2a2a3a" }}>
          <span>💬</span> Développer
        </button>
      </div>
    </div>
  );
}

function PlanningCard({ slot }: { slot: PlanSlot }) {
  const calLink = buildCalendarLink(slot);
  const typeColors: Record<string, string> = {
    "Trend": "#ff4466", "Tutorial": "#8b5cf6", "Behind-the-scenes": "#06b6d4",
    "Engagement": "#10b981", "Promotion": "#f59e0b"
  };
  const color = typeColors[slot.type] ?? "#9090a8";
  return (
    <div className="rounded-2xl p-4" style={{ background: "#13131a", border: "1px solid #1e1e2e" }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-bold text-sm text-white">{slot.jour}</p>
          <p className="text-xs mt-0.5" style={{ color: "#6a6a82" }}>⏰ {slot.heure}</p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: `${color}22`, color }}>{slot.type}</span>
      </div>
      <p className="text-xs mb-3 leading-relaxed" style={{ color: "#b0b0c8" }}>{slot.contenu}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {slot.hashtags.slice(0, 3).map(h => (
          <span key={h} className="px-1.5 py-0.5 rounded-lg text-xs" style={{ background: "#8b5cf622", color: "#a78bfa" }}>#{h.replace(/^#/, "")}</span>
        ))}
        {slot.hashtags.length > 3 && <span className="px-1.5 py-0.5 rounded-lg text-xs" style={{ background: "#1e1e2e", color: "#5a5a72" }}>+{slot.hashtags.length - 3}</span>}
      </div>
      <a href={calLink} target="_blank" rel="noopener noreferrer"
        className="w-full py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-transform"
        style={{ background: "#1e1e2e", color: "#9090a8", border: "1px solid #2a2a3a" }}>
        <span>📅</span> Ajouter au Google Agenda
      </a>
    </div>
  );
}

function ProposalBlock({ proposal }: { proposal: ParsedProposal }) {
  const [copied, setCopied] = useState(false);
  const canvaLink = proposal.canva ? buildCanvaLink(proposal.canva.template, proposal.canva.description) : null;
  const calLink = proposal.planning ? buildCalendarLink({
    jour: proposal.planning.date, date_iso: proposal.planning.date,
    heure: proposal.planning.heure, contenu: proposal.titre,
    type: proposal.planning.type, hashtags: proposal.hashtags?.split(" ").filter(h => h.startsWith("#")) ?? []
  }) : null;

  const handleCopy = () => {
    if (!proposal.hashtags) return;
    navigator.clipboard.writeText(proposal.hashtags).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #2a1a4a", background: "#0f0f1a" }}>
      <div className="px-4 py-3" style={{ background: "linear-gradient(135deg,#7c3aed22,#ec489922)", borderBottom: "1px solid #2a1a4a" }}>
        <p className="font-bold text-sm text-white">📱 {proposal.titre}</p>
        {proposal.format && <p className="text-xs mt-0.5" style={{ color: "#9090a8" }}>{proposal.format}</p>}
      </div>
      <div className="p-4 space-y-3">
        {proposal.hook && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#5a5a72" }}>Hook (3 premières secondes)</p>
            <p className="text-sm italic text-white">"{proposal.hook}"</p>
          </div>
        )}
        {proposal.hashtags && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#5a5a72" }}>Hashtags</p>
            <p className="text-xs leading-relaxed" style={{ color: "#8b6cf6" }}>{proposal.hashtags}</p>
          </div>
        )}
        <div className="flex gap-2 pt-1 flex-wrap">
          {canvaLink && (
            <a href={canvaLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg,#8b3aed,#ec4899)", color: "white" }}>
              🎨 Créer sur Canva
            </a>
          )}
          {calLink && (
            <a href={calLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
              style={{ background: "#1e1e2e", color: "#9090a8", border: "1px solid #2a2a3a" }}>
              📅 Planifier
            </a>
          )}
          {proposal.hashtags && (
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
              style={{ background: "#1e1e2e", color: copied ? "#10b981" : "#9090a8", border: "1px solid #2a2a3a" }}>
              {copied ? "✓ Copié !" : "📋 Hashtags"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export default function TikTokAgent() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("tendances");
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [trendsError, setTrendsError] = useState(false);
  const [niche, setNiche] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showNicheSetup, setShowNicheSetup] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadTrends = useCallback(async (n?: string) => {
    setLoadingTrends(true);
    setTrendsError(false);
    try {
      const res = await fetch("/api/tiktok-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "trends", niche: n ?? niche })
      });
      const json = await res.json() as { success: boolean; data?: TrendData };
      if (json.success && json.data) {
        setTrends(json.data);
      } else {
        setTrendsError(true);
      }
    } catch {
      setTrendsError(true);
    } finally {
      setLoadingTrends(false);
    }
  }, [niche]);

  useEffect(() => {
    loadTrends();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setStreaming(true);
    setTab("chat");

    const assistantPlaceholder: ChatMessage = { role: "assistant", content: "" };
    setMessages(prev => [...prev, assistantPlaceholder]);

    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/tiktok-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "chat", messages: newMessages }),
        signal: abortRef.current.signal,
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: full };
          return copy;
        });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: "⚠️ Erreur de connexion. Réessaie." };
          return copy;
        });
      }
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming]);

  const handleNicheSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowNicheSetup(false);
    loadTrends(niche);
  };

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: "tendances", label: "Tendances", emoji: "🔥" },
    { id: "chat", label: "Chat", emoji: "💬" },
    { id: "planning", label: "Planning", emoji: "📅" },
  ];

  const renderChat = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
              style={{ background: "linear-gradient(135deg,#ff004433,#69c9d033)" }}>📱</div>
            <p className="font-bold text-white mb-2">Trenda est prête</p>
            <p className="text-sm mb-5" style={{ color: "#6a6a82" }}>Dis-moi ce que tu veux créer ou pose une question sur les tendances.</p>
            <div className="space-y-2">
              {[
                "Quelles tendances correspondent à ma niche ?",
                "Crée 3 idées de contenu pour cette semaine",
                "Quel est le meilleur moment pour poster aujourd'hui ?",
                "Fais-moi un planning complet pour les 7 prochains jours",
              ].map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all active:scale-98"
                  style={{ background: "#13131a", border: "1px solid #1e1e2e", color: "#9090a8" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          const proposals = !isUser ? parseProposals(m.content) : [];
          const hasProposals = proposals.length > 0;
          return (
            <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              {isUser ? (
                <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-sm text-white"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}>
                  {m.content}
                </div>
              ) : (
                <div className="max-w-[92%] space-y-2">
                  {hasProposals ? (
                    <>
                      <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm"
                        style={{ background: "#13131a", color: "#b0b0c8" }}>
                        {m.content.split("━━")[0].trim()}
                      </div>
                      {proposals.map((p, pi) => <ProposalBlock key={pi} proposal={p} />)}
                    </>
                  ) : (
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm whitespace-pre-wrap leading-relaxed"
                      style={{ background: "#13131a", color: "#b0b0c8" }}>
                      {m.content || (streaming && i === messages.length - 1 ? (
                        <span className="inline-flex gap-0.5">
                          <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: "#8b5cf6" }} />
                          <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: "#8b5cf6" }} />
                          <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: "#8b5cf6" }} />
                        </span>
                      ) : "")}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <div className="shrink-0 px-4 pb-4 pt-2" style={{ borderTop: "1px solid #1a1a28" }}>
        <form onSubmit={e => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
          <input
            value={input} onChange={e => setInput(e.target.value)}
            placeholder="Demande à Trenda..."
            disabled={streaming}
            className="flex-1 px-4 py-3 rounded-2xl text-sm text-white outline-none"
            style={{ background: "#13131a", border: "1px solid #1e1e2e" }}
          />
          <button type="submit" disabled={streaming || !input.trim()}
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 active:scale-90 transition-transform"
            style={{ background: streaming || !input.trim() ? "#1e1e2e" : "linear-gradient(135deg,#7c3aed,#ec4899)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );

  const renderTrends = () => {
    if (loadingTrends) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 py-16 px-4">
          <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center animate-pulse-glow text-3xl"
            style={{ background: "linear-gradient(135deg,#ff004433,#69c9d033)" }}>📱</div>
          <p className="font-bold text-white mb-1">Trenda analyse les tendances…</p>
          <p className="text-sm text-center" style={{ color: "#5a5a72" }}>Analyse du marché francophone en cours</p>
          <div className="flex gap-1 mt-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="typing-dot w-2 h-2 rounded-full" style={{ background: "#8b5cf6", animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      );
    }
    if (trendsError || !trends) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 py-16 px-4">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="font-bold text-white mb-2">Impossible de charger les tendances</p>
          <p className="text-sm mb-4 text-center" style={{ color: "#5a5a72" }}>Vérifie ta clé API Anthropic dans le fichier .env</p>
          <button onClick={() => loadTrends()} className="px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}>
            Réessayer
          </button>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5 scrollbar-hide">
        {/* Résumé */}
        <div className="p-4 rounded-2xl" style={{ background: "linear-gradient(135deg,#7c3aed18,#ec489918)", border: "1px solid #7c3aed33" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">✨</span>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8b5cf6" }}>Opportunité du moment</p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "#c0c0d8" }}>{trends.resume_strategique}</p>
          <button onClick={() => sendMessage("Sur la base des tendances actuelles, donne-moi 3 propositions de contenu détaillées avec scripts, captions et planning.")}
            className="mt-3 w-full py-2.5 rounded-xl text-xs font-bold active:scale-98 transition-transform"
            style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "white" }}>
            💡 Générer des propositions de contenu →
          </button>
        </div>

        {/* Sons */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(#ff4466,#ff8800)" }} />
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#5a5a72" }}>Sons en tendance</p>
            </div>
            <span className="text-xs" style={{ color: "#5a5a72" }}>{trends.sons_tendance.length} sons</span>
          </div>
          <div className="space-y-2">
            {trends.sons_tendance.map((s, i) => <SoundCard key={i} s={s} />)}
          </div>
        </div>

        {/* Hashtags */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(#8b5cf6,#06b6d4)" }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#5a5a72" }}>Hashtags qui montent</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {trends.hashtags_tendance.map((h, i) => <HashtagCard key={i} h={h} />)}
          </div>
        </div>

        {/* Idées */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(#10b981,#06b6d4)" }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#5a5a72" }}>Idées de contenu</p>
          </div>
          <div className="space-y-2">
            {trends.idees_contenu.map((idea, i) => (
              <IdeaCard key={i} idea={idea} onAddToChat={sendMessage} />
            ))}
          </div>
        </div>

        {/* Heures peak */}
        {trends.heures_peak.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(#f59e0b,#ef4444)" }} />
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#5a5a72" }}>Heures de forte affluence</p>
            </div>
            <div className="rounded-2xl p-3.5 space-y-2" style={{ background: "#13131a", border: "1px solid #1e1e2e" }}>
              {trends.heures_peak.map((ph, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-semibold w-20 shrink-0" style={{ color: "#9090a8" }}>{ph.jour} {ph.heure}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#1e1e2e" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${ph.score}%`, background: ph.score > 80 ? "linear-gradient(90deg,#ef4444,#f59e0b)" : ph.score > 60 ? "#f59e0b" : "#10b981" }} />
                  </div>
                  <span className="text-xs font-bold w-8 text-right shrink-0" style={{ color: ph.score > 80 ? "#ef4444" : "#9090a8" }}>{ph.score}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: "max(env(safe-area-inset-bottom,0px),16px)" }} />
      </div>
    );
  };

  const renderPlanning = () => (
    <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-hide">
      {!trends ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-3xl mb-3">📅</p>
          <p className="font-bold text-white mb-2">Planning non disponible</p>
          <p className="text-sm mb-4" style={{ color: "#5a5a72" }}>Charge d'abord les tendances</p>
          <button onClick={() => { setTab("tendances"); loadTrends(); }}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}>
            Charger les tendances
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold text-white">Planning 7 jours</p>
            <button onClick={() => sendMessage("Génère un planning de contenu TikTok pour les 7 prochains jours avec des horaires précis selon les heures de forte affluence.")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold active:scale-95 transition-transform"
              style={{ background: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44" }}>
              🔄 Régénérer
            </button>
          </div>
          {trends.planning_semaine.map((slot, i) => <PlanningCard key={i} slot={slot} />)}
          <div className="p-4 rounded-2xl text-center" style={{ background: "#13131a", border: "1px dashed #2a2a3a" }}>
            <p className="text-xs mb-2" style={{ color: "#5a5a72" }}>Tu veux un planning personnalisé ?</p>
            <button onClick={() => { setTab("chat"); sendMessage("Je veux un planning de contenu personnalisé selon mes disponibilités et ma niche. Pose-moi des questions."); }}
              className="px-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "white" }}>
              💬 Demander à Trenda
            </button>
          </div>
          <div style={{ height: "max(env(safe-area-inset-bottom,0px),16px)" }} />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <div className="shrink-0 px-4 pb-3"
        style={{
          paddingTop: "max(env(safe-area-inset-top,0px),14px)",
          background: "linear-gradient(180deg,#0d0d18 0%,#0a0a0f 100%)",
          borderBottom: "1px solid #1a1a28",
        }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.push("/")}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform shrink-0"
            style={{ background: "#1a1a24" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-xl"
            style={{ background: "linear-gradient(135deg,#ff0044,#69c9d0)", boxShadow: "0 0 16px rgba(255,0,68,.3)" }}>
            📱
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-sm gradient-text leading-tight">Trenda · Agent TikTok</h1>
            <p className="text-xs" style={{ color: "#5a5a72" }}>Tendances · Contenu · Planning</p>
          </div>
          <button onClick={() => setShowNicheSetup(true)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl active:scale-95 transition-transform"
            style={{ background: "#13131a", border: "1px solid #2a2a3a" }}>
            <span className="text-xs">⚙️</span>
            <span className="text-xs font-semibold" style={{ color: "#6a6a82" }}>Ma niche</span>
          </button>
          <button onClick={() => loadTrends()}
            disabled={loadingTrends}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "#13131a", border: "1px solid #2a2a3a" }}>
            <svg className={loadingTrends ? "animate-spin" : ""} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "#13131a" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: tab === t.id ? "linear-gradient(135deg,#7c3aed,#ec4899)" : "transparent",
                color: tab === t.id ? "white" : "#6a6a82",
              }}>
              <span>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }} className="flex-1 flex flex-col overflow-hidden">
          {tab === "tendances" && renderTrends()}
          {tab === "chat" && renderChat()}
          {tab === "planning" && renderPlanning()}
        </motion.div>
      </AnimatePresence>

      {/* Niche setup modal */}
      <AnimatePresence>
        {showNicheSetup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-end z-50"
            style={{ background: "rgba(0,0,0,.7)" }}
            onClick={() => setShowNicheSetup(false)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="w-full rounded-t-3xl p-5"
              style={{ background: "#13131a", border: "1px solid #2a2a3a", paddingBottom: "max(env(safe-area-inset-bottom,0px),20px)" }}
              onClick={e => e.stopPropagation()}>
              <p className="font-bold text-white mb-1">Ta niche TikTok</p>
              <p className="text-sm mb-4" style={{ color: "#6a6a82" }}>
                Trenda adaptera toutes ses propositions à ta niche pour des tendances plus précises.
              </p>
              <form onSubmit={handleNicheSubmit} className="space-y-3">
                <input
                  value={niche}
                  onChange={e => setNiche(e.target.value)}
                  placeholder="Ex: mode vintage, cuisine végane, gaming, lifestyle..."
                  className="w-full px-4 py-3 rounded-2xl text-sm text-white outline-none"
                  style={{ background: "#0a0a0f", border: "1px solid #2a2a3a" }}
                  autoFocus
                />
                <button type="submit"
                  className="w-full py-3 rounded-2xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}>
                  Confirmer et recharger les tendances
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
