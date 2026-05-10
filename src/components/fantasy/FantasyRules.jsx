import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Coins, Info } from "lucide-react";

const PUNTOS = [
  { label: "🏆 Campeón del Mundial", pts: 25 },
  { label: "🥈 Subcampeón", pts: 15 },
  { label: "⚽ Cada semifinalista acertado", pts: 10 },
  { label: "👟 Máximo goleador", pts: 15 },
  { label: "✨ Selección sorpresa", pts: 10 },
  { label: "🎯 Resultado exacto de la final", pts: 30 },
];

export default function FantasyRules({ porcentajePremios = 70, porcentajeClub = 30 }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <h3 className="font-black text-slate-900">Sistema de puntos</h3>
          </div>
          <div className="space-y-2">
            {PUNTOS.map((p) => (
              <div key={p.label} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm">
                <span className="text-slate-700">{p.label}</span>
                <span className="font-bold text-orange-600">+{p.pts}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-3">En caso de empate, gana quien haya acertado más predicciones principales.</p>
        </CardContent>
      </Card>

      <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-slate-900">Reparto del bote</h3>
          </div>
          <div className="space-y-3">
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-4xl font-black text-emerald-600">{porcentajePremios}%</div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">Premios</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-4xl font-black text-orange-600">{porcentajeClub}%</div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">Club</div>
            </div>
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 text-xs text-yellow-900 font-medium flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              Cuantos más participantes, ¡mayor será el premio final!
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}