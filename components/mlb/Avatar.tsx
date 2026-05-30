"use client";

import { useState } from "react";
import type { MlbAgentId } from "@/lib/mlb/types";

// ── Vraies images (optionnelles) ──────────────────────────
// Déposez vos illustrations dans /public et l'app les utilisera
// automatiquement à la place du dessin :
//   public/plume.png   → le personnage Plume (la ghostwriter)
//   public/margaux.png → le personnage Margaux (l'éditrice)
const AVATAR_IMG: Record<MlbAgentId, string> = {
  plume: "/plume.png",
  margaux: "/margaux.png",
};

const SKIN = "#C68A5E";
const SKIN_SHADOW = "#A56B43";
const HAIR = "#3A2418";
const HAIR_HI = "#6B4226";
const CHEEK = "#E89B8B";
const LIP = "#B5675C";

function CurlyHair() {
  // Grande couronne de boucles volumineuses (style poupée)
  const curls: [number, number, number][] = [
    [50, 16, 15], [36, 18, 13], [64, 18, 13], [24, 26, 13], [76, 26, 13],
    [18, 40, 12], [82, 40, 12], [16, 54, 11], [84, 54, 11], [20, 66, 10],
    [80, 66, 10], [44, 12, 12], [56, 12, 12], [30, 14, 11], [70, 14, 11],
    [22, 78, 8], [78, 78, 8],
  ];
  return (
    <g>
      {curls.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={HAIR} />
      ))}
      {curls.map(([cx, cy, r], i) => (
        <circle key={`hi${i}`} cx={cx - 2.5} cy={cy - 2.5} r={r * 0.42} fill={HAIR_HI} opacity={0.55} />
      ))}
    </g>
  );
}

function Face({ pouty }: { pouty: boolean }) {
  return (
    <g>
      {/* visage */}
      <ellipse cx="50" cy="52" rx="23" ry="25" fill={SKIN} />
      <ellipse cx="50" cy="63" rx="23" ry="15" fill={SKIN_SHADOW} opacity={0.16} />
      {/* joues roses */}
      <circle cx="34" cy="60" r="6" fill={CHEEK} opacity={0.5} />
      <circle cx="66" cy="60" r="6" fill={CHEEK} opacity={0.5} />
      {/* sourcils */}
      <path d={pouty ? "M33 41 q7 -3 12 1" : "M33 42 q7 -2 12 0"} stroke="#2A1A12" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d={pouty ? "M55 42 q5 -4 12 -1" : "M55 42 q5 -2 12 0"} stroke="#2A1A12" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* yeux (groupe qui cligne) */}
      <g className="mlb-eyes">
        {/* grands yeux brillants */}
        <ellipse cx="39" cy="51" rx="5" ry="6.5" fill="#fff" />
        <ellipse cx="61" cy="51" rx="5" ry="6.5" fill="#fff" />
        <circle cx="39.5" cy="52" r="4.2" fill="#4A2C1A" />
        <circle cx="60.5" cy="52" r="4.2" fill="#4A2C1A" />
        <circle cx="39.5" cy="52" r="2" fill="#1C100A" />
        <circle cx="60.5" cy="52" r="2" fill="#1C100A" />
        <circle cx="41" cy="49.5" r="1.4" fill="#fff" />
        <circle cx="62" cy="49.5" r="1.4" fill="#fff" />
        {/* longs cils */}
        <path d="M33 47 q6 -4 11 -1" stroke="#1C100A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M56 46 q6 -3 11 1" stroke="#1C100A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M33 47 l-3 -1.5 M35 45.5 l-2.5 -2" stroke="#1C100A" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M67 47 l3 -1.5 M65 45.5 l2.5 -2" stroke="#1C100A" strokeWidth="1.3" strokeLinecap="round" />
      </g>
      {/* nez */}
      <path d="M49 58 q1.5 1.5 2.5 0" stroke={SKIN_SHADOW} strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* bouche boudeuse / sourire */}
      {pouty ? (
        <g>
          <path d="M44 67 q6 4 12 0 q-6 6 -12 0Z" fill={LIP} />
          <path d="M44 67 q6 2 12 0" stroke="#8A4A40" strokeWidth="0.8" fill="none" />
        </g>
      ) : (
        <path d="M43 65 q7 6 14 0" stroke={LIP} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}
    </g>
  );
}

