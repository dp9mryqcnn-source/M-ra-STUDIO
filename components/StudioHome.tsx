"use client";

import { useState, useEffect, useCallback } from "react";
import { AGENTS } from "@/lib/agents";
import type { AgentId } from "@/lib/agents";
import type { Deliverable, Episode, Message, AgentTask } from "@/lib/types";
import * as db from "@/lib/db";
import AgentCard from "./AgentCard";
import AgentWorkspace from "./AgentWorkspace";
import DeliverablesPanel from "./DeliverablesPanel";
import EpisodeSelector from "./EpisodeSelector";

export default function StudioHome() {
  const [ready, setReady] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentId | null>(null);
  const [agentMessages, setAgentMessages] = useState<Message[]>([]);
  const [showDeliverables, setShowDeliverables] = useState(false);
  const [distributingTasks, setDistributingTasks] = useState(false);

  // Load all data from IndexedDB on mount
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
      // Auto-select if only one episode
      if (eps.length === 1) setCurrentEpisode(eps[0]);
      setReady(true);
    }
    load();
  }, []);

  // Badge count per agent (unread tasks for current episode)
  const getBadge = useCallback(
    (agentId: AgentId) => {
      if (!currentEpisode) return 0;
      return tasks.filter(
        (t) => t.agentId === agentId && t.episodeId === currentEpisode.id && !t.read
      ).length;
    },
    [tasks, currentEpisode]
  );

  // Open agent workspace and load conversation
  const handleOpenAgent = useCallback(
    async (agentId: AgentId) => {
      if (!currentEpisode) return;
      const conv = await db.getConversation(agentId, currentEpisode.id);
      setAgentMessages(conv?.messages ?? []);
      setActiveAgent(agentId);
    },
    [currentEpisode]
  );

  // Create episode
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

  // Approve deliverable + trigger Réa workflow if it's Scéna's
  const handleApprove = useCallback(
    async (d: Omit<Deliverable, "id" | "approvedAt">) => {
      const deliverable: Deliverable = { ...d, id: crypto.randomUUID(), approvedAt: Date.now() };
      await db.saveDeliverable(deliverable);
      setDeliverables((prev) => [...prev, deliverable]);

      // Trigger Réa workflow when Scéna's work is approved
      if (d.agentId === "scena" && currentEpisode) {
        setDistributingTasks(true);
        try {
          const res = await fetch("/api/workflow", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ episodeName: currentEpisode.name, scriptContent: d.content }),
          });
          const { tasks: taskMap } = await res.json() as { tasks: Partial<Record<AgentId, string>> };

          const newTasks: AgentTask[] = [];
          for (const [agentId, taskContent] of Object.entries(taskMap)) {
            if (!taskContent) continue;
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
          setTasks((prev) => [...prev, ...newTasks]);
        } finally {
          setDistributingTasks(false);
        }
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

  // Show episode selector if no episode selected
  if (!currentEpisode) {
    return (
      <EpisodeSelector
        episodes={episodes}
        onSelect={setCurrentEpisode}
        onCreate={handleCreateEpisode}
      />
    );
  }

  const totalBadges = AGENTS.reduce((sum, a) => sum + getBadge(a.id), 0);

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
          {/* Back + Logo */}
          <button
            onClick={() => setCurrentEpisode(null)}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform mr-0.5"
            style={{ background: "#1a1a24" }}
          >
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
            <h1 className="font-black text-base gradient-text leading-tight truncate">
              {currentEpisode.name}
            </h1>
            <p className="text-xs leading-tight" style={{ color: "#5a5a72" }}>MØRA Studio</p>
          </div>

          {/* Réa distributing indicator */}
          {distributingTasks && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: "#7c3aed22", border: "1px solid #7c3aed44" }}
            >
              <div className="flex gap-0.5">
                <span className="typing-dot w-1 h-1 rounded-full bg-violet-400" />
                <span className="typing-dot w-1 h-1 rounded-full bg-violet-400" />
                <span className="typing-dot w-1 h-1 rounded-full bg-violet-400" />
              </div>
              <span className="text-xs font-semibold" style={{ color: "#8b5cf6" }}>Réa distribue</span>
            </div>
          )}

          {/* Deliverables button */}
          <button
            onClick={() => setShowDeliverables(true)}
            className="relative flex items-center gap-1 px-2.5 py-2 rounded-xl active:scale-95 transition-transform"
            style={{ background: "#13131a", border: "1px solid #2a2a3a" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span className="text-xs" style={{ color: "#9090a8" }}>Livrables</span>
            {deliverables.filter((d) => d.episodeId === currentEpisode.id).length > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "#10b981", color: "white" }}
              >
                {deliverables.filter((d) => d.episodeId === currentEpisode.id).length}
              </span>
            )}
          </button>
        </div>

        {/* Workflow hint */}
        {totalBadges > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl mt-1 animate-fade-in"
            style={{ background: "#7c3aed18", border: "1px solid #7c3aed33" }}
          >
            <span className="text-sm">🎬</span>
            <p className="text-xs" style={{ color: "#9090a8" }}>
              <span style={{ color: "#8b5cf6" }}>Réa a distribué {totalBadges} tâche{totalBadges > 1 ? "s" : ""}</span>{" "}
              — chaque agent a son travail en attente
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
            <AgentCard
              key={agent.id}
              agent={agent}
              badgeCount={getBadge(agent.id)}
              onClick={() => handleOpenAgent(agent.id)}
            />
          ))}
        </div>

        {/* Workflow guide */}
        <div
          className="mt-5 mx-0 px-4 py-3 rounded-2xl"
          style={{ background: "#13131a", border: "1px solid #1a1a28" }}
        >
          <p className="text-xs font-bold text-white mb-2">🎬 Workflow Møra</p>
          <div className="space-y-1">
            {[
              { step: "1", label: "Scéna écrit le script", color: "#f59e0b" },
              { step: "2", label: "Tu approuves → Réa distribue", color: "#8b5cf6" },
              { step: "3", label: "Chaque agent travaille", color: "#06b6d4" },
              { step: "4", label: "Tu approuves → PDF export", color: "#10b981" },
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: `${s.color}22`, color: s.color }}
                >
                  {s.step}
                </span>
                <p className="text-xs" style={{ color: "#6a6a82" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: "max(env(safe-area-inset-bottom,0px),20px)" }} />
      </div>

      {/* ── AGENT WORKSPACE ── */}
      {activeAgent && currentEpisode && (
        <AgentWorkspace
          agent={AGENTS.find((a) => a.id === activeAgent)!}
          episode={currentEpisode}
          initialMessages={agentMessages}
          pendingTask={
            tasks.find((t) => t.agentId === activeAgent && t.episodeId === currentEpisode.id && !t.read) ?? null
          }
          onClose={() => setActiveAgent(null)}
          onApprove={handleApprove}
          onTaskRead={handleTaskRead}
        />
      )}

      {/* ── DELIVERABLES ── */}
      {showDeliverables && (
        <DeliverablesPanel
          deliverables={deliverables}
          episodes={episodes}
          onClose={() => setShowDeliverables(false)}
        />
      )}
    </div>
  );
}
