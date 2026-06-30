import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, Sparkles, HeartHandshake, TrendingUp, Wallet, Eye } from "lucide-react";
import { toast } from "sonner";
import InsightCard from "../components/clubia/InsightCard";

const TEMAS = [
  { key: "retencion", label: "Retención y bajas", icon: HeartHandshake, color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100" },
  { key: "captacion", label: "Captación y crecimiento", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100" },
  { key: "finanzas", label: "Finanzas y morosidad", icon: Wallet, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100" },
];

export default function ClubIA() {
  const [insights, setInsights] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);

  const observar = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("clubIA", {});
      setInsights(res.data.insights);
      setMeta(res.data.meta);
    } catch (e) {
      toast.error("No se pudo generar el análisis de Club IA");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6 text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 opacity-10">
          <Brain className="w-40 h-40" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-7 h-7 text-indigo-300" />
            <h1 className="text-white m-0">Club IA</h1>
          </div>
          <p className="text-slate-300 text-sm max-w-lg leading-relaxed">
            No hace nada. Solo observa. Durante años. Y empieza a contarte lo que nadie había visto:
            qué patrones se repiten en las bajas, la captación y el dinero del club.
          </p>
          <Button
            onClick={observar}
            disabled={loading}
            className="mt-4 bg-white text-slate-900 hover:bg-slate-100 font-semibold"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Observando los datos...</>
            ) : (
              <><Eye className="w-4 h-4 mr-2" /> {insights ? "Volver a observar" : "Que la IA observe el club"}</>
            )}
          </Button>
        </div>
      </div>

      {/* Estado inicial */}
      {!insights && !loading && (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="p-8 text-center">
            <Sparkles className="w-10 h-10 text-indigo-300 mx-auto mb-3" />
            <p className="text-slate-500">
              Pulsa el botón y Club IA analizará todo el histórico del club para darte
              observaciones concretas y accionables.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Insights agrupados por tema */}
      {insights && (
        <div className="space-y-5">
          {meta && (
            <p className="text-xs text-slate-400 text-center">
              Observando {meta.jugadores_analizados} jugadores · {meta.pagos_analizados} pagos · {meta.referidos_analizados} referidos
            </p>
          )}
          {TEMAS.map((tema) => {
            const items = insights[tema.key] || [];
            if (!items.length) return null;
            const Icon = tema.icon;
            return (
              <div key={tema.key}>
                <div className={`flex items-center gap-2 mb-3 rounded-xl ${tema.bg} ${tema.border} border px-3 py-2`}>
                  <Icon className={`w-5 h-5 ${tema.color}`} />
                  <h2 className="text-base font-bold text-slate-800 m-0">{tema.label}</h2>
                </div>
                <div className="space-y-2">
                  {items.map((insight, i) => (
                    <InsightCard key={i} insight={insight} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}