"use client";

import { useState } from "react";
import type { TenderDossier, CompanyProfile } from "@/lib/tender-types";
import AOCreator from "./AOCreator";

const STATUS_CFG = {
  draft: { label: "Brouillon", color: "#64748b", bg: "#1e293b" },
  "in-progress": { label: "En cours", color: "#0ea5e9", bg: "#082233" },
  submitted: { label: "Soumis", color: "#f59e0b", bg: "#1c1200" },
  won: { label: "Gagné ✓", color: "#10b981", bg: "#061c10" },
  lost: { label: "Non retenu", color: "#ef4444", bg: "#1c0606" },
} as const;

function sectionProgress(d: TenderDossier) {
  const filled = d.sections.filter((s) => s.content.trim().length > 0).length;
  return { filled, total: d.sections.length, pct: Math.round((filled / d.sections.length) * 100) };
}

function daysUntil(ts: number) {
  return Math.floor((ts - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function TenderDashboard({
  dossiers,
  profile,
  onOpenDossier,
  onNewDossier,
  onGoProfile,
}: {
  dossiers: TenderDossier[];
  profile: CompanyProfile | null;
  onOpenDossier: (d: TenderDossier) => void;
  onNewDossier: (d: TenderDossier) => void;
  onGoProfile: () => void;
}) {
  const [showCreator, setShowCreator] = useState(false);

  const stats = {
    total: dossiers.length,
    inProgress: dossiers.filter((d) => d.status === "in-progress").length,
    submitted: dossiers.filter((d) => d.status === "submitted").length,
    won: dossiers.filter((d) => d.status === "won").length,
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#050d1a" }}>
      {/* Header */}
      <div
        className="shrink-0 px-4 pb-4"
        style={{
          paddingTop: "max(env(safe-area-inset-top,0px),16px)",
          background: "linear-gradient(180deg,#07111f 0%,#050d1a 100%)",
          borderBottom: "1px solid #0f2030",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg,#0891b2,#0d9488)",
                boxShadow: "0 0 16px rgba(8,145,178,.35)",
              }}
            >
              <span className="text-lg">🐟</span>
            </div>
            <div>
              <h1 className="font-black text-base text-white leading-tight">AppelPro</h1>
              <p className="text-xs" style={{ color: "#3a5a7a" }}>
                Marchés publics · Import/Export poissons surgelés
              </p>
            </div>
          </div>

          {!profile?.name && (
            <button
              onClick={onGoProfile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold active:scale-95 transition-transform"
              style={{
                background: "#f9731618",
                border: "1px solid #f9731644",
                color: "#fb923c",
              }}
            >
              ⚠️ Profil
            </button>
          )}
        </div>

        {dossiers.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: "Total", value: stats.total, color: "#64748b" },
              { label: "En cours", value: stats.inProgress, color: "#0ea5e9" },
              { label: "Soumis", value: stats.submitted, color: "#f59e0b" },
              { label: "Gagnés", value: stats.won, color: "#10b981" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-2 text-center"
                style={{ background: "#0a1a2a", border: "1px solid #0f2535" }}
              >
                <p className="text-lg font-black" style={{ color: s.color }}>
                  {s.value}
                </p>
                <p className="text-xs" style={{ color: "#3a5a7a" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4">
        {dossiers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 pb-24">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
              style={{ background: "#0a1a2a", border: "1px solid #0f2535" }}
            >
              📋
            </div>
            <div className="text-center px-4">
              <p className="font-bold text-white text-lg">Aucun dossier</p>
              <p className="text-sm mt-1.5" style={{ color: "#3a6a8a" }}>
                Appuie sur <strong style={{ color: "#0ea5e9" }}>+</strong> pour créer
                ton premier appel d&apos;offres
              </p>
            </div>
            {!profile?.name && (
              <button
                onClick={onGoProfile}
                className="px-5 py-2.5 rounded-2xl text-sm font-semibold active:scale-95 transition-transform"
                style={{
                  background: "#0891b222",
                  border: "1px solid #0891b244",
                  color: "#0ea5e9",
                }}
              >
                Remplir mon profil d&apos;abord →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {dossiers.map((d) => {
              const { filled, total, pct } = sectionProgress(d);
              const days = daysUntil(d.deadline);
              const cfg = STATUS_CFG[d.status];

              return (
                <button
                  key={d.id}
                  onClick={() => onOpenDossier(d)}
                  className="w-full text-left rounded-2xl p-4 transition-all active:scale-98"
                  style={{ background: "#0a1525", border: "1px solid #0f2030" }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white leading-tight line-clamp-2">
                        {d.title}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "#3a6a8a" }}>
                        {d.client}
                      </p>
                    </div>
                    <span
                      className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full mb-2" style={{ background: "#0f2030" }}>
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: pct === 100 ? "#10b981" : "linear-gradient(90deg,#0891b2,#0d9488)",
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: "#3a5a7a" }}>
                      {filled}/{total} sections · {pct}%
                    </p>
                    <p
                      className="text-xs font-semibold"
                      style={{
                        color: days < 0 ? "#ef4444" : days < 7 ? "#f97316" : days < 30 ? "#f59e0b" : "#3a6a8a",
                      }}
                    >
                      {days < 0 ? "⚠️ Délai dépassé" : days === 0 ? "Aujourd'hui" : `J-${days}`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div style={{ height: "90px" }} />
      </div>

      {/* FAB */}
      <div className="fixed bottom-20 right-4 z-30">
        <button
          onClick={() => setShowCreator(true)}
          className="w-14 h-14 rounded-2xl flex items-center justify-center active:scale-90 transition-transform"
          style={{
            background: "linear-gradient(135deg,#0891b2,#0d9488)",
            boxShadow: "0 4px 20px rgba(8,145,178,.55)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {showCreator && (
        <AOCreator
          onClose={() => setShowCreator(false)}
          onCreate={(d) => {
            setShowCreator(false);
            onNewDossier(d);
          }}
        />
      )}
    </div>
  );
}
