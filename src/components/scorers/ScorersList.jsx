import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ScorersList({ categoryFullName }) {
  const { data: scorers = [] } = useQuery({
    queryKey: ['goleadores', categoryFullName],
    queryFn: () => base44.entities.Goleador.filter({ categoria: categoryFullName }, '-goles', 200),
    initialData: [],
    staleTime: 60_000,
  });

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
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>Tabla de Goleadores</CardTitle>
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
              {scorers
                .sort((a, b) => (b.goles ?? 0) - (a.goles ?? 0))
                .map((s, i) => (
                <tr key={s.id || i} className="border-b last:border-0">
                  <td className="py-2 pr-3">{i + 1}</td>
                  <td className="py-2 pr-3">{s.jugador_nombre}</td>
                  <td className="py-2 pr-3">{s.equipo}</td>
                  <td className="py-2 pr-3 font-semibold">{s.goles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}