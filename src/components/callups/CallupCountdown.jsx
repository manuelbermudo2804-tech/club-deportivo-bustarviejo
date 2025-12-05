import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";

export default function CallupCountdown({ targetDate, targetTime, label = "Comienza en" }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(`${targetDate}T${targetTime || "00:00"}`);
      const now = new Date();
      const difference = target - now;

      if (difference <= 0) {
        return { expired: true };
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      // Urgent if less than 24 hours
      setIsUrgent(difference < 24 * 60 * 60 * 1000);

      return { days, hours, minutes, seconds, expired: false };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, targetTime]);

  if (!timeLeft || timeLeft.expired) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">¡Ya ha comenzado!</span>
      </div>
    );
  }

  const TimeBlock = ({ value, label }) => (
    <div className="flex flex-col items-center">
      <div className={`text-xl font-bold ${isUrgent ? 'text-red-600' : 'text-orange-600'}`}>
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-[10px] text-slate-500 uppercase">{label}</div>
    </div>
  );

  return (
    <div className={`rounded-xl p-3 ${isUrgent ? 'bg-red-50 border-2 border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        {isUrgent ? (
          <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
        ) : (
          <Clock className="w-4 h-4 text-orange-500" />
        )}
        <span className={`text-xs font-medium ${isUrgent ? 'text-red-700' : 'text-orange-700'}`}>
          {isUrgent ? '⚠️ ¡Queda poco tiempo!' : label}
        </span>
      </div>
      
      <div className="flex items-center justify-center gap-3">
        {timeLeft.days > 0 && (
          <>
            <TimeBlock value={timeLeft.days} label="días" />
            <span className={`text-lg font-bold ${isUrgent ? 'text-red-400' : 'text-orange-400'}`}>:</span>
          </>
        )}
        <TimeBlock value={timeLeft.hours} label="horas" />
        <span className={`text-lg font-bold ${isUrgent ? 'text-red-400' : 'text-orange-400'}`}>:</span>
        <TimeBlock value={timeLeft.minutes} label="min" />
        <span className={`text-lg font-bold ${isUrgent ? 'text-red-400' : 'text-orange-400'}`}>:</span>
        <TimeBlock value={timeLeft.seconds} label="seg" />
      </div>

      {isUrgent && (
        <p className="text-xs text-red-600 text-center mt-2 font-medium">
          ¡Confirma tu asistencia cuanto antes!
        </p>
      )}
    </div>
  );
}