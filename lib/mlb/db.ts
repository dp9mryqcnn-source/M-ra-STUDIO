"use client";

import type { MlbBook, MlbChapter, MlbMessage } from "./types";

// Persistance locale (localStorage) — tout reste sur l'appareil de Marie-Laure.
// Préfixe « mlb_ » pour ne jamais entrer en conflit avec le studio Møra.

const KEYS = {
  books: "mlb_books",
  chapters: "mlb_chapters",
  messages: (chapterId: string) => `mlb_msgs_${chapterId}`,
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
    console.warn("localStorage plein");
  }
}

// ── Livres ────────────────────────────────────────────────
export function getBooks(): MlbBook[] {
  return read<MlbBook[]>(KEYS.books, []).sort((a, b) => b.updatedAt - a.updatedAt);
}
export function saveBook(book: MlbBook): void {
  const all = read<MlbBook[]>(KEYS.books, []);
  const idx = all.findIndex((b) => b.id === book.id);
  if (idx >= 0) all[idx] = book;
  else all.push(book);
  write(KEYS.books, all);
}
export function deleteBook(bookId: string): void {
  write(
    KEYS.books,
    read<MlbBook[]>(KEYS.books, []).filter((b) => b.id !== bookId)
  );
  for (const ch of getChapters(bookId)) {
    if (typeof window !== "undefined") localStorage.removeItem(KEYS.messages(ch.id));
  }
  write(
    KEYS.chapters,
    read<MlbChapter[]>(KEYS.chapters, []).filter((c) => c.bookId !== bookId)
  );
}

// ── Chapitres ─────────────────────────────────────────────
export function getChapters(bookId: string): MlbChapter[] {
  return read<MlbChapter[]>(KEYS.chapters, [])
    .filter((c) => c.bookId === bookId)
    .sort((a, b) => a.number - b.number);
}
export function getChapter(chapterId: string): MlbChapter | null {
  return read<MlbChapter[]>(KEYS.chapters, []).find((c) => c.id === chapterId) ?? null;
}
export function saveChapter(chapter: MlbChapter): void {
  const all = read<MlbChapter[]>(KEYS.chapters, []);
  const idx = all.findIndex((c) => c.id === chapter.id);
  if (idx >= 0) all[idx] = chapter;
  else all.push(chapter);
  write(KEYS.chapters, all);
}
export function deleteChapter(chapterId: string): void {
  write(
    KEYS.chapters,
    read<MlbChapter[]>(KEYS.chapters, []).filter((c) => c.id !== chapterId)
  );
  if (typeof window !== "undefined") localStorage.removeItem(KEYS.messages(chapterId));
}

// ── Messages (conversation d'un chapitre) ─────────────────
export function getMessages(chapterId: string): MlbMessage[] {
  return read<MlbMessage[]>(KEYS.messages(chapterId), []);
}
export function setMessages(chapterId: string, messages: MlbMessage[]): void {
  write(KEYS.messages(chapterId), messages);
}
export function appendMessage(chapterId: string, message: MlbMessage): MlbMessage[] {
  const all = getMessages(chapterId);
  all.push(message);
  setMessages(chapterId, all);
  return all;
}
/** Met à jour le contenu du dernier message (streaming au fil de l'eau). */
export function updateLastMessage(chapterId: string, content: string): void {
  const all = getMessages(chapterId);
  if (all.length === 0) return;
  all[all.length - 1] = { ...all[all.length - 1], content };
  setMessages(chapterId, all);
}

// ── Photos personnalisées des agents (Plume / Margaux) ────
// Stockées en data-URL dans localStorage : la photo choisie sur le
// téléphone devient l'avatar, sans aucune manipulation de fichiers.
const avatarKey = (agentId: string) => `mlb_avatar_${agentId}`;

export function getAvatarImage(agentId: string): string | null {
  return read<string | null>(avatarKey(agentId), null);
}
export function setAvatarImage(agentId: string, dataUrl: string): void {
  write(avatarKey(agentId), dataUrl);
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("mlb-avatar-changed", { detail: agentId }));
}
export function clearAvatarImage(agentId: string): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(avatarKey(agentId));
    window.dispatchEvent(new CustomEvent("mlb-avatar-changed", { detail: agentId }));
  }
}

// ── Sauvegarde / Restauration globale ─────────────────────
export function exportAllData(): string {
  if (typeof window === "undefined") return "{}";
  const snapshot: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("mlb_")) {
      try {
        snapshot[key] = JSON.parse(localStorage.getItem(key)!);
      } catch {
        snapshot[key] = localStorage.getItem(key);
      }
    }
  }
  return JSON.stringify(snapshot, null, 2);
}
export function importAllData(json: string): void {
  if (typeof window === "undefined") return;
  const snapshot = JSON.parse(json) as Record<string, unknown>;
  for (const [key, value] of Object.entries(snapshot)) {
    if (key.startsWith("mlb_")) localStorage.setItem(key, JSON.stringify(value));
  }
}
