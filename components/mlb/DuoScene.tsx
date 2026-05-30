"use client";

import Avatar from "./Avatar";
import type { MlbAgentId } from "@/lib/mlb/types";

const C = { taupe: "#8E7E73", ink: "#4A403A", gold: "#D6BD9F", blush: "#E1C1B6" };

export type Flow = "idle" | "to-margaux" | "to-plume" | "collab";

/**
 * Petite scène vivante : Plume et Margaux, qui s'animent et se passent
 * le travail l'une à l'autre.
 */
export default function DuoScene({
  active,
  busy,
  flow,
}: {
  active: MlbAgentId | null;
  busy: boolean;
  flow: Flow;
}) {
  const caption =
    flow === "to-margaux"
      ? "Plume confie son texte à Margaux…"
      : flow === "to-plume"
      ? "Margaux renvoie ses notes à Plume…"
      : flow === "collab"
      ? "Plume & Margaux travaillent ensemble ✨"
      : busy && active === "plume"
      ? "Plume écrit pour vous…"
      : busy && active === "margaux"
      ? "Margaux relit attentivement…"
      : "Plume & Margaux, votre duo complice 💕";

  // Direction de l'échange
  const arrowClass =
    flow === "to-plume" ? "mlb-handoff-back" : flow === "to-margaux" || flow === "collab" ? "mlb-handoff" : "";

  return (
    <div
      className="rounded-3xl px-4 py-3 flex flex-col items-center"
      style={{ background: "linear-gradient(135deg,#FBF1EC,#F3E9D7)", border: `1.5px solid ${C.gold}66` }}
    >
      <div className="flex items-center justify-center gap-2 w-full">
        <div className="flex flex-col items-center">
          <Avatar agent="plume" size={64} animated talking={busy && active === "plume"} />
          <span style={{ color: C.ink }} className="text-[11px] font-bold mt-0.5">
            🪶 Plume
          </span>
        </div>

        {/* échange au centre */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-1">
          <div className="relative h-7 w-full flex items-center justify-center">
            <div className="absolute w-full h-[2px] rounded-full" style={{ background: `${C.gold}` }} />
            {busy || flow !== "idle" ? (
              <span className={`relative text-lg ${arrowClass}`}>📄</span>
            ) : (
              <span className="relative text-base">💞</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <Avatar agent="margaux" size={64} animated talking={busy && active === "margaux"} />
          <span style={{ color: C.ink }} className="text-[11px] font-bold mt-0.5">
            📖 Margaux
          </span>
        </div>
      </div>

      <p style={{ color: C.taupe }} className="text-xs italic mt-1.5 text-center">
        {caption}
        {busy && <span className="ml-1">…</span>}
      </p>
    </div>
  );
}
