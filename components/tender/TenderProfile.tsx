"use client";

import { useState } from "react";
import type { CompanyProfile, TenderReference } from "@/lib/tender-types";
import { CERTIFICATIONS_FISH } from "@/lib/tender-sections";

const LEGAL_FORMS = ["SARL", "SAS", "SASU", "SA", "EURL", "EI", "Auto-entrepreneur", "Autre"];

const EMPTY_PROFILE: CompanyProfile = {
  name: "",
  legalForm: "SARL",
  siret: "",
  address: "",
  postalCode: "",
  city: "",
  country: "France",
  phone: "",
  email: "",
  website: "",
  capital: "",
  effectif: 0,
  yearFounded: new Date().getFullYear() - 5,
  certifications: [],
  description: "",
  references: [],
  updatedAt: 0,
};

export default function TenderProfile({
  profile,
  onSave,
  onBack,
}: {
  profile: CompanyProfile | null;
  onSave: (p: CompanyProfile) => void;
  onBack: () => void;
}) {
  const [data, setData] = useState<CompanyProfile>(profile ?? { ...EMPTY_PROFILE });
  const [showAddRef, setShowAddRef] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const toggleCert = (cert: string) =>
    set(
      "certifications",
      data.certifications.includes(cert)
        ? data.certifications.filter((c) => c !== cert)
        : [...data.certifications, cert]
    );

  const handleSave = () => {
    onSave(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addRef = (ref: TenderReference) => {
    set("references", [...data.references, ref]);
    setShowAddRef(false);
  };

  const removeRef = (id: string) =>
    set("references", data.references.filter((r) => r.id !== id));

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
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform shrink-0"
            style={{ background: "#0f2030" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-black text-sm text-white">Profil entreprise</h1>
            <p className="text-xs" style={{ color: "#3a6a8a" }}>
              Utilisé par l&apos;IA dans tous tes appels d&apos;offres
            </p>
          </div>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{
              background: saved ? "#10b981" : "linear-gradient(135deg,#0891b2,#0d9488)",
              color: "white",
            }}
          >
            {saved ? "✓ Sauvé" : "Sauver"}
          </button>
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-6">

        <FormSection title="Identité">
          <Field label="Raison sociale *" value={data.name} onChange={(v) => set("name", v)}
            placeholder="Ex : PESCADO IMPORT SAS" />

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: "#5a8aaa" }}>
              Forme juridique
            </label>
            <div className="flex flex-wrap gap-2">
              {LEGAL_FORMS.map((f) => (
                <button
                  key={f}
                  onClick={() => set("legalForm", f)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
                  style={{
                    background: data.legalForm === f ? "#0891b218" : "#0f2030",
                    border: data.legalForm === f ? "1px solid #0891b2" : "1px solid #1a3045",
                    color: data.legalForm === f ? "#0ea5e9" : "#5a8aaa",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <Field label="SIRET" value={data.siret} onChange={(v) => set("siret", v)}
            placeholder="123 456 789 00012" />
          <Field label="Capital social" value={data.capital} onChange={(v) => set("capital", v)}
            placeholder="Ex : 50 000 €" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Effectif" value={String(data.effectif || "")}
              onChange={(v) => set("effectif", parseInt(v) || 0)} placeholder="Ex : 12" type="number" />
            <Field label="Année de création" value={String(data.yearFounded || "")}
              onChange={(v) => set("yearFounded", parseInt(v) || 0)} placeholder="Ex : 2008" type="number" />
          </div>
        </FormSection>

        <FormSection title="Coordonnées">
          <Field label="Adresse" value={data.address} onChange={(v) => set("address", v)}
            placeholder="12 rue du Port" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code postal" value={data.postalCode} onChange={(v) => set("postalCode", v)}
              placeholder="44000" />
            <Field label="Ville" value={data.city} onChange={(v) => set("city", v)}
              placeholder="Nantes" />
          </div>
          <Field label="Pays" value={data.country} onChange={(v) => set("country", v)}
            placeholder="France" />
          <Field label="Téléphone" value={data.phone} onChange={(v) => set("phone", v)}
            placeholder="+33 6 12 34 56 78" />
          <Field label="Email" value={data.email} onChange={(v) => set("email", v)}
            placeholder="contact@monentreprise.fr" type="email" />
          <Field label="Site web" value={data.website} onChange={(v) => set("website", v)}
            placeholder="www.monentreprise.fr" />
        </FormSection>

        <FormSection title="Présentation (texte libre)">
          <div>
            <p className="text-xs mb-1.5" style={{ color: "#3a6a8a" }}>
              Plus c&apos;est détaillé, mieux l&apos;IA rédige tes sections. Décris ton activité, tes
              spécialités, tes pays fournisseurs, tes moyens logistiques…
            </p>
            <textarea
              value={data.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Ex : Spécialiste de l'import-export de poissons surgelés depuis 2008, nous travaillons avec des fournisseurs certifiés MSC en Norvège, Islande et Maroc. Notre entrepôt frigorifique de 2 000 m² à Rungis et notre flotte de 6 camions réfrigérés nous permettent de livrer en J+1 sur toute la France..."
              className="w-full rounded-xl px-3 py-3 text-sm text-white outline-none resize-none"
              style={{ background: "#0f2030", border: "1px solid #1a3045", minHeight: "120px", lineHeight: "1.6" }}
            />
          </div>
        </FormSection>

        <FormSection title="Certifications & Normes">
          <div className="flex flex-wrap gap-2">
            {CERTIFICATIONS_FISH.map((cert) => (
              <button
                key={cert}
                onClick={() => toggleCert(cert)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
                style={{
                  background: data.certifications.includes(cert) ? "#10b98118" : "#0f2030",
                  border: data.certifications.includes(cert) ? "1px solid #10b981" : "1px solid #1a3045",
                  color: data.certifications.includes(cert) ? "#10b981" : "#5a8aaa",
                }}
              >
                {data.certifications.includes(cert) ? "✓ " : ""}
                {cert}
              </button>
            ))}
          </div>
        </FormSection>

        <FormSection title={`Références clients (${data.references.length})`}>
          {data.references.length === 0 && (
            <p className="text-xs text-center py-2" style={{ color: "#3a5a7a" }}>
              Aucune référence. Ajoute tes contrats passés pour enrichir tes dossiers.
            </p>
          )}

          {data.references.map((ref) => (
            <div
              key={ref.id}
              className="flex items-center gap-2 p-3 rounded-xl"
              style={{ background: "#0f2030", border: "1px solid #1a3045" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{ref.client}</p>
                <p className="text-xs truncate" style={{ color: "#3a6a8a" }}>{ref.description}</p>
                <p className="text-xs" style={{ color: "#3a5a7a" }}>
                  {ref.year}
                  {ref.value ? ` · ${ref.value.toLocaleString("fr-FR")} €` : ""}
                </p>
              </div>
              <button
                onClick={() => removeRef(ref.id)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
                style={{ background: "#ef444418", color: "#ef4444" }}
              >
                ×
              </button>
            </div>
          ))}

          <button
            onClick={() => setShowAddRef(true)}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all active:scale-98"
            style={{ background: "#07111f", border: "1px dashed #0f2535", color: "#0ea5e9" }}
          >
            + Ajouter une référence client
          </button>
        </FormSection>

        <div style={{ height: "24px" }} />
      </div>

      {showAddRef && (
        <AddReferenceModal onClose={() => setShowAddRef(false)} onAdd={addRef} />
      )}
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-3.5 rounded-full" style={{ background: "linear-gradient(#0891b2,#0d9488)" }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#0ea5e9" }}>
          {title}
        </p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#5a8aaa" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-3 py-3 text-sm text-white outline-none"
        style={{ background: "#0f2030", border: "1px solid #1a3045" }}
      />
    </div>
  );
}

function AddReferenceModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (ref: TenderReference) => void;
}) {
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear() - 1));
  const [value, setValue] = useState("");
  const [contact, setContact] = useState("");

  const valid = client.trim() && description.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,5,15,0.8)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full rounded-t-3xl p-5 space-y-3 animate-slide-up"
        style={{ background: "#0a1525", border: "1px solid #0f2030" }}
      >
        <h3 className="font-bold text-white text-center">Nouvelle référence client</h3>

        <Field label="Client / Organisme *" value={client} onChange={setClient}
          placeholder="Ex : Lycée J. Jaurès, CHU de Bordeaux, Ville de Nantes" />
        <Field label="Objet du marché *" value={description} onChange={setDescription}
          placeholder="Ex : Fourniture de poissons surgelés pour la restauration scolaire" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Année" value={year} onChange={setYear} placeholder="2024" type="number" />
          <Field label="Montant (€)" value={value} onChange={setValue} placeholder="120000" type="number" />
        </div>
        <Field label="Contact référent (optionnel)" value={contact} onChange={setContact}
          placeholder="Nom, tél. ou email" />

        <button
          onClick={() =>
            onAdd({
              id: crypto.randomUUID(),
              client: client.trim(),
              description: description.trim(),
              year: parseInt(year) || new Date().getFullYear(),
              value: value ? parseFloat(value) : undefined,
              contact: contact.trim() || undefined,
            })
          }
          disabled={!valid}
          className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-98"
          style={{
            background: valid ? "linear-gradient(135deg,#0891b2,#0d9488)" : "#0f2030",
            color: valid ? "white" : "#3a5a7a",
          }}
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}
