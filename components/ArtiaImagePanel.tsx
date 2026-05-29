"use client";

import { useState } from "react";

interface Props {
  prompt: string;
  negativePrompt: string;
  sceneLabel: string;
  borderColor: string;
  glowColor: string;
}

export default function ArtiaImagePanel({ prompt, negativePrompt, sceneLabel, borderColor, glowColor }: Props) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [approved, setApproved] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError("");
    setImages([]);
    try {
      const res = await fetch("/api/leonardo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, negativePrompt, width: 1360, height: 768 }),
      });
      const data = await res.json() as { images?: string[]; error?: string };
      if (data.error) throw new Error(data.error);
      setImages(data.images ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="mt-3 rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${borderColor}44`, background: `${glowColor}0a` }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ background: `${glowColor}18`, borderBottom: `1px solid ${borderColor}33` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🖼️</span>
          <span className="text-xs font-bold text-white">{sceneLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={copyPrompt}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold active:scale-95 transition-transform"
            style={{ background: `${borderColor}22`, color: borderColor, border: `1px solid ${borderColor}44` }}
          >
            {copied ? "✓ Copié" : "Copier prompt"}
          </button>
          <button
            onClick={generate}
            disabled={loading}
            className="px-3 py-1 rounded-lg text-xs font-bold active:scale-95 transition-transform"
            style={{
              background: loading ? "#2a2a3a" : borderColor,
              color: "white",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Génération…" : images.length > 0 ? "↺ Regénérer" : "✨ Générer"}
          </button>
        </div>
      </div>

      {/* Prompt preview */}
      <div className="px-3 py-2">
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#7a7a92" }}>
          {prompt}
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-2 py-6 animate-fade-in">
          <div className="flex gap-1">
            <span className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: borderColor }} />
            <span className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: borderColor }} />
            <span className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: borderColor }} />
          </div>
          <p className="text-xs" style={{ color: "#5a5a72" }}>Leonardo génère… (15-30 sec)</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-3 mb-3 px-3 py-2 rounded-xl" style={{ background: "#dc262618", border: "1px solid #dc262644" }}>
          <p className="text-xs" style={{ color: "#f87171" }}>⚠️ {error}</p>
        </div>
      )}

      {/* Images */}
      {images.length > 0 && !loading && (
        <div className="px-3 pb-3 space-y-2 animate-fade-in">
          <p className="text-xs font-semibold mb-2" style={{ color: "#5a5a72" }}>
            Choisis ton image :
          </p>
          {images.map((url, i) => (
            <div
              key={i}
              className="relative rounded-xl overflow-hidden"
              style={{ border: approved === url ? `2px solid #10b981` : `1px solid ${borderColor}33` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Génération ${i + 1}`} className="w-full" style={{ display: "block" }} />
              <div className="absolute bottom-0 left-0 right-0 flex gap-2 p-2" style={{ background: "linear-gradient(transparent,rgba(0,0,0,0.8))" }}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-center active:scale-95"
                  style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
                >
                  ↗ Voir
                </a>
                <button
                  onClick={() => setApproved(url)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold active:scale-95"
                  style={{
                    background: approved === url ? "#10b981" : borderColor,
                    color: "white",
                  }}
                >
                  {approved === url ? "✓ Approuvée" : "Approuver"}
                </button>
              </div>
            </div>
          ))}
          {approved && (
            <p className="text-xs text-center py-1" style={{ color: "#10b981" }}>
              ✅ Image approuvée — sauvegarde-la depuis l'aperçu
            </p>
          )}
        </div>
      )}
    </div>
  );
}
