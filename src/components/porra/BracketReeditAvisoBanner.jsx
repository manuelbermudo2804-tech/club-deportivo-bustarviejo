import React from "react";
import { AlertTriangle } from "lucide-react";
import CountdownTimer from "@/components/porra/CountdownTimer";

/**
 * Banner reutilizable que avisa a los participantes de que deben revisar/confirmar
 * su bracket (octavos → final) tras la actualización al cuadro oficial FIFA 2026.
 *
 * Se oculta automáticamente cuando ya pasó `fechaLimiteBracket`.
 *
 * Props:
 *  - fechaLimiteBracket: ISO string (ej. "2026-06-28T17:00:00Z")
 *  - variant: "dark" (sobre fondo oscuro, p.ej. PorraInscripcionesCerradas)
 *           | "light" (sobre fondo claro, p.ej. PorraRanking) — default "light"
 */
export default function BracketReeditAvisoBanner({ fechaLimiteBracket, variant = "light" }) {
  // Porras ya bloqueadas: no mostrar ningún aviso de bracket pendiente.
  return null;
  // eslint-disable-next-line no-unreachable
  if (!fechaLimiteBracket) return null;
  const limiteMs = new Date(fechaLimiteBracket).getTime();
  if (Number.isNaN(limiteMs) || Date.now() >= limiteMs) return null;

  const fechaTxt = new Date(fechaLimiteBracket).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
  const horaTxt = new Date(fechaLimiteBracket).toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid'
  });

  const isDark = variant === "dark";
  const wrap = isDark
    ? "bg-yellow-400/15 border-2 border-yellow-400/60 backdrop-blur-md"
    : "bg-yellow-50 border-2 border-yellow-400";
  const icon = isDark ? "text-yellow-300" : "text-yellow-600";
  const title = isDark ? "text-yellow-200" : "text-yellow-900";
  const body = isDark ? "text-white/90" : "text-yellow-900/90";
  const strong = isDark ? "text-yellow-200" : "text-yellow-900";
  const muted = isDark ? "text-white/70" : "text-yellow-800/80";

  return (
    <div className={`${wrap} rounded-2xl p-4 md:p-5 text-left`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-6 h-6 ${icon} flex-shrink-0 mt-0.5 animate-pulse`} />
        <div className="flex-1">
          <p className={`font-black ${title} text-sm md:text-base mb-1.5`}>
            📢 ¿Ya tienes porra? Revisa tu bracket
          </p>
          <p className={`${body} text-xs md:text-sm leading-relaxed mb-2`}>
            Hemos actualizado el bracket de eliminatorias al{' '}
            <strong className={strong}>cuadro oficial FIFA 2026</strong>{' '}
            (octavos → final). Tus predicciones de fase de grupos y mejores terceros{' '}
            <strong>se mantienen intactas</strong>, pero el cuadro de eliminatorias se ha reorganizado y necesitas confirmarlo.
          </p>
          <p className={`${body} text-xs md:text-sm leading-relaxed mb-2`}>
            ✅ Puedes <strong>modificarlo y confirmarlo</strong> hasta el{' '}
            <strong className={strong}>{fechaTxt} a las {horaTxt}h</strong>.
          </p>
          <div className="mt-2 mb-1">
            <CountdownTimer targetDate={fechaLimiteBracket} variant={isDark ? "dark" : "light"} label="Tiempo restante" />
          </div>
          <p className={`${muted} text-[11px] md:text-xs mt-2 italic`}>
            Accede a tu porra desde el email mágico que recibiste o desde "Recuperar accesos".
          </p>
        </div>
      </div>
    </div>
  );
}