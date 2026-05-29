"use client";

import type { Episode, Scene, Conversation, Deliverable, AgentTask, Message, LexCorrection } from "./types";
import type { AgentId } from "./agents";

const KEYS = {
  episodes: "mora_episodes",
  scenes: "mora_scenes",
  deliverables: "mora_deliverables",
  tasks: "mora_tasks",
  lexCorrections: "mora_lex_corrections",
  bible: "mora_bible",
  conv: (agentId: string, episodeId: string) => `mora_conv_${agentId}_${episodeId}`,
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { console.warn("localStorage full"); }
}

// ── Episodes ──────────────────────────────────────────────
export async function getAllEpisodes(): Promise<Episode[]> {
  return read<Episode[]>(KEYS.episodes, []);
}
export async function saveEpisode(episode: Episode): Promise<void> {
  const all = read<Episode[]>(KEYS.episodes, []);
  const idx = all.findIndex((e) => e.id === episode.id);
  if (idx >= 0) all[idx] = episode; else all.push(episode);
  write(KEYS.episodes, all);
}

// ── Scenes ────────────────────────────────────────────────
export async function getScenesByEpisode(episodeId: string): Promise<Scene[]> {
  const all = read<Scene[]>(KEYS.scenes, []);
  return all.filter((s) => s.episodeId === episodeId).sort((a, b) => a.number - b.number);
}
export async function saveScene(scene: Scene): Promise<void> {
  const all = read<Scene[]>(KEYS.scenes, []);
  const idx = all.findIndex((s) => s.id === scene.id);
  if (idx >= 0) all[idx] = scene; else all.push(scene);
  write(KEYS.scenes, all);
}
export async function updateSceneContent(sceneId: string, content: string): Promise<void> {
  const all = read<Scene[]>(KEYS.scenes, []);
  const idx = all.findIndex((s) => s.id === sceneId);
  if (idx >= 0) { all[idx] = { ...all[idx], content }; write(KEYS.scenes, all); }
}

// ── Conversations ─────────────────────────────────────────
export async function getConversation(agentId: AgentId, episodeId: string): Promise<Conversation | null> {
  return read<Conversation | null>(KEYS.conv(agentId, episodeId), null);
}
export async function saveConversation(conv: Conversation): Promise<void> {
  write(KEYS.conv(conv.agentId, conv.episodeId), conv);
}
export async function appendMessage(agentId: AgentId, episodeId: string, message: Message): Promise<Conversation> {
  const existing = await getConversation(agentId, episodeId);
  const conv: Conversation = existing
    ? { ...existing, messages: [...existing.messages, message], updatedAt: Date.now() }
    : { id: `${agentId}-${episodeId}`, episodeId, agentId, messages: [message], updatedAt: Date.now() };
  await saveConversation(conv);
  return conv;
}

// ── Deliverables ──────────────────────────────────────────
export async function getAllDeliverables(): Promise<Deliverable[]> {
  return read<Deliverable[]>(KEYS.deliverables, []);
}
export async function saveDeliverable(d: Deliverable): Promise<void> {
  const all = read<Deliverable[]>(KEYS.deliverables, []);
  const idx = all.findIndex((x) => x.id === d.id);
  if (idx >= 0) all[idx] = d; else all.push(d);
  write(KEYS.deliverables, all);
}

// ── Tasks ─────────────────────────────────────────────────
export async function getAllTasks(): Promise<AgentTask[]> {
  return read<AgentTask[]>(KEYS.tasks, []);
}
export async function saveTask(task: AgentTask): Promise<void> {
  const all = read<AgentTask[]>(KEYS.tasks, []);
  const idx = all.findIndex((t) => t.id === task.id);
  if (idx >= 0) all[idx] = task; else all.push(task);
  write(KEYS.tasks, all);
}
export async function markTaskRead(taskId: string): Promise<void> {
  const all = read<AgentTask[]>(KEYS.tasks, []);
  const idx = all.findIndex((t) => t.id === taskId);
  if (idx >= 0) { all[idx] = { ...all[idx], read: true }; write(KEYS.tasks, all); }
}

// ── Lex Corrections ───────────────────────────────────────
export function getLexCorrections(sceneId: string): LexCorrection[] {
  const all = read<LexCorrection[]>(KEYS.lexCorrections, []);
  return all.filter((c) => c.sceneId === sceneId && c.approved === undefined);
}
export function saveLexCorrections(corrections: LexCorrection[]): void {
  const all = read<LexCorrection[]>(KEYS.lexCorrections, []);
  for (const c of corrections) {
    const idx = all.findIndex((x) => x.id === c.id);
    if (idx >= 0) all[idx] = c; else all.push(c);
  }
  write(KEYS.lexCorrections, all);
}
export function resolveLexCorrection(id: string, approved: boolean): void {
  const all = read<LexCorrection[]>(KEYS.lexCorrections, []);
  const idx = all.findIndex((c) => c.id === id);
  if (idx >= 0) { all[idx] = { ...all[idx], approved }; write(KEYS.lexCorrections, all); }
}

// ── Story Bible ───────────────────────────────────────────
export function getBible(): string { return read<string>(KEYS.bible, ""); }
export function saveBible(text: string): void { write(KEYS.bible, text); }
