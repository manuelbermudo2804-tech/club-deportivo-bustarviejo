import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, AlertTriangle, Loader2, Link2, ExternalLink, Wand2, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";

/**
 * Given a base intranet classification URL, derives the 3 URLs:
 * - clasificacion (the base URL itself)
 * - resultados (NFG_CmpJornada)
 * - goleadores (NFG_CMP_Goleadores)
 */
function deriveUrls(baseUrl) {
  if (!baseUrl) return { clasificacion: "", resultados: "", goleadores: "" };

  // If it's already an intranet URL, extract params
  try {
    const u = new URL(baseUrl);
    const codPrimaria = u.searchParams.get("cod_primaria") || "1000128";
    const codComp = u.searchParams.get("CodCompeticion") || u.searchParams.get("codcompeticion");
    const codGrupo = u.searchParams.get("CodGrupo") || u.searchParams.get("codgrupo");
    const codTemp = u.searchParams.get("CodTemporada") || u.searchParams.get("codtemporada");

    if (!codComp || !codGrupo || !codTemp) {
      return { clasificacion: baseUrl, resultados: "", goleadores: "" };
    }

    const clasificacion = `https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion?cod_primaria=${codPrimaria}&codcompeticion=${codComp}&codgrupo=${codGrupo}&codtemporada=${codTemp}`;
    const resultados = `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CmpJornada?cod_primaria=${codPrimaria}&CodCompeticion=${codComp}&CodGrupo=${codGrupo}&CodTemporada=${codTemp}&CodJornada=1&cod_agrupacion=1&Sch_Tipo_Juego=`;
    const goleadores = `https://intranet.ffmadrid.es/nfg/NPcd/NFG_CMP_Goleadores?cod_primaria=${codPrimaria}&CodJornada=0&codcompeticion=${codComp}&codtemporada=${codTemp}&codgrupo=${codGrupo}&cod_agrupacion=1`;

    return { clasificacion, resultados, goleadores };
  } catch {
    return { clasificacion: baseUrl, resultados: "", goleadores: "" };
  }
}

