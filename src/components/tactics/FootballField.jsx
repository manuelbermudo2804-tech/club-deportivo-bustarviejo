import React from "react";

export default function FootballField({ children }) {
  return (
    <svg
      viewBox="0 0 100 70"
      className="w-full h-full"
      style={{ backgroundColor: "#2d8a3e" }}
    >
      {/* Campo principal */}
      <rect x="0" y="0" width="100" height="70" fill="#2d8a3e" />
      
      {/* Líneas del campo - color blanco */}
      <g stroke="rgba(255,255,255,0.8)" strokeWidth="0.3" fill="none">
        {/* Borde del campo */}
        <rect x="2" y="2" width="96" height="66" />
        
        {/* Línea central */}
        <line x1="50" y1="2" x2="50" y2="68" />
        
        {/* Círculo central */}
        <circle cx="50" cy="35" r="9" />
        <circle cx="50" cy="35" r="0.5" fill="rgba(255,255,255,0.8)" />
        
        {/* Área grande izquierda */}
        <rect x="2" y="15" width="16" height="40" />
        
        {/* Área pequeña izquierda */}
        <rect x="2" y="25" width="6" height="20" />
        
        {/* Punto penal izquierdo */}
        <circle cx="12" cy="35" r="0.5" fill="rgba(255,255,255,0.8)" />
        
        {/* Semicírculo área izquierda */}
        <path d="M 18 25 A 9 9 0 0 1 18 45" />
        
        {/* Área grande derecha */}
        <rect x="82" y="15" width="16" height="40" />
        
        {/* Área pequeña derecha */}
        <rect x="92" y="25" width="6" height="20" />
        
        {/* Punto penal derecho */}
        <circle cx="88" cy="35" r="0.5" fill="rgba(255,255,255,0.8)" />
        
        {/* Semicírculo área derecha */}
        <path d="M 82 25 A 9 9 0 0 0 82 45" />
        
        {/* Esquinas */}
        <path d="M 2 4 A 2 2 0 0 0 4 2" />
        <path d="M 96 2 A 2 2 0 0 0 98 4" />
        <path d="M 98 66 A 2 2 0 0 0 96 68" />
        <path d="M 4 68 A 2 2 0 0 0 2 66" />
        
        {/* Porterías */}
        <rect x="0" y="30" width="2" height="10" stroke="rgba(255,255,255,0.6)" />
        <rect x="98" y="30" width="2" height="10" stroke="rgba(255,255,255,0.6)" />
      </g>
      
      {/* Franjas del césped */}
      <g fill="rgba(255,255,255,0.03)">
        <rect x="2" y="2" width="12" height="66" />
        <rect x="26" y="2" width="12" height="66" />
        <rect x="50" y="2" width="12" height="66" />
        <rect x="74" y="2" width="12" height="66" />
      </g>
      
      {children}
    </svg>
  );
}