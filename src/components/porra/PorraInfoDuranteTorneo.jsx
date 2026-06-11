import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

/**
 * Banner explicativo para usuarios DURANTE el Mundial.
 * Aclara las dudas más típicas: bracket "raro" vs realidad, cómo se calculan
 * puntos, cuándo se actualiza el ranking, etc.
 *
 * variant: 'porra' (color naranja, para PorraMiPorra) | 'ranking' (color azul, para PorraRanking)
 */
export default function PorraInfoDuranteTorneo({ variant = 'porra' }) {
  const [abierto, setAbierto] = useState(false);

  const esRanking = variant === 'ranking';
  const wrapperClass = esRanking
    ? 'bg-blue-900/40 border-blue-400/40 backdrop-blur'
    : 'border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50';
  const textHeaderClass = esRanking ? 'text-white' : 'text-purple-900';
  const textBodyClass = esRanking ? 'text-blue-100' : 'text-purple-900';
  const iconColor = esRanking ? 'text-blue-300' : 'text-purple-600';
  const cardInnerClass = esRanking
    ? 'bg-blue-950/40 border border-blue-400/30'
    : 'bg-white border border-purple-200';

  return (
    <Card className={wrapperClass}>
      <CardContent className="p-3">
        <button
          type="button"
          onClick={() => setAbierto(v => !v)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Info className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
            <p className={`text-sm font-bold ${textHeaderClass} truncate`}>
              {esRanking
                ? '¿Por qué mi posición no cambia al instante? Léeme 👇'
                : '¿Mi bracket no coincide con los partidos reales? Léeme 👇'}
            </p>
          </div>
          {abierto
            ? <ChevronUp className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
            : <ChevronDown className={`w-4 h-4 ${iconColor} flex-shrink-0`} />}
        </button>

        {abierto && (
          <div className={`mt-3 space-y-2 text-xs leading-relaxed ${textBodyClass}`}>
            {esRanking ? (
              <>
                <div className={`${cardInnerClass} rounded-lg p-2.5`}>
                  <p className="font-bold mb-1">🕙 Actualización oficial: cada día sobre las 10:00 h</p>
                  <p>Tras los partidos del día anterior, el admin marca los resultados y se recalculan los puntos de todos. Por la mañana ya está todo al día. No hace falta refrescar de madrugada 😴</p>
                </div>
                <div className={`${cardInnerClass} rounded-lg p-2.5`}>
                  <p className="font-bold mb-1">✅ Tus puntos NO se pierden</p>
                  <p>Aunque veas tu posición "congelada" durante unas horas, todos los aciertos están guardados. Cuando se recalcule, aparecerán de golpe.</p>
                </div>
                <div className={`${cardInnerClass} rounded-lg p-2.5`}>
                  <p className="font-bold mb-1">⚖️ Igual para todos</p>
                  <p>El recálculo se hace simultáneamente para todos los participantes. Nadie tiene ventaja por refrescar más veces.</p>
                </div>
                <div className={`${cardInnerClass} rounded-lg p-2.5`}>
                  <p className="font-bold mb-1">🤔 ¿Crees que falta algún punto tuyo?</p>
                  <p>Entra en <strong>"Mi Porra → Desglose"</strong> para ver detalle de qué puntos has ganado por cada equipo y fase. Si ves algo raro, avisa al admin.</p>
                </div>
              </>
            ) : (
              <>
                <div className={`${cardInnerClass} rounded-lg p-2.5`}>
                  <p className="font-bold mb-1">📋 Lo que ves aquí es TU predicción</p>
                  <p>Tu bracket muestra lo que TÚ predijiste. Los partidos reales del Mundial pueden ser distintos — eso es normal y <strong>no es un error</strong>.</p>
                </div>
                <div className={`${cardInnerClass} rounded-lg p-2.5`}>
                  <p className="font-bold mb-1">🎯 Cómo ganas puntos</p>
                  <p>Ganas puntos por cada equipo que aciertes que <strong>llega a cada fase</strong> (octavos, cuartos, semis, final, campeón). <strong>NO importa contra quién juegue</strong> en tu cuadro.</p>
                  <p className="mt-1.5 italic opacity-90">Ejemplo: marcaste a España en cuartos contra Marruecos. En la realidad España juega cuartos contra Brasil y gana → te llevas los puntos de cuartos por España igualmente. ✅</p>
                </div>
                <div className={`${cardInnerClass} rounded-lg p-2.5`}>
                  <p className="font-bold mb-1">📺 ¿Dónde veo los partidos reales?</p>
                  <p>Aquí mostramos solo tu porra. Para resultados oficiales del Mundial consulta la web de la FIFA, la prensa deportiva o la tele 📺</p>
                </div>
                <div className={`${cardInnerClass} rounded-lg p-2.5`}>
                  <p className="font-bold mb-1">📊 Ver mis puntos detallados</p>
                  <p>Entra en la pestaña <strong>"Desglose"</strong> arriba para ver cuántos puntos has ganado por cada equipo y fase. ¡Se actualiza solo!</p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}