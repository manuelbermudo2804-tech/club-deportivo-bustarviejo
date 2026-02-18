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
    queryFn: async () => {
      console.log('🔄 Cargando goleadores para:', categoryFullName);
      const result = await base44.entities.Goleador.filter({ categoria: categoryFullName }, '-goles', 500);
      console.log('✅ Goleadores cargados:', result.length, result);
      return result;
    },
    initialData: () => queryClient.getQueryData(['goleadores', categoryFullName]) || [],
    placeholderData: () => queryClient.getQueryData(['goleadores', categoryFullName]) || [],
    staleTime: 5 * 60_000,
    keepPreviousData: true,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
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

  return (
    <div className="space-y-4">
      {temporadas.map(temporada => (
        <Card key={temporada} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>Tabla de Goleadores</span>
                <Badge className="bg-green-500 text-white">{temporada}</Badge>
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
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Jugador</th>
                    <th className="py-2 pr-3">Equipo</th>
                    <th className="py-2 pr-3">Goles</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const list = groupedByTemporada[temporada];
                    const map = new Map();
                    for (const s of list) {
                      const key = `${normalize(s.jugador_nombre)}|${normalize(s.equipo)}`;
                      const cur = map.get(key);
                      if (!cur || (s.goles ?? 0) > (cur.goles ?? 0)) map.set(key, s);
                    }
                    const deduped = Array.from(map.values()).sort((a, b) => (b.goles ?? 0) - (a.goles ?? 0));
                    return deduped.map((s, i) => {
                      const bust = isBustarviejo(s.equipo);
                      return (
                        <tr key={s.id || `${i}-${s.jugador_nombre}`} className={`border-b last:border-0 ${bust ? 'bg-orange-50' : ''}`}>
                          <td className="py-2 pr-3">{i + 1}</td>
                          <td className={`py-2 pr-3 ${bust ? 'text-orange-700 font-bold' : ''}`}>{bust && '⚽ '}{s.jugador_nombre}</td>
                          <td className={`py-2 pr-3 ${bust ? 'text-orange-700 font-semibold' : ''}`}>{s.equipo}</td>
                          <td className={`py-2 pr-3 font-semibold ${bust ? 'text-orange-700' : ''}`}>{s.goles}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
      
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