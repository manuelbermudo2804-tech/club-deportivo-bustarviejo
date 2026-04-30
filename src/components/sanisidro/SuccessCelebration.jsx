import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, Calendar, MapPin, Trophy, Heart, Sparkles } from "lucide-react";

// Mensaje de éxito espectacular para inscripciones de San Isidro
// Tipo: "torneo" | "voluntario"
export default function SuccessCelebration({ type = "torneo", title, subtitle, onClose, children }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    // Confetti party 🎉
    const duration = 3000;
    const end = Date.now() + duration;
    const colors = type === "voluntario"
      ? ["#ec4899", "#ef4444", "#f97316", "#fbbf24"]
      : ["#dc2626", "#fbbf24", "#16a34a", "#ffffff"];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();

    // Confetti grande inicial
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
      colors,
    });
  }, [type]);

  const isVol = type === "voluntario";

  const bgGradient = isVol
    ? "from-pink-600 via-red-500 to-orange-500"
    : "from-red-600 via-yellow-500 to-green-600";

  const icon = isVol ? Heart : Trophy;
  const Icon = icon;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} flex items-center justify-center p-4 relative overflow-hidden`}>
      {/* Sparkles decorativos animados de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <Sparkles
            key={i}
            className="absolute text-white/30 animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${20 + Math.random() * 40}px`,
              height: `${20 + Math.random() * 40}px`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div
        className={`relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transition-all duration-700 ${
          show ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-8"
        }`}
      >
        {/* Cabecera con gradiente y emojis flotantes */}
        <div className={`relative bg-gradient-to-br ${bgGradient} p-8 text-center overflow-hidden`}>
          <div className="absolute inset-0 opacity-20 text-7xl flex items-center justify-around">
            <span className="animate-bounce" style={{ animationDelay: "0s" }}>🎉</span>
            <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>🎊</span>
            <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>🎉</span>
          </div>
          <div className="relative">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-xl ring-4 ring-white/40">
              <CheckCircle2 className="w-14 h-14 text-green-500" />
            </div>
            <div className="flex items-center justify-center gap-2 text-white text-3xl font-black drop-shadow-lg">
              <Icon className="w-7 h-7" />
              <h2>{isVol ? "¡QUÉ GRANDE!" : "¡INSCRITO!"}</h2>
              <Icon className="w-7 h-7" />
            </div>
            <p className="text-white/95 text-sm font-bold mt-2 drop-shadow">
              {isVol ? "Eres parte de la familia 💪" : "¡Ya estás dentro del torneo!"}
            </p>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-black text-slate-900">{title}</h3>
            {subtitle && <p className="text-slate-600 text-sm">{subtitle}</p>}
          </div>

          {/* Cuadro con info del evento */}
          <div className={`rounded-xl p-4 ${isVol ? "bg-pink-50 border border-pink-200" : "bg-amber-50 border border-amber-200"}`}>
            <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${isVol ? "text-pink-700" : "text-amber-700"}`}>
              📅 No te lo pierdas
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Calendar className={`w-4 h-4 ${isVol ? "text-pink-600" : "text-amber-600"}`} />
                <span className="font-bold">15 de Mayo 2026</span> · San Isidro
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <MapPin className={`w-4 h-4 ${isVol ? "text-pink-600" : "text-amber-600"}`} />
                <span>Bustarviejo · Campo de fútbol</span>
              </div>
            </div>
          </div>

          {/* Mensaje motivacional */}
          <div className={`rounded-xl p-4 text-center ${isVol ? "bg-gradient-to-r from-pink-500 to-red-500" : "bg-gradient-to-r from-green-600 to-emerald-600"} text-white`}>
            <p className="font-bold text-sm leading-relaxed">
              {isVol
                ? "💖 ¡Sin gente como tú, San Isidro no sería lo mismo! Te contactaremos para confirmar tu turno."
                : "🏆 ¡Prepárate para vivir un día inolvidable! Comparte con tus amigos y anímalos a apuntarse."}
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}