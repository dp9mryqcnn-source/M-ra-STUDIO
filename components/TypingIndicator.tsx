"use client";

interface Props {
  agentEmoji: string;
  agentName: string;
  borderColor: string;
}

export default function TypingIndicator({ agentEmoji, agentName, borderColor }: Props) {
  return (
    <div className="flex items-end gap-2 animate-fade-in">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
        style={{ background: `${borderColor}22`, border: `1px solid ${borderColor}44` }}
      >
        {agentEmoji}
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{ background: "#1a1a24", border: "1px solid #2a2a3a" }}
      >
        <p className="text-xs mb-1.5" style={{ color: "#5a5a72" }}>
          {agentName} rédige…
        </p>
        <div className="flex gap-1">
          <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ backgroundColor: borderColor }} />
          <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ backgroundColor: borderColor }} />
          <span className="typing-dot w-1.5 h-1.5 rounded-full" style={{ backgroundColor: borderColor }} />
        </div>
      </div>
    </div>
  );
}
