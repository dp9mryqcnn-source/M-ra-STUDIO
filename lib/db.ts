"use client";

import type { Episode, Conversation, Deliverable, AgentTask, Message } from "./types";
import type { AgentId } from "./agents";

// localStorage keys
const KEYS = {
  episodes: "mora_episodes",
  deliverables: "mora_deliverables",
  tasks: "mora_tasks",
  conv: (agentId: string, episodeId: string) => `mora_conv_${agentId}_${episodeId}`,
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
    // storage full — try to clear old conversations
    console.warn("localStorage full");
  }
}

// ── Episodes ──────────────────────────────────────────────
export async function getAllEpisodes(): Promise<Episode[]> {
  return read<Episode[]>(KEYS.episodes, []);
}

export async function saveEpisode(episode: Episode): Promise<void> {
  const all = read<Episode[]>(KEYS.episodes, []);
  const idx = all.findIndex((e) => e.id === episode.id);
  if (idx >= 0) all[idx] = episode;
  else all.push(episode);
  write(KEYS.episodes, all);
}

export async function deleteEpisode(id: string): Promise<void> {
  const all = read<Episode[]>(KEYS.episodes, []);
  write(KEYS.episodes, all.filter((e) => e.id !== id));
}

// ── Conversations ─────────────────────────────────────────
export async function getConversation(
  agentId: AgentId,
  episodeId: string
): Promise<Conversation | null> {
  return read<Conversation | null>(KEYS.conv(agentId, episodeId), null);
}

export async function saveConversation(conv: Conversation): Promise<void> {
  write(KEYS.conv(conv.agentId, conv.episodeId), conv);
}

export async function appendMessage(
  agentId: AgentId,
  episodeId: string,
  message: Message
): Promise<Conversation> {
  const existing = await getConversation(agentId, episodeId);
  const conv: Conversation = existing
    ? { ...existing, messages: [...existing.messages, message], updatedAt: Date.now() }
    : {
        id: `${agentId}-${episodeId}`,
        episodeId,
        agentId,
        messages: [message],
        updatedAt: Date.now(),
      };
  await saveConversation(conv);
  return conv;
}

// ── Deliverables ──────────────────────────────────────────
export async function getAllDeliverables(): Promise<Deliverable[]> {
  return read<Deliverable[]>(KEYS.deliverables, []);
}

export async function getDeliverablesByEpisode(episodeId: string): Promise<Deliverable[]> {
  const all = read<Deliverable[]>(KEYS.deliverables, []);
  return all.filter((d) => d.episodeId === episodeId);
}

export async function getDeliverablesByAgent(agentId: AgentId): Promise<Deliverable[]> {
  const all = read<Deliverable[]>(KEYS.deliverables, []);
  return all.filter((d) => d.agentId === agentId);
}

export async function saveDeliverable(d: Deliverable): Promise<void> {
  const all = read<Deliverable[]>(KEYS.deliverables, []);
  const idx = all.findIndex((x) => x.id === d.id);
  if (idx >= 0) all[idx] = d;
  else all.push(d);
  write(KEYS.deliverables, all);
}

// ── Tasks ─────────────────────────────────────────────────
export async function getAllTasks(): Promise<AgentTask[]> {
  return read<AgentTask[]>(KEYS.tasks, []);
}

export async function getTasksForAgent(agentId: AgentId): Promise<AgentTask[]> {
  const all = read<AgentTask[]>(KEYS.tasks, []);
  return all.filter((t) => t.agentId === agentId);
}

export async function saveTask(task: AgentTask): Promise<void> {
  const all = read<AgentTask[]>(KEYS.tasks, []);
  const idx = all.findIndex((t) => t.id === task.id);
  if (idx >= 0) all[idx] = task;
  else all.push(task);
  write(KEYS.tasks, all);
}

export async function markTaskRead(taskId: string): Promise<void> {
  const all = read<AgentTask[]>(KEYS.tasks, []);
  const idx = all.findIndex((t) => t.id === taskId);
  if (idx >= 0) {
    all[idx] = { ...all[idx], read: true };
    write(KEYS.tasks, all);
  }
}

export async function getUnreadTaskCount(agentId: AgentId): Promise<number> {
  const all = read<AgentTask[]>(KEYS.tasks, []);
  return all.filter((t) => t.agentId === agentId && !t.read).length;
}
