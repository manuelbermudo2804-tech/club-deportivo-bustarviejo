import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";

function inferClubTeamName(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("bustar")) return true;
  if (n.includes("bustarviejo")) return true;
  return false;
}

export default function PositionEvolution({ categoryFullName }) {
  const [myTeam, setMyTeam] = React.useState("");
  const [rivalTeam, setRivalTeam] = React.useState("");
  const [mode, setMode] = React.useState("posicion"); // "posicion" | "puntos"

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["clasificacion-evolucion", categoryFullName],
    queryFn: async () => {
      if (!categoryFullName) return [];
      // Traemos suficientes registros para todas las jornadas
      const list = await base44.entities.Clasificacion.filter({ categoria: categoryFullName }, "-jornada", 1000);
      return list;
    },
    initialData: [],
    enabled: !!categoryFullName,
    staleTime: 60_000,
  });

  // Agrupar por jornada
  const jornadas = React.useMemo(() => {
    const byJ = rows.reduce((acc, r) => {
      const j = r.jornada ?? 0;
      if (!acc[j]) acc[j] = [];
      acc[j].push(r);
      return acc;
    }, {});
    return Object.keys(byJ)
      .map((j) => parseInt(j))
      .sort((a, b) => a - b)
      .map((j) => ({ jornada: j, data: rows.filter((r) => (r.jornada ?? 0) === j) }));
  }, [rows]);

  // Lista de equipos (del último corte)
  const teamOptions = React.useMemo(() => {
    if (jornadas.length === 0) return [];
    const last = jornadas[jornadas.length - 1].data;
    const names = [...new Set(last.map((r) => r.nombre_equipo).filter(Boolean))];
    return names.sort((a, b) => a.localeCompare(b));
  }, [jornadas]);

  // Selección por defecto robusta: cuando hay equipos, fijamos club y primer rival distinto
  React.useEffect(() => {
    if (teamOptions.length > 0) {
      const club = teamOptions.find(inferClubTeamName) || teamOptions[0];
      const other = teamOptions.find((n) => n !== club) || club;
      setMyTeam(club);
      setRivalTeam(other);
    }
  }, [teamOptions]);

  // Construir series por equipo
  const buildSeries = React.useCallback(
    (teamName) => {
      if (!teamName || jornadas.length === 0) return [];
      return jornadas.map(({ jornada, data }) => {
        const row = data.find((r) => r.nombre_equipo === teamName);
        return {
          jornada,
          posicion: row?.posicion ?? null,
          puntos: row?.puntos ?? null,
        };
      });
    },
    [jornadas]
  );

  const mySeries = buildSeries(myTeam);
  const rivalSeries = buildSeries(rivalTeam);

  // Preparar datos combinados para recharts (por x=jornada)
  const chartData = React.useMemo(() => {
    const js = jornadas.map((j) => j.jornada);
    return js.map((j) => {
      const m = mySeries.find((d) => d.jornada === j) || {};
      const r = rivalSeries.find((d) => d.jornada === j) || {};
      return {
        jornada: j,
        mi_pos: m.posicion,
        mi_pts: m.puntos,
        rv_pos: r.posicion,
        rv_pts: r.puntos,
      };
    });
  }, [jornadas, mySeries, rivalSeries]);

  const invertDomain = () => {
    // Para la posición, queremos 1 arriba. Calculamos máximos
    const allPositions = chartData.flatMap((d) => [d.mi_pos, d.rv_pos]).filter((v) => Number.isFinite(v));
    const max = allPositions.length ? Math.max(...allPositions) : 10;
    return [max, 1];
  };

  const pointsDomain = () => {
    const allPoints = chartData.flatMap((d) => [d.mi_pts, d.rv_pts]).filter((v) => Number.isFinite(v));
    const max = allPoints.length ? Math.max(...allPoints) : 10;
    return [0, Math.max(max, 3)];
  };

  const isEmpty = jornadas.length === 0 || teamOptions.length === 0;
  const disabledSelects = teamOptions.length === 0;

  return (
    <Card className="bg-white/90">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <TrendingUp className="w-5 h-5 text-orange-600" />
          Evolución Bonita de Posición
          <Badge className="bg-orange-500 text-white">{categoryFullName || "Categoría"}</Badge>
        </CardTitle>
        <div className="flex flex-wrap gap-2 items-center">
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="h-auto">
              <TabsTrigger value="posicion">Posición</TabsTrigger>
              <TabsTrigger value="puntos">Puntos</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={myTeam} onValueChange={setMyTeam} disabled={disabledSelects}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Mi equipo" /></SelectTrigger>
            <SelectContent className="z-[1000]">
              {teamOptions.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-slate-400">vs</span>
          <Select value={rivalTeam} onValueChange={setRivalTeam} disabled={disabledSelects || teamOptions.length < 2}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Rival" /></SelectTrigger>
            <SelectContent className="z-[1000]">
              {teamOptions.filter((t) => t !== myTeam).map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-12 text-center text-slate-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
            Cargando evolución...
          </div>
        ) : isEmpty ? (
          <div className="py-12 text-center text-slate-500">Sin datos de clasificación para esta categoría</div>
        ) : (
          <div className="grid gap-6">
            {/* Sparklines/LineCharts responsivos y fáciles */}
            {mode === "posicion" ? (
              <div className="h-48 sm:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <XAxis dataKey="jornada" tick={{ fontSize: 12 }} />
                    <YAxis domain={invertDomain()} tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip formatter={(v, n) => [v, n === "mi_pos" ? myTeam : rivalTeam]} labelFormatter={(l) => `Jornada ${l}`} />
                    <Legend formatter={(v) => (v === "mi_pos" ? myTeam : rivalTeam)} wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="mi_pos" stroke="#f97316" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="rv_pos" stroke="#10b981" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 sm:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <XAxis dataKey="jornada" tick={{ fontSize: 12 }} />
                    <YAxis domain={pointsDomain()} tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip formatter={(v, n) => [v, n === "mi_pts" ? myTeam : rivalTeam]} labelFormatter={(l) => `Jornada ${l}`} />
                    <Legend formatter={(v) => (v === "mi_pts" ? myTeam : rivalTeam)} wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="mi_pts" stroke="#f97316" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="rv_pts" stroke="#10b981" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}