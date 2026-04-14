import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Flame } from "lucide-react";

function getTimeLeft(deadlineStr) {
  const end = new Date(deadlineStr + "T23:59:59");
  const now = new Date();
  const diff = end - now;
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

export default function HeroCountdownBadge({ deadline }) {
  const [timeLeft, setTimeLeft] = useState(() => deadline ? getTimeLeft(deadline) : null);

  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => setTimeLeft(getTimeLeft(deadline)), 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (!deadline) return null;

  // Plazo finalizado
  if (!timeLeft) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2.5"
      >
        <span className="text-sm text-slate-300 font-semibold">🔒 El plazo de solicitudes ha finalizado</span>
      </motion.div>
    );
  }

  const isUrgent = timeLeft.days <= 7;

  const units = [
    { value: timeLeft.days, label: "d" },
    { value: timeLeft.hours, label: "h" },
    { value: timeLeft.minutes, label: "m" },
    { value: timeLeft.seconds, label: "s" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mt-6"
    >
      <a
        href="#paquetes"
        className={`inline-flex flex-col items-center gap-2 backdrop-blur-md rounded-2xl px-6 py-4 border-2 transition-all hover:scale-105 cursor-pointer ${
          isUrgent
            ? "bg-red-500/20 border-red-400/60 shadow-lg shadow-red-500/20"
            : "bg-orange-500/20 border-orange-400/50 shadow-lg shadow-orange-500/10"
        }`}
      >
        <div className="flex items-center gap-2">
          {isUrgent ? (
            <Flame className="w-4 h-4 text-red-400 animate-pulse" />
          ) : (
            <Clock className="w-4 h-4 text-orange-300" />
          )}
          <span className={`text-xs font-bold uppercase tracking-wider ${
            isUrgent ? "text-red-300" : "text-orange-300"
          }`}>
            {isUrgent ? "¡Últimos días!" : "Plazo abierto"} · Inscripción de patrocinadores
          </span>
          {isUrgent && <Flame className="w-4 h-4 text-red-400 animate-pulse" />}
        </div>

        <div className="flex items-center gap-1.5">
          {units.map((unit, i) => (
            <div key={i} className="flex items-center gap-0.5">
              <span className={`font-black text-xl tabular-nums ${
                isUrgent ? "text-red-300" : "text-white"
              }`}>
                {String(unit.value).padStart(2, "0")}
              </span>
              <span className={`text-[10px] font-semibold ${
                isUrgent ? "text-red-400/80" : "text-orange-300/80"
              }`}>
                {unit.label}
              </span>
              {i < units.length - 1 && (
                <span className="text-white/30 font-light mx-0.5">:</span>
              )}
            </div>
          ))}
        </div>

        <span className={`text-[11px] font-semibold ${
          isUrgent ? "text-red-300/90" : "text-orange-200/80"
        }`}>
          Toca para ver opciones ↓
        </span>
      </a>
    </motion.div>
  );
}