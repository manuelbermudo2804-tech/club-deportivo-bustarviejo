import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Trophy, List, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

const timeAgo = (dateStr) => {
  if (!dateStr) return "nunca";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
};

const getSeason = () => {
  const n = new Date();
  const y = n.getFullYear();
  return n.getMonth() >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
};

export default function RffmMonitorPanel() {
  const [syncing, setSyncing] = React.useState(null);
  const [syncResult, setSyncResult] = React.useState(null);
  const temporada = getSeason();

  const { data: configs = [] } = useQuery({
    queryKey: ["standings-configs-monitor"],
    queryFn: () => base44.entities.StandingsConfig.list(),
    staleTime: 60_000,
  });

  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ["category-configs-monitor"],
    queryFn: () => base44.entities.CategoryConfig.list(),
    staleTime: 60_000,
  });

  const { data: allClasificaciones = [] } = useQuery({
    queryKey: ["all-clasificaciones-monitor"],
    queryFn: () => base44.entities.Clasificacion.list("-updated_date", 500),
    staleTime: 60_000,
  });

  const { data: allResultados = [] } = useQuery({
    queryKey: ["all-resultados-monitor"],
    queryFn: () => base44.entities.Resultado.list("-updated_date", 500),
    staleTime: 60_000,
  });

  const { data: allGoleadores = [] } = useQuery({
    queryKey: ["all-goleadores-monitor"],
    queryFn: () => base44.entities.Goleador.list("-updated_date", 500),
    staleTime: 60_000,
  });

  const categoryStats = React.useMemo(() => {
    const stats = [];
    for (const cfg of configs) {
      const cat = cfg.categoria;
      const catConfig = categoryConfigs.find((c) => c.nombre === cat);
      const compite = catConfig?.compite_en_liga === true;

      const clasificaciones = allClasificaciones.filter((c) => c.categoria === cat && c.temporada === temporada);
      const resultados = allResultados.filter((r) => r.categoria === cat && r.temporada === temporada);
      const goleadores = allGoleadores.filter((g) => g.categoria === cat && g.temporada === temporada);

      const lastClasUpdate = clasificaciones.length ? Math.max(...clasificaciones.map((c) => new Date(c.updated_date).getTime())) : null;
      const lastResUpdate = resultados.length ? Math.max(...resultados.map((r) => new Date(r.updated_date).getTime())) : null;
      const lastGolUpdate = goleadores.length ? Math.max(...goleadores.map((g) => new Date(g.updated_date).getTime())) : null;

      const jornadasClas = [...new Set(clasificaciones.map((c) => c.jornada))];
      const jornadasRes = [...new Set(resultados.map((r) => r.jornada))].sort((a, b) => a - b);

      stats.push({
        categoria: cat,
        compite,
        hasClassUrl: !!cfg.rfef_url,
        hasResultsUrl: !!cfg.rfef_results_url,
        hasScorersUrl: !!cfg.rfef_scorers_url,
        clasificaciones: clasificaciones.length,
        lastClasUpdate: lastClasUpdate ? new Date(lastClasUpdate).toISOString() : null,
        jornadaClas: jornadasClas.length ? Math.max(...jornadasClas) : null,
        resultados: resultados.length,
        lastResUpdate: lastResUpdate ? new Date(lastResUpdate).toISOString() : null,
        jornadasRes,
        goleadores: goleadores.length,
        lastGolUpdate: lastGolUpdate ? new Date(lastGolUpdate).toISOString() : null,
      });
    }
    return stats.sort((a, b) => a.categoria.localeCompare(b.categoria));
  }, [configs, categoryConfigs, allClasificaciones, allResultados, allGoleadores, temporada]);

  const missingConfigs = React.useMemo(() => {
    const configuredCats = new Set(configs.map((c) => c.categoria));
    return categoryConfigs
      .filter((c) => c.compite_en_liga && c.activa && !configuredCats.has(c.nombre))
      .map((c) => c.nombre);
  }, [configs, categoryConfigs]);

  const handleSync = async (categoria) => {
    const key = categoria || "all";
    setSyncing(key);
    setSyncResult(null);
    try {
      const payload = categoria ? { categoria } : {};
      const res = await base44.functions.invoke("rffmWeeklySync", payload);
      setSyncResult(res.data);
      toast.success(categoria ? `${categoria} sincronizada` : "Todas sincronizadas");
    } catch (e) {
      toast.error("Error: " + (e.message || "desconocido"));
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sync all button */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">📡 Monitor RFFM — Temporada {temporada}</p>
        <Button
          size="sm"
          onClick={() => handleSync(null)}
          disabled={!!syncing}
          className="bg-orange-600 hover:bg-orange-700 gap-1.5 h-8 text-xs"
        >
          {syncing === "all" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Sync todo
        </Button>
      </div>

      {/* Alertas */}
      {missingConfigs.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-50 border border-yellow-300 text-sm">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-yellow-800 text-xs">Sin URLs configuradas:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {missingConfigs.map((c) => (
                <Badge key={c} className="bg-yellow-200 text-yellow-900 text-[10px]">{c}</Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabla compacta */}
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 text-left">
              <th className="pb-2 pr-3">Categoría</th>
              <th className="pb-2 px-1 text-center">Liga</th>
              <th className="pb-2 px-1 text-center">URLs</th>
              <th className="pb-2 px-1 text-center"><Trophy className="w-3 h-3 inline" /></th>
              <th className="pb-2 px-1 text-center"><List className="w-3 h-3 inline" /></th>
              <th className="pb-2 px-1 text-center"><Users className="w-3 h-3 inline" /></th>
              <th className="pb-2 px-1 text-center">Última</th>
              <th className="pb-2 px-1"></th>
            </tr>
          </thead>
          <tbody>
            {categoryStats.map((stat) => {
              const latestUpdate = [stat.lastClasUpdate, stat.lastResUpdate, stat.lastGolUpdate]
                .filter(Boolean).sort().pop();
              const isStale = latestUpdate && (Date.now() - new Date(latestUpdate).getTime()) > 8 * 24 * 60 * 60 * 1000;

              return (
                <tr key={stat.categoria} className={`border-b hover:bg-slate-50 ${isStale ? "bg-red-50" : ""}`}>
                  <td className="py-2 pr-3 font-medium truncate max-w-[120px]" title={stat.categoria}>
                    {stat.categoria.replace("Fútbol ", "").replace(" (Mixto)", "")}
                  </td>
                  <td className="py-2 px-1 text-center">
                    {stat.compite ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 inline" /> : <XCircle className="w-3.5 h-3.5 text-slate-300 inline" />}
                  </td>
                  <td className="py-2 px-1 text-center">
                    <div className="flex justify-center gap-0.5 text-[10px] font-bold">
                      <span className={stat.hasClassUrl ? "text-green-600" : "text-slate-300"}>C</span>
                      <span className={stat.hasResultsUrl ? "text-green-600" : "text-slate-300"}>R</span>
                      <span className={stat.hasScorersUrl ? "text-green-600" : "text-slate-300"}>G</span>
                    </div>
                  </td>
                  <td className="py-2 px-1 text-center">
                    {stat.clasificaciones > 0 ? (
                      <span className="text-green-700 font-medium">J{stat.jornadaClas}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-2 px-1 text-center">
                    {stat.resultados > 0 ? (
                      <span className="text-green-700 font-medium">{stat.jornadasRes.length}j</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-2 px-1 text-center">
                    {stat.goleadores > 0 ? (
                      <span className="text-green-700 font-medium">{stat.goleadores}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-2 px-1 text-center">
                    {latestUpdate ? (
                      <span className={`${isStale ? "text-red-600 font-bold" : "text-slate-500"}`}>
                        {isStale && "⚠️"}{timeAgo(latestUpdate)}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-2 px-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSync(stat.categoria)}
                      disabled={!!syncing}
                      className="h-6 w-6 p-0"
                    >
                      {syncing === stat.categoria ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {categoryStats.length === 0 && (
          <p className="text-center text-slate-400 py-4 text-xs">Sin configuraciones RFFM.</p>
        )}
      </div>

      {/* Sync result */}
      {syncResult && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-3">
          <p className="text-xs font-semibold text-green-700 mb-1">✅ Resultado sync:</p>
          <pre className="text-[10px] overflow-x-auto whitespace-pre-wrap max-h-40 text-slate-600">
            {typeof syncResult === "string" ? syncResult : JSON.stringify(syncResult, null, 2)}
          </pre>
        </div>
      )}

      <p className="text-[10px] text-slate-400 text-center">C=Clasif. · R=Result. · G=Goleadores · Rojo=+8 días sin actualizar</p>
    </div>
  );
}