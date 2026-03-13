import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function MinutesStatsPanel({ players, matchStructure }) {
  const stats = useMemo(() => {
    const totalMatches = matchStructure.length;
    return players.map(p => {
      let total = 0;
      let matchesPlayed = 0;
      matchStructure.forEach(match => {
        const entry = match.minutos_jugadores?.find(m => m.jugador_id === p.id);
        const mins = (entry?.minutos_1parte || 0) + (entry?.minutos_2parte || 0);
        total += mins;
        if (mins > 0) matchesPlayed++;
      });
      return {
        id: p.id,
        nombre: p.nombre?.split(' ').slice(0, 2).join(' ') || '?',
        total,
        partidos: matchesPlayed,
        media: matchesPlayed > 0 ? Math.round(total / matchesPlayed) : 0,
        totalMatches,
      };
    }).sort((a, b) => b.total - a.total);
  }, [players, matchStructure]);

  if (stats.every(s => s.total === 0)) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-slate-500 text-sm">
          Aún no hay minutos registrados. Rellena la tabla para ver estadísticas.
        </CardContent>
      </Card>
    );
  }

  const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#84cc16", "#0ea5e9", "#f97316", "#6366f1", "#14b8a6"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Minutos Totales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.filter(s => s.total > 0)} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nombre" width={90} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`${v} min`, "Total"]} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {stats.filter(s => s.total > 0).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resumen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="text-left py-2 px-2">Jugador</th>
                  <th className="text-center py-2 px-1">Min</th>
                  <th className="text-center py-2 px-1">PJ</th>
                  <th className="text-center py-2 px-1">Media</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="py-1.5 px-2 font-medium">{s.nombre}</td>
                    <td className="py-1.5 px-1 text-center font-bold text-amber-700">{s.total || '—'}</td>
                    <td className="py-1.5 px-1 text-center">{s.partidos}/{s.totalMatches}</td>
                    <td className="py-1.5 px-1 text-center">{s.media || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}