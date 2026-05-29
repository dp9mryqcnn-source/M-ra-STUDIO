"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Agent } from "@/lib/agents";
import type { Deliverable, Episode, AgentTask, Message } from "@/lib/types";
import * as db from "@/lib/db";
import TypingIndicator from "./TypingIndicator";
import ArtiaImagePanel from "./ArtiaImagePanel";

interface Props {
  agent: Agent;
  episode: Episode;
  initialMessages: Message[];
  bible: string;
  pendingTask: AgentTask | null;
  onClose: () => void;
  onApprove: (deliverable: Omit<Deliverable, "id" | "approvedAt">) => void;
  onTaskRead: (taskId: string) => void;
}

function extractLeonardoPrompts(text: string): { scene: string; prompt: string; negative: string }[] {
  const results: { scene: string; prompt: string; negative: string }[] = [];
  // Cherche les blocs PROMPT LEONARDO avec leur négatif
  const blocks = text.split(/🖼️/);
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const promptMatch = block.match(/PROMPT LEONARDO[^:]*:\s*\n?([\s\S]+?)(?=❌|🎬|🎨|🖼️|$)/i);
    const negMatch = block.match(/❌[^:]*:\s*\n?([\s\S]+?)(?=🎬|🎨|🖼️|$)/i);
    const sceneMatch = block.match(/SCÈNE?\s*\d+[^—\n]*|SCENE\s*\d+[^—\n]*/i);
    if (promptMatch?.[1]?.trim()) {
      results.push({
        scene: sceneMatch?.[0]?.trim() ?? `Visuel ${i}`,
        prompt: promptMatch[1].trim().replace(/^["']|["']$/g, ""),
        negative: negMatch?.[1]?.trim() ?? "",
      });
    }
  }
  return results;
}

function renderContent(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("### "))
      return <h3 key={i} className="font-bold text-sm mt-3 mb-1" style={{ color: "#d4d4e8" }}>{line.slice(4)}</h3>;
    if (line.startsWith("## "))
      return <h2 key={i} className="font-bold text-base mt-4 mb-1" style={{ color: "#e0e0f0" }}>{line.slice(3)}</h2>;
    if (line.startsWith("# "))
      return <h1 key={i} className="font-bold text-lg mt-4 mb-2" style={{ color: "#f0f0f8" }}>{line.slice(2)}</h1>;
    if (line.includes("**")) {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="text-sm leading-relaxed" style={{ color: "#c0c0d8" }}>
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: "#e0e0f0" }}>{p}</strong> : p)}
        </p>
      );
    }
    if (line.startsWith("- ") || line.startsWith("• "))
      return <li key={i} className="text-sm leading-relaxed ml-3" style={{ color: "#b0b0c8" }}>{line.slice(2)}</li>;
    if (/^\d+\. /.test(line))
      return <li key={i} className="text-sm leading-relaxed ml-3 list-decimal" style={{ color: "#b0b0c8" }}>{line.replace(/^\d+\. /, "")}</li>;
    if (line.trim() === "") return <br key={i} />;
    return <p key={i} className="text-sm leading-relaxed" style={{ color: "#b0b0c8" }}>{line}</p>;
  });
}

