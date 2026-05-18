"use client";

import { useState, useRef, useEffect } from "react";
import type { TenderSection, TenderDossier, CompanyProfile } from "@/lib/tender-types";

export default function SectionEditor({
  section,
  dossier,
  profile,
  onSave,
  onClose,
}: {
  section: TenderSection;
  dossier: TenderDossier;
  profile: CompanyProfile | null;
  onSave: (s: TenderSection) => void;
  onClose: () => void;
}) {
  const [content, setContent] = useState(section.content);
  const [generating, setGenerating] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [showInstruction, setShowInstruction] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [content]);

  const handleGenerate = async (customInstruction?: string) => {
    if (!profile?.name) {
      alert("Remplis d'abord ton profil entreprise pour que l'IA puisse rédiger avec tes informations.");
      return;
    }
    setGenerating(true);
    setContent("");
    setShowInstruction(false);

    try {
      const res = await fetch("/api/tender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          section,
          dossierTitle: dossier.title,
          dossierClient: dossier.client,
          context: customInstruction?.trim() || undefined,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Erreur serveur");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setContent(text);
      }
    } catch {
      setContent("⚠️ Erreur lors de la génération. Vérifiez votre connexion et réessayez.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    onSave({
      ...section,
      content,
      status: content.trim().length > 0 ? "ready" : "empty",
    });
  };

  const handleCopy = async () => {
    if (!content.trim()) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const isModified = content !== section.content;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#050d1a" }}>
      {/* Header */}
      <div
        className="shrink-0 px-4 py-3"
        style={{
          paddingTop: "max(env(safe-area-inset-top,0px),14px)",
          background: "#07111f",
          borderBottom: "1px solid #0f2030",
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform shrink-0"
            style={{ background: "#0f2030" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm text-white truncate">{section.title}</h2>
            <p className="text-xs" style={{ color: "#3a6a8a" }}>
              {section.required ? "Requis" : "Optionnel"}
              {words > 0 ? ` · ${words} mots` : ""}
            </p>
          </div>
          {content.trim() && (
            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
              style={{
                background: copied ? "#10b98118" : "#0f2030",
                border: `1px solid ${copied ? "#10b981" : "#1a3045"}`,
                color: copied ? "#10b981" : "#5a8aaa",
              }}
            >
              {copied ? "✓ Copié" : "Copier"}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isModified}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{
              background: isModified ? "linear-gradient(135deg,#0891b2,#0d9488)" : "#0f2030",
              color: isModified ? "white" : "#3a5a7a",
            }}
          >
            Sauver
          </button>
        </div>
      </div>

      {/* Exigence */}
      <div
        className="shrink-0 mx-4 mt-3 px-3 py-2.5 rounded-xl"
        style={{ background: "#071825", border: "1px solid #0f2535" }}
      >
        <p className="text-xs font-semibold mb-1" style={{ color: "#0ea5e9" }}>
          Ce que le marché demande
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "#5a8aaa" }}>
          {section.requirement}
        </p>
      </div>

      {/* Boutons IA */}
      <div className="shrink-0 px-4 mt-3 space-y-2">
        <button
          onClick={() => handleGenerate()}
          disabled={generating}
          className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-98"
          style={{
            background: generating ? "#071825" : "#0891b214",
            border: `1px solid ${generating ? "#0f2030" : "#0891b244"}`,
            color: generating ? "#3a5a7a" : "#0ea5e9",
          }}
        >
          {generating ? (
            <>
              <div className="flex gap-0.5">
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-sky-400" />
              </div>
              Rédaction en cours…
            </>
          ) : (
            <>✨ Générer avec l&apos;IA</>
          )}
        </button>

        <button
          onClick={() => setShowInstruction(!showInstruction)}
          disabled={generating}
          className="w-full py-2 rounded-xl text-xs font-medium transition-all active:scale-98"
          style={{ background: "#07111f", border: "1px solid #0f2030", color: "#3a6a8a" }}
        >
          ✎ Générer avec instructions personnalisées
        </button>

        {showInstruction && (
          <div className="animate-fade-in space-y-2">
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Ex : Mets en avant nos 15 ans d'expérience, notre flotte de 8 camions réfrigérés, notre agrément CE FR44..."
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none resize-none"
              style={{ background: "#0f2030", border: "1px solid #1a3045", minHeight: "72px" }}
            />
            <button
              onClick={() => handleGenerate(instruction)}
              disabled={!instruction.trim()}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-98"
              style={{
                background: instruction.trim() ? "#0891b2" : "#0f2030",
                color: instruction.trim() ? "white" : "#3a5a7a",
              }}
            >
              Générer avec ces instructions
            </button>
          </div>
        )}
      </div>

      {/* Zone de texte */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pt-3 pb-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Rédigez ici ou utilisez l'IA pour générer le texte automatiquement à partir de votre profil…"
          className="w-full text-sm text-white outline-none resize-none"
          style={{
            background: "transparent",
            lineHeight: "1.75",
            minHeight: "200px",
            caretColor: "#0ea5e9",
          }}
        />
      </div>

      <div className="shrink-0 safe-bottom" style={{ minHeight: "12px", background: "#050d1a" }} />
    </div>
  );
}
