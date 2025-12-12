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
  
  return (
    <div className="seasonal-decorations">
      {items.map((emoji, idx) => (
        <span
          key={idx}
          className={`decoration decoration-${idx + 1}`}
          style={{
            left: `${(idx + 1) * 20}%`,
            animationDelay: `${idx * 0.5}s`
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
  }, [season]);

  return <SeasonalDecorations season={season} />;
}