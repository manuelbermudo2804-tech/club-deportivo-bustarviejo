import React, { useState, useRef, useCallback } from "react";

export default function DraggableBall({ 
  position,
  onDrag,
  fieldRef,
  maxY = 70,
  deporteActivo = "futbol"
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const animationFrame = useRef(null);
  const lastPos = useRef({ x: position.x, y: position.y });

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    
    setIsDragging(true);
    lastPos.current = { x: position.x, y: position.y };
  }, [position.x, position.y]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging || !fieldRef?.current) return;
    
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
    
    animationFrame.current = requestAnimationFrame(() => {
      const rect = fieldRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * maxY;
      
      const clampedX = Math.max(2, Math.min(98, x));
      const clampedY = Math.max(2, Math.min(maxY - 2, y));
      
      if (Math.abs(clampedX - lastPos.current.x) > 0.1 || 
          Math.abs(clampedY - lastPos.current.y) > 0.1) {
        lastPos.current = { x: clampedX, y: clampedY };
        onDrag(clampedX, clampedY);
      }
    });
  }, [isDragging, fieldRef, maxY, onDrag]);

  const handlePointerUp = useCallback((e) => {
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
    
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    
    setIsDragging(false);
  }, []);

  const scale = isDragging ? 1.3 : isHovered ? 1.15 : 1;
  const ballSize = 2.5;

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      style={{ 
        cursor: isDragging ? "grabbing" : "grab", 
        touchAction: "none"
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      {/* Área de toque más grande */}
      <circle cx="0" cy="0" r="5" fill="transparent" />
      
      {/* Sombra del balón */}
      <ellipse
        cx={isDragging ? 0.3 : 0}
        cy={isDragging ? 1.2 : 0.6}
        rx={ballSize * scale * 0.9}
        ry={isDragging ? 0.8 : 0.5}
        fill={`rgba(0,0,0,${isDragging ? 0.5 : 0.3})`}
      />
      
      {deporteActivo === "futbol" ? (
        // Balón de fútbol
        <g transform={`scale(${scale})`}>
          {/* Base blanca */}
          <circle
            cx="0"
            cy="0"
            r={ballSize}
            fill="white"
            stroke={isDragging ? "#fbbf24" : "#333"}
            strokeWidth={isDragging ? 0.4 : 0.2}
          />
          {/* Patrón de pentágonos */}
          <g fill="#1a1a1a">
            <polygon points="0,-1.2 0.9,-0.4 0.6,0.8 -0.6,0.8 -0.9,-0.4" />
            <polygon points="-1.8,-0.8 -1.3,-0.2 -1.8,0.4 -2.2,0 -2.2,-0.5" transform="scale(0.6)" />
            <polygon points="1.8,-0.8 1.3,-0.2 1.8,0.4 2.2,0 2.2,-0.5" transform="scale(0.6)" />
            <polygon points="0,2.2 -0.5,1.8 0,1.4 0.5,1.8" transform="scale(0.6)" />
          </g>
          {/* Brillo */}
          <ellipse
            cx="-0.6"
            cy="-0.6"
            rx="0.5"
            ry="0.3"
            fill="rgba(255,255,255,0.6)"
            transform="rotate(-30)"
          />
        </g>
      ) : (
        // Balón de baloncesto
        <g transform={`scale(${scale})`}>
          {/* Base naranja */}
          <circle
            cx="0"
            cy="0"
            r={ballSize}
            fill="#e65c00"
            stroke={isDragging ? "#fbbf24" : "#8b3a00"}
            strokeWidth={isDragging ? 0.4 : 0.3}
          />
          {/* Líneas del balón */}
          <g stroke="#1a1a1a" strokeWidth="0.15" fill="none">
            <line x1="0" y1={-ballSize} x2="0" y2={ballSize} />
            <ellipse cx="0" cy="0" rx={ballSize * 0.7} ry={ballSize} />
            <path d={`M ${-ballSize * 0.85} 0 Q 0 -${ballSize * 0.5} ${ballSize * 0.85} 0`} />
            <path d={`M ${-ballSize * 0.85} 0 Q 0 ${ballSize * 0.5} ${ballSize * 0.85} 0`} />
          </g>
          {/* Textura */}
          <circle cx="0" cy="0" r={ballSize} fill="url(#basketballTexture)" opacity="0.1" />
          {/* Brillo */}
          <ellipse
            cx="-0.5"
            cy="-0.5"
            rx="0.6"
            ry="0.35"
            fill="rgba(255,255,255,0.4)"
            transform="rotate(-30)"
          />
        </g>
      )}
      
      {/* Etiqueta al pasar el ratón */}
      {isHovered && !isDragging && (
        <g>
          <rect
            x="-4"
            y="-6.5"
            width="8"
            height="2.5"
            rx="0.5"
            fill="rgba(0,0,0,0.85)"
          />
          <text
            x="0"
            y="-4.8"
            textAnchor="middle"
            fill="white"
            fontSize="1.5"
            fontFamily="Arial, sans-serif"
            style={{ userSelect: "none", pointerEvents: "none" }}
          >
            Balón
          </text>
        </g>
      )}
    </g>
  );
}