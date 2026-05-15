"use client";

import { useState } from "react";
import type { Deliverable } from "@/lib/types";
import { AGENTS } from "@/lib/agents";

interface Props {
  deliverables: Deliverable[];
  onClose: () => void;
}

export default function DeliverablesPanel({ deliverables, onClose }: Props) {
  const [selected, setSelected] = useState<Deliverable | null>(null);

  if (selected) {
    const agent = AGENTS.find((a) => a.id === selected.agentId)!;
    return (
      <div className="fixed inset-0 flex flex-col animate-slide-up" style={{ background: "#0a0a0f", zIndex: 60 }}>
        <div
          className="shrink-0 flex items-center gap-3 px-4 pb-3"
          style={{ paddingTop: "max(env(safe-area-inset-top,0px),12px)", background: "#0d0d15", borderBottom: "1px solid #1a1a2a" }}
        >
          <button
            onClick={() => setSelected(null)}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90"
            style={{ background: "#1a1a24" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="text-2xl">{selected.agentEmoji}</span>
          <div>
            <p className="font-bold text-white text-sm">{selected.agentName}</p>
            <p className="text-xs truncate max-w-[200px]" style={{ color: agent.borderColor }}>{selected.title}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
          <div
            className="rounded-2xl p-4"
            style={{ background: "#13131a", border: `1px solid ${agent.borderColor}33` }}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#c0c0d8" }}>
              {selected.content}
            </p>
          </div>
          <p className="text-xs text-center mt-4" style={{ color: "#5a5a72" }}>
            Approuvé le {selected.approvedAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col animate-slide-up" style={{ background: "#0a0a0f", zIndex: 50 }}>
      <div
        className="shrink-0 flex items-center gap-3 px-4 pb-3"
        style={{ paddingTop: "max(env(safe-area-inset-top,0px),12px)", background: "#0d0d15", borderBottom: "1px solid #1a1a2a" }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90"
          style={{ background: "#1a1a24" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <p className="font-bold text-white text-lg">Livrables approuvés</p>
        <div
          className="ml-auto px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ background: "#10b98122", color: "#10b981" }}
        >
          {deliverables.length}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        {deliverables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <span className="text-4xl">📭</span>
            <p className="text-sm" style={{ color: "#5a5a72" }}>
              Aucun livrable approuvé pour l'instant
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...deliverables].reverse().map((d) => {
              const agent = AGENTS.find((a) => a.id === d.agentId)!;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className="w-full text-left rounded-2xl p-4 transition-all active:scale-98"
                  style={{ background: "#13131a", border: `1px solid ${agent.borderColor}33` }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{d.agentEmoji}</span>
                    <span className="text-xs font-semibold" style={{ color: agent.borderColor }}>
                      {d.agentName}
                    </span>
                    <span className="ml-auto text-xs" style={{ color: "#5a5a72" }}>
                      {d.approvedAt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white truncate">{d.title}</p>
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: "#6a6a82" }}>
                    {d.content.slice(0, 100)}…
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
