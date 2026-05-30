"use client";

import { useState, useEffect, useCallback } from "react";
import { AGENTS } from "@/lib/agents";
import type { AgentId } from "@/lib/agents";
import type { Deliverable, Episode, Scene, Message, AgentTask, LexCorrection } from "@/lib/types";
import * as db from "@/lib/db";
import AgentCard from "./AgentCard";
import AgentWorkspace from "./AgentWorkspace";
import DeliverablesPanel from "./DeliverablesPanel";
import EpisodeSelector from "./EpisodeSelector";
import StoryBible from "./StoryBible";
import LexCorrectionPanel from "./LexCorrectionPanel";

function buildSceneTasks(episodeName: string, sceneTitle: string, sceneContent: string, sceneId: string): Partial<Record<AgentId, string>> {
  const excerpt = sceneContent.slice(0, 600);
  const ctx = `Épisode "${episodeName}" — ${sceneTitle}\n\nSCRIPT DE LA SCÈNE :\n"""\n${excerpt}\n"""`;
  return {
    artia: `${ctx}\n\nLivre MAINTENANT les prompts Leonardo AI et Kling AI prêts à coller pour cette scène. Prompts en anglais, directement utilisables.`,
    monty: `${ctx}\n\nLivre MAINTENANT les instructions CapCut complètes pour cette scène. Noms exacts des menus, pas à pas.`,
    tikia: `${ctx}\n\nLivre MAINTENANT 2 posts TikTok complets (hook + caption + hashtags) pour cette scène.`,
    compta: `${ctx}\n\nLivre MAINTENANT le budget estimé pour produire cette scène (tableau avec outils et coûts).`,
    lex: `${ctx}\n\nAnalyse MAINTENANT cette scène sur le plan juridique. Si des mots doivent être corrigés, inclus le bloc CORRECTIONS_LEX:[...] à la fin.`,
    sono: `${ctx}\n\nCompose MAINTENANT les prompts Suno AI pour cette scène. Prompts en anglais, avec instructions d'intégration CapCut.`,
    maxi: `${ctx}\n\nExtrais LE moment viral de 15-30 secondes de cette scène (celui qui laisse une question sans réponse) et crée le prompt Runway AI ultime pour CE clip précis — pas toute la scène.`,
    livia: `${ctx}\n\nPour cette scène :\n1. Écris le chapitre de roman complet et immersif (prose narrative, monologues intérieurs, descriptions atmosphériques, cliffhanger en fin)\n2. Propose 3 concepts de couverture avec prompts Leonardo AI\n3. Donne la fiche Amazon KDP complète prête à coller`,
  };
}

function parseLexCorrections(content: string, sceneId: string): LexCorrection[] {
  const match = content.match(/CORRECTIONS_LEX:\s*(\[[\s\S]*?\])/);
  if (!match) return [];
  try {
    const raw = JSON.parse(match[1]) as { original: string; suggestion: string; reason: string }[];
    return raw.map((c) => ({ id: crypto.randomUUID(), sceneId, ...c }));
  } catch { return []; }
}

