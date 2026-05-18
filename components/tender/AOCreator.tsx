"use client";

import { useState } from "react";
import type { TenderDossier } from "@/lib/tender-types";
import { createDefaultSections, AO_CATEGORIES } from "@/lib/tender-sections";

export default function AOCreator({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (d: TenderDossier) => void;
}) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [reference, setReference] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState(AO_CATEGORIES[0]);
  const [estimatedValue, setEstimatedValue] = useState("");

  const valid = title.trim() && client.trim() && deadline;

  const handleCreate = () => {
    if (!valid) return;
    const dossier: TenderDossier = {
      id: crypto.randomUUID(),
      title: title.trim(),
      client: client.trim(),
      reference:
        reference.trim() ||
        `AO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900 + 100))}`,
      deadline: new Date(deadline).getTime(),
      estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sections: createDefaultSections(),
      notes: "",
      category,
    };
    onCreate(dossier);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,5,15,0.8)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full rounded-t-3xl overflow-hidden animate-slide-up"
        style={{ background: "#0a1525", border: "1px solid #0f2030", maxHeight: "92vh" }}
      >
        <div
          className="flex items-center justify-between px-4 py-4"
          style={{ borderBottom: "1px solid #0f2030" }}
        >
          <h2 className="font-bold text-white text-base">Nouvel appel d&apos;offres</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "#0f2030", color: "#9090a8" }}
          >
            ✕
          </button>
        </div>

        <div
          className="overflow-y-auto scrollbar-hide px-4 py-4 space-y-4"
          style={{ maxHeight: "calc(92vh - 130px)" }}
        >
          <Field
            label="Intitulé du marché *"
            placeholder="Ex : Fourniture de poissons surgelés pour la restauration scolaire 2026-2027"
            value={title}
            onChange={setTitle}
          />
          <Field
            label="Acheteur public *"
            placeholder="Ex : Mairie de Lyon, CHU de Bordeaux, CD13..."
            value={client}
            onChange={setClient}
          />
          <Field
            label="Référence AO"
            placeholder="Ex : AO-2026-041 (générée automatiquement si vide)"
            value={reference}
            onChange={setReference}
          />

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#5a8aaa" }}>
              Date limite de dépôt *
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-xl px-3 py-3 text-sm text-white outline-none"
              style={{ background: "#0f2030", border: "1px solid #1a3045", colorScheme: "dark" }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: "#5a8aaa" }}>
              Catégorie
            </label>
            <div className="flex flex-wrap gap-2">
              {AO_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
                  style={{
                    background: category === c ? "#0891b218" : "#0f2030",
                    border: category === c ? "1px solid #0891b2" : "1px solid #1a3045",
                    color: category === c ? "#0ea5e9" : "#5a8aaa",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <Field
            label="Valeur estimée du marché (€)"
            placeholder="Ex : 80000"
            value={estimatedValue}
            onChange={setEstimatedValue}
            type="number"
          />
        </div>

        <div className="px-4 py-4" style={{ borderTop: "1px solid #0f2030" }}>
          <button
            onClick={handleCreate}
            disabled={!valid}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-98"
            style={{
              background: valid ? "linear-gradient(135deg,#0891b2,#0d9488)" : "#0f2030",
              color: valid ? "white" : "#3a5a7a",
            }}
          >
            Créer le dossier →
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#5a8aaa" }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-3 text-sm text-white outline-none"
        style={{ background: "#0f2030", border: "1px solid #1a3045" }}
      />
    </div>
  );
}
