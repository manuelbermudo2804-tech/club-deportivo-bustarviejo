import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ResultsList({ categoryFullName }) {
  const { data: results = [] } = useQuery({
    queryKey: ['resultados', categoryFullName],
    queryFn: () => base44.entities.Resultado.filter({ categoria: categoryFullName }, '-updated_date', 500),
    initialData: [],
    staleTime: 60_000,
  });

  const grouped = results.reduce((acc, r) => {
    const key = `${r.temporada}|${r.jornada}`;
    if (!acc[key]) acc[key] = { temporada: r.temporada, jornada: r.jornada, data: [] };
    acc[key].data.push(r);
    return acc;
  }, {});

  const groups = Object.values(grouped).sort((a, b) => (b.jornada ?? 0) - (a.jornada ?? 0));

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
              <span>Jornada {g.jornada ?? '-'}</span>
              <Badge className="bg-green-500 text-white">{g.temporada}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {g.data
              .sort((a, b) => (a.local || '').localeCompare(b.local || ''))
              .map((m) => (
              <div key={m.id} className="flex items-center justify-between py-1 text-sm">
                <span className="truncate mr-2">{m.local}</span>
                <span className="font-semibold">{Number.isFinite(m.goles_local) && Number.isFinite(m.goles_visitante) ? `${m.goles_local} - ${m.goles_visitante}` : '-'}</span>
                <span className="truncate ml-2 text-right">{m.visitante}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}