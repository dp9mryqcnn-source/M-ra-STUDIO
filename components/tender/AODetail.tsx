"use client";

import { useState } from "react";
import type { TenderDossier, TenderSection, CompanyProfile, TenderStatus } from "@/lib/tender-types";
import { exportTenderPDF } from "@/lib/tender-pdf";
import SectionEditor from "./SectionEditor";

const STATUS_OPTIONS: { value: TenderStatus; label: string; color: string; bg: string }[] = [
  { value: "draft", label: "Brouillon", color: "#64748b", bg: "#1e293b" },
  { value: "in-progress", label: "En cours", color: "#0ea5e9", bg: "#082233" },
  { value: "submitted", label: "Soumis", color: "#f59e0b", bg: "#1c1200" },
  { value: "won", label: "Gagné ✓", color: "#10b981", bg: "#061c10" },
  { value: "lost", label: "Non retenu", color: "#ef4444", bg: "#1c0606" },
];

function daysUntil(ts: number) {
  return Math.floor((ts - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function AODetail({
  dossier,
  profile,
  onSave,
  onDelete,
  onBack,
}: {
  dossier: TenderDossier;
  profile: CompanyProfile | null;
  onSave: (d: TenderDossier) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}) {
  const [activeSection, setActiveSection] = useState<TenderSection | null>(null);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSectionSave = (updated: TenderSection) => {
    onSave({
      ...dossier,
      updatedAt: Date.now(),
      sections: dossier.sections.map((s) => (s.id === updated.id ? updated : s)),
    });
    setActiveSection(null);
  };

  const handleStatusChange = (status: TenderStatus) => {
    onSave({ ...dossier, status, updatedAt: Date.now() });
    setShowStatusPicker(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportTenderPDF(dossier, profile);
    } finally {
      setExporting(false);
    }
  };

  const filledCount = dossier.sections.filter((s) => s.content.trim().length > 0).length;
  const pct = Math.round((filledCount / dossier.sections.length) * 100);
  const statusCfg = STATUS_OPTIONS.find((s) => s.value === dossier.status)!;
  const days = daysUntil(dossier.deadline);

  return (
    <div className="flex flex-col h-full" style={{ background: "#050d1a" }}>
      {/* Header */}
      <div
        className="shrink-0 px-4 pb-3"
        style={{
          paddingTop: "max(env(safe-area-inset-top,0px),14px)",
          background: "#07111f",
          borderBottom: "1px solid #0f2030",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform shrink-0"
            style={{ background: "#0f2030" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-black text-sm text-white leading-tight line-clamp-1">{dossier.title}</h1>
            <p className="text-xs" style={{ color: "#3a6a8a" }}>{dossier.client}</p>
          </div>

          <div className="relative shrink-0">
            <button
              onClick={() => setShowStatusPicker(!showStatusPicker)}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold active:scale-95 transition-transform"
              style={{ color: statusCfg.color, background: statusCfg.bg, border: `1px solid ${statusCfg.color}44` }}
            >
              {statusCfg.label} ▾
            </button>

            {showStatusPicker && (
              <div
                className="absolute right-0 top-9 z-40 rounded-2xl overflow-hidden animate-fade-in"
                style={{ background: "#0a1525", border: "1px solid #0f2030", minWidth: "140px" }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    className="w-full px-4 py-2.5 text-left text-sm font-semibold flex items-center gap-2 active:opacity-70"
                    style={{ color: opt.color }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: opt.color }} />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Barre de progression */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="w-full h-2 rounded-full" style={{ background: "#0f2030" }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: pct === 100 ? "#10b981" : "linear-gradient(90deg,#0891b2,#0d9488)",
                }}
              />
            </div>
          </div>
          <p className="text-xs shrink-0 font-medium" style={{ color: "#3a6a8a" }}>
            {filledCount}/{dossier.sections.length} · {pct}%
          </p>
          <p
            className="text-xs shrink-0 font-semibold"
            style={{
              color: days < 0 ? "#ef4444" : days < 7 ? "#f97316" : days < 30 ? "#f59e0b" : "#3a6a8a",
            }}
          >
            {days < 0 ? "⚠️ Dépassé" : days === 0 ? "Aujourd'hui !" : `J-${days}`}
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4">
        {showStatusPicker && (
          <div className="fixed inset-0 z-30" onClick={() => setShowStatusPicker(false)} />
        )}

        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(#0891b2,#0d9488)" }} />
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#3a5a7a" }}>
            Sections du dossier
          </p>
        </div>

        <div className="space-y-2">
          {dossier.sections.map((section) => {
            const filled = section.content.trim().length > 0;
            const words = section.content.trim().split(/\s+/).filter(Boolean).length;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section)}
                className="w-full text-left rounded-2xl p-3.5 transition-all active:scale-98"
                style={{
                  background: "#0a1525",
                  border: `1px solid ${filled ? "#0891b244" : "#0f2030"}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm"
                    style={{
                      background: filled ? "#0891b218" : "#0f2030",
                      border: `1px solid ${filled ? "#0891b244" : "#1a3045"}`,
                      color: filled ? "#0ea5e9" : "#3a5a7a",
                    }}
                  >
                    {filled ? "✓" : "✎"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white leading-tight">{section.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: filled ? "#0891b2" : "#3a5a7a" }}>
                      {filled ? `${words} mots rédigés` : section.required ? "Requis · À rédiger" : "Optionnel · À rédiger"}
                    </p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3a5a7a" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-5 space-y-3">
          <button
            onClick={handleExport}
            disabled={exporting || filledCount === 0}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98"
            style={{
              background: filledCount > 0 ? "linear-gradient(135deg,#0891b2,#0d9488)" : "#0f2030",
              color: filledCount > 0 ? "white" : "#3a5a7a",
            }}
          >
            {exporting ? (
              <>
                <div className="flex gap-0.5">
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-white" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-white" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-white" />
                </div>
                Génération PDF…
              </>
            ) : (
              "📄 Exporter en PDF"
            )}
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 rounded-2xl font-medium text-sm transition-all active:scale-98"
            style={{ background: "#ef444410", border: "1px solid #ef444428", color: "#ef4444" }}
          >
            Supprimer ce dossier
          </button>
        </div>
        <div style={{ height: "24px" }} />
      </div>

      {/* Confirm suppression */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,5,15,0.8)" }}
          onClick={(e) => e.target === e.currentTarget && setShowDeleteConfirm(false)}
        >
          <div
            className="w-full rounded-t-3xl p-6 space-y-4 animate-slide-up"
            style={{ background: "#0a1525", border: "1px solid #0f2030" }}
          >
            <p className="font-bold text-white text-center text-base">Supprimer ce dossier ?</p>
            <p className="text-sm text-center" style={{ color: "#3a6a8a" }}>
              Cette action est irréversible. Tout le contenu rédigé sera perdu.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-2xl font-medium text-sm"
                style={{ background: "#0f2030", color: "#9090a8" }}
              >
                Annuler
              </button>
              <button
                onClick={() => onDelete(dossier.id)}
                className="flex-1 py-3 rounded-2xl font-bold text-sm"
                style={{ background: "#ef4444", color: "white" }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSection && (
        <SectionEditor
          section={activeSection}
          dossier={dossier}
          profile={profile}
          onSave={handleSectionSave}
          onClose={() => setActiveSection(null)}
        />
      )}
    </div>
  );
}
