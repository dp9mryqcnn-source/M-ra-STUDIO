"use client";

import { useState } from "react";
import { saveBible } from "@/lib/db";

interface Props {
  initialValue: string;
  onClose: () => void;
  onSave: (bible: string) => void;
}

const PLACEHOLDER = `Exemple :
MØRA est une série [genre] sur [personnage principal], une [description].

PERSONNAGES :
- Møra : [description physique + caractère]
- [Autre personnage] : [description]

UNIVERS : [monde, époque, ambiance]

TON : [sombre / poétique / énergique / etc.]

THÈMES : [thèmes principaux]

INFOS IMPORTANTES : [tout ce que les agents doivent savoir]`;

export default function StoryBible({ initialValue, onClose, onSave }: Props) {
  const [text, setText] = useState(initialValue);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveBible(text);
    onSave(text);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 flex flex-col animate-slide-up" style={{ background: "#0a0a0f", zIndex: 70 }}>
      <div
        className="shrink-0 flex items-center gap-3 px-4 pb-3"
        style={{ paddingTop: "max(env(safe-area-inset-top,0px),14px)", background: "#0d0d15", borderBottom: "1px solid #1a1a2a" }}
      >
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90"
          style={{ background: "#1a1a24" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="font-bold text-white text-base">Bible de la série</p>
          <p className="text-xs" style={{ color: "#5a5a72" }}>Lu automatiquement par tous les agents</p>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-transform"
          style={{ background: saved ? "#10b981" : "linear-gradient(135deg,#7c3aed,#ec4899)", color: "white" }}
        >
          {saved ? "✓ Sauvé" : "Sauvegarder"}
        </button>
      </div>

      {/* Info banner */}
      <div
        className="shrink-0 mx-4 mt-3 px-4 py-3 rounded-xl"
        style={{ background: "#7c3aed18", border: "1px solid #7c3aed44" }}
      >
        <div className="flex items-start gap-2">
          <span className="text-base shrink-0">💡</span>
          <p className="text-xs leading-relaxed" style={{ color: "#9090a8" }}>
            Écris ici tout ce que ta série Møra doit être — personnages, univers, ton, thèmes. <strong style={{ color: "#a78bfa" }}>Tous les agents liront ceci automatiquement</strong> à chaque conversation. Tu n'auras plus jamais à réexpliquer.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          className="w-full h-full min-h-[400px] rounded-2xl p-4 text-sm leading-relaxed resize-none outline-none scrollbar-hide"
          style={{
            background: "#13131a",
            color: "#e0e0f0",
            border: "1px solid #2a2a3a",
            lineHeight: "1.7",
          }}
        />
        <div style={{ height: "max(env(safe-area-inset-bottom,0px),20px)" }} />
      </div>
    </div>
  );
}
