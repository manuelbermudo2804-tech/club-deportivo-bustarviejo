import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FantasyLeaderboard({ entries }) {
  const sorted = [...(entries || [])]
    .filter((e) => e.estado_pago === "pagado")
    .sort((a, b) => (b.puntos_total || 0) - (a.puntos_total || 0) || (b.predicciones_acertadas || 0) - (a.predicciones_acertadas || 0));

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-slate-500">
          <Trophy className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="font-medium">Aún no hay participantes con pago verificado</p>
          <p className="text-xs mt-1">¡Sé el primero en apuntarte!</p>
        </CardContent>
      </Card>
    );
  }

  const medalColor = (i) => i === 0 ? "bg-yellow-400 text-yellow-900" : i === 1 ? "bg-slate-300 text-slate-800" : i === 2 ? "bg-orange-400 text-orange-900" : "bg-slate-100 text-slate-600";

  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-indigo-600" />
            <h3 className="font-black text-slate-900">Clasificación</h3>
            <Badge variant="secondary" className="ml-auto">{sorted.length} participantes</Badge>
          </div>
        </div>
        <div className="divide-y">
          {sorted.map((e, i) => (
            <div key={e.id} className={`flex items-center gap-3 px-4 py-3 ${i < 3 ? 'bg-gradient-to-r from-yellow-50/40 to-transparent' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${medalColor(i)}`}>
                {i < 3 ? <Medal className="w-4 h-4" /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 truncate">{e.nickname}</div>
                <div className="text-xs text-slate-500">{e.predicciones_acertadas || 0} aciertos</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-indigo-600">{e.puntos_total || 0}</div>
                <div className="text-xs text-slate-500">pts</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}