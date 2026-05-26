"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Types ─────────────────────────────────────────── */
interface Son { titre: string; artiste: string; utilisations: string; statut: "montant" | "viral" | "peak"; genre: string; }
interface Hashtag { tag: string; vues: string; croissance: string; niche: string; }
interface Idee { titre: string; format: string; hook: string; hashtags: string[]; heure: string; duree: string; niveau: "facile" | "moyen" | "avancé"; }
interface Slot { jour: string; date: string; heure: string; contenu: string; type: string; hashtags: string[]; }
interface Peak { label: string; score: number; }
interface TrendData { sons: Son[]; hashtags: Hashtag[]; idees: Idee[]; planning: Slot[]; peak_times: Peak[]; resume: string; }
interface Msg { role: "user" | "assistant"; content: string; }
interface Proposal { titre: string; format?: string; hook?: string; caption?: string; hashtags?: string; canva?: { tpl: string; desc: string }; plan?: { date: string; heure: string; type: string }; }
type Tab = "tendances" | "chat" | "planning";

/* ── Helpers ─────────────────────────────────────────── */
const STATUT: Record<Son["statut"], { label: string; color: string; bg: string }> = {
  viral:   { label: "VIRAL 🔥",    color: "#ff2d55", bg: "#ff2d5520" },
  peak:    { label: "PEAK ⚡",     color: "#f59e0b", bg: "#f59e0b20" },
  montant: { label: "MONTANT 📈",  color: "#25f4ee", bg: "#25f4ee20" },
};
const NIVEAU: Record<Idee["niveau"], { color: string; bg: string }> = {
  facile: { color: "#25f4ee", bg: "#25f4ee20" },
  moyen:  { color: "#f59e0b", bg: "#f59e0b20" },
  avancé: { color: "#fe2c55", bg: "#fe2c5520" },
};
const TYPE_COLOR: Record<string, string> = {
  Trend: "#fe2c55", Tutorial: "#8b5cf6", "Behind-the-scenes": "#25f4ee",
  Engagement: "#10b981", Promotion: "#f59e0b", Éducatif: "#06b6d4",
};

