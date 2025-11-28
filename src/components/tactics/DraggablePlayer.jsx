import React from "react";

export default function DraggablePlayer({ 
  jugador, 
  onDragStart, 
  onDrag, 
  onDragEnd,
  fieldRef,
  escala 
}) {
  const handlePointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    
    onDragStart(jugador.numero);
  };

  const handlePointerMove = (e) => {
    if (!fieldRef?.current) return;
    
    const rect = fieldRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 70;
    
    // Limitar a los bordes del campo
    const clampedX = Math.max(2, Math.min(98, x));
    const clampedY = Math.max(2, Math.min(68, y));
    
    onDrag(jugador.numero, clampedX, clampedY);
  };

  const handlePointerUp = (e) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    onDragEnd();
  };

  return (
    <g
      transform={`translate(${jugador.x}, ${jugador.y})`}
      style={{ cursor: "grab", touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Sombra del jugador */}
      <ellipse
        cx="0"
        cy="0.5"
        rx="2.2"
        ry="0.8"
        fill="rgba(0,0,0,0.3)"
      />
      
      {/* Círculo del jugador */}
      <circle
        cx="0"
        cy="0"
        r="2.5"
        fill="#1e40af"
        stroke="#ffffff"
        strokeWidth="0.4"
      />
      
      {/* Número del jugador */}
      <text
        x="0"
        y="0.8"
        textAnchor="middle"
        fill="white"
        fontSize="2.2"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        {jugador.numero}
      </text>
      
      {/* Posición debajo */}
      {jugador.posicion && (
        <text
          x="0"
          y="4.5"
          textAnchor="middle"
          fill="white"
          fontSize="1.5"
          fontFamily="Arial, sans-serif"
          style={{ userSelect: "none", pointerEvents: "none" }}
        >
          {jugador.posicion}
        </text>
      )}
    </g>
  );
}