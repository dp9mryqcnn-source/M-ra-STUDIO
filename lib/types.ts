import type { AgentId } from "./agents";

export type MessageRole = "user" | "agent";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

export interface Episode {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  status: "in-progress" | "completed";
}

export interface Scene {
  id: string;
  episodeId: string;
  number: number;
  title: string;
  content: string;
  approvedAt: number;
}

export interface Deliverable {
  id: string;
  episodeId: string;
  episodeName: string;
  sceneId?: string;
  sceneTitle?: string;
  agentId: AgentId;
  agentName: string;
  agentEmoji: string;
  title: string;
  content: string;
  approvedAt: number;
}

export interface AgentTask {
  id: string;
  episodeId: string;
  sceneId?: string;
  agentId: AgentId;
  taskContent: string;
  createdAt: number;
  read: boolean;
}

export interface Conversation {
  id: string;
  episodeId: string;
  agentId: AgentId;
  messages: Message[];
  updatedAt: number;
}

export interface LexCorrection {
  id: string;
  sceneId: string;
  original: string;
  suggestion: string;
  reason: string;
  approved?: boolean;
}
