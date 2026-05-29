"use client";

import type { LexCorrection } from "@/lib/types";
import { resolveLexCorrection } from "@/lib/db";

interface Props {
  corrections: LexCorrection[];
  sceneTitle: string;
  onResolve: (id: string, approved: boolean) => void;
}

export default function LexCorrectionPanel({ corrections, sceneTitle, onResolve }: Props) {
  if (corrections.length === 0) return null;

  const handleResolve = (id: string, approved: boolean) => {
    resolveLexCorrection(id, approved);
    onResolve(id, approved);
  };

  return (
    <div
      className="mx-4 mt-2 mb-1 rounded-2xl overflow-hidden animate-fade-in"
      style={{ border: "1px solid #dc262666", background: "#dc262610" }}
    >
      <div
        className="px-4 py-2 flex items-center gap-2"
        style={{ background: "#dc262622", borderBottom: "1px solid #dc262633" }}
      >
        <span className="text-base">⚖️</span>
        <div className="flex-1">
          <p className="text-xs font-bold text-white">Lex — Correction juridique</p>
          <p className="text-xs" style={{ color: "#fca5a5" }}>{sceneTitle} · {corrections.length} correction{corrections.length > 1 ? "s" : ""} proposée{corrections.length > 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {corrections.map((c) => (
          <div key={c.id}>
            <p className="text-xs mb-1" style={{ color: "#6a6a82" }}>{c.reason}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2">
                <span
                  className="px-2 py-1 rounded-lg text-xs font-semibold line-through"
                  style={{ background: "#dc262622", color: "#f87171" }}
                >
                  {c.original}
                </span>
                <span className="text-xs" style={{ color: "#5a5a72" }}>→</span>
                <span
                  className="px-2 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: "#10b98122", color: "#34d399" }}
                >
                  {c.suggestion}
                </span>
              </div>
              <button
                onClick={() => handleResolve(c.id, false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90"
                style={{ background: "#dc262622", color: "#f87171" }}
              >
                ✗
              </button>
              <button
                onClick={() => handleResolve(c.id, true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 font-bold"
                style={{ background: "#10b98133", color: "#34d399" }}
              >
                ✓
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