export default function StudioHome() {
  const [ready, setReady] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [pendingCorrections, setPendingCorrections] = useState<LexCorrection[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentId | null>(null);
  const [agentMessages, setAgentMessages] = useState<Message[]>([]);
  const [showDeliverables, setShowDeliverables] = useState(false);
  const [showBible, setShowBible] = useState(false);
  const [bible, setBible] = useState("");
  const [distributingTasks, setDistributingTasks] = useState(false);

  useEffect(() => {
    async function load() {
      const [eps, allDelivs, allTasks] = await Promise.all([
        db.getAllEpisodes(), db.getAllDeliverables(), db.getAllTasks(),
      ]);
      setBible(db.getBible());
      setEpisodes(eps.sort((a, b) => b.createdAt - a.createdAt));
      setDeliverables(allDelivs);
      setTasks(allTasks);
      if (eps.length === 1) setCurrentEpisode(eps[0]);
      setReady(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (!currentEpisode) return;
    db.getScenesByEpisode(currentEpisode.id).then(setScenes);
  }, [currentEpisode]);

  const getBadge = useCallback((agentId: AgentId) => {
    if (!currentEpisode) return 0;
    return tasks.filter((t) => t.agentId === agentId && t.episodeId === currentEpisode.id && !t.read).length;
  }, [tasks, currentEpisode]);

  const handleOpenAgent = useCallback(async (agentId: AgentId) => {
    if (!currentEpisode) return;
    const conv = await db.getConversation(agentId, currentEpisode.id);
    setAgentMessages(conv?.messages ?? []);
    setActiveAgent(agentId);
  }, [currentEpisode]);

  const handleCreateEpisode = useCallback(async (name: string, description: string) => {
    const ep: Episode = { id: crypto.randomUUID(), name, description, createdAt: Date.now(), status: "in-progress" };
    await db.saveEpisode(ep);
    setEpisodes((prev) => [ep, ...prev]);
    setCurrentEpisode(ep);
  }, []);

  const handleApprove = useCallback(async (d: Omit<Deliverable, "id" | "approvedAt">) => {
    const deliverable: Deliverable = { ...d, id: crypto.randomUUID(), approvedAt: Date.now() };
    await db.saveDeliverable(deliverable);
    setDeliverables((prev) => [...prev, deliverable]);

    // Scéna valide une scène → créer la scène + distribuer à tous les agents
    if (d.agentId === "scena" && currentEpisode) {
      const sceneMatch = d.content.match(/SCÈNE\s*(\d+)\s*[—-]\s*([^\n]+)/i);
      const sceneNumber = sceneMatch ? parseInt(sceneMatch[1]) : scenes.length + 1;
      const sceneTitle = sceneMatch ? sceneMatch[2].trim() : `Scène ${sceneNumber}`;

      const scene: Scene = {
        id: crypto.randomUUID(),
        episodeId: currentEpisode.id,
        number: sceneNumber,
        title: sceneTitle,
        content: d.content,
        approvedAt: Date.now(),
      };
      await db.saveScene(scene);
      setScenes((prev) => [...prev.filter((s) => s.number !== sceneNumber), scene].sort((a, b) => a.number - b.number));

      // Distribuer les tâches à tous les agents
      setDistributingTasks(true);
      const taskMap = buildSceneTasks(currentEpisode.name, sceneTitle, d.content, scene.id);
      const newTasks: AgentTask[] = [];
      for (const [agentId, taskContent] of Object.entries(taskMap)) {
        if (!taskContent) continue;
        const task: AgentTask = {
          id: crypto.randomUUID(),
          episodeId: currentEpisode.id,
          sceneId: scene.id,
          agentId: agentId as AgentId,
          taskContent,
          createdAt: Date.now(),
          read: false,
        };
        await db.saveTask(task);
        newTasks.push(task);
      }
      setTasks((prev) => [...prev, ...newTasks]);
      setTimeout(() => setDistributingTasks(false), 800);
    }

    // Lex : détecter les corrections automatiques
    if (d.agentId === "lex" && currentEpisode) {
      const latestScene = scenes[scenes.length - 1];
      if (latestScene) {
        const corrections = parseLexCorrections(d.content, latestScene.id);
        if (corrections.length > 0) {
          db.saveLexCorrections(corrections);
          setPendingCorrections((prev) => [...prev, ...corrections]);
        }
      }
    }
  }, [currentEpisode, scenes]);

  const handleTaskRead = useCallback(async (taskId: string) => {
    await db.markTaskRead(taskId);
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, read: true } : t));
  }, []);

  const handleLexResolve = useCallback((id: string, approved: boolean) => {
    setPendingCorrections((prev) => prev.filter((c) => c.id !== id));
    if (approved) {
      // La correction est approuvée — mettre à jour le contenu de la scène
      const correction = pendingCorrections.find((c) => c.id === id);
      if (correction) {
        const scene = scenes.find((s) => s.id === correction.sceneId);
        if (scene) {
          const updated = scene.content.replace(new RegExp(correction.original, "gi"), correction.suggestion);
          db.updateSceneContent(scene.id, updated);
          setScenes((prev) => prev.map((s) => s.id === scene.id ? { ...s, content: updated } : s));
        }
      }
    }
  }, [pendingCorrections, scenes]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: "#0a0a0f" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse-glow"
            style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}>
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
        {showBible && <StoryBible initialValue={bible} onClose={() => setShowBible(false)} onSave={setBible} />}
      </>
    );
  }

  const totalBadges = AGENTS.reduce((sum, a) => sum + getBadge(a.id), 0);
  const bibleSet = bible.trim().length > 0;
  const episodeDeliverables = deliverables.filter((d) => d.episodeId === currentEpisode.id);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0a0f" }}>
      {/* HEADER */}
      <div className="shrink-0 px-4 pb-2"
        style={{ paddingTop: "max(env(safe-area-inset-top,0px),14px)", background: "linear-gradient(180deg,#0d0d18 0%,#0a0a0f 100%)", borderBottom: "1px solid #1a1a28" }}>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentEpisode(null)}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90"
            style={{ background: "#1a1a24" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          </button>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", boxShadow: "0 0 12px rgba(124,58,237,.4)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-sm gradient-text leading-tight truncate">{currentEpisode.name}</h1>
            <p className="text-xs" style={{ color: "#5a5a72" }}>{scenes.length} scène{scenes.length !== 1 ? "s" : ""} · MØRA</p>
          </div>
          {distributingTasks && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "#7c3aed22", border: "1px solid #7c3aed44" }}>
              <div className="flex gap-0.5">
                <span className="typing-dot w-1 h-1 rounded-full bg-violet-400" />
                <span className="typing-dot w-1 h-1 rounded-full bg-violet-400" />
                <span className="typing-dot w-1 h-1 rounded-full bg-violet-400" />
              </div>
              <span className="text-xs font-semibold" style={{ color: "#8b5cf6" }}>Distribution</span>
            </div>
          )}
          <button onClick={() => setShowBible(true)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl active:scale-95"
            style={{ background: bibleSet ? "#7c3aed22" : "#13131a", border: bibleSet ? "1px solid #7c3aed55" : "1px solid #2a2a3a" }}>
            <span className="text-xs">📖</span>
            <span className="text-xs font-semibold" style={{ color: bibleSet ? "#a78bfa" : "#5a5a72" }}>{bibleSet ? "✓" : "Bible"}</span>
          </button>
          <button onClick={() => setShowDeliverables(true)}
            className="relative flex items-center gap-1 px-2 py-1.5 rounded-xl active:scale-95"
            style={{ background: "#13131a", border: "1px solid #2a2a3a" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <span className="text-xs" style={{ color: "#9090a8" }}>Livrables</span>
            {episodeDeliverables.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#10b981", color: "white" }}>
                {episodeDeliverables.length}
              </span>
            )}
          </button>
        </div>

        {!bibleSet && (
          <button onClick={() => setShowBible(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl mt-2 active:scale-98"
            style={{ background: "#f9731618", border: "1px solid #f9731644" }}>
            <span className="text-sm">⚠️</span>
            <p className="text-xs flex-1 text-left" style={{ color: "#fb923c" }}>
              <strong>Remplis la Bible</strong> — les agents ne connaissent pas encore Møra
            </p>
            <span className="text-xs" style={{ color: "#fb923c" }}>→</span>
          </button>
        )}

        {totalBadges > 0 && !distributingTasks && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl mt-2 animate-fade-in"
            style={{ background: "#7c3aed18", border: "1px solid #7c3aed33" }}>
            <span className="text-sm">🎬</span>
            <p className="text-xs" style={{ color: "#9090a8" }}>
              <span style={{ color: "#8b5cf6" }}>{totalBadges} tâche{totalBadges > 1 ? "s" : ""} en attente</span> — agents prêts
            </p>
          </div>
        )}
      </div>

      {/* LEX CORRECTIONS */}
      {pendingCorrections.length > 0 && currentEpisode && (
        <LexCorrectionPanel
          corrections={pendingCorrections}
          sceneTitle={scenes.find((s) => s.id === pendingCorrections[0].sceneId)?.title ?? "Scène"}
          onResolve={handleLexResolve}
        />
      )}

      {/* AGENTS GRID */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3">
        {/* Accès au studio d'écriture pastel — Le Monde de MLB */}
        <a
          href="/mlb"
          className="flex items-center gap-3 rounded-2xl p-3 mb-3 active:scale-98 transition-transform"
          style={{ background: "linear-gradient(135deg,#F6E7E1,#D6BD9F)", boxShadow: "0 4px 16px rgba(214,189,159,.3)" }}
        >
          <span className="text-lg shrink-0">🪶</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm" style={{ color: "#4A403A", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
              Le Monde de MLB
            </p>
            <p className="text-xs" style={{ color: "#8E7E73" }}>Plume &amp; Margaux écrivent votre livre →</p>
          </div>
        </a>

        {/* Scenes pills */}
        {scenes.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
            {scenes.map((s) => (
              <div key={s.id}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "#10b98122", color: "#10b981", border: "1px solid #10b98144" }}>
                ✓ Scène {s.number}
              </div>
            ))}
            <div className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44" }}>
              ✍️ Scène {scenes.length + 1} →
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(#7c3aed,#ec4899)" }} />
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#5a5a72" }}>10 agents · Scène par scène</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {AGENTS.map((agent) => (
            <AgentCard key={agent.id} agent={agent} badgeCount={getBadge(agent.id)} onClick={() => handleOpenAgent(agent.id)} />
          ))}
        </div>

        {/* Workflow guide */}
        <div className="mt-4 px-4 py-3 rounded-2xl" style={{ background: "#13131a", border: "1px solid #1a1a28" }}>
          <p className="text-xs font-bold text-white mb-2">🎬 Workflow scène par scène</p>
          <div className="space-y-1.5">
            {[
              { n: "1", t: "Remplis la Bible 📖 (une seule fois)", c: bibleSet ? "#10b981" : "#f97316" },
              { n: "2", t: "Scéna écrit la Scène 1 → tu valides", c: "#f59e0b" },
              { n: "3", t: "Tous les agents travaillent sur la Scène 1", c: "#8b5cf6" },
              { n: "4", t: "Lex corrige auto si besoin → ton aval", c: "#dc2626" },
              { n: "5", t: "Maxi 🚀 extrait le clip viral 15-30s", c: "#f43f5e" },
              { n: "6", t: "Livia 📚 écrit le chapitre roman + KDP", c: "#34d399" },
              { n: "7", t: "Répète pour Scène 2, 3…", c: "#06b6d4" },
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
        <StoryBible initialValue={bible} onClose={() => setShowBible(false)} onSave={setBible} />
      )}
    </div>
  );
}
