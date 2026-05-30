"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import DuoScene, { type Flow } from "./DuoScene";
import { MLB_AGENTS, getMlbAgent } from "@/lib/mlb/agents";
import type { MlbAgentId, MlbBook, MlbChapter, MlbMessage } from "@/lib/mlb/types";
import {
  appendMessage,
  deleteBook,
  deleteChapter,
  getBooks,
  getChapters,
  getMessages,
  saveBook,
  saveChapter,
  updateLastMessage,
  setAvatarImage,
  clearAvatarImage,
  getAvatarImage,
} from "@/lib/mlb/db";
import { buildChapterPdf, saveOrSharePdf } from "@/lib/mlb/pdf";

// ── Palette « Le Monde de MLB » ───────────────────────────
const C = {
  pearl: "#F9F6F1",
  blush: "#E1C1B6",
  gold: "#D6BD9F",
  silver: "#B8B2AA",
  taupe: "#8E7E73",
  ink: "#4A403A",
};

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

// Redimensionne la photo choisie (pour tenir dans le stockage du téléphone)
function fileToScaledDataUrl(file: File, max = 480, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Construit les messages API du point de vue d'un agent ──
function buildApiMessages(thread: MlbMessage[], target: MlbAgentId) {
  const mapped = thread
    .filter((m) => m.content.trim())
    .map((m) => {
      if (m.author === target) return { role: "assistant" as const, content: m.content };
      const speaker = m.author === "user" ? "" : m.author === "plume" ? "[DE PLUME] " : "[DE MARGAUX] ";
      return { role: "user" as const, content: speaker + m.content };
    });
  while (mapped.length && mapped[0].role === "assistant") mapped.shift();
  const merged: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of mapped) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += "\n\n" + m.content;
    else merged.push({ ...m });
  }
  if (merged.length === 0 || merged[merged.length - 1].role !== "user")
    merged.push({ role: "user", content: "Continue." });
  return merged;
}

