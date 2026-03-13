import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Clock, Users, Trophy } from "lucide-react";

export default function SeasonMinutesStats({ records, duracionDefault }) {
  const stats = useMemo(() => {
    if (!records || records.length === 0) return null;

    const playerMap = {};
    let totalMatchMinutes = 0;

    records.forEach(r => {
      const dur = r.duracion_partido || duracionDefault || 70;
      totalMatchMinutes += dur;
      (r.minutos_jugadores || []).forEach(mj => {
        if (!playerMap[mj.jugador_id]) {
          playerMap[mj.jugador_id] = { nombre: mj.jugador_nombre, total: 0, partidos: 0 };
        }
        playerMap[mj.jugador_id].total += mj.minutos || 0;
        if ((mj.minutos || 0) > 0) {
          playerMap[mj.jugador_id].partidos += 1;
        }
      });
    });

    const players = Object.entries(playerMap)
      .map(([id, data]) => ({
        id,
        nombre: data.nombre,
        totalMinutos: data.total,
        partidos: data.partidos,
        porcentaje: totalMatchMinutes > 0 ? Math.round((data.total / totalMatchMinutes) * 100) : 0
      }))
      .sort((a, b) => b.totalMinutos - a.totalMinutos);

    return { players, totalMatches: records.length, totalMatchMinutes };
  }, [records, duracionDefault]);

  if (!stats) {
    return (
      <div className="text-center py-8 text-slate-500">
        <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>No hay datos de minutos todavía</p>
      </div>
    );
  }

  const maxMinutos = stats.players[0]?.totalMinutos || 1;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow border text-center">
          <Trophy className="w-6 h-6 mx-auto mb-1 text-orange-500" />
          <div className="text-2xl font-bold">{stats.totalMatches}</div>
          <p className="text-xs text-slate-500">Partidos registrados</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border text-center">
          <Users className="w-6 h-6 mx-auto mb-1 text-blue-500" />
          <div className="text-2xl font-bold">{stats.players.length}</div>
          <p className="text-xs text-slate-500">Jugadores</p>
        </div>
      </div>

      {/* Tabla ranking */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Minutos acumulados por jugador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.players.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className={`w-6 text-center text-sm font-bold ${
                  idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-orange-400' : 'text-slate-500'
                }`}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium truncate">{p.nombre}</span>
                    <span className="text-sm font-bold text-blue-600 ml-2">{p.totalMinutos}'</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
                      style={{ width: `${Math.round((p.totalMinutos / maxMinutos) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-slate-400">{p.partidos} partido{p.partidos !== 1 ? 's' : ''}</span>
                    <span className="text-[10px] text-slate-400">{p.porcentaje}% del total</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}