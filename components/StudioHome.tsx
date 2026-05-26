"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AGENTS } from "@/lib/agents";
import type { AgentId } from "@/lib/agents";
import type { Deliverable, Episode, Message, AgentTask } from "@/lib/types";
import * as db from "@/lib/db";
import AgentCard from "./AgentCard";
import AgentWorkspace from "./AgentWorkspace";
import DeliverablesPanel from "./DeliverablesPanel";
import EpisodeSelector from "./EpisodeSelector";
import StoryBible from "./StoryBible";

// Génère les tâches pour chaque agent à partir du script de Scéna — 100% local, fiable
function buildAgentTasks(episodeName: string, script: string): Partial<Record<AgentId, string>> {
  const excerpt = script.slice(0, 800);
  return {
    artia: `Épisode "${episodeName}" — Script approuvé ✅\n\nSur la base de ce script :\n"""\n${excerpt}...\n"""\n\nLivre MAINTENANT les prompts Leonardo AI et Kling AI complets et prêts à coller pour les 3-5 scènes visuelles les plus importantes. Les prompts doivent être en anglais, directement utilisables, zéro modification requise.`,
    monty: `Épisode "${episodeName}" — Script approuvé ✅\n\nSur la base de ce script :\n"""\n${excerpt}...\n"""\n\nLivre MAINTENANT les instructions CapCut complètes pas à pas pour monter cet épisode : timeline, effets, transitions, export. Tout doit être immédiatement applicable.`,
    tikia: `Épisode "${episodeName}" — Script approuvé ✅\n\nSur la base de ce script :\n"""\n${excerpt}...\n"""\n\nLivre MAINTENANT 3 posts TikTok complets prêts à poster (hook + caption + hashtags + timing) pour promouvoir cet épisode.`,
    compta: `Épisode "${episodeName}" — Script approuvé ✅\n\nSur la base de ce script :\n"""\n${excerpt}...\n"""\n\nLivre MAINTENANT le budget détaillé pour produire cet épisode (outils IA, logiciels, temps estimé) sous forme de tableau.`,
    lex: `Épisode "${episodeName}" — Script approuvé ✅\n\nSur la base de ce script :\n"""\n${excerpt}...\n"""\n\nAnalyse MAINTENANT les points juridiques de cet épisode : droits musicaux, droits d'image, mentions légales à ajouter, points de vigilance.`,
    sono: `Épisode "${episodeName}" — Script approuvé ✅\n\nSur la base de ce script :\n"""\n${excerpt}...\n"""\n\nCompose MAINTENANT la bande-son complète de cet épisode : prompts Suno AI prêts à coller pour chaque scène, instructions de mixage et timestamps précis.`,
  };
}

