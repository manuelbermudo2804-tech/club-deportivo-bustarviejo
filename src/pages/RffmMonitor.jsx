import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, Trophy, List, Users, Loader2, Database } from "lucide-react";
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
  return `hace ${days} días`;
};

const getSeason = () => {
  const n = new Date();
  const y = n.getFullYear();
  return n.getMonth() >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
};

export default function RffmMonitor() {
  const [syncing, setSyncing] = React.useState(null); // null | 'all' | categoria
  const [syncResult, setSyncResult] = React.useState(null);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isAdmin = me?.role === "admin";

  // Configs RFFM
  const { data: configs = [] } = useQuery({
    queryKey: ["standings-configs-monitor"],
    queryFn: () => base44.entities.StandingsConfig.list(),
    staleTime: 60_000,
  });

  // CategoryConfig para ver compite_en_liga
  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ["category-configs-monitor"],
    queryFn: () => base44.entities.CategoryConfig.list(),
    staleTime: 60_000,
  });

  const temporada = getSeason();

  // Datos actuales por categoría
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

  // Construir resumen por categoría
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

  // Categorías sin URL configurada pero que compiten
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
      toast.success(categoria ? `${categoria} sincronizada` : "Todas las categorías sincronizadas");
    } catch (e) {
      toast.error("Error: " + (e.message || "desconocido"));
    } finally {
      setSyncing(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-slate-600">Solo administradores pueden ver esta página.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Database className="w-7 h-7 text-orange-600" />
            Monitor RFFM
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Estado de las extracciones automáticas · Temporada {temporada}
          </p>
        </div>
        <Button
          onClick={() => handleSync(null)}
          disabled={!!syncing}
          className="bg-orange-600 hover:bg-orange-700 gap-2"
        >
          {syncing === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sincronizar todo ahora
        </Button>
      </div>

      {/* Alertas */}
      {missingConfigs.length > 0 && (
        <Card className="border-2 border-yellow-400 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-800">Categorías que compiten pero SIN URLs configuradas:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {missingConfigs.map((c) => (
                    <Badge key={c} className="bg-yellow-200 text-yellow-900">{c}</Badge>
                  ))}
                </div>
                <p className="text-xs text-yellow-700 mt-2">Ve a Centro de Competición → Gestionar URLs RFFM para configurarlas.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Automatizaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">⏰ Automatizaciones activas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-sm">Sync Semanal (Lunes 8:00)</p>
                <p className="text-xs text-slate-500">Clasificación + Resultados + Goleadores de todas las categorías</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-sm">Monitor Horarios (cada 6h)</p>
                <p className="text-xs text-slate-500">Detecta cambios de fecha/hora/campo y actualiza convocatorias</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estado por categoría */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Estado por categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 text-left">
                  <th className="pb-2 pr-4">Categoría</th>
                  <th className="pb-2 px-2 text-center">Liga</th>
                  <th className="pb-2 px-2 text-center">URLs</th>
                  <th className="pb-2 px-2 text-center">
                    <Trophy className="w-4 h-4 inline" /> Clasif.
                  </th>
                  <th className="pb-2 px-2 text-center">
                    <List className="w-4 h-4 inline" /> Resultados
                  </th>
                  <th className="pb-2 px-2 text-center">
                    <Users className="w-4 h-4 inline" /> Goleadores
                  </th>
                  <th className="pb-2 px-2 text-center">Última Actualiz.</th>
                  <th className="pb-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.map((stat) => {
                  const latestUpdate = [stat.lastClasUpdate, stat.lastResUpdate, stat.lastGolUpdate]
                    .filter(Boolean)
                    .sort()
                    .pop();
                  const isStale = latestUpdate && (Date.now() - new Date(latestUpdate).getTime()) > 8 * 24 * 60 * 60 * 1000; // >8 days

                  return (
                    <tr key={stat.categoria} className={`border-b hover:bg-slate-50 ${isStale ? "bg-red-50" : ""}`}>
                      <td className="py-3 pr-4 font-medium">{stat.categoria}</td>
                      <td className="py-3 px-2 text-center">
                        {stat.compite ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 inline" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-300 inline" />
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex justify-center gap-1">
                          <span title="Clasificación" className={stat.hasClassUrl ? "text-green-600" : "text-slate-300"}>C</span>
                          <span title="Resultados" className={stat.hasResultsUrl ? "text-green-600" : "text-slate-300"}>R</span>
                          <span title="Goleadores" className={stat.hasScorersUrl ? "text-green-600" : "text-slate-300"}>G</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {stat.clasificaciones > 0 ? (
                          <span className="text-green-700 font-medium">
                            J{stat.jornadaClas} ({stat.clasificaciones})
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {stat.resultados > 0 ? (
                          <span className="text-green-700 font-medium">
                            {stat.jornadasRes.length}j ({stat.resultados})
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {stat.goleadores > 0 ? (
                          <span className="text-green-700 font-medium">{stat.goleadores}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {latestUpdate ? (
                          <span className={`text-xs ${isStale ? "text-red-600 font-bold" : "text-slate-600"}`}>
                            {isStale && "⚠️ "}
                            {timeAgo(latestUpdate)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">sin datos</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSync(stat.categoria)}
                          disabled={!!syncing}
                          className="h-7 text-xs gap-1"
                        >
                          {syncing === stat.categoria ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Sync
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {categoryStats.length === 0 && (
            <p className="text-center text-slate-500 py-8">No hay configuraciones RFFM creadas.</p>
          )}
        </CardContent>
      </Card>

      {/* Resultado último sync */}
      {syncResult && (
        <Card className="border-2 border-green-400">
          <CardHeader>
            <CardTitle className="text-lg text-green-700">✅ Resultado de la sincronización</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-50 rounded-xl p-4 text-xs overflow-x-auto whitespace-pre-wrap max-h-96">
              {typeof syncResult === "string" ? syncResult : JSON.stringify(syncResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Leyenda */}
      <div className="text-xs text-slate-400 text-center space-y-1">
        <p>C = URL Clasificación · R = URL Resultados · G = URL Goleadores</p>
        <p>Las filas en rojo indican datos con más de 8 días sin actualizar</p>
      </div>
    </div>
  );
}