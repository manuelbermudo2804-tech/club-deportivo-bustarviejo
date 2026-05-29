import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Activity, Users, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LiveActivityWidget() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await base44.entities.AnalyticsEvent.filter(
        { evento_tipo: "page_view" },
        "-timestamp",
        2000
      );
      setEvents(data || []);
      setLastUpdate(new Date());
    } catch (e) {
      console.error("LiveActivity load error:", e);
      setError(e?.message || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const ms5 = 5 * 60 * 1000;
    const ms60 = 60 * 60 * 1000;
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const startYesterday = new Date(startToday); startYesterday.setDate(startYesterday.getDate() - 1);

    const activeUsers = new Set();
    const last1h = [];
    let today = 0;
    let yesterday = 0;

    for (const e of events) {
      const t = new Date(e.timestamp).getTime();
      if (now - t <= ms5 && e.usuario_email) activeUsers.add(e.usuario_email);
      if (now - t <= ms60) last1h.push(e);
      if (t >= startToday.getTime()) today++;
      else if (t >= startYesterday.getTime() && t < startToday.getTime()) yesterday++;
    }

    const pageCount = {};
    for (const e of last1h) {
      const p = e.pagina || "—";
      pageCount[p] = (pageCount[p] || 0) + 1;
    }
    const topPages = Object.entries(pageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { activeNow: activeUsers.size, last1hCount: last1h.length, today, yesterday, topPages };
  }, [events]);

  const diff = stats.today - stats.yesterday;
  const diffPct = stats.yesterday > 0 ? Math.round((diff / stats.yesterday) * 100) : null;

  return (
    <Card className="p-5 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Activity className="w-5 h-5 text-emerald-600" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <h3 className="font-bold text-slate-900">En vivo</h3>
          {lastUpdate && (
            <span className="text-xs text-slate-500">
              · actualizado {lastUpdate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
            <Users className="w-3.5 h-3.5" /> Activos ahora
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">{stats.activeNow}</div>
          <div className="text-[10px] text-slate-400">últimos 5 min</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
            <Activity className="w-3.5 h-3.5" /> Visitas última hora
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.last1hCount}</div>
          <div className="text-[10px] text-slate-400">page views</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="text-slate-500 text-xs mb-1">Hoy</div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.today}</div>
          <div className="text-[10px] text-slate-400">desde 00:00</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="text-slate-500 text-xs mb-1">vs Ayer</div>
          <div className={`text-2xl font-extrabold flex items-center gap-1 ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {diff >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            {diff >= 0 ? "+" : ""}{diff}
          </div>
          <div className="text-[10px] text-slate-400">
            {diffPct !== null ? `${diffPct >= 0 ? "+" : ""}${diffPct}%` : `ayer: ${stats.yesterday}`}
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">🔥 Top 5 páginas — última hora</div>
        {stats.topPages.length === 0 ? (
          <div className="text-sm text-slate-400 italic py-3 text-center">Sin actividad en la última hora</div>
        ) : (
          <div className="space-y-1.5">
            {stats.topPages.map(([page, count], i) => {
              const max = stats.topPages[0][1];
              const pct = Math.round((count / max) * 100);
              return (
                <div key={page} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-5">#{i + 1}</span>
                  <div className="flex-1 bg-slate-100 rounded-md overflow-hidden h-6 relative">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-semibold text-slate-900">
                      <span className="truncate">{page}</span>
                      <span className="ml-2">{count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          ⚠️ {error}
        </div>
      )}
      {!error && !loading && events.length === 0 && (
        <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
          No hay eventos <code>page_view</code> registrados todavía. El widget se llenará cuando los usuarios naveguen por la app.
        </div>
      )}
      <div className="mt-3 text-[10px] text-slate-400 text-center">
        {events.length > 0 && `${events.length} eventos cargados · `}Auto-refresca cada 30 segundos
      </div>
    </Card>
  );
}