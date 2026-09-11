import React, { useState, useEffect } from "react";
import { CalendarClock, MapPin, PartyPopper } from "lucide-react";

const pad = (n) => String(n).padStart(2, "0");

/**
 * Cuenta atrás hasta el día del sorteo del premio principal.
 * fecha: "YYYY-MM-DDTHH:mm" (hora local) o "YYYY-MM-DD".
 */
export default function SorteoCountdown({ fecha, lugar }) {
  const [ahora, setAhora] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!fecha) return null;

  const objetivo = new Date(fecha.length <= 10 ? `${fecha}T12:00` : fecha).getTime();
  if (Number.isNaN(objetivo)) return null;

  const diff = objetivo - ahora;
  const fechaTexto = new Date(objetivo).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (diff <= 0) {
    return (
      <div className="mt-4 rounded-2xl bg-white/15 border border-white/25 p-4 text-center">
        <PartyPopper className="w-6 h-6 mx-auto mb-1" />
        <p className="font-bold">¡Ya se ha celebrado el sorteo!</p>
        <p className="text-xs text-white/80 capitalize">{fechaTexto}</p>
      </div>
    );
  }

  const dias = Math.floor(diff / 86400000);
  const horas = Math.floor((diff % 86400000) / 3600000);
  const minutos = Math.floor((diff % 3600000) / 60000);
  const segundos = Math.floor((diff % 60000) / 1000);

  const bloques = [
    { v: dias, l: "días" },
    { v: pad(horas), l: "horas" },
    { v: pad(minutos), l: "min" },
    { v: pad(segundos), l: "seg" },
  ];

  return (
    <div className="mt-4 rounded-2xl bg-white/15 border border-white/25 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/90 flex items-center gap-1.5">
        <CalendarClock className="w-4 h-4" />
        Sorteo en
      </p>
      <div className="grid grid-cols-4 gap-2 mt-2">
        {bloques.map((b) => (
          <div key={b.l} className="bg-white/20 rounded-xl py-2 text-center">
            <p className="text-2xl font-black leading-none tabular-nums">{b.v}</p>
            <p className="text-[10px] uppercase text-white/80 mt-1">{b.l}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-white/90 mt-2 capitalize">{fechaTexto}</p>
      {lugar && (
        <p className="text-xs text-white/80 flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3" /> {lugar}
        </p>
      )}
    </div>
  );
}