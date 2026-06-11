import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

/**
 * Contador regresivo hasta una fecha (ISO string).
 * Se actualiza cada segundo. Cuando llega a 0, muestra "¡Plazo terminado!".
 *
 * Props:
 *  - targetDate: ISO string (ej. "2026-06-28T17:00:00Z")
 *  - variant: "dark" | "light" (default "light")
 *  - label: texto opcional antes del contador (ej. "Cierre en")
 */
export default function CountdownTimer({ targetDate, variant = "light", label = "Cierre en" }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!targetDate) return null;
  const target = new Date(targetDate).getTime();
  if (Number.isNaN(target)) return null;

  const diff = target - now;
  const terminado = diff <= 0;

  const dias = Math.floor(diff / 86400000);
  const horas = Math.floor((diff % 86400000) / 3600000);
  const minutos = Math.floor((diff % 3600000) / 60000);
  const segundos = Math.floor((diff % 60000) / 1000);

  const isDark = variant === "dark";
  const wrap = isDark
    ? "bg-black/30 border border-yellow-400/40 text-white"
    : "bg-yellow-100 border border-yellow-300 text-yellow-900";
  const numBg = isDark ? "bg-yellow-400/20 text-yellow-200" : "bg-white text-yellow-900 border border-yellow-300";

  if (terminado) {
    return (
      <div className={`${wrap} rounded-lg px-3 py-2 text-xs md:text-sm font-bold inline-flex items-center gap-2`}>
        <Clock className="w-4 h-4" /> ¡Plazo terminado!
      </div>
    );
  }

  return (
    <div className={`${wrap} rounded-lg px-3 py-2 inline-flex items-center gap-2 flex-wrap`}>
      <Clock className="w-4 h-4 flex-shrink-0" />
      <span className="text-[11px] md:text-xs font-bold uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1 font-mono font-black">
        <NumBox bg={numBg} value={dias} label="d" />
        <span className="opacity-50">:</span>
        <NumBox bg={numBg} value={horas} label="h" />
        <span className="opacity-50">:</span>
        <NumBox bg={numBg} value={minutos} label="m" />
        <span className="opacity-50">:</span>
        <NumBox bg={numBg} value={segundos} label="s" />
      </div>
    </div>
  );
}

function NumBox({ bg, value, label }) {
  return (
    <span className={`${bg} rounded px-1.5 py-0.5 text-xs md:text-sm tabular-nums`}>
      {String(value).padStart(2, '0')}<span className="text-[9px] md:text-[10px] opacity-70 ml-0.5">{label}</span>
    </span>
  );
}