// ════════════════════════════════════════════════════════════
//  Composant principal
// ════════════════════════════════════════════════════════════
export default function MlbApp() {
  const [view, setView] = useState<"home" | "book" | "chapter">("home");
  const [books, setBooks] = useState<MlbBook[]>([]);
  const [activeBook, setActiveBook] = useState<MlbBook | null>(null);
  const [chapters, setChapters] = useState<MlbChapter[]>([]);
  const [activeChapter, setActiveChapter] = useState<MlbChapter | null>(null);

  useEffect(() => {
    setBooks(getBooks());
    // PWA : enregistrement du service worker (mode hors-ligne + installation)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const openBook = useCallback((book: MlbBook) => {
    setActiveBook(book);
    setChapters(getChapters(book.id));
    setView("book");
  }, []);

  const refreshChapters = useCallback((bookId: string) => setChapters(getChapters(bookId)), []);

  const openChapter = useCallback((ch: MlbChapter) => {
    setActiveChapter(ch);
    setView("chapter");
  }, []);

  return (
    <div
      style={{ background: C.pearl, color: C.ink }}
      className="fixed inset-0 overflow-hidden flex flex-col"
    >
      {view === "home" && (
        <HomeView
          books={books}
          onCreate={(b) => {
            saveBook(b);
            setBooks(getBooks());
            openBook(b);
          }}
          onOpen={openBook}
          onDelete={(id) => {
            deleteBook(id);
            setBooks(getBooks());
          }}
        />
      )}

      {view === "book" && activeBook && (
        <BookView
          book={activeBook}
          chapters={chapters}
          onBack={() => setView("home")}
          onCreateChapter={(ch) => {
            saveChapter(ch);
            refreshChapters(activeBook.id);
            openChapter(ch);
          }}
          onOpenChapter={openChapter}
          onDeleteChapter={(id) => {
            deleteChapter(id);
            refreshChapters(activeBook.id);
          }}
        />
      )}

      {view === "chapter" && activeBook && activeChapter && (
        <ChapterAtelier
          book={activeBook}
          chapter={activeChapter}
          onBack={() => {
            refreshChapters(activeBook.id);
            setView("book");
          }}
          onChapterChange={(ch) => {
            setActiveChapter(ch);
            saveChapter(ch);
          }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Accueil — Le Monde de MLB
// ════════════════════════════════════════════════════════════
function HomeView({
  books,
  onCreate,
  onOpen,
  onDelete,
}: {
  books: MlbBook[];
  onCreate: (b: MlbBook) => void;
  onOpen: (b: MlbBook) => void;
  onDelete: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const subRef = useRef<HTMLInputElement>(null);
  const genreRef = useRef<HTMLInputElement>(null);
  const [installEvt, setInstallEvt] = useState<Event | null>(null);

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const create = () => {
    const title = titleRef.current?.value.trim() || "Mon livre";
    const now = Date.now();
    onCreate({
      id: uid(),
      title,
      subtitle: subRef.current?.value.trim() || "",
      genre: genreRef.current?.value.trim() || "",
      createdAt: now,
      updatedAt: now,
    });
    setCreating(false);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide safe-top">
      {/* En-tête */}
      <header className="px-6 pt-8 pb-5 text-center" style={{ background: `linear-gradient(180deg, ${C.gold}33, transparent)` }}>
        <p style={{ color: C.taupe, letterSpacing: 4 }} className="text-[11px] font-semibold uppercase">
          Studio d'écriture
        </p>
        <h1
          style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: C.ink }}
          className="text-[34px] leading-tight mt-1 italic font-bold"
        >
          Le Monde de MLB
        </h1>
        <p style={{ color: C.taupe }} className="text-sm mt-1">
          Vos idées, deux plumes complices, votre livre. 💕
        </p>
      </header>

      {/* Les deux agents */}
      <section className="px-5 grid grid-cols-2 gap-3 mt-1">
        {MLB_AGENTS.map((a) => (
          <AgentCardHome key={a.id} agentId={a.id} emoji={a.emoji} name={a.name} shortRole={a.shortRole} tagline={a.tagline} bubble={a.bubble} accent={a.accent} />
        ))}
      </section>

      <p style={{ color: C.taupe }} className="text-center text-xs mt-3 px-8 italic">
        Plume réécrit vos idées · Margaux les édite · elles se passent le travail à deux. ✨
      </p>

      {/* Mes livres */}
      <section className="px-5 mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 style={{ color: C.ink }} className="font-bold text-lg">
            Mes livres
          </h2>
          <button
            onClick={() => setCreating((v) => !v)}
            style={{ background: C.taupe, color: "white" }}
            className="text-sm font-semibold px-4 py-2 rounded-full active:scale-95 transition"
          >
            + Nouveau
          </button>
        </div>

        {creating && (
          <div className="rounded-2xl p-4 mb-3 space-y-2 animate-fade-in" style={{ background: "white", border: `1.5px solid ${C.gold}` }}>
            <Field inputRef={titleRef} placeholder="Titre du livre" autoFocus />
            <Field inputRef={subRef} placeholder="Sous-titre (optionnel)" />
            <Field inputRef={genreRef} placeholder="Genre (roman, mémoire, jeunesse…)" />
            <div className="flex gap-2 pt-1">
              <button onClick={create} style={{ background: C.blush, color: C.ink }} className="flex-1 py-2.5 rounded-xl font-semibold active:scale-95 transition">
                Créer le livre
              </button>
              <button onClick={() => setCreating(false)} style={{ color: C.taupe }} className="px-4">
                Annuler
              </button>
            </div>
          </div>
        )}

        {books.length === 0 && !creating && (
          <div className="rounded-2xl p-6 text-center" style={{ background: "white", border: `1.5px dashed ${C.silver}` }}>
            <p style={{ color: C.taupe }} className="text-sm">
              Aucun livre pour l'instant.
              <br />
              Touchez <b>+ Nouveau</b> pour commencer votre première histoire. 🌸
            </p>
          </div>
        )}

        <div className="space-y-2.5 pb-8">
          {books.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl p-4 flex items-center gap-3 shadow-sm active:scale-[0.99] transition"
              style={{ background: "white", border: `1px solid ${C.silver}55` }}
            >
              <button onClick={() => onOpen(b)} className="flex-1 text-left">
                <h3 style={{ color: C.ink, fontFamily: "Georgia, serif" }} className="font-bold text-base">
                  {b.title}
                </h3>
                {b.subtitle && (
                  <p style={{ color: C.taupe }} className="text-xs italic">
                    {b.subtitle}
                  </p>
                )}
                <p style={{ color: C.silver }} className="text-[11px] mt-0.5">
                  {b.genre || "Livre"} · {getChapters(b.id).length} chapitre(s)
                </p>
              </button>
              <button
                onClick={() => {
                  if (confirm(`Supprimer « ${b.title} » et tous ses chapitres ?`)) onDelete(b.id);
                }}
                style={{ color: C.silver }}
                className="px-2 py-1 text-lg"
                aria-label="Supprimer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      {installEvt && (
        <button
          onClick={async () => {
            const e = installEvt as Event & { prompt?: () => void };
            e.prompt?.();
            setInstallEvt(null);
          }}
          style={{ background: C.gold, color: "white" }}
          className="mx-5 mb-6 py-3 rounded-2xl font-semibold active:scale-95 transition"
        >
          📲 Installer l'application sur mon téléphone
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Vue Livre — liste des chapitres
// ════════════════════════════════════════════════════════════
function BookView({
  book,
  chapters,
  onBack,
  onCreateChapter,
  onOpenChapter,
  onDeleteChapter,
}: {
  book: MlbBook;
  chapters: MlbChapter[];
  onBack: () => void;
  onCreateChapter: (ch: MlbChapter) => void;
  onOpenChapter: (ch: MlbChapter) => void;
  onDeleteChapter: (id: string) => void;
}) {
  const create = () => {
    const number = (chapters[chapters.length - 1]?.number ?? 0) + 1;
    onCreateChapter({
      id: uid(),
      bookId: book.id,
      number,
      title: "",
      idea: "",
      finalText: "",
      status: "brouillon",
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title={book.title} subtitle={book.subtitle || book.genre} onBack={onBack} />
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pt-4">
        <button
          onClick={create}
          style={{ background: C.blush, color: C.ink }}
          className="w-full py-3.5 rounded-2xl font-bold mb-4 active:scale-95 transition shadow-sm"
        >
          ✍️ Nouveau chapitre
        </button>

        {chapters.length === 0 && (
          <p style={{ color: C.taupe }} className="text-center text-sm mt-8 italic px-6">
            Commencez votre premier chapitre. Donnez votre idée à Plume, elle s'occupe du reste. 🪶
          </p>
        )}

        <div className="space-y-2.5 pb-10">
          {chapters.map((ch) => (
            <div
              key={ch.id}
              className="rounded-2xl p-4 flex items-center gap-3 shadow-sm"
              style={{ background: "white", border: `1px solid ${C.silver}55` }}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center font-bold shrink-0"
                style={{ background: C.gold, color: "white", fontFamily: "Georgia, serif" }}
              >
                {ch.number}
              </div>
              <button onClick={() => onOpenChapter(ch)} className="flex-1 text-left">
                <h3 style={{ color: C.ink }} className="font-semibold">
                  {ch.title || `Chapitre ${ch.number}`}
                </h3>
                <p style={{ color: C.taupe }} className="text-[11px]">
                  <StatusPill status={ch.status} />
                </p>
              </button>
              <button
                onClick={() => {
                  if (confirm("Supprimer ce chapitre ?")) onDeleteChapter(ch.id);
                }}
                style={{ color: C.silver }}
                className="px-2 text-lg"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: MlbChapter["status"] }) {
  const map = {
    brouillon: { t: "Brouillon", c: C.silver },
    "en-cours": { t: "En cours", c: C.gold },
    termine: { t: "Terminé ✓", c: "#7FA88A" },
  } as const;
  const s = map[status];
  return (
    <span style={{ color: s.c }} className="font-semibold">
      {s.t}
    </span>
  );
}

// ════════════════════════════════════════════════════════════
//  Atelier de chapitre — Plume & Margaux collaborent
// ════════════════════════════════════════════════════════════
function ChapterAtelier({
  book,
  chapter,
  onBack,
  onChapterChange,
}: {
  book: MlbBook;
  chapter: MlbChapter;
  onBack: () => void;
  onChapterChange: (ch: MlbChapter) => void;
}) {
  const [messages, setMessages] = useState<MlbMessage[]>(() => getMessages(chapter.id));
  const [busy, setBusy] = useState(false);
  const [activeAgent, setActiveAgent] = useState<MlbAgentId>("plume");
  const [thinkingAgent, setThinkingAgent] = useState<MlbAgentId | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [flow, setFlow] = useState<Flow>("idle");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<MlbMessage[]>(messages);
  messagesRef.current = messages;

  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const bookContext = `Titre : ${book.title}${book.subtitle ? ` — ${book.subtitle}` : ""}\nGenre : ${
    book.genre || "non précisé"
  }\nChapitre en cours : n°${chapter.number}${chapter.title ? ` « ${chapter.title} »` : ""}\nIdée de départ de Marie-Laure : ${
    chapter.idea || "(à venir)"
  }`;

  const touchChapter = useCallback(
    (patch: Partial<MlbChapter>) => {
      const next = { ...chapter, ...patch, updatedAt: Date.now() };
      onChapterChange(next);
    },
    [chapter, onChapterChange]
  );

  // ── Lance un agent et streame sa réponse (persistée au fil de l'eau) ──
  const runAgent = useCallback(
    async (agentId: MlbAgentId, userMsg?: string) => {
      let thread = messagesRef.current;
      if (userMsg) {
        const um: MlbMessage = { id: uid(), chapterId: chapter.id, author: "user", content: userMsg, timestamp: Date.now() };
        thread = [...thread, um];
        appendMessage(chapter.id, um);
        setMessages(thread);
      }
      const threadForApi = thread;
      const placeholder: MlbMessage = {
        id: uid(),
        chapterId: chapter.id,
        author: agentId,
        content: "",
        timestamp: Date.now(),
      };
      appendMessage(chapter.id, placeholder);
      setMessages([...thread, placeholder]);
      setThinkingAgent(agentId);

      try {
        const res = await fetch("/api/mlb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, messages: buildApiMessages(threadForApi, agentId), bookContext }),
        });
        const reader = res.body!.getReader();
        const dec = new TextDecoder();
        let acc = "";
        let first = true;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          if (first) {
            setThinkingAgent(null);
            first = false;
          }
          updateLastMessage(chapter.id, acc); // persistance immédiate → rien n'est perdu
          setMessages((prev) => {
            const c = [...prev];
            c[c.length - 1] = { ...c[c.length - 1], content: acc };
            return c;
          });
        }
        if (chapter.status === "brouillon") touchChapter({ status: "en-cours" });
        return acc;
      } catch {
        updateLastMessage(chapter.id, "⚠️ La connexion a été interrompue. Réessayez.");
        setMessages(getMessages(chapter.id));
        return "";
      } finally {
        setThinkingAgent(null);
      }
    },
    [chapter.id, chapter.status, bookContext, touchChapter]
  );

  const lastOf = (author: MlbAgentId) => [...messagesRef.current].reverse().find((m) => m.author === author && m.content.trim());

  const send = async () => {
    const text = inputRef.current?.value.trim();
    if (!text || busy) return;
    if (inputRef.current) inputRef.current.value = "";
    setBusy(true);
    await runAgent(activeAgent, text);
    setBusy(false);
  };

  const startFromIdea = async () => {
    const idea = ideaRef.current?.value.trim();
    const title = titleRef.current?.value.trim() || "";
    if (!idea || busy) return;
    touchChapter({ idea, title });
    setBusy(true);
    setActiveAgent("plume");
    await runAgent("plume", `Voici l'idée de mon chapitre, réécris-la pour moi en plusieurs versions :\n\n${idea}`);
    setBusy(false);
  };

  const toMargaux = async () => {
    if (busy) return;
    const plumeText = lastOf("plume");
    if (!plumeText) {
      alert("Demandez d'abord à Plume d'écrire le texte. 🪶");
      return;
    }
    setBusy(true);
    setFlow("to-margaux");
    setActiveAgent("margaux");
    await runAgent("margaux", "📨 Margaux, voici le dernier texte écrit par Plume. Fais ta relecture d'éditrice complète et laisse-lui des notes précises.");
    setFlow("idle");
    setBusy(false);
  };

  const backToPlume = async () => {
    if (busy) return;
    if (!lastOf("margaux")) {
      alert("Demandez d'abord la relecture de Margaux. 📖");
      return;
    }
    setBusy(true);
    setFlow("to-plume");
    setActiveAgent("plume");
    await runAgent("plume", "📨 Plume, voici les notes de Margaux. Applique-les et propose-moi la version révisée du chapitre.");
    setFlow("idle");
    setBusy(false);
  };

  const collaborate = async () => {
    if (busy) return;
    setBusy(true);
    setFlow("collab");
    const needDraft = !lastOf("plume") || messagesRef.current[messagesRef.current.length - 1]?.author !== "plume";
    if (needDraft && (chapter.idea || ideaRef.current?.value.trim())) {
      const idea = chapter.idea || ideaRef.current!.value.trim();
      if (!chapter.idea) touchChapter({ idea });
      setActiveAgent("plume");
      await runAgent("plume", `Voici l'idée de mon chapitre, réécris-la en plusieurs versions :\n\n${idea}`);
    }
    setActiveAgent("margaux");
    await runAgent("margaux", "📨 Margaux, fais ta relecture d'éditrice du dernier texte de Plume et laisse-lui des notes précises.");
    setActiveAgent("plume");
    await runAgent("plume", "📨 Plume, applique les notes de Margaux et propose la version révisée.");
    setFlow("idle");
    setBusy(false);
  };

  const setAsFinal = (content: string) => {
    touchChapter({ finalText: content });
    alert("✅ Texte enregistré comme version du chapitre. Vous pouvez générer le PDF.");
  };

  const exportPdf = async (withConversation: boolean) => {
    let finalText = chapter.finalText;
    if (!finalText.trim()) {
      const p = lastOf("plume");
      finalText = p?.content || chapter.idea;
      if (p) touchChapter({ finalText: p.content });
    }
    const { blob, filename } = await buildChapterPdf(
      { ...book },
      { ...chapter, finalText },
      messagesRef.current,
      withConversation
    );
    const r = await saveOrSharePdf(blob, filename);
    if (r === "downloaded") alert("📄 PDF téléchargé dans vos fichiers.");
  };

  const hasIdea = chapter.idea.trim().length > 0 || messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={chapter.title || `Chapitre ${chapter.number}`}
        subtitle={book.title}
        onBack={onBack}
        right={
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{ color: C.taupe }}
            className="text-2xl px-2 leading-none"
            aria-label="Options"
          >
            ⋯
          </button>
        }
      />

      {menuOpen && (
        <ChapterMenu
          chapter={chapter}
          onClose={() => setMenuOpen(false)}
          onSetTitle={(t) => touchChapter({ title: t })}
          onStatus={(s) => touchChapter({ status: s })}
          onExport={exportPdf}
        />
      )}

      {/* Bandeau de départ : l'idée du chapitre */}
      {!hasIdea && (
        <div className="px-5 pt-4">
          <div className="rounded-2xl p-4" style={{ background: "white", border: `1.5px solid ${C.gold}` }}>
            <p style={{ color: C.ink }} className="font-bold mb-2">
              🌸 Votre idée de chapitre
            </p>
            <input
              ref={titleRef}
              placeholder="Titre du chapitre (optionnel)"
              defaultValue={chapter.title}
              className="w-full mb-2 px-3 py-2 rounded-xl outline-none"
              style={{ background: C.pearl, color: C.ink, border: `1px solid ${C.silver}55` }}
            />
            <textarea
              ref={ideaRef}
              placeholder="Racontez votre idée, même en vrac… Plume va la transformer."
              rows={4}
              className="w-full px-3 py-2 rounded-xl outline-none resize-none"
              style={{ background: C.pearl, color: C.ink, border: `1px solid ${C.silver}55` }}
            />
            <button
              onClick={startFromIdea}
              disabled={busy}
              style={{ background: C.blush, color: C.ink, opacity: busy ? 0.6 : 1 }}
              className="w-full mt-2 py-3 rounded-xl font-bold active:scale-95 transition"
            >
              🪶 Confier mon idée à Plume
            </button>
          </div>
        </div>
      )}

      {/* Scène vivante : Plume & Margaux qui interagissent */}
      {hasIdea && (
        <div className="px-4 pt-3">
          <DuoScene active={thinkingAgent ?? activeAgent} busy={busy} flow={flow} />
        </div>
      )}

      {/* Fil de conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-3">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onSetFinal={setAsFinal} />
        ))}
        {thinkingAgent && <Thinking agent={thinkingAgent} />}
        {messages.length > 0 && !busy && (
          <p style={{ color: C.silver }} className="text-center text-[11px] italic pt-1">
            Tout est sauvegardé automatiquement 🔒
          </p>
        )}
      </div>

      {/* Barre d'actions de collaboration */}
      {hasIdea && (
        <div className="px-3 pt-1.5 pb-1 flex gap-2 overflow-x-auto scrollbar-hide" style={{ borderTop: `1px solid ${C.silver}33` }}>
          <ChipBtn label="📖 Relecture de Margaux" disabled={busy} onClick={toMargaux} bg={C.gold} />
          <ChipBtn label="🪶 Renvoyer à Plume" disabled={busy} onClick={backToPlume} bg={C.blush} />
          <ChipBtn label="✨ Collaboration auto" disabled={busy} onClick={collaborate} bg={C.taupe} fg="white" />
          <ChipBtn label="📄 PDF" disabled={busy} onClick={() => exportPdf(false)} bg={C.silver} fg="white" />
        </div>
      )}

      {/* Saisie + sélecteur d'agent */}
      {hasIdea && (
        <div className="px-3 pb-3 pt-1.5 safe-bottom" style={{ background: C.pearl }}>
          <div className="flex gap-1.5 mb-2">
            {MLB_AGENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setActiveAgent(a.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-semibold transition"
                style={{
                  background: activeAgent === a.id ? a.bubble : "transparent",
                  color: activeAgent === a.id ? C.ink : C.silver,
                  border: `1.5px solid ${activeAgent === a.id ? a.accent : C.silver + "55"}`,
                }}
              >
                <Avatar agent={a.id} size={20} animated={false} />
                Parler à {a.name}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder={`Écrire à ${getMlbAgent(activeAgent).name}…`}
              className="flex-1 px-4 py-3 rounded-2xl outline-none resize-none max-h-32"
              style={{ background: "white", color: C.ink, border: `1.5px solid ${C.silver}55` }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button
              onClick={send}
              disabled={busy}
              style={{ background: getMlbAgent(activeAgent).accent, opacity: busy ? 0.5 : 1 }}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl shrink-0 active:scale-90 transition"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Menu d'options du chapitre (titre, statut, export PDF) ─
function ChapterMenu({
  chapter,
  onClose,
  onSetTitle,
  onStatus,
  onExport,
}: {
  chapter: MlbChapter;
  onClose: () => void;
  onSetTitle: (t: string) => void;
  onStatus: (s: MlbChapter["status"]) => void;
  onExport: (withConversation: boolean) => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  return (
    <div className="fixed inset-0 z-30 flex items-end" style={{ background: "rgba(74,64,58,0.35)" }} onClick={onClose}>
      <div
        className="w-full rounded-t-3xl p-5 space-y-3 animate-slide-up"
        style={{ background: C.pearl }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 rounded-full mx-auto" style={{ background: C.silver }} />
        <p style={{ color: C.ink }} className="font-bold text-center">
          Chapitre {chapter.number}
        </p>

        <div>
          <label style={{ color: C.taupe }} className="text-xs font-semibold">
            Titre du chapitre
          </label>
          <input
            ref={titleRef}
            defaultValue={chapter.title}
            placeholder={`Chapitre ${chapter.number}`}
            onBlur={() => onSetTitle(titleRef.current?.value.trim() || "")}
            className="w-full mt-1 px-3 py-2.5 rounded-xl outline-none"
            style={{ background: "white", color: C.ink, border: `1px solid ${C.silver}55` }}
          />
        </div>

        <div>
          <label style={{ color: C.taupe }} className="text-xs font-semibold">
            Statut
          </label>
          <div className="flex gap-2 mt-1">
            {(["brouillon", "en-cours", "termine"] as const).map((s) => (
              <button
                key={s}
                onClick={() => onStatus(s)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold"
                style={{
                  background: chapter.status === s ? C.gold : "white",
                  color: chapter.status === s ? "white" : C.taupe,
                  border: `1px solid ${C.silver}55`,
                }}
              >
                {s === "brouillon" ? "Brouillon" : s === "en-cours" ? "En cours" : "Terminé"}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            onExport(false);
            onClose();
          }}
          style={{ background: C.blush, color: C.ink }}
          className="w-full py-3 rounded-xl font-bold active:scale-95 transition"
        >
          📄 Enregistrer le chapitre en PDF
        </button>
        <button
          onClick={() => {
            onExport(true);
            onClose();
          }}
          style={{ background: "white", color: C.taupe, border: `1px solid ${C.silver}55` }}
          className="w-full py-3 rounded-xl font-semibold active:scale-95 transition"
        >
          📚 PDF complet (avec l'atelier Plume & Margaux)
        </button>
        <button onClick={onClose} style={{ color: C.taupe }} className="w-full py-2 text-sm">
          Fermer
        </button>
      </div>
    </div>
  );
}

// ── Petits composants présentables ────────────────────────
function ChipBtn({
  label,
  onClick,
  disabled,
  bg,
  fg = "#4A403A",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  bg: string;
  fg?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ background: bg, color: fg, opacity: disabled ? 0.5 : 1 }}
      className="whitespace-nowrap text-xs font-semibold px-3.5 py-2 rounded-full active:scale-95 transition shrink-0"
    >
      {label}
    </button>
  );
}

function MessageBubble({ message, onSetFinal }: { message: MlbMessage; onSetFinal: (c: string) => void }) {
  const isUser = message.author === "user";
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[82%] px-4 py-2.5 rounded-3xl rounded-br-md whitespace-pre-wrap text-[15px] leading-relaxed"
          style={{ background: C.taupe, color: "white" }}
        >
          {message.content}
        </div>
      </div>
    );
  }
  const agent = getMlbAgent(message.author as MlbAgentId);
  return (
    <div className="flex items-start gap-2 animate-fade-in">
      <div className="shrink-0 mt-1">
        <Avatar agent={agent.id} size={34} animated={false} />
      </div>
      <div className="max-w-[85%]">
        <p style={{ color: agent.accent }} className="text-xs font-bold mb-0.5 ml-1">
          {agent.emoji} {agent.name}
        </p>
        <div
          className="px-4 py-3 rounded-3xl rounded-tl-md whitespace-pre-wrap text-[15px] leading-relaxed"
          style={{ background: agent.bubble, color: C.ink, border: `1px solid ${agent.accent}33` }}
        >
          {message.content || "…"}
        </div>
        {message.content.trim() && (
          <button
            onClick={() => onSetFinal(message.content)}
            style={{ color: agent.accent }}
            className="text-[11px] font-semibold mt-1 ml-1 active:opacity-60"
          >
            ✓ Définir comme texte du chapitre
          </button>
        )}
      </div>
    </div>
  );
}

function Thinking({ agent }: { agent: MlbAgentId }) {
  const a = getMlbAgent(agent);
  return (
    <div className="flex items-center gap-2">
      <Avatar agent={agent} size={34} talking />
      <div className="px-4 py-3 rounded-3xl rounded-tl-md flex items-center gap-1.5" style={{ background: a.bubble }}>
        <span style={{ color: C.taupe }} className="text-xs italic mr-1">
          {a.name} écrit
        </span>
        <span className="typing-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: a.accent }} />
        <span className="typing-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: a.accent }} />
        <span className="typing-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: a.accent }} />
      </div>
    </div>
  );
}

function TopBar({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  return (
    <header
      className="flex items-center gap-2 px-3 py-3 safe-top shrink-0"
      style={{ background: `linear-gradient(180deg, ${C.gold}33, ${C.pearl})`, borderBottom: `1px solid ${C.silver}33` }}
    >
      <button onClick={onBack} style={{ color: C.taupe }} className="w-9 h-9 flex items-center justify-center text-xl active:scale-90">
        ‹
      </button>
      <div className="flex-1 min-w-0">
        <h2 style={{ color: C.ink, fontFamily: "Georgia, serif" }} className="font-bold truncate">
          {title}
        </h2>
        {subtitle && (
          <p style={{ color: C.taupe }} className="text-[11px] truncate italic">
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </header>
  );
}

// Carte d'un agent sur l'accueil, avec sélecteur de photo personnalisée
function AgentCardHome({
  agentId,
  emoji,
  name,
  shortRole,
  tagline,
  bubble,
  accent,
}: {
  agentId: MlbAgentId;
  emoji: string;
  name: string;
  shortRole: string;
  tagline: string;
  bubble: string;
  accent: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [hasCustom, setHasCustom] = useState(false);

  useEffect(() => {
    setHasCustom(!!getAvatarImage(agentId));
  }, [agentId]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await fileToScaledDataUrl(file);
      setAvatarImage(agentId, url);
      setHasCustom(true);
    } catch {
      alert("Impossible de lire cette image. Essayez une autre photo. 🌸");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div
      className="rounded-3xl p-4 flex flex-col items-center text-center shadow-sm"
      style={{ background: bubble, border: `1.5px solid ${accent}55` }}
    >
      <Avatar agent={agentId} size={78} />
      <h3 style={{ color: C.ink }} className="font-bold text-lg mt-2">
        {emoji} {name}
      </h3>
      <p style={{ color: accent }} className="text-xs font-semibold">
        {shortRole}
      </p>
      <p style={{ color: C.taupe }} className="text-[11px] mt-1 leading-snug italic">
        {tagline}
      </p>
      <button
        onClick={() => fileRef.current?.click()}
        style={{ background: "#ffffffcc", color: C.ink, border: `1px solid ${accent}66` }}
        className="text-[11px] font-semibold mt-2 px-3 py-1.5 rounded-full active:scale-95 transition"
      >
        📷 {hasCustom ? "Changer la photo" : "Choisir ma photo"}
      </button>
      {hasCustom && (
        <button
          onClick={() => {
            clearAvatarImage(agentId);
            setHasCustom(false);
          }}
          style={{ color: C.taupe }}
          className="text-[10px] mt-1 underline active:opacity-60"
        >
          Revenir au dessin
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </div>
  );
}

function Field({
  inputRef,
  placeholder,
  autoFocus,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      ref={inputRef}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full px-3 py-2.5 rounded-xl outline-none"
      style={{ background: C.pearl, color: C.ink, border: `1px solid ${C.silver}55` }}
    />
  );
}
