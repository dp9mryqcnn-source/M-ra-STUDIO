"use client";

import { useState } from "react";
import type { Deliverable, Episode } from "@/lib/types";
import { AGENTS } from "@/lib/agents";
import { exportEpisodePDF, exportAgentPDF } from "@/lib/pdf";

interface Props {
  deliverables: Deliverable[];
  episodes: Episode[];
  onClose: () => void;
}

type Tab = "episodes" | "agents";

export default function DeliverablesPanel({ deliverables, episodes, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("episodes");
  const [selected, setSelected] = useState<Deliverable | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportEpisode = async (ep: Episode) => {
    const epDeliverables = deliverables.filter((d) => d.episodeId === ep.id);
    if (epDeliverables.length === 0) return;
    setExporting(true);
    try {
      await exportEpisodePDF(ep, epDeliverables);
    } finally {
      setExporting(false);
    }
  };

  const handleExportAgent = async (agentId: string) => {
    const agent = AGENTS.find((a) => a.id === agentId)!;
    const agentDeliverables = deliverables.filter((d) => d.agentId === agentId);
    if (agentDeliverables.length === 0) return;
    setExporting(true);
    try {
      await exportAgentPDF(agentId, agent.name, agent.emoji, agentDeliverables);
    } finally {
      setExporting(false);
    }
  };

  // Detail view
  if (selected) {
    const agent = AGENTS.find((a) => a.id === selected.agentId)!;
    return (
      <div className="fixed inset-0 flex flex-col animate-slide-up" style={{ background: "#0a0a0f", zIndex: 60 }}>
        <div
          className="shrink-0 flex items-center gap-3 px-4 pb-3"
          style={{ paddingTop: "max(env(safe-area-inset-top,0px),12px)", background: "#0d0d15", borderBottom: "1px solid #1a1a2a" }}
        >
          <button onClick={() => setSelected(null)}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90"
            style={{ background: "#1a1a24" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="text-2xl">{selected.agentEmoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm">{selected.agentName}</p>
            <p className="text-xs truncate" style={{ color: agent.borderColor }}>{selected.episodeName}</p>
          </div>
          <button
            onClick={() => handleExportAgent(selected.agentId)}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl active:scale-95 transition-transform"
            style={{ background: "#1a1a24", border: "1px solid #2a2a3a" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            <span className="text-xs" style={{ color: "#9090a8" }}>PDF</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
          <div
            className="rounded-2xl p-4 mb-3"
            style={{ background: "#13131a", border: `1px solid ${agent.borderColor}33` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: `${agent.glowColor}22`, color: agent.borderColor, border: `1px solid ${agent.borderColor}44` }}
              >
                ✨ Prompt définitif
              </span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#c0c0d8" }}>
              {selected.content}
            </p>
          </div>
          <p className="text-xs text-center" style={{ color: "#5a5a72" }}>
            Approuvé le {new Date(selected.approvedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col animate-slide-up" style={{ background: "#0a0a0f", zIndex: 50 }}>
      {/* Header */}
      <div
        className="shrink-0 px-4 pb-0"
        style={{ paddingTop: "max(env(safe-area-inset-top,0px),12px)", background: "#0d0d15", borderBottom: "1px solid #1a1a2a" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90"
            style={{ background: "#1a1a24" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <p className="font-bold text-white text-lg flex-1">Livrables</p>
          <div
            className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ background: "#10b98122", color: "#10b981" }}
          >
            {deliverables.length}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-0">
          {(["episodes", "agents"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-sm font-semibold rounded-t-xl transition-colors"
              style={
                tab === t
                  ? { color: "#8b5cf6", borderBottom: "2px solid #8b5cf6", background: "transparent" }
                  : { color: "#5a5a72", borderBottom: "2px solid transparent" }
              }
            >
              {t === "episodes" ? "Par épisode" : "Par agent"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        {deliverables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <span className="text-4xl">📭</span>
            <p className="text-sm" style={{ color: "#5a5a72" }}>Aucun livrable approuvé</p>
          </div>
        ) : tab === "episodes" ? (
          // ── By episode ──
          <div className="space-y-4">
            {episodes.map((ep) => {
              const epDelivs = deliverables.filter((d) => d.episodeId === ep.id);
              if (epDelivs.length === 0) return null;
              return (
                <div key={ep.id}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-white text-sm">{ep.name}</p>
                    <button
                      onClick={() => handleExportEpisode(ep)}
                      disabled={exporting}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform"
                      style={{ background: "#1a1a24", border: "1px solid #2a2a3a" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                      </svg>
                      <span className="text-xs font-semibold" style={{ color: "#8b5cf6" }}>
                        {exporting ? "…" : "PDF épisode"}
                      </span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {epDelivs.map((d) => {
                      const agent = AGENTS.find((a) => a.id === d.agentId)!;
                      return (
                        <button
                          key={d.id}
                          onClick={() => setSelected(d)}
                          className="w-full text-left rounded-xl p-3 active:scale-98 transition-all"
                          style={{ background: "#13131a", border: `1px solid ${agent.borderColor}22` }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{d.agentEmoji}</span>
                            <span className="text-xs font-semibold" style={{ color: agent.borderColor }}>{d.agentName}</span>
                            <span className="ml-auto text-xs" style={{ color: "#5a5a72" }}>
                              {new Date(d.approvedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                          <p className="text-xs mt-1.5 line-clamp-2" style={{ color: "#6a6a82" }}>
                            {d.content.slice(0, 80)}…
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // ── By agent ──
          <div className="space-y-3">
            {AGENTS.map((agent) => {
              const agentDelivs = deliverables.filter((d) => d.agentId === agent.id);
              if (agentDelivs.length === 0) return null;
              return (
                <div key={agent.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{agent.emoji}</span>
                      <p className="font-bold text-white text-sm">{agent.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${agent.glowColor}22`, color: agent.borderColor }}>
                        {agentDelivs.length}
                      </span>
                    </div>
                    <button
                      onClick={() => handleExportAgent(agent.id)}
                      disabled={exporting}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform"
                      style={{ background: "#1a1a24", border: "1px solid #2a2a3a" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={agent.borderColor} strokeWidth="2" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                      </svg>
                      <span className="text-xs font-semibold" style={{ color: agent.borderColor }}>
                        {exporting ? "…" : "PDF agent"}
                      </span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {agentDelivs.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setSelected(d)}
                        className="w-full text-left rounded-xl p-3 active:scale-98 transition-all"
                        style={{ background: "#13131a", border: `1px solid ${agent.borderColor}22` }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white truncate">{d.episodeName}</p>
                          <span className="text-xs shrink-0 ml-2" style={{ color: "#5a5a72" }}>
                            {new Date(d.approvedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <p className="text-xs mt-1 line-clamp-2" style={{ color: "#6a6a82" }}>
                          {d.content.slice(0, 80)}…
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ height: "max(env(safe-area-inset-bottom,0px),20px)" }} />
      </div>
    </div>
  );
}
