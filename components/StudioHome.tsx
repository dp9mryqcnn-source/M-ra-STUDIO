"use client";

import { useState, useCallback } from "react";
import { AGENTS } from "@/lib/agents";
import type { AgentId } from "@/lib/agents";
import type { Deliverable } from "@/lib/types";
import AgentCard from "./AgentCard";
import AgentWorkspace from "./AgentWorkspace";
import DeliverablesPanel from "./DeliverablesPanel";

export default function StudioHome() {
  const [activeAgent, setActiveAgent] = useState<AgentId | null>(null);
  const [showDeliverables, setShowDeliverables] = useState(false);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);

  const handleApprove = useCallback(
    (d: Omit<Deliverable, "id" | "approvedAt">) => {
      setDeliverables((prev) => [
        ...prev,
        { ...d, id: crypto.randomUUID(), approvedAt: new Date() },
      ]);
    },
    []
  );

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: "#0a0a0f" }}
    >
      {/* ── HEADER ── */}
      <div
        className="shrink-0 px-5 pb-4"
        style={{
          paddingTop: "max(env(safe-area-inset-top,0px), 16px)",
          background: "linear-gradient(180deg, #0d0d18 0%, #0a0a0f 100%)",
          borderBottom: "1px solid #1a1a28",
        }}
      >
        <div className="flex items-center justify-between mb-1">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #ec4899)",
                boxShadow: "0 0 14px rgba(124,58,237,0.5)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1 className="font-black text-lg leading-none tracking-tight gradient-text">
                MØRA
              </h1>
              <p className="text-xs leading-tight" style={{ color: "#5a5a72" }}>
                Studio
              </p>
            </div>
          </div>

          {/* Deliverables button */}
          <button
            onClick={() => setShowDeliverables(true)}
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl active:scale-95 transition-transform"
            style={{ background: "#13131a", border: "1px solid #2a2a3a" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span className="text-xs" style={{ color: "#9090a8" }}>Livrables</span>
            {deliverables.length > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "#10b981", color: "white" }}
              >
                {deliverables.length}
              </span>
            )}
          </button>
        </div>

        {/* Subtitle */}
        <p className="text-xs mt-2" style={{ color: "#5a5a72" }}>
          Ton équipe · 8 agents · Approbation finale par toi
        </p>
      </div>

      {/* ── DECORATIVE ORBS ── */}
      <div className="relative shrink-0 h-2 overflow-visible pointer-events-none">
        <div
          className="absolute top-0 left-1/4 w-32 h-32 rounded-full opacity-10 blur-3xl"
          style={{ background: "#7c3aed", transform: "translateY(-50%)" }}
        />
        <div
          className="absolute top-0 right-1/4 w-24 h-24 rounded-full opacity-10 blur-3xl"
          style={{ background: "#ec4899", transform: "translateY(-50%)" }}
        />
      </div>

      {/* ── AGENTS GRID ── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4">
        {/* Section label */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(#7c3aed,#ec4899)" }} />
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#5a5a72" }}>
            Ton équipe
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {AGENTS.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isActive={activeAgent === agent.id}
              onClick={() => setActiveAgent(agent.id)}
            />
          ))}
        </div>

        {/* Bottom tip */}
        <div
          className="mt-5 mx-1 px-4 py-3 rounded-2xl flex items-start gap-3"
          style={{ background: "#13131a", border: "1px solid #1a1a28" }}
        >
          <span className="text-lg shrink-0">💡</span>
          <div>
            <p className="text-xs font-semibold text-white mb-0.5">Comment ça marche</p>
            <p className="text-xs leading-relaxed" style={{ color: "#6a6a82" }}>
              Choisis un agent, envoie ta demande, lis son travail — puis <span style={{ color: "#10b981" }}>approuve</span> ou demande une <span style={{ color: "#8b5cf6" }}>révision</span>.
            </p>
          </div>
        </div>

        <div style={{ height: "max(env(safe-area-inset-bottom,0px), 20px)" }} />
      </div>

      {/* ── AGENT WORKSPACE ── */}
      {activeAgent && (
        <AgentWorkspace
          agent={AGENTS.find((a) => a.id === activeAgent)!}
          onClose={() => setActiveAgent(null)}
          onApprove={handleApprove}
        />
      )}

      {/* ── DELIVERABLES PANEL ── */}
      {showDeliverables && (
        <DeliverablesPanel
          deliverables={deliverables}
          onClose={() => setShowDeliverables(false)}
        />
      )}
    </div>
  );
}
