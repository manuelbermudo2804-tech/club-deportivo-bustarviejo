import React from "react";

export default function DraggablePlayer({ 
  jugador, 
  onDragStart, 
  onDrag, 
  onDragEnd,
  fieldRef,
  maxY = 70,
  colorJugador = "#1e40af"
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
    const y = ((e.clientY - rect.top) / rect.height) * maxY;
    
    // Limitar a los bordes del campo
    const clampedX = Math.max(2, Math.min(98, x));
    const clampedY = Math.max(2, Math.min(maxY - 2, y));
    
    onDrag(jugador.numero, clampedX, clampedY);
  };

  const handlePointerUp = (e) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    onDragEnd();
  };

  // Obtener iniciales del nombre
  const getIniciales = () => {
    if (jugador.iniciales) return jugador.iniciales;
    if (jugador.nombre) {
      const partes = jugador.nombre.trim().split(/\s+/);
      if (partes.length >= 2) {
        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
      }
      return partes[0].substring(0, 2).toUpperCase();
    }
    return jugador.numero;
  };

  const iniciales = getIniciales();
  const fontSize = iniciales.length > 2 ? 1.6 : 2;

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
        rx="2.5"
        ry="0.8"
        fill="rgba(0,0,0,0.3)"
      />
      
      {/* Círculo del jugador */}
      <circle
        cx="0"
        cy="0"
        r="2.8"
        fill={colorJugador}
        stroke="#ffffff"
        strokeWidth="0.4"
      />
      
      {/* Iniciales del jugador */}
      <text
        x="0"
        y="0.7"
        textAnchor="middle"
        fill="white"
        fontSize={fontSize}
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        {iniciales}
      </text>
      
      {/* Posición debajo */}
      {jugador.posicion && (
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fill="white"
          fontSize="1.4"
          fontFamily="Arial, sans-serif"
          style={{ userSelect: "none", pointerEvents: "none", textShadow: "0 0 2px black" }}
        >
          {jugador.posicion}
        </text>
      )}
    </g>
  );
}