function CategoryUrlRow({ cat, config, onSaved }) {
  const [baseUrl, setBaseUrl] = useState("");
  const [urls, setUrls] = useState({ clasificacion: "", resultados: "", goleadores: "" });
  const [testing, setTesting] = useState(null); // null | 'clasificacion' | 'resultados' | 'goleadores'
  const [testResults, setTestResults] = useState({});
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Initialize from config
  useEffect(() => {
    if (config) {
      setUrls({
        clasificacion: config.rfef_url || "",
        resultados: config.rfef_results_url || "",
        goleadores: config.rfef_scorers_url || "",
      });
    } else {
      setUrls({ clasificacion: "", resultados: "", goleadores: "" });
    }
  }, [config]);

  const hasUrls = urls.clasificacion || urls.resultados || urls.goleadores;

  const handleDerive = () => {
    if (!baseUrl.trim()) {
      toast.error("Pega primero una URL de la intranet");
      return;
    }
    const derived = deriveUrls(baseUrl.trim());
    setUrls(derived);
    toast.success("URLs generadas automáticamente");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        categoria: cat,
        rfef_url: urls.clasificacion,
        rfef_results_url: urls.resultados,
        rfef_scorers_url: urls.goleadores,
      };

      if (config?.id) {
        await base44.entities.StandingsConfig.update(config.id, data);
      } else {
        await base44.entities.StandingsConfig.create(data);
      }
      toast.success(`URLs guardadas para ${cat}`);
      onSaved?.();
    } catch (e) {
      toast.error("Error al guardar: " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (type) => {
    const url = type === "clasificacion" ? urls.clasificacion : type === "resultados" ? urls.resultados : urls.goleadores;
    if (!url) { toast.error("No hay URL para probar"); return; }

    setTesting(type);
    try {
      const action = type === "clasificacion" ? "standings" : type === "resultados" ? "all_results" : "scorers";
      const res = await base44.functions.invoke("rffmScraper", { action, url });

      if (type === "clasificacion") {
        const count = res.data?.standings?.length || 0;
        setTestResults(prev => ({ ...prev, [type]: count > 0 ? `✅ ${count} equipos` : "❌ Sin datos" }));
      } else if (type === "resultados") {
        const played = res.data?.summary?.played || 0;
        setTestResults(prev => ({ ...prev, [type]: played > 0 ? `✅ ${played} partidos jugados` : "❌ Sin datos" }));
      } else {
        const count = res.data?.scorers?.length || 0;
        setTestResults(prev => ({ ...prev, [type]: count > 0 ? `✅ ${count} goleadores` : "❌ Sin datos" }));
      }
    } catch (e) {
      setTestResults(prev => ({ ...prev, [type]: `❌ Error: ${e.message?.substring(0, 50)}` }));
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Header row - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">{cat}</span>
          {hasUrls ? (
            <Badge className="bg-green-100 text-green-700 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Configurada
            </Badge>
          ) : (
            <Badge className="bg-yellow-100 text-yellow-700 text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" /> Sin URLs
            </Badge>
          )}
        </div>
        <span className="text-slate-400 text-lg">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t bg-slate-50/50">
          {/* Quick paste: base URL */}
          <div className="pt-3">
            <label className="text-xs font-bold text-blue-700 block mb-1">
              🔗 Pega aquí cualquier URL de la intranet RFFM para esta categoría:
            </label>
            <div className="flex gap-2">
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion?cod_primaria=..."
                className="flex-1 text-xs h-9"
              />
              <Button size="sm" onClick={handleDerive} className="bg-blue-600 hover:bg-blue-700 gap-1 whitespace-nowrap">
                <Wand2 className="w-3.5 h-3.5" /> Generar URLs
              </Button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Pega cualquier URL de la intranet (clasificación, jornadas o goleadores) y se generarán automáticamente las 3 URLs.
            </p>
          </div>

          {/* 3 URL fields */}
          {[
            { key: "clasificacion", label: "📊 Clasificación", field: "rfef_url" },
            { key: "resultados", label: "📋 Resultados/Jornadas", field: "rfef_results_url" },
            { key: "goleadores", label: "⚽ Goleadores", field: "rfef_scorers_url" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-slate-600 block mb-1">{label}</label>
              <div className="flex gap-1.5">
                <Input
                  value={urls[key]}
                  onChange={(e) => setUrls(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={`URL de ${label.split(" ").slice(1).join(" ")}`}
                  className="flex-1 text-xs h-8"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-xs"
                  disabled={!urls[key]}
                  onClick={() => window.open(urls[key], "_blank")}
                  title="Abrir en navegador"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-xs"
                  disabled={!urls[key] || testing === key}
                  onClick={() => handleTest(key)}
                  title="Probar URL"
                >
                  {testing === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Probar"}
                </Button>
              </div>
              {testResults[key] && (
                <p className={`text-xs mt-0.5 ${testResults[key].startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
                  {testResults[key]}
                </p>
              )}
            </div>
          ))}

          {/* Save button */}
          <div className="flex justify-end pt-1">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-orange-600 hover:bg-orange-700 gap-1.5"
              size="sm"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Guardar URLs
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RffmUrlManager({ open, onOpenChange }) {
  const queryClient = useQueryClient();

  // Get categories that compete in leagues
  const { data: categories = [] } = useQuery({
    queryKey: ["competition-categories-for-urls"],
    queryFn: async () => {
      const all = await base44.entities.CategoryConfig.filter({ compite_en_liga: true, activa: true });
      return all.map(c => c.nombre).filter(Boolean).sort();
    },
    staleTime: 10 * 60_000,
  });

  // Get all StandingsConfig records
  const { data: configs = [], refetch: refetchConfigs } = useQuery({
    queryKey: ["all-standings-configs"],
    queryFn: () => base44.entities.StandingsConfig.list("-updated_date", 100),
    staleTime: 60_000,
    enabled: open,
  });

  const configMap = React.useMemo(() => {
    const map = {};
    for (const c of configs) {
      if (c.categoria) map[c.categoria] = c;
    }
    return map;
  }, [configs]);

  const configuredCount = categories.filter(c => configMap[c]?.rfef_url).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-orange-600" />
            Gestión de URLs RFFM
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-sm text-blue-900 font-medium">📌 Instrucciones</p>
            <p className="text-xs text-blue-700 mt-1">
              Al inicio de cada temporada, abre la intranet de la RFFM, navega a la competición de cada categoría, 
              y pega la URL aquí. El sistema generará automáticamente las URLs de clasificación, resultados y goleadores.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {configuredCount}/{categories.length} categorías configuradas
            </Badge>
          </div>

          <div className="space-y-2">
            {categories.map(cat => (
              <CategoryUrlRow
                key={cat}
                cat={cat}
                config={configMap[cat]}
                onSaved={() => {
                  refetchConfigs();
                  queryClient.invalidateQueries({ queryKey: ["standings-config"] });
                }}
              />
            ))}

            {categories.length === 0 && (
              <p className="text-center text-slate-500 py-6 text-sm">
                No hay categorías con "Compite en Liga" activado. Actívalo en Temporadas y Categorías.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}