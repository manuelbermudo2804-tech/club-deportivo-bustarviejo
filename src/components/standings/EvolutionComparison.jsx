import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

function buildSeries(records, teamName, jornadas) {
  const byKey = new Map();
  for (const r of records) {
    if (r.nombre_equipo === teamName) {
      byKey.set(r.jornada || 0, { posicion: r.posicion ?? null, puntos: r.puntos ?? null });
    }
  }
  return jornadas.map((j) => ({
    jornada: j,
    posicion: byKey.get(j)?.posicion ?? null,
    puntos: byKey.get(j)?.puntos ?? null,
  }));
}

export default function EvolutionComparison({ categoria, temporada }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["evo-clasif", categoria],
    queryFn: async () => {
      const recs = await base44.entities.Clasificacion.filter({ categoria }, "-updated_date", 400);
      return recs || [];
    },
    staleTime: 2 * 60_000,
  });

  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto mb-2" />
          <p className="text-slate-600 text-sm">Preparando evolución…</p>
        </CardContent>
      </Card>
    );
  }

  if (!rows.length) return null;

  // Determinar temporada activa
  let activeSeason = temporada;
  if (!activeSeason) {
    const bySeason = rows.reduce((acc, r) => {
      (acc[r.temporada] ||= []).push(r);
      return acc;
    }, {});
    activeSeason = Object.entries(bySeason)
      .map(([t, list]) => ({ t, last: new Date(list[0]?.updated_date || 0).getTime() }))
      .sort((a, b) => b.last - a.last)[0]?.t;
  }
  const seasonRows = rows.filter((r) => r.temporada === activeSeason);
  if (!seasonRows.length) return null;

  // Jornadas disponibles
  const jornadas = Array.from(new Set(seasonRows.map((r) => r.jornada || 0))).sort((a, b) => a - b);
  const maxJ = jornadas[jornadas.length - 1] || 0;
  const latestRows = seasonRows.filter((r) => (r.jornada || 0) === maxJ);

  // Nombres de equipos y selección por defecto (nuestro club primero)
  const teamNames = Array.from(new Set(latestRows.map((r) => r.nombre_equipo))).sort((a, b) => a.localeCompare(b));
  const defaultMine = teamNames.find((n) => n?.toLowerCase().includes("bustar")) || teamNames[0];
  const defaultRival = teamNames.find((n) => n !== defaultMine) || teamNames[0];

  const [mine, setMine] = React.useState(defaultMine);
  const [rival, setRival] = React.useState(defaultRival);

  React.useEffect(() => {
    // Si cambia la categoría/temporada, reestablecer por defecto
    setMine(defaultMine);
    setRival(defaultRival);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria, activeSeason]);

  const mineSeries = buildSeries(seasonRows, mine, jornadas);
  const rivalSeries = buildSeries(seasonRows, rival, jornadas);

  const mergedPos = jornadas.map((j, i) => ({
    jornada: j,
    [mine]: mineSeries[i]?.posicion ?? null,
    [rival]: rivalSeries[i]?.posicion ?? null,
  }));
  const mergedPts = jornadas.map((j, i) => ({
    jornada: j,
    [mine]: mineSeries[i]?.puntos ?? null,
    [rival]: rivalSeries[i]?.puntos ?? null,
  }));

  return (
    <Card className="mt-4">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="">
            <h3 className="text-lg font-bold text-slate-900">Evolución bonita de posición</h3>
            <p className="text-xs text-slate-500">Temporada <Badge variant="outline">{activeSeason}</Badge></p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-slate-600">Mi equipo</div>
            <Select value={mine} onValueChange={setMine}>
              <SelectTrigger className="w-48 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {teamNames.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-slate-600 ml-1">Rival</div>
            <Select value={rival} onValueChange={setRival}>
              <SelectTrigger className="w-48 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {teamNames.filter((n) => n !== mine).map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Posición por jornada (1 es mejor) */}
        <div className="bg-white rounded-xl border p-3">
          <p className="text-xs text-slate-600 mb-2">Posición por jornada (↓ mejor)</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedPos} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="jornada" tick={{ fontSize: 10 }} />
                <YAxis reversed allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => (value ?? "-")} labelFormatter={(l) => `Jornada ${l}`} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey={mine} stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey={rival} stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Puntos acumulados por jornada */}
        <div className="bg-white rounded-xl border p-3">
          <p className="text-xs text-slate-600 mb-2">Puntos acumulados por jornada</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedPts} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="jornada" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => (value ?? "-")} labelFormatter={(l) => `Jornada ${l}`} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey={mine} stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey={rival} stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">Consejo: Elige el rival del próximo partido para ver tendencias rápidas. Si faltan puntos/posiciones en alguna jornada, es porque no hay snapshot guardado de ese día.</p>
      </CardContent>
    </Card>
  );
}