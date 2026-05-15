import type { AgentId } from "./agents";

export type MessageRole = "user" | "agent";
export type DeliverableStatus = "pending" | "approved" | "revision";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface Deliverable {
  id: string;
  agentId: AgentId;
  agentName: string;
  agentEmoji: string;
  title: string;
  content: string;
  approvedAt: Date;
}

export interface Session {
  agentId: AgentId;
  messages: Message[];
  status: "idle" | "thinking" | "done";
  lastDeliverable?: string;
}
