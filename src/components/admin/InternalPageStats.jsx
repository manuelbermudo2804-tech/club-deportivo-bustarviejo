import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart3, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const RANGES = [
  { key: "7", label: "7 días" },
  { key: "30", label: "30 días" },
  { key: "90", label: "90 días" },
];

export default function InternalPageStats() {
  const [range, setRange] = useState("30");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["analyticsPageViews", range],
    queryFn: async () => {
      const since = new Date(Date.now() - parseInt(range) * 24 * 60 * 60 * 1000).toISOString();
      // Pull a generous batch sorted by newest, then filter client-side by date and type.
      const items = await base44.entities.AnalyticsEvent.list("-timestamp", 5000);
      return items.filter(e => e.evento_tipo === "page_view" && e.timestamp >= since);
    },
    staleTime: 60_000,
  });

  // Aggregate by page
  const byPage = {};
  const usersByPage = {};
  events.forEach(e => {
    const p = (e.pagina || "(desconocida)").replace(/^\//, "");
    byPage[p] = (byPage[p] || 0) + 1;
    if (e.usuario_email) {
      usersByPage[p] = usersByPage[p] || new Set();
      usersByPage[p].add(e.usuario_email);
    }
  });

  const ranking = Object.entries(byPage)
    .map(([pagina, visitas]) => ({
      pagina,
      visitas,
      usuarios: usersByPage[pagina]?.size || 0,
    }))
    .sort((a, b) => b.visitas - a.visitas)
    .slice(0, 25);

  const totalVisitas = events.length;
  const totalUsuarios = new Set(events.map(e => e.usuario_email).filter(Boolean)).size;
  const max = ranking[0]?.visitas || 1;

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 lg:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Secciones más visitadas (dentro de la app)</h3>
            <p className="text-xs text-slate-500">Ranking de páginas internas según el tráfico de usuarios autenticados</p>
          </div>
        </div>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <Button
              key={r.key}
              size="sm"
              variant={range === r.key ? "default" : "outline"}
              onClick={() => setRange(r.key)}
              className={range === r.key ? "bg-indigo-600 hover:bg-indigo-700" : ""}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <div className="bg-indigo-50 rounded-xl p-3">
          <div className="text-xs text-indigo-700 font-semibold">Visitas totales</div>
          <div className="text-2xl font-extrabold text-indigo-900">{totalVisitas.toLocaleString()}</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3">
          <div className="text-xs text-emerald-700 font-semibold">Usuarios únicos</div>
          <div className="text-2xl font-extrabold text-emerald-900">{totalUsuarios.toLocaleString()}</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 col-span-2 lg:col-span-1">
          <div className="text-xs text-amber-700 font-semibold">Secciones distintas</div>
          <div className="text-2xl font-extrabold text-amber-900">{ranking.length}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-500 text-sm">Cargando…</div>
      ) : ranking.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          Aún no hay datos de navegación registrados en este período.
        </div>
      ) : (
        <div className="space-y-2">
          {ranking.map((row, i) => {
            const pct = (row.visitas / max) * 100;
            return (
              <div key={row.pagina} className="group">
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-400 font-mono text-xs w-5">{i + 1}.</span>
                    <span className="font-semibold text-slate-800 truncate">{row.pagina}</span>
                    {i === 0 && <TrendingUp className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-shrink-0">
                    <span className="text-slate-500">{row.usuarios} usuarios</span>
                    <span className="font-bold text-indigo-700 w-12 text-right">{row.visitas.toLocaleString()}</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}