export default function StudioHome() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentId | null>(null);
  const [agentMessages, setAgentMessages] = useState<Message[]>([]);
  const [showDeliverables, setShowDeliverables] = useState(false);
  const [showBible, setShowBible] = useState(false);
  const [bible, setBible] = useState("");
  const [distributingTasks, setDistributingTasks] = useState(false);

  useEffect(() => {
    async function load() {
      const [eps, allDelivs, allTasks] = await Promise.all([
        db.getAllEpisodes(),
        db.getAllDeliverables(),
        db.getAllTasks(),
      ]);
      setEpisodes(eps.sort((a, b) => b.createdAt - a.createdAt));
      setDeliverables(allDelivs);
      setTasks(allTasks);
      setBible(db.getBible());
      if (eps.length === 1) setCurrentEpisode(eps[0]);
      setReady(true);
    }
    load();
  }, []);

  const getBadge = useCallback(
    (agentId: AgentId) => {
      if (!currentEpisode) return 0;
      return tasks.filter(
        (t) => t.agentId === agentId && t.episodeId === currentEpisode.id && !t.read
      ).length;
    },
    [tasks, currentEpisode]
  );

  const handleOpenAgent = useCallback(
    async (agentId: AgentId) => {
      if (!currentEpisode) return;
      const conv = await db.getConversation(agentId, currentEpisode.id);
      setAgentMessages(conv?.messages ?? []);
      setActiveAgent(agentId);
    },
    [currentEpisode]
  );

  const handleCreateEpisode = useCallback(async (name: string, description: string) => {
    const ep: Episode = {
      id: crypto.randomUUID(),
      name,
      description,
      createdAt: Date.now(),
      status: "in-progress",
    };
    await db.saveEpisode(ep);
    setEpisodes((prev) => [ep, ...prev]);
    setCurrentEpisode(ep);
  }, []);

  const handleApprove = useCallback(
    async (d: Omit<Deliverable, "id" | "approvedAt">) => {
      const deliverable: Deliverable = { ...d, id: crypto.randomUUID(), approvedAt: Date.now() };
      await db.saveDeliverable(deliverable);
      setDeliverables((prev) => [...prev, deliverable]);

      // Scéna approuvée → Réa distribue les tâches localement (fiable, sans API)
      if (d.agentId === "scena" && currentEpisode) {
        setDistributingTasks(true);
        const taskMap = buildAgentTasks(currentEpisode.name, d.content);
        const newTasks: AgentTask[] = [];

        for (const [agentId, taskContent] of Object.entries(taskMap)) {
          if (!taskContent) continue;
          // Supprimer l'ancienne tâche non lue du même agent/épisode
          const existing = await db.getAllTasks();
          const old = existing.find(
            (t) => t.agentId === agentId && t.episodeId === currentEpisode.id && !t.read
          );
          if (old) await db.markTaskRead(old.id);

          const task: AgentTask = {
            id: crypto.randomUUID(),
            episodeId: currentEpisode.id,
            agentId: agentId as AgentId,
            taskContent,
            createdAt: Date.now(),
            read: false,
          };
          await db.saveTask(task);
          newTasks.push(task);
        }

        const updatedTasks = await db.getAllTasks();
        setTasks(updatedTasks);
        setTimeout(() => setDistributingTasks(false), 800);
      }
    },
    [currentEpisode]
  );

  const handleTaskRead = useCallback(async (taskId: string) => {
    await db.markTaskRead(taskId);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, read: true } : t)));
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: "#0a0a0f" }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse-glow"
            style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}
          >
            <span className="text-2xl">🎬</span>
          </div>
          <p className="text-sm" style={{ color: "#5a5a72" }}>Chargement…</p>
        </div>
      </div>
    );
  }

  if (!currentEpisode) {
    return (
      <>
        <EpisodeSelector episodes={episodes} onSelect={setCurrentEpisode} onCreate={handleCreateEpisode} />
        {showBible && (
          <StoryBible
            initialValue={bible}
            onClose={() => setShowBible(false)}
            onSave={(b) => setBible(b)}
          />
        )}
      </>
    );
  }

  const totalBadges = AGENTS.reduce((sum, a) => sum + getBadge(a.id), 0);
  const bibleSet = bible.trim().length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0a0f" }}>
      {/* ── HEADER ── */}
      <div
        className="shrink-0 px-4 pb-3"
        style={{
          paddingTop: "max(env(safe-area-inset-top,0px),14px)",
          background: "linear-gradient(180deg,#0d0d18 0%,#0a0a0f 100%)",
          borderBottom: "1px solid #1a1a28",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => setCurrentEpisode(null)}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "#1a1a24" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>

          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", boxShadow: "0 0 12px rgba(124,58,237,.4)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-black text-sm gradient-text leading-tight truncate">{currentEpisode.name}</h1>
            <p className="text-xs leading-tight" style={{ color: "#5a5a72" }}>MØRA Studio</p>
          </div>

          {distributingTasks && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "#7c3aed22", border: "1px solid #7c3aed44" }}>
              <div className="flex gap-0.5">
                <span className="typing-dot w-1 h-1 rounded-full bg-violet-400" />
                <span className="typing-dot w-1 h-1 rounded-full bg-violet-400" />
                <span className="typing-dot w-1 h-1 rounded-full bg-violet-400" />
              </div>
              <span className="text-xs font-semibold" style={{ color: "#8b5cf6" }}>Réa distribue</span>
            </div>
          )}

          {/* Bible button */}
          <button
            onClick={() => setShowBible(true)}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl active:scale-95 transition-transform"
            style={{
              background: bibleSet ? "#7c3aed22" : "#13131a",
              border: bibleSet ? "1px solid #7c3aed66" : "1px solid #2a2a3a",
            }}
          >
            <span className="text-sm">📖</span>
            <span className="text-xs font-semibold" style={{ color: bibleSet ? "#a78bfa" : "#5a5a72" }}>
              {bibleSet ? "Bible ✓" : "Bible"}
            </span>
          </button>

          {/* Livrables */}
          <button
            onClick={() => setShowDeliverables(true)}
            className="relative flex items-center gap-1 px-2.5 py-2 rounded-xl active:scale-95 transition-transform"
            style={{ background: "#13131a", border: "1px solid #2a2a3a" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <span className="text-xs" style={{ color: "#9090a8" }}>Livrables</span>
            {deliverables.filter((d) => d.episodeId === currentEpisode.id).length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "#10b981", color: "white" }}>
                {deliverables.filter((d) => d.episodeId === currentEpisode.id).length}
              </span>
            )}
          </button>
        </div>

        {/* Bible warning */}
        {!bibleSet && (
          <button
            onClick={() => setShowBible(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl mt-1 animate-fade-in active:scale-98 transition-transform"
            style={{ background: "#f97316" + "18", border: "1px solid #f9731644" }}
          >
            <span className="text-sm">⚠️</span>
            <p className="text-xs text-left flex-1" style={{ color: "#fb923c" }}>
              <strong>Remplis la Bible de ta série</strong> — les agents ne connaissent pas encore Møra
            </p>
            <span className="text-xs" style={{ color: "#fb923c" }}>→</span>
          </button>
        )}

        {/* Réa distributed */}
        {totalBadges > 0 && !distributingTasks && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl mt-1 animate-fade-in"
            style={{ background: "#7c3aed18", border: "1px solid #7c3aed33" }}>
            <span className="text-sm">🎬</span>
            <p className="text-xs" style={{ color: "#9090a8" }}>
              <span style={{ color: "#8b5cf6" }}>Réa a distribué {totalBadges} tâche{totalBadges > 1 ? "s" : ""}</span>{" "}— agents prêts
            </p>
          </div>
        )}
      </div>

      {/* ── AGENTS GRID ── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(#7c3aed,#ec4899)" }} />
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#5a5a72" }}>
            Ton équipe · 8 agents
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {AGENTS.map((agent) => (
            <AgentCard key={agent.id} agent={agent} badgeCount={getBadge(agent.id)} onClick={() => handleOpenAgent(agent.id)} />
          ))}
        </div>

        {/* Trenda CTA */}
        <button
          onClick={() => router.push("/tiktok")}
          className="mt-4 w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:scale-98 transition-transform"
          style={{ background: "linear-gradient(135deg,#ff004418,#69c9d018)", border: "1px solid #ff004433" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: "linear-gradient(135deg,#ff0044,#69c9d0)", boxShadow: "0 0 12px rgba(255,0,68,.3)" }}>
            📱
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-black text-white leading-tight">Trenda · Agent TikTok</p>
            <p className="text-xs mt-0.5" style={{ color: "#6a6a82" }}>Tendances · Propositions de contenu · Planning</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff4466" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        {/* Workflow */}
        <div className="mt-4 px-4 py-3 rounded-2xl" style={{ background: "#13131a", border: "1px solid #1a1a28" }}>
          <p className="text-xs font-bold text-white mb-2">🎬 Workflow Møra</p>
          <div className="space-y-1.5">
            {[
              { n: "1", t: "Remplis la Bible 📖 (une seule fois)", c: bibleSet ? "#10b981" : "#f97316" },
              { n: "2", t: "Scéna écrit le script → tu approuves", c: "#f59e0b" },
              { n: "3", t: "Réa distribue aux 6 agents automatiquement", c: "#8b5cf6" },
              { n: "4", t: "Chaque agent livre ses prompts prêts à coller", c: "#06b6d4" },
              { n: "5", t: "Tu approuves → Export PDF", c: "#10b981" },
            ].map((s) => (
              <div key={s.n} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: `${s.c}22`, color: s.c }}>{s.n}</span>
                <p className="text-xs" style={{ color: "#6a6a82" }}>{s.t}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: "max(env(safe-area-inset-bottom,0px),20px)" }} />
      </div>

      {activeAgent && currentEpisode && (
        <AgentWorkspace
          agent={AGENTS.find((a) => a.id === activeAgent)!}
          episode={currentEpisode}
          initialMessages={agentMessages}
          bible={bible}
          pendingTask={tasks.find((t) => t.agentId === activeAgent && t.episodeId === currentEpisode.id && !t.read) ?? null}
          onClose={() => setActiveAgent(null)}
          onApprove={handleApprove}
          onTaskRead={handleTaskRead}
        />
      )}

      {showDeliverables && (
        <DeliverablesPanel deliverables={deliverables} episodes={episodes} onClose={() => setShowDeliverables(false)} />
      )}

      {showBible && (
        <StoryBible initialValue={bible} onClose={() => setShowBible(false)} onSave={(b) => setBible(b)} />
      )}
    </div>
  );
}
