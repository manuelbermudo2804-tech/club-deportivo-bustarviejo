import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Trophy } from "lucide-react";

export default function ScorersList({ categoryFullName, isAdmin, onDelete }) {
  const queryClient = useQueryClient();
  const { data: scorers = [], isLoading } = useQuery({
    queryKey: ['goleadores', categoryFullName],
    queryFn: () => base44.entities.Goleador.filter({ categoria: categoryFullName }, '-goles', 200),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  });

  if (isLoading && scorers.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
          <p className="text-slate-600 text-sm">Cargando goleadores...</p>
        </CardContent>
      </Card>
    );
  }

  // Agrupar por temporada
  // Deduplicar visualmente por jugador+equipo dentro de cada temporada (por si hay restos)
  const groupedByTemporada = scorers.reduce((acc, scorer) => {
    if (!acc[scorer.temporada]) {
      acc[scorer.temporada] = [];
    }
    acc[scorer.temporada].push(scorer);
    return acc;
  }, {});

  const temporadas = Object.keys(groupedByTemporada).sort((a, b) => b.localeCompare(a));

  const normalize = (s) => String(s || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toUpperCase();
  const isBustarviejo = (name) => /bustarviejo/i.test(String(name || ''));

  if (scorers.length === 0) {
    return (
      <Card className="border-2 border-dashed border-slate-300">
        <CardContent className="p-12 text-center text-slate-500">
          No hay goleadores guardados todavía
        </CardContent>
      </Card>
    );
  }

  // Extract Bustarviejo scorers for highlight banner
  const bustScorers = scorers
    .filter(s => isBustarviejo(s.equipo))
    .sort((a, b) => (b.goles ?? 0) - (a.goles ?? 0));

  return (
    <div className="space-y-4">
      {/* Bustarviejo Scorers Highlight Banner */}
      {bustScorers.length > 0 && (
        <Card className="border-2 border-orange-400 bg-gradient-to-r from-orange-50 via-white to-green-50 shadow-lg overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Trophy className="w-5 h-5 text-orange-500" />
              Goleadores del CD Bustarviejo
              <Badge className="bg-orange-600 text-white ml-2">{bustScorers.length} jugadores</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {bustScorers.map((s, i) => (
                <div key={s.id || `bust-${i}`} className={`flex items-center gap-3 p-3 rounded-xl border ${i === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 shadow-md' : 'bg-white border-orange-200'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-slate-300 text-slate-800' : i === 2 ? 'bg-orange-300 text-orange-900' : 'bg-orange-100 text-orange-700'}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate text-sm">{s.jugador_nombre}</p>
                    <p className="text-xs text-slate-500 truncate">{s.equipo}</p>
                  </div>
                  <div className={`text-xl font-black ${i === 0 ? 'text-yellow-600' : 'text-orange-600'}`}>
                    {s.goles}
                    <span className="text-xs font-normal text-slate-500 ml-0.5">goles</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {temporadas.map(temporada => {
        const list = groupedByTemporada[temporada];
        const map = new Map();
        for (const s of list) {
          const key = `${normalize(s.jugador_nombre)}|${normalize(s.equipo)}`;
          const cur = map.get(key);
          if (!cur || (s.goles ?? 0) > (cur.goles ?? 0)) map.set(key, s);
        }
        const deduped = Array.from(map.values()).sort((a, b) => (b.goles ?? 0) - (a.goles ?? 0));
        const maxGoles = deduped.length > 0 ? (deduped[0].goles || 1) : 1;

        return (
          <Card key={temporada} className="hover:shadow-lg transition-shadow border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-orange-500" />
                  <span>Tabla de Goleadores</span>
                  <Badge className="bg-orange-600 text-white">{temporada}</Badge>
                  <Badge variant="outline" className="text-slate-500">{deduped.length} jugadores</Badge>
                </div>
                {isAdmin && onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`¿Eliminar goleadores de temporada ${temporada}?`)) {
                        onDelete({ temporada });
                      }
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
                    <tr>
                      <th className="py-2 px-3 text-left rounded-tl-lg">#</th>
                      <th className="py-2 px-3 text-left">Jugador</th>
                      <th className="py-2 px-3 text-left">Equipo</th>
                      <th className="py-2 px-3 text-center">Goles</th>
                      <th className="py-2 px-3 rounded-tr-lg hidden sm:table-cell"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {deduped.map((s, i) => {
                      const bust = isBustarviejo(s.equipo);
                      const golesPct = maxGoles > 0 ? ((s.goles || 0) / maxGoles) * 100 : 0;
                      return (
                        <tr key={s.id || `${i}-${s.jugador_nombre}`} className={`border-b last:border-0 transition-colors hover:bg-slate-50 ${bust ? 'bg-gradient-to-r from-orange-50 to-orange-100/50' : ''}`}>
                          <td className="py-2.5 px-3 font-bold text-slate-500">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </td>
                          <td className={`py-2.5 px-3 font-medium ${bust ? 'text-orange-700 font-bold' : ''}`}>
                            {bust && '⚽ '}{s.jugador_nombre}
                          </td>
                          <td className={`py-2.5 px-3 text-xs ${bust ? 'text-orange-600 font-semibold' : 'text-slate-600'}`}>{s.equipo}</td>
                          <td className={`py-2.5 px-3 text-center font-bold text-base ${bust ? 'text-orange-700' : 'text-slate-900'}`}>{s.goles}</td>
                          <td className="py-2.5 px-3 hidden sm:table-cell w-24">
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  bust ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                                  i === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                  i <= 2 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                                  'bg-gradient-to-r from-slate-400 to-slate-500'
                                }`}
                                style={{ width: `${golesPct}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {temporadas.length === 0 && (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="p-12 text-center text-slate-500">
            No hay goleadores guardados todavía
          </CardContent>
        </Card>
      )}
    </div>
  );
}