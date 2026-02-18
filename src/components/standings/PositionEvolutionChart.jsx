import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function PositionEvolutionChart({ categoria }) {
  const { data: allStandings = [], isLoading } = useQuery({
    queryKey: ["all-standings-evolution", categoria],
    queryFn: () => base44.entities.Clasificacion.filter({ categoria }, "-updated_date", 500),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const chartData = useMemo(() => {
    if (!allStandings.length) return [];

    // Agrupar por temporada, tomar la más reciente
    const byTemp = {};
    for (const r of allStandings) {
      if (!byTemp[r.temporada]) byTemp[r.temporada] = [];
      byTemp[r.temporada].push(r);
    }
    const temps = Object.keys(byTemp).sort((a, b) => b.localeCompare(a));
    const currentTemp = temps[0];
    if (!currentTemp) return [];

    const rows = byTemp[currentTemp];

    // Agrupar por jornada
    const byJornada = {};
    for (const r of rows) {
      const j = r.jornada;
      if (j == null) continue;
      if (!byJornada[j]) byJornada[j] = [];
      byJornada[j].push(r);
    }

    const jornadas = Object.keys(byJornada)
      .map(Number)
      .filter(n => Number.isFinite(n))
      .sort((a, b) => a - b);

    // Para cada jornada, encontrar posición y puntos de Bustarviejo
    const points = [];
    for (const j of jornadas) {
      const teams = byJornada[j];
      const totalTeams = teams.length;
      const bust = teams.find(
        (t) =>
          (t.nombre_equipo || "").toLowerCase().includes("bustarviejo") ||
          (t.nombre_equipo || "").toLowerCase().includes("bustar")
      );
      if (bust) {
        points.push({
          jornada: `J${j}`,
          jornadaNum: j,
          posicion: bust.posicion,
          puntos: bust.puntos || 0,
          totalTeams,
          ganados: bust.ganados || 0,
          empatados: bust.empatados || 0,
          perdidos: bust.perdidos || 0,
        });
      }
    }
    return points;
  }, [allStandings]);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-lg border-2 border-orange-500/50 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-orange-400" />
          <h3 className="font-bold text-lg">Evolución en la Liga</h3>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" />
        </div>
      </div>
    );
  }

  if (chartData.length < 2) return null;

  const first = chartData[0];
  const last = chartData[chartData.length - 1];
  const posDiff = first.posicion - last.posicion; // positive = improved
  const bestPos = Math.min(...chartData.map((d) => d.posicion));
  const worstPos = Math.max(...chartData.map((d) => d.posicion));
  const maxTeams = Math.max(...chartData.map((d) => d.totalTeams), worstPos);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-orange-500/50 rounded-xl p-3 shadow-xl text-white text-xs space-y-1">
        <p className="font-bold text-orange-400 text-sm">{d.jornada}</p>
        <p>
          Posición: <strong className="text-white">{d.posicion}º</strong> de {d.totalTeams}
        </p>
        <p>
          Puntos: <strong className="text-orange-400">{d.puntos}</strong>
        </p>
        <p>
          {d.ganados}V - {d.empatados}E - {d.perdidos}D
        </p>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-lg border-2 border-orange-500/50 mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-400" />
          <h3 className="font-bold text-lg">Evolución en la Liga</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {posDiff > 0 ? (
            <div className="flex items-center gap-1 bg-green-500/20 px-2.5 py-1 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-bold text-green-400">+{posDiff} pos</span>
            </div>
          ) : posDiff < 0 ? (
            <div className="flex items-center gap-1 bg-red-500/20 px-2.5 py-1 rounded-lg">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-bold text-red-400">{posDiff} pos</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
              <Minus className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400">Sin cambios</span>
            </div>
          )}
        </div>
      </div>

      {/* Mini stats */}
      <div className="flex gap-3 mb-3 text-[10px] text-slate-400">
        <span>Mejor: <strong className="text-green-400">{bestPos}º</strong></span>
        <span>Peor: <strong className="text-red-400">{worstPos}º</strong></span>
        <span>Actual: <strong className="text-orange-400">{last.posicion}º</strong></span>
        <span>Puntos: <strong className="text-white">{last.puntos}</strong></span>
      </div>

      {/* Chart */}
      <div className="h-52 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 15, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="posGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="jornada"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
              tickLine={false}
            />
            <YAxis
              reversed
              domain={[1, maxTeams]}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
              tickLine={false}
              tickFormatter={(v) => `${v}º`}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Zona podio */}
            <ReferenceLine y={3} stroke="rgba(234,179,8,0.3)" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="posicion"
              stroke="#f97316"
              strokeWidth={3}
              fill="url(#posGradient)"
              dot={({ cx, cy, payload, index }) => {
                const isFirst = index === 0;
                const isLast = index === chartData.length - 1;
                const isBest = payload.posicion === bestPos;
                const r = isFirst || isLast || isBest ? 5 : 3;
                const fill = isBest ? "#22c55e" : isLast ? "#f97316" : "#f97316";
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={fill}
                    stroke="#0f172a"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-slate-500 text-center mt-1">
        ↑ Arriba = mejor posición · Línea punteada = zona podio
      </p>
    </div>
  );
}