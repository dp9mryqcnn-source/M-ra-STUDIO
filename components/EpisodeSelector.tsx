"use client";

import { useState } from "react";
import type { Episode } from "@/lib/types";

interface Props {
  episodes: Episode[];
  onSelect: (ep: Episode) => void;
  onCreate: (name: string, description: string) => void;
}

export default function EpisodeSelector({ episodes, onSelect, onCreate }: Props) {
  const [creating, setCreating] = useState(episodes.length === 0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim());
    setName("");
    setDescription("");
    setCreating(false);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <div
        className="shrink-0 px-5 pt-safe pb-4"
        style={{
          paddingTop: "max(env(safe-area-inset-top,0px),20px)",
          background: "linear-gradient(180deg,#0d0d18 0%,#0a0a0f 100%)",
          borderBottom: "1px solid #1a1a28",
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", boxShadow: "0 0 14px rgba(124,58,237,.5)" }}
          >
            <span className="text-lg">🎬</span>
          </div>
          <div>
            <h1 className="font-black text-xl gradient-text">MØRA</h1>
            <p className="text-xs" style={{ color: "#5a5a72" }}>Choisis un épisode</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        {/* Create form */}
        {creating ? (
          <div
            className="rounded-2xl p-4 mb-4 animate-fade-in"
            style={{ background: "#13131a", border: "1px solid #7c3aed55" }}
          >
            <p className="font-bold text-white mb-3">Nouvel épisode</p>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom (ex: Épisode 1 — Les Origines)"
              className="w-full rounded-xl px-4 py-3 text-sm mb-2 outline-none"
              style={{ background: "#1a1a24", color: "#f0f0f5", border: "1px solid #2a2a3a" }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description courte (optionnel)"
              className="w-full rounded-xl px-4 py-3 text-sm mb-3 outline-none resize-none"
              style={{ background: "#1a1a24", color: "#f0f0f5", border: "1px solid #2a2a3a" }}
            />
            <div className="flex gap-2">
              {episodes.length > 0 && (
                <button
                  onClick={() => setCreating(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: "#1a1a24", color: "#9090a8", border: "1px solid #2a2a3a" }}
                >
                  Annuler
                </button>
              )}
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                style={{
                  background: name.trim() ? "linear-gradient(135deg,#7c3aed,#ec4899)" : "#2a2a3a",
                  color: "white",
                }}
              >
                Créer l'épisode
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center gap-3 rounded-2xl p-4 mb-4 active:scale-98 transition-transform"
            style={{ background: "#13131a", border: "1px dashed #2a2a3a" }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#7c3aed33,#ec489933)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span className="text-sm font-semibold" style={{ color: "#8b5cf6" }}>Nouvel épisode</span>
          </button>
        )}

        {/* Episode list */}
        {episodes.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "#5a5a72" }}>
              <span className="w-1 h-3 rounded-full inline-block" style={{ background: "linear-gradient(#7c3aed,#ec4899)" }} />
              Épisodes
            </p>
            <div className="space-y-2">
              {[...episodes].sort((a, b) => b.createdAt - a.createdAt).map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => onSelect(ep)}
                  className="w-full text-left rounded-2xl p-4 active:scale-98 transition-all"
                  style={{ background: "#13131a", border: "1px solid #1a1a28" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm truncate">{ep.name}</p>
                      {ep.description && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: "#6a6a82" }}>{ep.description}</p>
                      )}
                      <p className="text-xs mt-1.5" style={{ color: "#5a5a72" }}>
                        {new Date(ep.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <div
                      className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
                      style={{
                        background: ep.status === "completed" ? "#10b98122" : "#7c3aed22",
                        color: ep.status === "completed" ? "#10b981" : "#8b5cf6",
                      }}
                    >
                      {ep.status === "completed" ? "Terminé" : "En cours"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5a5a72" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                    <span className="text-xs" style={{ color: "#5a5a72" }}>Continuer</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {episodes.length === 0 && !creating && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <span className="text-5xl">🎬</span>
            <p className="text-sm text-center" style={{ color: "#5a5a72" }}>
              Aucun épisode encore.<br />Crée ton premier épisode pour commencer.
            </p>
          </div>
        )}

        <div style={{ height: "max(env(safe-area-inset-bottom,0px),20px)" }} />
      </div>
    </div>
  );
}
