"use client";

import type { Agent } from "@/lib/agents";

interface Props {
  agent: Agent;
  isActive?: boolean;
  onClick: () => void;
}

export default function AgentCard({ agent, isActive, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="relative w-full text-left rounded-2xl overflow-hidden transition-all duration-200 active:scale-95"
      style={{
        background: `linear-gradient(135deg, ${agent.glowColor}22, transparent)`,
        border: `1px solid ${agent.borderColor}44`,
        boxShadow: isActive ? `0 0 24px ${agent.glowColor}` : "none",
      }}
    >
      {/* Gradient top bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${agent.gradient}`} />

      <div className="p-4">
        {/* Emoji + Status */}
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl leading-none">{agent.emoji}</span>
          <span
            className="w-2 h-2 rounded-full mt-1"
            style={{ backgroundColor: isActive ? "#10b981" : "#5a5a72" }}
          />
        </div>

        {/* Name */}
        <p className="font-bold text-base text-white mb-0.5">{agent.name}</p>

        {/* Short role */}
        <p className="text-xs leading-tight" style={{ color: agent.borderColor }}>
          {agent.shortRole}
        </p>

        {/* Tagline */}
        <p className="text-xs mt-2 leading-tight" style={{ color: "#6a6a82" }}>
          {agent.tagline}
        </p>
      </div>
    </button>
  );
}
