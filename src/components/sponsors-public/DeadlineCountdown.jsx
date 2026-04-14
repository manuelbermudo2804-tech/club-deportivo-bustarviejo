import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

function getTimeLeft(deadlineStr) {
  const end = new Date(deadlineStr + "T23:59:59");
  const now = new Date();
  const diff = end - now;
  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

export default function DeadlineCountdown({ deadline }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(deadline));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(deadline));
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (!timeLeft) {
    return (
      <div className="mt-6 bg-slate-100 border-2 border-slate-300 rounded-2xl p-5 text-center">
        <p className="text-sm font-bold text-slate-700">
          🔒 El plazo para presentar solicitudes ha finalizado
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Las posiciones con más de un interesado se resolverán por subasta. El club contactará con los candidatos.
        </p>
      </div>
    );
  }

  const units = [
    { value: timeLeft.days, label: "días" },
    { value: timeLeft.hours, label: "horas" },
    { value: timeLeft.minutes, label: "min" },
    { value: timeLeft.seconds, label: "seg" },
  ];

  const isUrgent = timeLeft.days <= 7;

  return (
    <div className={`mt-6 border-2 rounded-2xl p-5 text-center ${
      isUrgent ? 'bg-red-50 border-red-400' : 'bg-amber-50 border-amber-300'
    }`}>
      <div className="flex items-center justify-center gap-2 mb-3">
        <Clock className={`w-5 h-5 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`} />
        <p className={`text-sm font-bold ${isUrgent ? 'text-red-700' : 'text-amber-800'}`}>
          {isUrgent ? '⏰ ¡Queda poco tiempo!' : '⏰ Plazo para presentar solicitudes'}
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {units.map((unit, i) => (
          <div key={i} className="text-center">
            <div className={`w-14 sm:w-16 h-14 sm:h-16 rounded-xl flex items-center justify-center font-black text-2xl sm:text-3xl shadow-inner ${
              isUrgent
                ? 'bg-red-600 text-white'
                : 'bg-white text-slate-900 border border-amber-200'
            }`}>
              {String(unit.value).padStart(2, '0')}
            </div>
            <p className={`text-[10px] font-semibold mt-1 ${
              isUrgent ? 'text-red-600' : 'text-amber-700'
            }`}>{unit.label}</p>
          </div>
        ))}
      </div>

      <p className={`text-xs mt-3 ${isUrgent ? 'text-red-600' : 'text-amber-700'}`}>
        Fecha límite: {new Date(deadline).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
        {' · '}Las posiciones con más de un interesado se resolverán por subasta.
      </p>
    </div>
  );
}