import React from "react";

function Reno({ x, lider }) {
  return (
    <g transform={`translate(${x},0)`}>
      <circle cx="5" cy="42" r="3" fill="#fef3c7" />
      <ellipse cx="25" cy="45" rx="20" ry="9" fill="#8b5a2b" />
      <path d="M40 40 L50 28" stroke="#8b5a2b" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="54" cy="25" rx="8" ry="5.5" fill="#8b5a2b" />
      <path d="M50 21 L46 10 M47 14 L42 11 M53 20 L55 9 M54 13 L59 10" stroke="#5c3a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="55" cy="23" r="1" fill="#111" />
      <circle cx="62" cy="25" r={lider ? 3 : 2} fill={lider ? "#ef4444" : "#3b2413"} className={lider ? "festive-twinkle" : ""} />
      <path d="M38 50 L50 56 M34 52 L44 60 M12 50 L0 56 M16 52 L6 60" stroke="#6b4423" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

// Papá Noel en su trineo tirado por dos renos (mira hacia la derecha).
export default function SantaTrineo({ className = "" }) {
  return (
    <svg viewBox="0 0 260 80" className={className} aria-hidden="true">
      <path d="M100 42 Q 125 50 140 45 Q 175 52 210 45" stroke="#fbbf24" strokeWidth="1.5" fill="none" />
      <Reno x={115} />
      <Reno x={185} lider />
      <circle cx="24" cy="30" r="11" fill="#92400e" />
      <circle cx="45" cy="32" r="14" fill="#dc2626" />
      <path d="M56 28 L68 18" stroke="#dc2626" strokeWidth="5" strokeLinecap="round" />
      <circle cx="69" cy="17" r="3" fill="#f8fafc" />
      <circle cx="48" cy="14" r="7" fill="#fcd9b6" />
      <ellipse cx="49" cy="20" rx="7" ry="6" fill="#f8fafc" />
      <path d="M41 11 L55 11 L62 3 Z" fill="#dc2626" />
      <rect x="40" y="9" width="16" height="4" rx="2" fill="#f8fafc" />
      <circle cx="62" cy="3" r="2.5" fill="#f8fafc" />
      <path d="M12 38 H92 Q104 38 104 26 Q108 26 108 32 Q108 62 78 62 H28 Q10 62 12 38 Z" fill="#b91c1c" />
      <path d="M14 50 H104" stroke="#fbbf24" strokeWidth="2" />
      <path d="M30 62 V70 M75 62 V70" stroke="#fbbf24" strokeWidth="2" />
      <path d="M6 70 H88 Q104 70 110 58" stroke="#fbbf24" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}