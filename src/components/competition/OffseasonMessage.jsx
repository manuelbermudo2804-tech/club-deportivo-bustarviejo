import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Calendar, Sparkles } from "lucide-react";

/**
 * Mensaje elegante para mostrar cuando no hay datos de competición (fuera de temporada)
 * Variantes: 'full' (tarjeta grande), 'compact' (inline), 'banner' (banner horizontal)
 */
export default function OffseasonMessage({ variant = "full", className = "" }) {
  // Calcular próxima temporada
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  const nextSeason = `${year}/${year + 1}`;

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-3 p-4 bg-gradient-to-r from-slate-100 to-orange-50 rounded-xl border border-orange-200/50 ${className}`}>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg flex-shrink-0">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-sm">Temporada en preparación</p>
          <p className="text-xs text-slate-500">Los datos de competición estarán disponibles en septiembre</p>
        </div>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className={`bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-center ${className}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span className="text-orange-400 font-bold text-sm">FUERA DE TEMPORADA</span>
          <Sparkles className="w-4 h-4 text-orange-400" />
        </div>
        <p className="text-white text-sm">Preparando la temporada <strong>{nextSeason}</strong></p>
        <p className="text-slate-400 text-xs mt-1">Los partidos y clasificaciones aparecerán en septiembre</p>
      </div>
    );
  }

  // variant === "full" (default)
  return (
    <Card className={`border-2 border-dashed border-orange-300 bg-gradient-to-br from-orange-50 to-white overflow-hidden ${className}`}>
      <CardContent className="p-8 text-center relative">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-200/20 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-green-200/20 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-xl shadow-orange-500/30 mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            ¡Volvemos pronto! 💪
          </h3>
          
          <p className="text-slate-600 mb-4 max-w-sm mx-auto">
            La competición ha terminado por esta temporada. Estamos preparando la nueva temporada <strong className="text-orange-600">{nextSeason}</strong> con más fuerza que nunca.
          </p>

          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Calendar className="w-4 h-4 text-orange-500" />
              <span>Septiembre {year}</span>
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-2">
            <span className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
              🏟️ Desde 1989
            </span>
            <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
              💚 Bustarviejo
            </span>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Mientras tanto, sigue al club en redes sociales. ¡Nos vemos en septiembre!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}