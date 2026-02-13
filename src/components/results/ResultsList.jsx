import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function ResultsList({ categoryFullName, isAdmin, onDelete }) {
  const queryClient = useQueryClient();
  const { data: results = [], isLoading } = useQuery({
    queryKey: ['resultados', categoryFullName],
    queryFn: async () => {
      console.log('🔄 Cargando resultados para:', categoryFullName);
      const result = await base44.entities.Resultado.filter({ categoria: categoryFullName }, '-jornada', 500);
      console.log('✅ Resultados cargados:', result.length, result);
      return result;
    },
    initialData: () => queryClient.getQueryData(['resultados', categoryFullName]) || [],
    placeholderData: () => queryClient.getQueryData(['resultados', categoryFullName]) || [],
    staleTime: 5 * 60_000,
    keepPreviousData: true,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
  });

  if (isLoading && results.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
          <p className="text-slate-600 text-sm">Cargando resultados...</p>
        </CardContent>
      </Card>
    );
  }

  const grouped = results.reduce((acc, r) => {
    const key = `${r.temporada}|${r.jornada}`;
    if (!acc[key]) acc[key] = { temporada: r.temporada, jornada: r.jornada, data: [] };
    acc[key].data.push(r);
    return acc;
  }, {});

  const groups = Object.values(grouped).sort((a, b) => (b.jornada ?? 0) - (a.jornada ?? 0));

  const initials = (s) => {
    const str = String(s || '').trim();
    if (!str) return '';
    const parts = str.split(/\s+/);
    return (parts[0][0] || '').toUpperCase();
  };

  if (groups.length === 0) {
    return (
      <Card className="border-2 border-dashed border-slate-300">
        <CardContent className="p-12 text-center text-slate-500">
          No hay resultados guardados todavía
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {groups.map((g, idx) => (
        <Card key={idx} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>Jornada {g.jornada ?? '-'}</span>
                <Badge className="bg-green-500 text-white">{g.temporada}</Badge>
              </div>
              {isAdmin && onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`¿Eliminar resultados de Jornada ${g.jornada}?`)) {
                      onDelete({ temporada: g.temporada, jornada: g.jornada });
                    }
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {g.data
              .sort((a, b) => (a.local || '').localeCompare(b.local || ''))
              .map((m) => {
                const hasScore = Number.isFinite(m.goles_local) && Number.isFinite(m.goles_visitante);
                return (
                  <div key={m.id} className="grid grid-cols-[1fr_auto_1fr] items-center py-3 gap-2">
                    <div className="pr-2 text-slate-800 text-sm whitespace-normal break-words font-medium text-left">
                      {m.local}
                    </div>

                    <div className="px-3 text-center flex-shrink-0 min-w-[60px]">
                      <div className={`text-lg font-extrabold whitespace-nowrap ${hasScore ? 'text-slate-900' : 'text-slate-400'}`}>
                        {hasScore ? `${m.goles_local} - ${m.goles_visitante}` : ' - '}
                      </div>
                    </div>

                    <div className="pl-2 text-slate-800 text-sm whitespace-normal break-words font-medium text-right">
                      {m.visitante}
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}