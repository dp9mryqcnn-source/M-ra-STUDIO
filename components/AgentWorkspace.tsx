"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Agent } from "@/lib/agents";
import type { Deliverable, Message } from "@/lib/types";
import TypingIndicator from "./TypingIndicator";

interface Props {
  agent: Agent;
  onClose: () => void;
  onApprove: (deliverable: Omit<Deliverable, "id" | "approvedAt">) => void;
}

function formatContent(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Headers
    if (line.startsWith("### ")) return <h3 key={i} className="font-bold text-sm mt-3 mb-1" style={{ color: "#d4d4e8" }}>{line.slice(4)}</h3>;
    if (line.startsWith("## ")) return <h2 key={i} className="font-bold text-base mt-4 mb-1.5" style={{ color: "#e0e0f0" }}>{line.slice(3)}</h2>;
    if (line.startsWith("# ")) return <h1 key={i} className="font-bold text-lg mt-4 mb-2" style={{ color: "#f0f0f8" }}>{line.slice(2)}</h1>;
    // Bold lines with **
    if (line.includes("**")) {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="text-sm leading-relaxed" style={{ color: "#c0c0d8" }}>
          {parts.map((part, j) => j % 2 === 1 ? <strong key={j} style={{ color: "#e0e0f0" }}>{part}</strong> : part)}
        </p>
      );
    }
    // List items
    if (line.startsWith("- ") || line.startsWith("• ")) {
      return <li key={i} className="text-sm leading-relaxed ml-3" style={{ color: "#b0b0c8" }}>{line.slice(2)}</li>;
    }
    if (/^\d+\. /.test(line)) {
      return <li key={i} className="text-sm leading-relaxed ml-3 list-decimal" style={{ color: "#b0b0c8" }}>{line.replace(/^\d+\. /, "")}</li>;
    }
    // Empty line
    if (line.trim() === "") return <br key={i} />;
    // Default
    return <p key={i} className="text-sm leading-relaxed" style={{ color: "#b0b0c8" }}>{line}</p>;
  });
}

export default function AgentWorkspace({ agent, onClose, onApprove }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [pendingApproval, setPendingApproval] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, streamedText]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isThinking) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);
    setStreamedText("");
    setPendingApproval(null);
    setApproved(false);

    const history = [...messages, userMsg].map((m) => ({
      role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, messages: history }),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      setIsThinking(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        full += chunk;
        setStreamedText(full);
      }

      const agentMsg: Message = {
        id: crypto.randomUUID(),
        role: "agent",
        content: full,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMsg]);
      setStreamedText("");
      setPendingApproval(full);
    } catch {
      setIsThinking(false);
      setStreamedText("");
    }
  }, [input, isThinking, messages, agent.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleApprove = () => {
    if (!pendingApproval) return;
    setApproved(true);
    const title = messages.find((m) => m.role === "user")?.content.slice(0, 60) ?? "Livrable";
    onApprove({
      agentId: agent.id,
      agentName: agent.name,
      agentEmoji: agent.emoji,
      title,
      content: pendingApproval,
    });
    setPendingApproval(null);
    setTimeout(() => setApproved(false), 2500);
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
        className="shrink-0 flex items-center gap-3 px-4 pb-3 pt-safe"
        style={{
          paddingTop: "max(env(safe-area-inset-top, 0px), 12px)",
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
            background: `linear-gradient(135deg, ${agent.glowColor}44, ${agent.glowColor}11)`,
            border: `1px solid ${agent.borderColor}66`,
            boxShadow: `0 0 16px ${agent.glowColor}`,
          }}
        >
          {agent.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-base leading-tight">{agent.name}</p>
          <p className="text-xs leading-tight truncate" style={{ color: agent.borderColor }}>
            {agent.role}
          </p>
        </div>

        {/* Accent bar */}
        <div
          className={`w-2 h-2 rounded-full`}
          style={{ backgroundColor: "#10b981", boxShadow: "0 0 6px #10b98166" }}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 pb-10">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
              style={{
                background: `radial-gradient(circle, ${agent.glowColor}33, transparent)`,
                border: `1px solid ${agent.borderColor}44`,
              }}
            >
              {agent.emoji}
            </div>
            <div className="text-center">
              <p className="font-bold text-lg text-white">{agent.name} est prête</p>
              <p className="text-sm mt-1" style={{ color: "#6a6a82" }}>
                {agent.tagline}
              </p>
            </div>
            <div
              className="px-4 py-2 rounded-full text-xs"
              style={{ background: `${agent.glowColor}22`, color: agent.borderColor, border: `1px solid ${agent.borderColor}44` }}
            >
              Envoie ta première demande ↓
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
                  ? { background: `linear-gradient(135deg, ${agent.borderColor}cc, ${agent.borderColor}88)` }
                  : { background: "#1a1a24", border: "1px solid #2a2a3a" }
              }
            >
              {msg.role === "user" ? (
                <p className="text-sm text-white leading-relaxed">{msg.content}</p>
              ) : (
                <div className="space-y-0.5">{formatContent(msg.content)}</div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming text */}
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
              <div className="space-y-0.5">{formatContent(streamedText)}</div>
            </div>
          </div>
        )}

        {isThinking && (
          <TypingIndicator
            agentEmoji={agent.emoji}
            agentName={agent.name}
            borderColor={agent.borderColor}
          />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Approval panel */}
      {pendingApproval && !approved && (
        <div
          className="shrink-0 px-4 py-3 animate-fade-in"
          style={{ borderTop: `1px solid ${agent.borderColor}33`, background: "#0d0d15" }}
        >
          <p className="text-xs text-center mb-2.5" style={{ color: "#6a6a82" }}>
            Valides-tu ce livrable ?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleRevision}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
              style={{ background: "#1a1a24", color: "#9090a8", border: "1px solid #2a2a3a" }}
            >
              ↩ Révision
            </button>
            <button
              onClick={handleApprove}
              className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{ background: "#10b981", color: "white", boxShadow: "0 0 16px rgba(16,185,129,0.4)" }}
            >
              ✓ Approuver
            </button>
          </div>
        </div>
      )}

      {/* Approved celebration */}
      {approved && (
        <div
          className="shrink-0 px-4 py-4 flex items-center justify-center gap-2 animate-fade-in"
          style={{ borderTop: "1px solid #10b98133", background: "#0d150f" }}
        >
          <span className="text-xl">✅</span>
          <p className="font-bold text-sm" style={{ color: "#10b981" }}>
            Livrable approuvé et sauvegardé !
          </p>
        </div>
      )}

      {/* Input */}
      {!pendingApproval && !approved && (
        <div
          className="shrink-0 px-4 py-3"
          style={{
            paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)",
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
              onKeyDown={handleKeyDown}
              placeholder={`Demande à ${agent.name}…`}
              disabled={isThinking}
              className="flex-1 bg-transparent resize-none outline-none text-sm py-1.5"
              style={{ color: "#f0f0f5", lineHeight: "1.5", maxHeight: "120px" }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isThinking}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mb-0.5 transition-all active:scale-90"
              style={{
                background: input.trim() && !isThinking
                  ? `linear-gradient(135deg, ${agent.borderColor}, ${agent.glowColor})`
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
