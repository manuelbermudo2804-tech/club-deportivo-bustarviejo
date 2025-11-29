import React, { useState, useRef, useCallback } from "react";

export default function DraggablePlayer({ 
  jugador, 
  onDragStart, 
  onDrag, 
  onDragEnd,
  fieldRef,
  maxY = 70,
  colorJugador = "#1e40af",
  isSelected = false,
  onSelect
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: jugador.x, y: jugador.y });
  const animationFrame = useRef(null);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    lastPos.current = { x: jugador.x, y: jugador.y };
    
    onDragStart(jugador.numero);
    if (onSelect) onSelect(jugador.numero);
  }, [jugador.numero, jugador.x, jugador.y, onDragStart, onSelect]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging || !fieldRef?.current) return;
    
    // Cancelar frame anterior para evitar acumulación
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
    
    animationFrame.current = requestAnimationFrame(() => {
      const rect = fieldRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * maxY;
      
      // Limitar a los bordes del campo con margen
      const clampedX = Math.max(4, Math.min(96, x));
      const clampedY = Math.max(4, Math.min(maxY - 4, y));
      
      // Solo actualizar si hay cambio significativo (reduce re-renders)
      if (Math.abs(clampedX - lastPos.current.x) > 0.1 || 
          Math.abs(clampedY - lastPos.current.y) > 0.1) {
        lastPos.current = { x: clampedX, y: clampedY };
        onDrag(jugador.numero, clampedX, clampedY);
      }
    });
  }, [isDragging, fieldRef, maxY, jugador.numero, onDrag]);

  const handlePointerUp = useCallback((e) => {
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
    
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignorar error si ya se liberó
    }
    
    setIsDragging(false);
    onDragEnd();
  }, [onDragEnd]);

  const handlePointerEnter = () => setIsHovered(true);
  const handlePointerLeave = () => {
    setIsHovered(false);
    if (!isDragging) return;
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
  const fontSize = iniciales.length > 2 ? 1.6 : 2.2;
  
  // Escalado visual durante arrastre/hover
  const scale = isDragging ? 1.25 : isHovered ? 1.1 : 1;
  const opacity = isDragging ? 0.9 : 1;
  const shadowOpacity = isDragging ? 0.5 : 0.3;
  const strokeWidth = isDragging || isHovered ? 0.6 : 0.4;
  const glowRadius = isDragging ? 1 : 0;

  return (
    <g
      transform={`translate(${jugador.x}, ${jugador.y})`}
      style={{ 
        cursor: isDragging ? "grabbing" : "grab", 
        touchAction: "none",
        transition: isDragging ? "none" : "transform 0.1s ease-out"
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* Área de toque más grande (invisible) para facilitar selección en móvil */}
      <circle
        cx="0"
        cy="0"
        r="5"
        fill="transparent"
        style={{ pointerEvents: "all" }}
      />
      
      {/* Efecto de brillo cuando está arrastrando */}
      {isDragging && (
        <circle
          cx="0"
          cy="0"
          r={3.5 * scale}
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="0.8"
          style={{ 
            filter: "blur(0.3px)",
            animation: "pulse 0.5s ease-in-out infinite alternate"
          }}
        />
      )}
      
      {/* Sombra del jugador - más pronunciada al arrastrar */}
      <ellipse
        cx={isDragging ? 0.5 : 0}
        cy={isDragging ? 1.5 : 0.8}
        rx={3 * scale}
        ry={isDragging ? 1.2 : 0.8}
        fill={`rgba(0,0,0,${shadowOpacity})`}
        style={{ transition: "all 0.15s ease-out" }}
      />
      
      {/* Círculo del jugador */}
      <circle
        cx="0"
        cy="0"
        r={3.2 * scale}
        fill={colorJugador}
        stroke={isDragging ? "#fbbf24" : isHovered ? "#ffffff" : "#ffffff"}
        strokeWidth={strokeWidth}
        opacity={opacity}
        style={{ 
          transition: isDragging ? "none" : "all 0.15s ease-out",
          filter: isDragging ? "brightness(1.1)" : "none"
        }}
      />
      
      {/* Número del jugador (pequeño arriba) */}
      <circle
        cx={2 * scale}
        cy={-2 * scale}
        r={1.2 * scale}
        fill="#ffffff"
        stroke={colorJugador}
        strokeWidth="0.2"
        style={{ transition: isDragging ? "none" : "all 0.15s ease-out" }}
      />
      <text
        x={2 * scale}
        y={-1.5 * scale}
        textAnchor="middle"
        fill={colorJugador}
        fontSize={1.3 * scale}
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        {jugador.numero}
      </text>
      
      {/* Iniciales del jugador */}
      <text
        x="0"
        y={0.8 * scale}
        textAnchor="middle"
        fill="white"
        fontSize={fontSize * scale}
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
        style={{ 
          userSelect: "none", 
          pointerEvents: "none",
          textShadow: "0 0.5px 1px rgba(0,0,0,0.5)"
        }}
      >
        {iniciales}
      </text>
      
      {/* Posición debajo - solo visible cuando no arrastra */}
      {jugador.posicion && !isDragging && (
        <g style={{ opacity: isHovered ? 1 : 0.8, transition: "opacity 0.15s" }}>
          <rect
            x={-jugador.posicion.length * 0.8}
            y={4}
            width={jugador.posicion.length * 1.6}
            height={2.5}
            rx="0.5"
            fill="rgba(0,0,0,0.6)"
          />
          <text
            x="0"
            y="5.8"
            textAnchor="middle"
            fill="white"
            fontSize="1.5"
            fontFamily="Arial, sans-serif"
            style={{ userSelect: "none", pointerEvents: "none" }}
          >
            {jugador.posicion}
          </text>
        </g>
      )}
      
      {/* Indicador de nombre del jugador al pasar el ratón */}
      {isHovered && jugador.nombre && !isDragging && (
        <g>
          <rect
            x={-jugador.nombre.length * 0.6}
            y={-7}
            width={jugador.nombre.length * 1.2}
            height={2.8}
            rx="0.5"
            fill="rgba(0,0,0,0.85)"
          />
          <text
            x="0"
            y="-5"
            textAnchor="middle"
            fill="white"
            fontSize="1.6"
            fontWeight="500"
            fontFamily="Arial, sans-serif"
            style={{ userSelect: "none", pointerEvents: "none" }}
          >
            {jugador.nombre}
          </text>
        </g>
      )}
    </g>
  );
}