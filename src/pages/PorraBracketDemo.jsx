import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Crown } from "lucide-react";

// PÁGINA DE DEMOSTRACIÓN (solo para ver el diseño).
// Datos ficticios: predicción del usuario + resultado real, para enseñar cómo
// quedaría el bracket mostrando "lo mío vs lo real" partido a partido.

const META = {
  '8vos': { titulo: 'Octavos de final', color: 'from-indigo-500 to-indigo-600', pts: 3 },
  '4tos': { titulo: 'Cuartos de final', color: 'from-purple-500 to-purple-600', pts: 5 },
  'final': { titulo: '🏆 GRAN FINAL', color: 'from-red-600 to-orange-600', pts: 10 },
};

// partido: { fase, contendientes:[{cod,nombre,bandera}], miGanador, ganadorReal, finalizado }
const DEMO = [
  {
    fase: '8vos',
    partidos: [
      { contendientes: [{ cod:'ESP', nombre:'España', bandera:'🇪🇸' }, { cod:'MAR', nombre:'Marruecos', bandera:'🇲🇦' }], miGanador:'ESP', ganadorReal:'ESP', finalizado:true },
      { contendientes: [{ cod:'BRA', nombre:'Brasil', bandera:'🇧🇷' }, { cod:'CRO', nombre:'Croacia', bandera:'🇭🇷' }], miGanador:'BRA', ganadorReal:'CRO', finalizado:true },
      { contendientes: [{ cod:'FRA', nombre:'Francia', bandera:'🇫🇷' }, { cod:'POL', nombre:'Polonia', bandera:'🇵🇱' }], miGanador:'FRA', ganadorReal:null, finalizado:false },
    ],
  },
  {
    fase: '4tos',
    partidos: [
      { contendientes: [{ cod:'ESP', nombre:'España', bandera:'🇪🇸' }, { cod:'CRO', nombre:'Croacia', bandera:'🇭🇷' }], miGanador:'ESP', ganadorReal:'ESP', finalizado:true },
      { contendientes: [{ cod:'ARG', nombre:'Argentina', bandera:'🇦🇷' }, { cod:'POR', nombre:'Portugal', bandera:'🇵🇹' }], miGanador:'POR', ganadorReal:'ARG', finalizado:true },
    ],
  },
  {
    fase: 'final',
    partidos: [
      { contendientes: [{ cod:'ESP', nombre:'España', bandera:'🇪🇸' }, { cod:'ARG', nombre:'Argentina', bandera:'🇦🇷' }], miGanador:'ESP', ganadorReal:'ESP', finalizado:true, esFinal:true },
    ],
  },
];

export default function PorraBracketDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 text-xs text-amber-900">
          <strong>👁️ VISTA DE DEMOSTRACIÓN</strong> — datos de ejemplo para ver el diseño. Aquí verás tu elección y, cuando el partido acabe, el equipo que ganó de verdad debajo.
        </div>

        {DEMO.map((bloque) => {
          const meta = META[bloque.fase];
          return (
            <Card key={bloque.fase} className="border-2 border-slate-200 overflow-hidden">
              <div className={`bg-gradient-to-r ${meta.color} text-white px-4 py-3`}>
                <h3 className="font-black text-base flex items-center justify-between">
                  <span>{meta.titulo}</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{meta.pts} pts c/u</span>
                </h3>
              </div>
              <CardContent className="p-3 space-y-2">
                {bloque.partidos.map((p, idx) => {
                  const acerto = p.finalizado && p.ganadorReal === p.miGanador;
                  const fallo = p.finalizado && p.ganadorReal !== p.miGanador;
                  const real = p.contendientes.find((c) => c.cod === p.ganadorReal);
                  return (
                    <div key={idx} className={`rounded-lg p-3 ${p.esFinal ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400' : 'bg-slate-50 border border-slate-200'}`}>
                      <p className="text-xs font-bold text-slate-500 mb-2">
                        {p.esFinal ? <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-yellow-600" /> Tu CAMPEÓN</span> : `Partido ${idx + 1}`}
                      </p>

                      {/* Mi elección — los dos contendientes, resaltando mi pick */}
                      <div className="grid grid-cols-2 gap-2">
                        {p.contendientes.map((c) => {
                          const sel = p.miGanador === c.cod;
                          return (
                            <div
                              key={c.cod}
                              className={`p-3 rounded-lg font-bold text-sm flex flex-col items-center justify-center gap-1 min-h-[80px] ${
                                sel
                                  ? p.esFinal
                                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg scale-105'
                                    : 'bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-lg scale-105'
                                  : 'bg-white border-2 border-slate-200 opacity-60'
                              }`}
                            >
                              <span className="text-3xl">{c.bandera}</span>
                              <span className="text-center leading-tight">{c.nombre}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Resultado real — debajo, en la misma franja */}
                      {p.finalizado ? (
                        <div className={`mt-2 rounded-lg px-3 py-2 flex items-center justify-between text-sm font-bold border-2 ${
                          acerto ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'
                        }`}>
                          <span className="flex items-center gap-1.5">
                            <span className="text-base">{real?.bandera}</span>
                            <span>Ganó de verdad: <strong>{real?.nombre}</strong></span>
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/60">
                            {acerto ? `✅ +${meta.pts} pts` : '❌ Fallaste'}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2 rounded-lg px-3 py-2 text-xs text-slate-500 bg-white border border-dashed border-slate-300 text-center">
                          ⏳ Aún no se ha jugado — verás aquí quién gana de verdad
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}