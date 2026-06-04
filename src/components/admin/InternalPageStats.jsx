import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart3, TrendingUp, TrendingDown, Smartphone, Monitor, Ghost, AlertTriangle, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

const RANGES = [
  { key: "7", label: "7 días" },
  { key: "30", label: "30 días" },
  { key: "90", label: "90 días" },
];

const ROLE_FILTERS = [
  { key: "no_admin", label: "Sin admins" },
  { key: "all", label: "Todos" },
  { key: "familia", label: "Familias" },
  { key: "entrenador", label: "Entrenadores" },
  { key: "coordinador", label: "Coordinadores" },
  { key: "jugador", label: "Jugadores" },
];

// Normaliza el rol del usuario en uno de los grupos de ROLE_FILTERS
function resolveRoleGroup(rol) {
  if (!rol) return "otro";
  const r = String(rol).toLowerCase();
  if (r === "admin") return "admin";
  if (r.includes("entrenador") || r === "coach") return "entrenador";
  if (r.includes("coordinador")) return "coordinador";
  if (r.includes("jugador") || r === "player" || r.includes("menor")) return "jugador";
  if (r.includes("familia") || r === "parent" || r === "user") return "familia";
  return "otro";
}

export default function InternalPageStats() {
  const [range, setRange] = useState("30");
  const [roleFilter, setRoleFilter] = useState("no_admin");

  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ["analyticsPageViews", range],
    queryFn: async () => {
      const days = parseInt(range);
      // Traemos el doble del rango para poder calcular periodo anterior
      const sinceDouble = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000).toISOString();
      const items = await base44.entities.AnalyticsEvent.list("-timestamp", 10000);
      return items.filter(e => e.evento_tipo === "page_view" && e.timestamp >= sinceDouble);
    },
    staleTime: 60_000,
  });

  // Aplicar filtros y separar en período actual / anterior
  const { current, previous } = useMemo(() => {
    const days = parseInt(range);
    const now = Date.now();
    const startCurrent = now - days * 24 * 60 * 60 * 1000;
    const startPrevious = now - days * 2 * 24 * 60 * 60 * 1000;

    const matchesRole = (e) => {
      const group = resolveRoleGroup(e.usuario_rol);
      if (roleFilter === "all") return true;
      if (roleFilter === "no_admin") return group !== "admin";
      return group === roleFilter;
    };

    const current = [];
    const previous = [];
    allEvents.forEach(e => {
      if (!matchesRole(e)) return;
      const t = new Date(e.timestamp).getTime();
      if (t >= startCurrent) current.push(e);
      else if (t >= startPrevious) previous.push(e);
    });
    return { current, previous };
  }, [allEvents, range, roleFilter]);

  // Agregar por página (período actual)
  const stats = useMemo(() => {
    const byPage = {};
    const usersByPage = {};
    const mobileByPage = {};
    const desktopByPage = {};

    current.forEach(e => {
      const p = (e.pagina || "(desconocida)").replace(/^\//, "");
      byPage[p] = (byPage[p] || 0) + 1;
      if (e.usuario_email) {
        usersByPage[p] = usersByPage[p] || new Set();
        usersByPage[p].add(e.usuario_email);
      }
      if (e.dispositivo === "mobile") mobileByPage[p] = (mobileByPage[p] || 0) + 1;
      else if (e.dispositivo === "desktop") desktopByPage[p] = (desktopByPage[p] || 0) + 1;
    });

    // Agregar por página (período anterior) — solo para comparativa
    const byPagePrev = {};
    previous.forEach(e => {
      const p = (e.pagina || "(desconocida)").replace(/^\//, "");
      byPagePrev[p] = (byPagePrev[p] || 0) + 1;
    });

    const ranking = Object.entries(byPage)
      .map(([pagina, visitas]) => {
        const usuarios = usersByPage[pagina]?.size || 0;
        const mobile = mobileByPage[pagina] || 0;
        const desktop = desktopByPage[pagina] || 0;
        const prev = byPagePrev[pagina] || 0;
        const delta = prev === 0 ? (visitas > 0 ? 100 : 0) : Math.round(((visitas - prev) / prev) * 100);
        const ratio = usuarios > 0 ? visitas / usuarios : 0;
        return { pagina, visitas, usuarios, mobile, desktop, prev, delta, ratio };
      })
      .sort((a, b) => b.visitas - a.visitas);

    const totalVisitas = current.length;
    const totalUsuarios = new Set(current.map(e => e.usuario_email).filter(Boolean)).size;

    // Páginas candidatas a eliminar:
    // - Zombi: ≤ 3 visitas Y ≤ 1 usuario único en el período
    // - Power-user only: ≥ 20 visitas pero ≤ 2 usuarios únicos (uso muy concentrado)
    const zombi = ranking.filter(r => r.visitas <= 3 && r.usuarios <= 1);
    const powerUserOnly = ranking.filter(r => r.visitas >= 20 && r.usuarios <= 2);

    return { ranking, totalVisitas, totalUsuarios, zombi, powerUserOnly };
  }, [current, previous]);

  const top25 = stats.ranking.slice(0, 25);
  const max = top25[0]?.visitas || 1;

  return (
    <div className="space-y-4">
      {/* Panel principal */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Secciones más visitadas (dentro de la app)</h3>
              <p className="text-xs text-slate-500">Filtra por rol para entender qué usa cada tipo de usuario</p>
            </div>
          </div>
          <div className="flex gap-1 flex-wrap">
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

        {/* Filtros de rol */}
        <div className="flex gap-1 flex-wrap mb-4">
          {ROLE_FILTERS.map(r => (
            <Button
              key={r.key}
              size="sm"
              variant={roleFilter === r.key ? "default" : "outline"}
              onClick={() => setRoleFilter(r.key)}
              className={`text-xs ${roleFilter === r.key ? "bg-slate-900 hover:bg-slate-800" : ""}`}
            >
              {r.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          <div className="bg-indigo-50 rounded-xl p-3">
            <div className="text-xs text-indigo-700 font-semibold">Visitas totales</div>
            <div className="text-2xl font-extrabold text-indigo-900">{stats.totalVisitas.toLocaleString()}</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3">
            <div className="text-xs text-emerald-700 font-semibold">Usuarios únicos</div>
            <div className="text-2xl font-extrabold text-emerald-900">{stats.totalUsuarios.toLocaleString()}</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 col-span-2 lg:col-span-1">
            <div className="text-xs text-amber-700 font-semibold">Secciones distintas</div>
            <div className="text-2xl font-extrabold text-amber-900">{stats.ranking.length}</div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-slate-500 text-sm">Cargando…</div>
        ) : top25.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No hay datos para este filtro en este período.
          </div>
        ) : (
          <div className="space-y-2">
            {top25.map((row, i) => {
              const pct = (row.visitas / max) * 100;
              const totalDevice = row.mobile + row.desktop;
              const mobilePct = totalDevice > 0 ? Math.round((row.mobile / totalDevice) * 100) : 0;
              return (
                <div key={row.pagina} className="group">
                  <div className="flex items-center justify-between text-sm mb-1 gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-slate-400 font-mono text-xs w-5">{i + 1}.</span>
                      <span className="font-semibold text-slate-800 truncate">{row.pagina}</span>
                      {i === 0 && <TrendingUp className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-shrink-0">
                      <DeltaBadge delta={row.delta} />
                      {totalDevice > 0 && (
                        <span className="text-slate-500 hidden sm:flex items-center gap-1" title="% móvil vs desktop">
                          {mobilePct >= 50 ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                          {mobilePct}%
                        </span>
                      )}
                      <span className="text-slate-500">{row.usuarios} usr</span>
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

      {/* Panel: páginas candidatas a eliminar */}
      {!isLoading && (stats.zombi.length > 0 || stats.powerUserOnly.length > 0) && (
        <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Páginas candidatas a revisar</h3>
              <p className="text-xs text-slate-500">Secciones con uso muy bajo o muy concentrado en pocos usuarios</p>
            </div>
          </div>

          {stats.zombi.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Ghost className="w-4 h-4 text-slate-500" />
                <h4 className="font-semibold text-sm text-slate-800">Páginas zombi ({stats.zombi.length})</h4>
                <span className="text-xs text-slate-500">— ≤ 3 visitas y ≤ 1 usuario único. Candidatas a eliminar.</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {stats.zombi.slice(0, 30).map(z => (
                  <span key={z.pagina} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-mono">
                    {z.pagina} <span className="text-slate-400">({z.visitas}v · {z.usuarios}u)</span>
                  </span>
                ))}
                {stats.zombi.length > 30 && (
                  <span className="text-xs text-slate-500 px-2 py-1">+{stats.zombi.length - 30} más…</span>
                )}
              </div>
            </div>
          )}

          {stats.powerUserOnly.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h4 className="font-semibold text-sm text-slate-800">Uso concentrado ({stats.powerUserOnly.length})</h4>
                <span className="text-xs text-slate-500">— muchas visitas pero solo 1-2 usuarios. ¿Merece estar en el menú principal?</span>
              </div>
              <div className="space-y-1">
                {stats.powerUserOnly.map(p => (
                  <div key={p.pagina} className="flex items-center justify-between text-sm bg-amber-50 rounded-lg px-3 py-1.5">
                    <span className="font-semibold text-slate-800 truncate">{p.pagina}</span>
                    <span className="text-xs text-amber-800 font-bold">
                      {p.visitas} visitas · solo {p.usuarios} usuario{p.usuarios !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DeltaBadge({ delta }) {
  if (delta === 0) {
    return (
      <span className="text-slate-400 flex items-center gap-0.5" title="Sin cambio vs período anterior">
        <Minus className="w-3 h-3" />
      </span>
    );
  }
  const positive = delta > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const color = positive ? "text-emerald-600" : "text-rose-600";
  const label = `${positive ? "+" : ""}${delta}%`;
  return (
    <span className={`${color} flex items-center gap-0.5 font-semibold`} title="Cambio vs período anterior">
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}