export default function AgentWorkspace({
  agent,
  episode,
  initialMessages,
  bible,
  pendingTask,
  onClose,
  onApprove,
  onTaskRead,
}: Props) {
  const lastMsg = initialMessages[initialMessages.length - 1];
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [pendingApproval, setPendingApproval] = useState<string | null>(
    lastMsg?.role === "agent" ? lastMsg.content : null
  );
  const [approved, setApproved] = useState(false);
  const [taskDismissed, setTaskDismissed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-fill task into input if pending
  useEffect(() => {
    if (pendingTask && !taskDismissed && messages.length === 0) {
      setInput(pendingTask.taskContent);
    }
  }, [pendingTask, taskDismissed, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, streamedText]);

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isThinking) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsThinking(true);
    setStreamedText("");
    setPendingApproval(null);
    setApproved(false);

    await db.appendMessage(agent.id, episode.id, userMsg);

    if (pendingTask && !taskDismissed) {
      onTaskRead(pendingTask.id);
      setTaskDismissed(true);
    }

    const history = nextMessages.map((m) => ({
      role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, messages: history, bible }),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      setIsThinking(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value);
        setStreamedText(full);
      }

      const agentMsg: Message = {
        id: crypto.randomUUID(),
        role: "agent",
        content: full,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, agentMsg]);
      setStreamedText("");
      setPendingApproval(full);
      await db.appendMessage(agent.id, episode.id, agentMsg);
    } catch {
      setIsThinking(false);
      setStreamedText("");
    }
  }, [input, isThinking, messages, agent.id, episode.id, pendingTask, taskDismissed, onTaskRead]);

  const handleApprove = async () => {
    if (!pendingApproval) return;
    setApproved(true);
    const title = messages.find((m) => m.role === "user")?.content.slice(0, 60) ?? "Livrable";
    onApprove({
      episodeId: episode.id,
      episodeName: episode.name,
      agentId: agent.id,
      agentName: agent.name,
      agentEmoji: agent.emoji,
      title,
      content: pendingApproval,
    });
    setPendingApproval(null);
    setTimeout(() => setApproved(false), 3000);
  };

  const handleRevision = () => {
    setPendingApproval(null);
    inputRef.current?.focus();
  };

  return (
    <div
      className="fixed inset-0 flex flex-col animate-slide-up"
      style={{ background: "#0a0a0f", zIndex: 50 }}
    >
      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 pb-3"
        style={{
          paddingTop: "max(env(safe-area-inset-top,0px),12px)",
          background: "#0d0d15",
          borderBottom: `1px solid ${agent.borderColor}33`,
        }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: "#1a1a24" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9090a8" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
          style={{
            background: `linear-gradient(135deg,${agent.glowColor}44,${agent.glowColor}11)`,
            border: `1px solid ${agent.borderColor}66`,
            boxShadow: `0 0 16px ${agent.glowColor}`,
          }}
        >
          {agent.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-base leading-tight">{agent.name}</p>
          <p className="text-xs truncate" style={{ color: agent.borderColor }}>
            {agent.role}
          </p>
        </div>

        {/* Episode badge */}
        <div
          className="px-2 py-1 rounded-lg text-xs font-semibold shrink-0 max-w-[90px] truncate"
          style={{ background: "#1a1a24", color: "#6a6a82", border: "1px solid #2a2a3a" }}
        >
          {episode.name.length > 12 ? episode.name.slice(0, 12) + "…" : episode.name}
        </div>
      </div>

      {/* Pending task banner */}
      {pendingTask && !taskDismissed && messages.length === 0 && (
        <div
          className="shrink-0 mx-4 mt-3 px-4 py-3 rounded-xl animate-fade-in"
          style={{ background: `${agent.glowColor}22`, border: `1px solid ${agent.borderColor}55` }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">📋</span>
            <p className="text-xs font-bold" style={{ color: agent.borderColor }}>Tâche de Réa</p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#9090a8" }}>
            {pendingTask.taskContent.slice(0, 120)}…
          </p>
          <p className="text-xs mt-1.5" style={{ color: "#5a5a72" }}>
            Appuie sur Envoyer pour commencer ↓
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
        {messages.length === 0 && !(pendingTask && !taskDismissed) && (
          <div className="flex flex-col items-center justify-center h-full gap-4 pb-10">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
              style={{
                background: `radial-gradient(circle,${agent.glowColor}33,transparent)`,
                border: `1px solid ${agent.borderColor}44`,
              }}
            >
              {agent.emoji}
            </div>
            <div className="text-center">
              <p className="font-bold text-lg text-white">{agent.name} est prête</p>
              <p className="text-sm mt-1" style={{ color: "#6a6a82" }}>{agent.tagline}</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 animate-fade-in ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {msg.role === "agent" && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
                style={{ background: `${agent.glowColor}22`, border: `1px solid ${agent.borderColor}44` }}
              >
                {agent.emoji}
              </div>
            )}
            <div
              className={`max-w-[82%] px-4 py-3 rounded-2xl ${msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"}`}
              style={
                msg.role === "user"
                  ? { background: `linear-gradient(135deg,${agent.borderColor}cc,${agent.borderColor}88)` }
                  : { background: "#1a1a24", border: "1px solid #2a2a3a" }
              }
            >
              {msg.role === "user" ? (
                <p className="text-sm text-white leading-relaxed">{msg.content}</p>
              ) : (
                <div className="space-y-0.5">{renderContent(msg.content)}</div>
              )}
              <p className="text-right text-xs mt-1.5" style={{ color: msg.role === "user" ? "rgba(255,255,255,0.5)" : "#3a3a52" }}>
                {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            {/* Artia — panels de génération Leonardo */}
            {msg.role === "agent" && agent.id === "artia" && (
              <div className="w-full mt-1 ml-10 space-y-2">
                {extractLeonardoPrompts(msg.content).map((p, i) => (
                  <ArtiaImagePanel
                    key={i}
                    sceneLabel={p.scene}
                    prompt={p.prompt}
                    negativePrompt={p.negative}
                    borderColor={agent.borderColor}
                    glowColor={agent.glowColor}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {streamedText && (
          <div className="flex items-end gap-2 animate-fade-in">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
              style={{ background: `${agent.glowColor}22`, border: `1px solid ${agent.borderColor}44` }}
            >
              {agent.emoji}
            </div>
            <div
              className="max-w-[82%] px-4 py-3 rounded-2xl rounded-bl-sm"
              style={{ background: "#1a1a24", border: `1px solid ${agent.borderColor}44` }}
            >
              <div className="space-y-0.5">{renderContent(streamedText)}</div>
            </div>
          </div>
        )}

        {isThinking && (
          <TypingIndicator agentEmoji={agent.emoji} agentName={agent.name} borderColor={agent.borderColor} />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Approval panel */}
      {pendingApproval && !approved && (
        <div
          className="shrink-0 px-4 py-3 animate-fade-in"
          style={{ borderTop: `1px solid ${agent.borderColor}33`, background: "#0d0d15" }}
        >
          {/* Prompt définitif badge */}
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: `${agent.glowColor}22`, color: agent.borderColor, border: `1px solid ${agent.borderColor}44` }}
            >
              ✨ Prompt définitif prêt
            </span>
          </div>
          <p className="text-xs text-center mb-2.5" style={{ color: "#6a6a82" }}>
            Valides-tu ce livrable pour <strong style={{ color: "white" }}>{episode.name}</strong> ?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleRevision}
              className="flex-1 py-3 rounded-xl font-semibold text-sm active:scale-95 transition-transform"
              style={{ background: "#1a1a24", color: "#9090a8", border: "1px solid #2a2a3a" }}
            >
              ↩ Révision
            </button>
            <button
              onClick={handleApprove}
              className="flex-1 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
              style={{ background: "#10b981", color: "white", boxShadow: "0 0 16px rgba(16,185,129,.4)" }}
            >
              ✓ Approuver
            </button>
          </div>
        </div>
      )}

      {/* Approved */}
      {approved && (
        <div
          className="shrink-0 px-4 py-4 flex flex-col items-center gap-1 animate-fade-in"
          style={{ borderTop: "1px solid #10b98133", background: "#0d150f" }}
        >
          <p className="font-bold text-sm" style={{ color: "#10b981" }}>
            ✅ Livrable approuvé et sauvegardé !
          </p>
          <p className="text-xs" style={{ color: "#5a5a72" }}>
            Consultable dans "Livrables"
          </p>
        </div>
      )}

      {/* Input */}
      {!pendingApproval && !approved && (
        <div
          className="shrink-0 px-4 py-3"
          style={{
            paddingBottom: "max(env(safe-area-inset-bottom,0px),12px)",
            borderTop: "1px solid #1a1a2a",
            background: "#0d0d15",
          }}
        >
          <div
            className="flex items-end gap-2 rounded-2xl px-4 py-2"
            style={{ background: "#1a1a24", border: `1px solid ${agent.borderColor}44` }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={`Demande à ${agent.name}…`}
              disabled={isThinking}
              className="flex-1 bg-transparent resize-none outline-none text-sm py-1.5"
              style={{ color: "#f0f0f5", lineHeight: "1.5", maxHeight: "120px" }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isThinking}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mb-0.5 transition-all active:scale-90"
              style={{
                background: input.trim() && !isThinking
                  ? `linear-gradient(135deg,${agent.borderColor},${agent.glowColor})`
                  : "#2a2a3a",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
