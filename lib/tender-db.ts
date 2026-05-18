"use client";

import type { CompanyProfile, TenderDossier } from "./tender-types";

const KEYS = {
  profile: "tender_profile",
  dossiers: "tender_dossiers",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn("localStorage full");
  }
}

export function getProfile(): CompanyProfile | null {
  return read<CompanyProfile | null>(KEYS.profile, null);
}

export function saveProfile(profile: CompanyProfile): void {
  write(KEYS.profile, { ...profile, updatedAt: Date.now() });
}

export function getAllDossiers(): TenderDossier[] {
  return read<TenderDossier[]>(KEYS.dossiers, []);
}

export function saveDossier(dossier: TenderDossier): void {
  const all = read<TenderDossier[]>(KEYS.dossiers, []);
  const idx = all.findIndex((d) => d.id === dossier.id);
  if (idx >= 0) all[idx] = dossier;
  else all.push(dossier);
  write(KEYS.dossiers, all);
}

export function deleteDossier(id: string): void {
  const all = read<TenderDossier[]>(KEYS.dossiers, []);
  write(KEYS.dossiers, all.filter((d) => d.id !== id));
}
