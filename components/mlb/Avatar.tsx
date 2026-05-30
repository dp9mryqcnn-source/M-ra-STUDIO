"use client";

import type { MlbAgentId } from "@/lib/mlb/types";

// Petits personnages « chibi » dessinés en SVG, dans l'esprit des illustrations
// de Marie-Laure : peau caramel, cheveux bouclés, robe fleurie pastel.

const SKIN = "#C68A5E";
const SKIN_DARK = "#A56B43";
const HAIR = "#3A2418";
const HAIR_HI = "#5A3826";
const CHEEK = "#E89B8B";

function CurlyHair() {
  // Couronne de boucles : plusieurs cercles superposés
  const curls: [number, number, number][] = [
    [50, 26, 16], [34, 30, 13], [66, 30, 13], [26, 44, 12], [74, 44, 12],
    [30, 58, 11], [70, 58, 11], [40, 22, 12], [60, 22, 12], [50, 18, 13],
    [24, 56, 9], [76, 56, 9],
  ];
  return (
    <g>
      {curls.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={HAIR} />
      ))}
      {curls.slice(0, 6).map(([cx, cy, r], i) => (
        <circle key={`h${i}`} cx={cx - 2} cy={cy - 2} r={r * 0.5} fill={HAIR_HI} opacity={0.5} />
      ))}
    </g>
  );
}

function Face({ smiling }: { smiling: boolean }) {
  return (
    <g>
      {/* visage */}
      <ellipse cx="50" cy="52" rx="22" ry="24" fill={SKIN} />
      <ellipse cx="50" cy="60" rx="22" ry="16" fill={SKIN_DARK} opacity={0.18} />
      {/* joues */}
      <circle cx="36" cy="58" r="5" fill={CHEEK} opacity={0.55} />
      <circle cx="64" cy="58" r="5" fill={CHEEK} opacity={0.55} />
      {/* yeux */}
      <g>
        <ellipse cx="41" cy="50" rx="3.4" ry="4.4" fill="#2A1A12" />
        <ellipse cx="59" cy="50" rx="3.4" ry="4.4" fill="#2A1A12" />
        <circle cx="42.2" cy="48.6" r="1.1" fill="#fff" />
        <circle cx="60.2" cy="48.6" r="1.1" fill="#fff" />
        {/* cils */}
        <path d="M37 47 q4 -3 8 0" stroke="#2A1A12" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M55 47 q4 -3 8 0" stroke="#2A1A12" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </g>
      {/* bouche */}
      {smiling ? (
        <path d="M44 64 q6 5 12 0" stroke="#7A3B33" strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M46 65 q4 3 8 0 q-4 4 -8 0Z" fill="#C66B5E" />
      )}
    </g>
  );
}

export default function Avatar({
  agent,
  size = 96,
}: {
  agent: MlbAgentId;
  size?: number;
}) {
  const isPlume = agent === "plume";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={isPlume ? "Plume" : "Margaux"}
      style={{ display: "block" }}
    >
      <defs>
        <clipPath id={`c-${agent}`}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
        <linearGradient id={`bg-${agent}`} x1="0" y1="0" x2="1" y2="1">
          {isPlume ? (
            <>
              <stop offset="0%" stopColor="#F6E7E1" />
              <stop offset="100%" stopColor="#E1C1B6" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#F3E9D7" />
              <stop offset="100%" stopColor="#D6BD9F" />
            </>
          )}
        </linearGradient>
      </defs>

      <g clipPath={`url(#c-${agent})`}>
        <rect width="100" height="100" fill={`url(#bg-${agent})`} />
        {/* épaules / robe fleurie */}
        <ellipse cx="50" cy="100" rx="34" ry="26" fill={isPlume ? "#9FC0B0" : "#E7B6A0"} />
        <g opacity={0.85}>
          <circle cx="38" cy="92" r="3.4" fill="#F4A6B0" />
          <circle cx="58" cy="96" r="3" fill="#F6D27A" />
          <circle cx="48" cy="100" r="2.6" fill="#F4A6B0" />
          <circle cx="64" cy="90" r="2.4" fill="#FCE8C9" />
        </g>
        <CurlyHair />
        <Face smiling={!isPlume} />

        {/* accessoire */}
        {isPlume ? (
          // une plume blanche
          <g transform="translate(70 60) rotate(28)">
            <path d="M0 0 q10 -22 4 -30 q-10 12 -8 30Z" fill="#FBF7F0" stroke="#D8C9BE" strokeWidth="0.6" />
            <line x1="2" y1="-2" x2="3" y2="-26" stroke="#C9A98E" strokeWidth="0.7" />
          </g>
        ) : (
          // un petit livre
          <g transform="translate(64 70)">
            <rect x="-12" y="-7" width="24" height="16" rx="2" fill="#B89B73" />
            <rect x="-12" y="-7" width="12" height="16" rx="2" fill="#D6BD9F" />
            <line x1="0" y1="-6" x2="0" y2="8" stroke="#8E7E73" strokeWidth="0.8" />
          </g>
        )}
        {/* boucle d'oreille dorée */}
        <circle cx="72" cy="60" r="1.8" fill="#E7C873" />
      </g>
      <circle cx="50" cy="50" r="49" fill="none" stroke="#fff" strokeWidth="2" opacity={0.7} />
    </svg>
  );
}
