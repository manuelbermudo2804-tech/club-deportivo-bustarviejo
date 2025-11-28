import React from "react";

export default function BasketballCourt({ children }) {
  return (
    <svg
      viewBox="0 0 100 60"
      className="w-full h-full"
      style={{ backgroundColor: "#c4783b" }}
    >
      {/* Cancha principal */}
      <rect x="0" y="0" width="100" height="60" fill="#c4783b" />
      
      {/* Líneas de la cancha - color blanco */}
      <g stroke="rgba(255,255,255,0.9)" strokeWidth="0.4" fill="none">
        {/* Borde de la cancha */}
        <rect x="2" y="2" width="96" height="56" />
        
        {/* Línea central */}
        <line x1="50" y1="2" x2="50" y2="58" />
        
        {/* Círculo central */}
        <circle cx="50" cy="30" r="6" />
        
        {/* Zona izquierda (pintura) */}
        <rect x="2" y="17" width="16" height="26" />
        
        {/* Semicírculo zona izquierda */}
        <circle cx="18" cy="30" r="6" />
        
        {/* Línea de triple izquierda */}
        <path d="M 2 10 L 6 10 A 24 24 0 0 1 6 50 L 2 50" />
        
        {/* Tablero y aro izquierdo */}
        <line x1="4" y1="25" x2="4" y2="35" strokeWidth="0.6" />
        <circle cx="6" cy="30" r="1.5" />
        
        {/* Zona derecha (pintura) */}
        <rect x="82" y="17" width="16" height="26" />
        
        {/* Semicírculo zona derecha */}
        <circle cx="82" cy="30" r="6" />
        
        {/* Línea de triple derecha */}
        <path d="M 98 10 L 94 10 A 24 24 0 0 0 94 50 L 98 50" />
        
        {/* Tablero y aro derecho */}
        <line x1="96" y1="25" x2="96" y2="35" strokeWidth="0.6" />
        <circle cx="94" cy="30" r="1.5" />
      </g>
      
      {/* Franjas del parquet */}
      <g fill="rgba(0,0,0,0.05)">
        <rect x="2" y="2" width="8" height="56" />
        <rect x="18" y="2" width="8" height="56" />
        <rect x="34" y="2" width="8" height="56" />
        <rect x="50" y="2" width="8" height="56" />
        <rect x="66" y="2" width="8" height="56" />
        <rect x="82" y="2" width="8" height="56" />
      </g>
      
      {children}
    </svg>
  );
}