function canvaLink(tpl: string, desc: string) {
  return `https://www.canva.com/search/templates?q=${encodeURIComponent(`${tpl} ${desc} TikTok`)}`;
}
function calLink(slot: { date: string; heure: string; contenu: string; type: string; hashtags: string[] }) {
  const d = slot.date.replace(/-/g, "");
  const [h, m] = slot.heure.split(":");
  const s = `${d}T${h}${m}00`, e = `${d}T${String(+h + 1).padStart(2, "0")}${m}00`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("TikTok: " + slot.contenu)}&dates=${s}/${e}&details=${encodeURIComponent(slot.hashtags.join(" "))}`;
}
function parseProposals(txt: string): Proposal[] {
  return txt.split("━━━━━━━━━━━━━━━━━━━━━━━━")
    .filter(b => b.includes("📱"))
    .map(b => ({
      titre:    b.match(/📱\s*(.+)/)?.[1]?.trim() ?? "",
      format:   b.match(/Format\s*:\s*(.+)/)?.[1]?.trim(),
      hook:     b.match(/Hook\s*:\s*(.+)/)?.[1]?.trim(),
      caption:  b.match(/Caption\s*:\s*(.+)/)?.[1]?.trim(),
      hashtags: b.match(/Hashtags\s*:\s*(.+)/)?.[1]?.trim(),
      canva: (() => { const m = b.match(/\[CANVA:([^|]+)\|([^\]]+)\]/); return m ? { tpl: m[1], desc: m[2] } : undefined; })(),
      plan:  (() => { const m = b.match(/\[PLANNING:([^|]+)\|([^|]+)\|([^\]]+)\]/); return m ? { date: m[1], heure: m[2], type: m[3] } : undefined; })(),
    }));
}

/* ── Petits composants (définis HORS du composant principal) ── */
const SonCard = memo(({ s }: { s: Son }) => {
  const st = STATUT[s.statut];
  return (
    <div className="rounded-2xl p-3.5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate">{s.titre}</p>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>{s.artiste} · {s.genre}</p>
        </div>
        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
      </div>
      <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>🎵 {s.utilisations}</p>
    </div>
  );
});
SonCard.displayName = "SonCard";

const HashCard = memo(({ h }: { h: Hashtag }) => {
  const up = h.croissance.startsWith("+");
  return (
    <div className="rounded-2xl p-3.5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <p className="font-bold text-sm mb-1" style={{ color: "#25f4ee" }}>#{h.tag.replace(/^#/, "")}</p>
      <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>{h.niche}</p>
      <div className="flex justify-between">
        <span className="text-xs" style={{ color: "var(--muted)" }}>{h.vues}</span>
        <span className="text-xs font-bold" style={{ color: up ? "#25f4ee" : "#fe2c55" }}>{h.croissance}</span>
      </div>
    </div>
  );
});
HashCard.displayName = "HashCard";

const IdeeCard = memo(({ idea, onChat }: { idea: Idee; onChat(m: string): void }) => {
  const nv = NIVEAU[idea.niveau];
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-start gap-2 mb-2">
        <p className="font-bold text-sm text-white flex-1">{idea.titre}</p>
        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: nv.bg, color: nv.color }}>{idea.niveau}</span>
      </div>
      <p className="text-xs italic mb-3 leading-relaxed" style={{ color: "#8a8aa0" }}>"{idea.hook}"</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#1a1a28", color: "var(--muted)" }}>⏱ {idea.duree}</span>
        <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#1a1a28", color: "var(--muted)" }}>📅 {idea.heure}</span>
      </div>
      <div className="flex gap-2">
        <a href={canvaLink(idea.format, idea.titre)} target="_blank" rel="noopener noreferrer"
          className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold"
          style={{ background: "linear-gradient(135deg,#fe2c55,#ff6b6b)", color: "white" }}>
          🎨 Canva
        </a>
        <button onClick={() => onChat(`Développe cette idée TikTok : "${idea.titre}". Hook : "${idea.hook}". Donne-moi le script complet, caption, hashtags et planning précis.`)}
          className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold"
          style={{ background: "#1a1a28", color: "var(--muted)", border: "1px solid var(--border)" }}>
          💬 Développer
        </button>
      </div>
    </div>
  );
});
IdeeCard.displayName = "IdeeCard";

const SlotCard = memo(({ slot }: { slot: Slot }) => {
  const color = TYPE_COLOR[slot.type] ?? "#9090a8";
  const link = calLink(slot);
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-bold text-sm text-white">{slot.jour}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>⏰ {slot.heure}</p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: `${color}22`, color }}>{slot.type}</span>
      </div>
      <p className="text-xs mb-3 leading-relaxed" style={{ color: "#b0b0c8" }}>{slot.contenu}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {slot.hashtags.slice(0, 3).map(h => (
          <span key={h} className="px-1.5 py-0.5 rounded-lg text-xs" style={{ background: "#25f4ee15", color: "#25f4ee" }}>#{h.replace(/^#/, "")}</span>
        ))}
        {slot.hashtags.length > 3 && <span className="text-xs" style={{ color: "var(--muted)" }}>+{slot.hashtags.length - 3}</span>}
      </div>
      <a href={link} target="_blank" rel="noopener noreferrer"
        className="w-full py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold"
        style={{ background: "#1a1a28", color: "var(--muted)", border: "1px solid var(--border)" }}>
        📅 Ajouter au Google Agenda
      </a>
    </div>
  );
});
SlotCard.displayName = "SlotCard";

const ProposalCard = memo(({ p }: { p: Proposal }) => {
  const [copied, setCopied] = useState(false);
  const cl = p.canva ? canvaLink(p.canva.tpl, p.canva.desc) : null;
  const gl = p.plan ? calLink({ date: p.plan.date, heure: p.plan.heure, contenu: p.titre, type: p.plan.type, hashtags: p.hashtags?.split(" ").filter(h => h.startsWith("#")) ?? [] }) : null;
  const copy = () => { if (!p.hashtags) return; navigator.clipboard.writeText(p.hashtags).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #fe2c5530", background: "#0d0d14" }}>
      <div className="px-4 py-3" style={{ background: "linear-gradient(135deg,#fe2c5515,#25f4ee10)", borderBottom: "1px solid #fe2c5520" }}>
        <p className="font-bold text-sm text-white">📱 {p.titre}</p>
        {p.format && <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{p.format}</p>}
      </div>
      <div className="p-4 space-y-3">
        {p.hook && <div><p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>Hook</p><p className="text-sm text-white italic">"{p.hook}"</p></div>}
        {p.caption && <div><p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>Caption</p><p className="text-xs leading-relaxed" style={{ color: "#c0c0d8" }}>{p.caption}</p></div>}
        {p.hashtags && <div><p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>Hashtags</p><p className="text-xs leading-relaxed" style={{ color: "#25f4ee" }}>{p.hashtags}</p></div>}
        <div className="flex flex-wrap gap-2 pt-1">
          {cl && <a href={cl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: "linear-gradient(135deg,#fe2c55,#ff6b6b)", color: "white" }}>🎨 Créer sur Canva</a>}
          {gl && <a href={gl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: "#1a1a28", color: "var(--muted)", border: "1px solid var(--border)" }}>📅 Planifier</a>}
          {p.hashtags && <button onClick={copy} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: "#1a1a28", color: copied ? "#25f4ee" : "var(--muted)", border: "1px solid var(--border)" }}>{copied ? "✓ Copié !" : "📋 Hashtags"}</button>}
        </div>
      </div>
    </div>
  );
});
ProposalCard.displayName = "ProposalCard";

/* ── Panel Tendances (hors TrendaApp) ── */
const TendancesPanel = memo(({ data, loading, error, onReload, onChat }: {
  data: TrendData | null; loading: boolean; error: boolean;
  onReload(): void; onChat(m: string): void;
}) => {
  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
      <div className="w-20 h-20 rounded-3xl icon-glow flex items-center justify-center text-4xl" style={{ background: "linear-gradient(135deg,#fe2c55,#25f4ee)" }}>📱</div>
      <p className="font-bold text-white text-lg">Analyse en cours…</p>
      <p className="text-sm text-center" style={{ color: "var(--muted)" }}>Trenda scrute les tendances TikTok francophones</p>
      <div className="flex gap-1.5 mt-2">{[0,1,2].map(i => <span key={i} className="typing-dot w-2 h-2 rounded-full" style={{ background: "var(--tiktok-red)", animationDelay: `${i*.15}s` }} />)}</div>
    </div>
  );
  if (error || !data) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
      <p className="text-4xl">⚠️</p>
      <p className="font-bold text-white">Chargement échoué</p>
      <p className="text-sm text-center" style={{ color: "var(--muted)" }}>Vérifie la variable ANTHROPIC_API_KEY sur Vercel</p>
      <button onClick={onReload} className="mt-2 px-5 py-2.5 rounded-2xl font-bold text-white text-sm" style={{ background: "linear-gradient(135deg,#fe2c55,#ff6b6b)" }}>Réessayer</button>
    </div>
  );
  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5 scrollbar-hide">
      <div className="p-4 rounded-2xl" style={{ background: "linear-gradient(135deg,#fe2c5515,#25f4ee10)", border: "1px solid #fe2c5530" }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#fe2c55" }}>✨ Opportunité du moment</p>
        <p className="text-sm leading-relaxed" style={{ color: "#c0c0d8" }}>{data.resume}</p>
        <button onClick={() => onChat("Sur la base des tendances actuelles, propose-moi 3 idées de contenu détaillées avec scripts, captions et planning.")}
          className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg,#fe2c55,#25f4ee20)", border: "1px solid #fe2c5540" }}>
          💡 Générer des propositions →
        </button>
      </div>
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2"><div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(#fe2c55,#ff8800)" }} /><p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Sons en tendance</p></div>
          <span className="text-xs" style={{ color: "var(--muted)" }}>{data.sons.length}</span>
        </div>
        <div className="space-y-2">{data.sons.map((s, i) => <SonCard key={i} s={s} />)}</div>
      </section>
      <section>
        <div className="flex items-center gap-2 mb-2"><div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(#25f4ee,#8b5cf6)" }} /><p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Hashtags qui montent</p></div>
        <div className="grid grid-cols-2 gap-2">{data.hashtags.map((h, i) => <HashCard key={i} h={h} />)}</div>
      </section>
      <section>
        <div className="flex items-center gap-2 mb-2"><div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(#10b981,#25f4ee)" }} /><p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Idées de contenu</p></div>
        <div className="space-y-2">{data.idees.map((idea, i) => <IdeeCard key={i} idea={idea} onChat={onChat} />)}</div>
      </section>
      {data.peak_times.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2"><div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(#f59e0b,#fe2c55)" }} /><p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Heures de forte affluence</p></div>
          <div className="rounded-2xl p-4 space-y-2.5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            {data.peak_times.map((pt, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs w-24 shrink-0 font-medium" style={{ color: "#b0b0c8" }}>{pt.label}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#1a1a28" }}>
                  <div className="h-full rounded-full" style={{ width: `${pt.score}%`, background: pt.score > 80 ? "linear-gradient(90deg,#fe2c55,#f59e0b)" : pt.score > 60 ? "#f59e0b" : "#25f4ee" }} />
                </div>
                <span className="text-xs font-bold w-8 text-right shrink-0" style={{ color: pt.score > 80 ? "#fe2c55" : "var(--muted)" }}>{pt.score}%</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <div style={{ height: "max(env(safe-area-inset-bottom,0px),16px)" }} />
    </div>
  );
});
TendancesPanel.displayName = "TendancesPanel";

/* ── Panel Chat (hors TrendaApp) ── */
const ChatPanel = memo(({ msgs, streaming, onSend }: {
  msgs: Msg[]; streaming: boolean; onSend(text: string): void;
}) => {
  // Uncontrolled input — React ne touche jamais input.value, clavier iOS reste ouvert
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasText, setHasText] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputRef.current?.value.trim();
    if (!val || streaming) return;
    onSend(val);
    if (inputRef.current) inputRef.current.value = "";
    setHasText(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
        {msgs.length === 0 && (
          <div className="py-10 px-2 text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl icon-glow" style={{ background: "linear-gradient(135deg,#fe2c55,#25f4ee)" }}>📱</div>
            <p className="font-bold text-white mb-1.5">Trenda est prête</p>
            <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>Dis-moi ce que tu veux créer ou pose une question.</p>
            <div className="space-y-2">
              {["Quelles tendances correspondent à ma niche ?",
                "Crée 3 idées de contenu pour cette semaine",
                "Quel est le meilleur moment pour poster aujourd'hui ?",
                "Fais-moi un planning complet pour les 7 prochains jours",
              ].map(s => (
                <button key={s} onClick={() => onSend(s)}
                  className="w-full text-left px-3.5 py-2.5 rounded-2xl text-sm transition-opacity active:opacity-70"
                  style={{ background: "var(--card)", border: "1px solid var(--border)", color: "#9090a8" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => {
          const isUser = m.role === "user";
          const proposals = !isUser ? parseProposals(m.content) : [];
          return (
            <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              {isUser
                ? <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm text-white"
                    style={{ background: "linear-gradient(135deg,#fe2c55,#ff6b6b)" }}>{m.content}</div>
                : <div className="max-w-[94%] space-y-2">
                    {proposals.length > 0
                      ? <>
                          {m.content.split("━━")[0].trim() && (
                            <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm whitespace-pre-wrap"
                              style={{ background: "var(--card)", color: "#c0c0d8" }}>
                              {m.content.split("━━")[0].trim()}
                            </div>
                          )}
                          {proposals.map((p, pi) => <ProposalCard key={pi} p={p} />)}
                        </>
                      : <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm whitespace-pre-wrap leading-relaxed"
                          style={{ background: "var(--card)", color: "#c0c0d8" }}>
                          {m.content || (streaming && i === msgs.length - 1
                            ? <span className="inline-flex gap-1">{[0,1,2].map(j => <span key={j} className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: "#fe2c55", animationDelay: `${j*.15}s` }} />)}</span>
                            : null)}
                        </div>
                    }
                  </div>
              }
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="shrink-0 px-4 pt-2 pb-4" style={{ borderTop: "1px solid var(--border)", paddingBottom: "max(env(safe-area-inset-bottom,0px),16px)" }}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            defaultValue=""
            onInput={e => setHasText((e.currentTarget as HTMLInputElement).value.trim().length > 0)}
            placeholder="Demande à Trenda…"
            disabled={streaming}
            className="flex-1 px-4 py-3 rounded-2xl text-sm text-white outline-none"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          />
          <button type="submit" disabled={!hasText || streaming}
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-opacity"
            style={{ background: hasText && !streaming ? "linear-gradient(135deg,#fe2c55,#ff6b6b)" : "var(--card)", opacity: !hasText || streaming ? .4 : 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
});
ChatPanel.displayName = "ChatPanel";

/* ── Panel Planning (hors TrendaApp) ── */
const PlanningPanel = memo(({ data, onReload, onChat }: {
  data: TrendData | null; onReload(): void; onChat(m: string): void;
}) => (
  <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-hide">
    {!data
      ? <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-4xl">📅</p>
          <p className="font-bold text-white">Charge d'abord les tendances</p>
          <button onClick={onReload} className="px-5 py-2.5 rounded-2xl font-bold text-white text-sm" style={{ background: "linear-gradient(135deg,#fe2c55,#ff6b6b)" }}>Charger les tendances</button>
        </div>
      : <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold text-white">Planning 7 jours</p>
            <button onClick={() => onChat("Génère un planning TikTok sur 7 jours avec des horaires selon les heures de forte affluence.")}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: "#fe2c5520", color: "#fe2c55", border: "1px solid #fe2c5540" }}>
              🔄 Régénérer
            </button>
          </div>
          {data.planning.map((slot, i) => <SlotCard key={i} slot={slot} />)}
          <button onClick={() => onChat("Je veux un planning personnalisé selon mes disponibilités. Pose-moi quelques questions.")}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white mt-2"
            style={{ background: "linear-gradient(135deg,#fe2c55,#25f4ee20)", border: "1px solid #fe2c5530" }}>
            💬 Planning personnalisé avec Trenda
          </button>
          <div style={{ height: "max(env(safe-area-inset-bottom,0px),16px)" }} />
        </div>
    }
  </div>
));
PlanningPanel.displayName = "PlanningPanel";

/* ── Composant principal ─────────────────────────────── */
export default function TrendaApp() {
  const [tab, setTab]           = useState<Tab>("tendances");
  const [data, setData]         = useState<TrendData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(false);
  const [niche, setNiche]       = useState("");
  const [showNiche, setShowNiche] = useState(false);
  const [msgs, setMsgs]         = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);

  const loadTrends = useCallback(async (n?: string) => {
    setLoading(true); setError(false);
    try {
      const r = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "trends", niche: n ?? niche }),
      });
      const j = await r.json() as { ok: boolean; data?: TrendData };
      if (j.ok && j.data) setData(j.data); else setError(true);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [niche]);

  useEffect(() => { loadTrends(); }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    setTab("chat");
    const next: Msg[] = [...msgs, { role: "user", content: text.trim() }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const r = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "chat", messages: next }),
      });
      const reader = r.body!.getReader();
      const dec = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += dec.decode(value, { stream: true });
        setMsgs(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", content: full }; return c; });
      }
    } catch {
      setMsgs(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", content: "⚠️ Erreur. Réessaie." }; return c; });
    } finally { setStreaming(false); }
  }, [msgs, streaming]);

  const TABS = [
    { id: "tendances" as Tab, label: "Tendances", icon: "🔥" },
    { id: "chat"      as Tab, label: "Chat",      icon: "💬" },
    { id: "planning"  as Tab, label: "Planning",  icon: "📅" },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="shrink-0 px-4 pb-3"
        style={{ paddingTop: "max(env(safe-area-inset-top,0px),14px)", background: "linear-gradient(180deg,#0d0d18,var(--bg))", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center text-xl icon-glow"
            style={{ background: "linear-gradient(135deg,#fe2c55,#25f4ee)" }}>📱</div>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-lg gradient-text leading-none">Trenda</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Agent TikTok · Tendances & Contenu</p>
          </div>
          <button onClick={() => setShowNiche(true)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-opacity active:opacity-60"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <span className="text-xs">⚙️</span>
            <span className="text-xs font-semibold truncate max-w-16" style={{ color: "var(--muted)" }}>{niche || "Ma niche"}</span>
          </button>
          <button onClick={() => loadTrends()} disabled={loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity active:opacity-60"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <svg className={loading ? "animate-spin" : ""} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "var(--card)" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: tab === t.id ? "linear-gradient(135deg,#fe2c55,#ff6b6b)" : "transparent", color: tab === t.id ? "white" : "var(--muted)" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu des onglets — Chat sans AnimatePresence pour éviter toute perte de focus iOS */}
      {tab === "chat"
        ? <ChatPanel msgs={msgs} streaming={streaming} onSend={send} />
        : (
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="flex-1 flex flex-col overflow-hidden">
              {tab === "tendances" && <TendancesPanel data={data} loading={loading} error={error} onReload={loadTrends} onChat={t => { send(t); }} />}
              {tab === "planning"  && <PlanningPanel data={data} onReload={() => { setTab("tendances"); loadTrends(); }} onChat={t => { send(t); }} />}
            </motion.div>
          </AnimatePresence>
        )
      }

      {/* Modal niche */}
      <AnimatePresence>
        {showNiche && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,.75)" }}
            onClick={() => setShowNiche(false)}>
            <motion.form initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              className="w-full rounded-t-3xl p-5 space-y-3"
              style={{ background: "#111118", border: "1px solid var(--border)", paddingBottom: "max(env(safe-area-inset-bottom,0px),20px)" }}
              onClick={e => e.stopPropagation()}
              onSubmit={e => { e.preventDefault(); setShowNiche(false); loadTrends(niche); }}>
              <p className="font-bold text-white text-lg">Ta niche TikTok</p>
              <p className="text-sm" style={{ color: "var(--muted)" }}>Trenda adapte toutes ses suggestions à ta niche.</p>
              <input value={niche} onChange={e => setNiche(e.target.value)}
                placeholder="Ex: mode vintage, cuisine végane, gaming, fitness…"
                className="w-full px-4 py-3.5 rounded-2xl text-sm text-white outline-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                autoFocus />
              <button type="submit" className="w-full py-3.5 rounded-2xl font-bold text-white"
                style={{ background: "linear-gradient(135deg,#fe2c55,#ff6b6b)" }}>
                Confirmer et recharger
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
