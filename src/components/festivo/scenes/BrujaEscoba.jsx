import React from "react";

// Bruja montada en su escoba con un gato negro en la punta (mira hacia la derecha).
export default function BrujaEscoba({ className = "" }) {
  return (
    <svg viewBox="0 -15 160 100" className={className} aria-hidden="true">
      <path d="M78 24 Q50 30 36 54 L62 54 Z" fill="#6d28d9" />
      <path d="M24 57 L2 46 L6 60 L0 72 L24 62 Z" fill="#b45309" />
      <rect x="22" y="55" width="6" height="8" rx="1" fill="#78350f" transform="rotate(-4 25 59)" />
      <line x1="24" y1="60" x2="150" y2="50" stroke="#7c4a1e" strokeWidth="3" strokeLinecap="round" />
      <path d="M78 16 Q70 26 64 32 M80 18 Q74 28 70 36" stroke="#f97316" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M62 56 L80 22 L100 54 Z" fill="#1e1b2e" />
      <path d="M86 32 L106 52" stroke="#1e1b2e" strokeWidth="4" strokeLinecap="round" />
      <path d="M82 54 L94 66 L100 64" stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="84" cy="18" r="7" fill="#86efac" />
      <path d="M90 17 L97 20 L90 21 Z" fill="#4ade80" />
      <circle cx="86" cy="16" r="1" fill="#111" />
      <ellipse cx="85" cy="12" rx="13" ry="3" fill="#111" />
      <path d="M77 12 L93 12 L78 -12 Z" fill="#111" />
      <rect x="78" y="8" width="14" height="3" fill="#f97316" />
      <ellipse cx="132" cy="46" rx="7" ry="5" fill="#0f0f0f" />
      <circle cx="140" cy="40" r="4.5" fill="#0f0f0f" />
      <path d="M137 37 L138 32 L140 36 M141 36 L143 32 L144 37" fill="#0f0f0f" stroke="#0f0f0f" strokeWidth="1" />
      <circle cx="142" cy="40" r="0.9" fill="#facc15" />
      <path d="M125 45 Q118 38 122 32" stroke="#0f0f0f" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}