export default function Avatar({
  agent,
  size = 96,
  animated = true,
  talking = false,
}: {
  agent: MlbAgentId;
  size?: number;
  animated?: boolean;
  talking?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const isPlume = agent === "plume";
  const motionClass = !animated ? "" : talking ? "mlb-talk" : "mlb-float";

  // Si une vraie image existe dans /public, on l'utilise.
  if (!imgError) {
    return (
      <div className={motionClass} style={{ width: size, height: size, display: "block" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={AVATAR_IMG[agent]}
          alt={isPlume ? "Plume" : "Margaux"}
          width={size}
          height={size}
          onError={() => setImgError(true)}
          style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block", border: "2px solid #ffffffcc" }}
        />
      </div>
    );
  }

  // Sinon, dessin vectoriel mignon (repli).
  return (
    <div className={motionClass} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={isPlume ? "Plume" : "Margaux"} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <clipPath id={`c-${agent}`}>
            <circle cx="50" cy="50" r="50" />
          </clipPath>
          <linearGradient id={`bg-${agent}`} x1="0" y1="0" x2="1" y2="1">
            {isPlume ? (
              <>
                <stop offset="0%" stopColor="#FBF1EC" />
                <stop offset="100%" stopColor="#E1C1B6" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#F7EFDF" />
                <stop offset="100%" stopColor="#D6BD9F" />
              </>
            )}
          </linearGradient>
        </defs>

        <g clipPath={`url(#c-${agent})`}>
          <rect width="100" height="100" fill={`url(#bg-${agent})`} />
          {/* robe fleurie à épaules dénudées */}
          <ellipse cx="50" cy="102" rx="36" ry="28" fill={isPlume ? "#9FC0B0" : "#E7B6A0"} />
          <ellipse cx="50" cy="92" rx="30" ry="10" fill={isPlume ? "#B6D2C5" : "#F0C9B8"} />
          <g opacity={0.9}>
            <circle cx="34" cy="94" r="3.6" fill="#F4A6B0" />
            <circle cx="60" cy="98" r="3.2" fill="#F6D27A" />
            <circle cx="46" cy="101" r="2.8" fill="#F4A6B0" />
            <circle cx="66" cy="91" r="2.6" fill="#FCE8C9" />
            <circle cx="40" cy="100" r="2.2" fill="#FCE8C9" />
          </g>
          <CurlyHair />
          <Face pouty={isPlume} />
          {/* boucle d'oreille dorée */}
          <circle cx="74" cy="62" r="2.2" fill="#E7C873" stroke="#C9A24A" strokeWidth="0.5" />
        </g>

        {/* accessoire animé (hors du cercle) */}
        {isPlume ? (
          <g className={animated ? "mlb-sway" : ""} transform="translate(80 50)">
            <path d="M0 0 q11 -24 5 -33 q-11 13 -9 33Z" fill="#FBF7F0" stroke="#D8C9BE" strokeWidth="0.7" />
            <line x1="2" y1="-2" x2="4" y2="-28" stroke="#C9A98E" strokeWidth="0.9" />
          </g>
        ) : (
          <g className={animated ? "mlb-sway" : ""} transform="translate(78 60)">
            <rect x="-11" y="-7" width="22" height="15" rx="2" fill="#B89B73" />
            <rect x="-11" y="-7" width="11" height="15" rx="2" fill="#D6BD9F" />
            <line x1="0" y1="-6" x2="0" y2="7" stroke="#8E7E73" strokeWidth="0.9" />
            <line x1="3" y1="-3" x2="8" y2="-3" stroke="#fff" strokeWidth="0.7" />
            <line x1="3" y1="0" x2="8" y2="0" stroke="#fff" strokeWidth="0.7" />
          </g>
        )}
        {/* étoiles scintillantes */}
        {animated && (
          <>
            <path className="mlb-sparkle" style={{ animationDelay: "0s" }} d="M14 22 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4Z" fill="#E7C873" />
            <path className="mlb-sparkle" style={{ animationDelay: "0.9s" }} d="M88 80 l1 2 2 1 -2 1 -1 2 -1 -2 -2 -1 2 -1Z" fill="#F4A6B0" />
          </>
        )}
        <circle cx="50" cy="50" r="49" fill="none" stroke="#fff" strokeWidth="2" opacity={0.75} />
      </svg>
    </div>
  );
}
