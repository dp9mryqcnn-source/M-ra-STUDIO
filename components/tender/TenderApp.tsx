"use client";

import { useState, useEffect } from "react";
import type { TenderDossier, CompanyProfile } from "@/lib/tender-types";
import * as db from "@/lib/tender-db";
import TenderDashboard from "./TenderDashboard";
import TenderProfile from "./TenderProfile";
import AODetail from "./AODetail";

type View = "dashboard" | "profile" | "ao-detail";

export default function TenderApp() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [dossiers, setDossiers] = useState<TenderDossier[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [activeDossier, setActiveDossier] = useState<TenderDossier | null>(null);

  useEffect(() => {
    setProfile(db.getProfile());
    setDossiers(db.getAllDossiers().sort((a, b) => b.updatedAt - a.updatedAt));
    setReady(true);
  }, []);

  const handleSaveProfile = (p: CompanyProfile) => {
    db.saveProfile(p);
    setProfile(p);
  };

  const handleSaveDossier = (d: TenderDossier) => {
    db.saveDossier(d);
    const sorted = db.getAllDossiers().sort((a, b) => b.updatedAt - a.updatedAt);
    setDossiers(sorted);
    setActiveDossier(d);
  };

  const handleDeleteDossier = (id: string) => {
    db.deleteDossier(id);
    setDossiers(db.getAllDossiers().sort((a, b) => b.updatedAt - a.updatedAt));
    setActiveDossier(null);
    setView("dashboard");
  };

  const handleOpenDossier = (d: TenderDossier) => {
    setActiveDossier(d);
    setView("ao-detail");
  };

  const handleNewDossier = (d: TenderDossier) => {
    db.saveDossier(d);
    setDossiers(db.getAllDossiers().sort((a, b) => b.updatedAt - a.updatedAt));
    setActiveDossier(d);
    setView("ao-detail");
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: "#050d1a" }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse-glow"
            style={{ background: "linear-gradient(135deg,#0891b2,#0d9488)" }}
          >
            <span className="text-2xl">🐟</span>
          </div>
          <p className="text-sm" style={{ color: "#3a6a8a" }}>
            Chargement…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "#050d1a" }}>
      <div className="flex-1 overflow-hidden">
        {view === "dashboard" && (
          <TenderDashboard
            dossiers={dossiers}
            profile={profile}
            onOpenDossier={handleOpenDossier}
            onNewDossier={handleNewDossier}
            onGoProfile={() => setView("profile")}
          />
        )}
        {view === "profile" && (
          <TenderProfile
            profile={profile}
            onSave={handleSaveProfile}
            onBack={() => setView("dashboard")}
          />
        )}
        {view === "ao-detail" && activeDossier && (
          <AODetail
            dossier={activeDossier}
            profile={profile}
            onSave={handleSaveDossier}
            onDelete={handleDeleteDossier}
            onBack={() => setView("dashboard")}
          />
        )}
      </div>

      {view !== "ao-detail" && (
        <div
          className="shrink-0 flex items-center justify-around px-8 py-2 safe-bottom"
          style={{ background: "#07111f", borderTop: "1px solid #0f2030" }}
        >
          <NavBtn
            icon="📋"
            label="Dossiers"
            active={view === "dashboard"}
            onClick={() => setView("dashboard")}
          />
          <NavBtn
            icon="🏢"
            label="Mon profil"
            active={view === "profile"}
            onClick={() => setView("profile")}
            dot={!profile?.name}
          />
        </div>
      )}
    </div>
  );
}

function NavBtn({
  icon,
  label,
  active,
  onClick,
  dot,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  dot?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 px-8 py-1 rounded-xl transition-all active:scale-95"
    >
      <div className="relative">
        <span className="text-xl">{icon}</span>
        {dot && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-orange-500" />
        )}
      </div>
      <span
        className="text-xs font-semibold"
        style={{ color: active ? "#0ea5e9" : "#3a5a7a" }}
      >
        {label}
      </span>
    </button>
  );
}
