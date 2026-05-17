"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { Episode, Conversation, Deliverable, AgentTask, Message } from "./types";
import type { AgentId } from "./agents";

const DB_NAME = "mora-studio";
const DB_VERSION = 1;

type MoraDB = {
  episodes: Episode;
  conversations: Conversation;
  deliverables: Deliverable;
  tasks: AgentTask;
};

let dbPromise: Promise<IDBPDatabase<MoraDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MoraDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const ep = db.createObjectStore("episodes", { keyPath: "id" });
        ep.createIndex("createdAt", "createdAt");

        const conv = db.createObjectStore("conversations", { keyPath: "id" });
        conv.createIndex("episodeId", "episodeId");
        conv.createIndex("agentId-episodeId", ["agentId", "episodeId"]);

        const del = db.createObjectStore("deliverables", { keyPath: "id" });
        del.createIndex("episodeId", "episodeId");
        del.createIndex("agentId", "agentId");

        const task = db.createObjectStore("tasks", { keyPath: "id" });
        task.createIndex("agentId", "agentId");
        task.createIndex("episodeId", "episodeId");
      },
    });
  }
  return dbPromise;
}

// ── Episodes ──────────────────────────────────────────────
export async function getAllEpisodes(): Promise<Episode[]> {
  const db = await getDB();
  return db.getAll("episodes");
}

export async function saveEpisode(episode: Episode): Promise<void> {
  const db = await getDB();
  await db.put("episodes", episode);
}

export async function deleteEpisode(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("episodes", id);
}

// ── Conversations ─────────────────────────────────────────
export async function getConversation(
  agentId: AgentId,
  episodeId: string
): Promise<Conversation | null> {
  const db = await getDB();
  const all = await db.getAllFromIndex("conversations", "agentId-episodeId", [agentId, episodeId]);
  return all[0] ?? null;
}

export async function saveConversation(conv: Conversation): Promise<void> {
  const db = await getDB();
  await db.put("conversations", conv);
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
  const db = await getDB();
  return db.getAll("deliverables");
}

export async function getDeliverablesByEpisode(episodeId: string): Promise<Deliverable[]> {
  const db = await getDB();
  return db.getAllFromIndex("deliverables", "episodeId", episodeId);
}

export async function getDeliverablesByAgent(agentId: AgentId): Promise<Deliverable[]> {
  const db = await getDB();
  return db.getAllFromIndex("deliverables", "agentId", agentId);
}

export async function saveDeliverable(d: Deliverable): Promise<void> {
  const db = await getDB();
  await db.put("deliverables", d);
}

// ── Tasks ─────────────────────────────────────────────────
export async function getTasksForAgent(agentId: AgentId): Promise<AgentTask[]> {
  const db = await getDB();
  return db.getAllFromIndex("tasks", "agentId", agentId);
}

export async function saveTask(task: AgentTask): Promise<void> {
  const db = await getDB();
  await db.put("tasks", task);
}

export async function markTaskRead(taskId: string): Promise<void> {
  const db = await getDB();
  const task = await db.get("tasks", taskId);
  if (task) await db.put("tasks", { ...task, read: true });
}

export async function getUnreadTaskCount(agentId: AgentId): Promise<number> {
  const tasks = await getTasksForAgent(agentId);
  return tasks.filter((t) => !t.read).length;
}

export async function getAllTasks(): Promise<AgentTask[]> {
  const db = await getDB();
  return db.getAll("tasks");
}
