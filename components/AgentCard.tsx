"use client";

import type { Agent } from "@/lib/agents";

interface Props {
  agent: Agent;
  isActive?: boolean;
  badgeCount?: number;
  onClick: () => void;
}

export default function AgentCard({ agent, isActive, badgeCount = 0, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="relative w-full text-left rounded-2xl overflow-hidden transition-all duration-200 active:scale-95"
      style={{
        background: `linear-gradient(135deg, ${agent.glowColor}18, transparent)`,
        border: `1px solid ${isActive ? agent.borderColor + "88" : agent.borderColor + "33"}`,
        boxShadow: isActive ? `0 0 20px ${agent.glowColor}` : "none",
      }}
    >
      {/* Gradient top bar */}
      <div className={`h-0.5 w-full bg-gradient-to-r ${agent.gradient}`} />

      <div className="p-4">
        {/* Emoji + badge */}
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl leading-none">{agent.emoji}</span>
          <div className="flex items-center gap-1.5">
            {badgeCount > 0 && (
              <span
                className="min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "#7c3aed", color: "white", boxShadow: "0 0 8px rgba(124,58,237,0.6)" }}
              >
                {badgeCount}
              </span>
            )}
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: badgeCount > 0 ? "#10b981" : "#3a3a52" }}
            />
          </div>
        </div>

        {/* Name */}
        <p className="font-bold text-base text-white mb-0.5">{agent.name}</p>

        {/* Short role */}
        <p className="text-xs leading-tight" style={{ color: agent.borderColor }}>
          {agent.shortRole}
        </p>

        {/* Tagline */}
        <p className="text-xs mt-2 leading-tight" style={{ color: "#5a5a72" }}>
          {agent.tagline}
        </p>
      </div>
    </button>
  );
}
