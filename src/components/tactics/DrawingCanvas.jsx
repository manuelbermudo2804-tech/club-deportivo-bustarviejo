import React from "react";

export default function DrawingCanvas({ 
  lineas, 
  lineaActual, 
  colorLinea, 
  grosorLinea,
  tipoLinea 
}) {
  const renderLinea = (linea, index, esActual = false) => {
    if (!linea.puntos || linea.puntos.length < 2) return null;
    
    const puntos = linea.puntos;
    const color = linea.color || colorLinea;
    const grosor = linea.grosor || grosorLinea;
    const tipo = linea.tipo || tipoLinea;
    
    // Crear path
    let d = `M ${puntos[0].x} ${puntos[0].y}`;
    for (let i = 1; i < puntos.length; i++) {
      d += ` L ${puntos[i].x} ${puntos[i].y}`;
    }
    
    const strokeDasharray = tipo === "punteada" ? "1,1" : "none";
    
    // Calcular ángulo para la flecha
    const renderFlecha = () => {
      if (tipo !== "flecha" || puntos.length < 2) return null;
      
      const ultimo = puntos[puntos.length - 1];
      const penultimo = puntos[puntos.length - 2];
      const angulo = Math.atan2(ultimo.y - penultimo.y, ultimo.x - penultimo.x);
      const tamanioFlecha = grosor * 2;
      
      const x1 = ultimo.x - tamanioFlecha * Math.cos(angulo - Math.PI / 6);
      const y1 = ultimo.y - tamanioFlecha * Math.sin(angulo - Math.PI / 6);
      const x2 = ultimo.x - tamanioFlecha * Math.cos(angulo + Math.PI / 6);
      const y2 = ultimo.y - tamanioFlecha * Math.sin(angulo + Math.PI / 6);
      
      return (
        <polygon
          points={`${ultimo.x},${ultimo.y} ${x1},${y1} ${x2},${y2}`}
          fill={color}
        />
      );
    };
    
    return (
      <g key={esActual ? "current" : index}>
        <path
          d={d}
          stroke={color}
          strokeWidth={grosor}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={strokeDasharray}
          opacity={esActual ? 0.7 : 1}
        />
        {renderFlecha()}
      </g>
    );
  };

  return (
    <g>
      {/* Líneas guardadas */}
      {lineas.map((linea, index) => renderLinea(linea, index))}
      
      {/* Línea actual siendo dibujada */}
      {lineaActual && lineaActual.puntos.length > 0 && 
        renderLinea(lineaActual, -1, true)
      }
    </g>
  );
}