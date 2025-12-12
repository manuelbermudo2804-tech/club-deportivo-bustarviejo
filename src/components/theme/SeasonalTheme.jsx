import React, { useEffect, useState } from "react";

// Detecta la temporada actual según la fecha
const getCurrentSeason = () => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();

  // Navidad (1 dic - 6 ene)
  if ((month === 12 && day >= 1) || (month === 1 && day <= 6)) {
    return "navidad";
  }
  
  // Halloween (21 oct - 31 oct)
  if (month === 10 && day >= 21) {
    return "halloween";
  }
  
  // Primavera (21 mar - 20 jun)
  if ((month === 3 && day >= 21) || month === 4 || month === 5 || (month === 6 && day <= 20)) {
    return "primavera";
  }
  
  // Verano (21 jun - 22 sep)
  if ((month === 6 && day >= 21) || month === 7 || month === 8 || (month === 9 && day <= 22)) {
    return "verano";
  }
  
  // Otoño (23 sep - 20 nov)
  if ((month === 9 && day >= 23) || month === 10 || (month === 11 && day <= 20)) {
    return "otono";
  }
  
  // Invierno (resto del tiempo)
  return "invierno";
};

// Decoraciones flotantes para cada temporada
const SeasonalDecorations = ({ season }) => {
  const decorations = {
    navidad: ["❄️", "⭐", "🎄", "🎅"],
    halloween: ["🎃", "👻", "🦇", "🕷️"],
    primavera: ["🌸", "🌺", "🦋", "🌼"],
    verano: ["☀️", "🌊", "🏖️", "🍉"],
    otono: ["🍂", "🍁", "🌰", "🎃"],
    invierno: ["❄️", "⛄", "🌨️", "☃️"]
  };

  const items = decorations[season] || [];
  
  // Generar múltiples instancias de decoraciones para efecto más visible
  const repeatedItems = [...items, ...items, ...items];
  
  return (
    <div className="seasonal-decorations">
      {repeatedItems.map((emoji, idx) => (
        <span
          key={idx}
          className={`decoration decoration-${(idx % 4) + 1}`}
          style={{
            left: `${5 + (idx * 8)}%`,
            animationDelay: `${idx * 1.5}s`,
            fontSize: idx % 2 === 0 ? '2rem' : '1.5rem'
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
};

export default function SeasonalTheme() {
  const [season, setSeason] = useState(getCurrentSeason());

  useEffect(() => {
    // Actualizar la temporada cada hora por si cambia
    const interval = setInterval(() => {
      setSeason(getCurrentSeason());
    }, 3600000); // 1 hora

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Aplicar clase CSS al body según la temporada
    document.body.classList.remove(
      "season-navidad",
      "season-halloween",
      "season-primavera",
      "season-verano",
      "season-otono",
      "season-invierno"
    );
    document.body.classList.add(`season-${season}`);
    
    // Log para debug
    console.log('🎨 Temporada activa:', season);
  }, [season]);

  return (
    <>
      <SeasonalDecorations season={season} />
      {/* Badge indicador de temporada (solo visible para debug) */}
      <div style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 10000,
        pointerEvents: 'none'
      }}>
        Temporada: {season}
      </div>
    </>
  );
}