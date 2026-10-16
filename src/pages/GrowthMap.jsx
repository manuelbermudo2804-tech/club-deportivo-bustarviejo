import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Users, TrendingUp, Sparkles, Loader2, Home, Megaphone } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import GrowthMapView from "../components/growth/GrowthMapView";
import LocalityRankingCard from "../components/growth/LocalityRankingCard";

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-900 leading-none">{value}</div>
          <div className="text-xs text-slate-500 mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GrowthMap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke("growthMap", {});
        setData(res.data);
      } catch (e) {
        toast.error("No se pudo cargar el mapa de crecimiento");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const runAnalysis = async () => {
    if (!data) return;
    setAnalyzing(true);
    try {
      const externos = data.localidades.filter((l) => l.esExterno);
      const resumen = data.localidades
        .map((l) => `${l.label}: ${l.count} jugadores (${l.pct}%)${l.esBase ? " [SEDE DEL CLUB]" : ` [externo, potencial ${l.potencial}]`}`)
        .join("\n");

      const prompt = `Eres un asesor de captación de un club deportivo de fútbol base (CD Bustarviejo, Sierra Norte de Madrid). La sede está en Bustarviejo.

Datos de procedencia de los ${data.total} jugadores actuales:
${resumen}

Jugadores locales (Bustarviejo): ${data.jugadoresLocales}
Jugadores que vienen de otros pueblos: ${data.jugadoresExternos} (de ${data.numLocalidadesExternas} localidades distintas)

Quiero detectar qué pueblos cercanos tienen MÁS POTENCIAL DE CRECIMIENTO para hacer una campaña de captación. La hipótesis: los pueblos que ya nos envían jugadores probablemente NO tienen club propio (o no cubren todas las categorías), por lo que son objetivos ideales para campaña.

Analiza para internet la realidad de estos pueblos de la Sierra Norte de Madrid: ¿cuáles tienen club de fútbol base propio y cuáles no? Prioriza los que NO tienen club, ya que ahí hay demanda no cubierta.

Devuelve, en español y formato markdown:
1. **Ranking de oportunidad**: lista los 3-4 pueblos externos con más potencial, indicando para cada uno si tiene o no club deportivo propio.
2. **Acción de campaña concreta** para cada uno (dónde anunciar, qué categoría priorizar, mensaje clave).
3. Una recomendación final breve.

Sé concreto y práctico. No inventes datos de jugadores.`;

      const text = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: "gemini_3_flash",
      });
      setAnalysis(text);
    } catch (e) {
      toast.error("No se pudo generar el análisis");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-slate-500">No hay datos disponibles.</div>;
  }

  const externos = data.localidades.filter((l) => l.esExterno);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-3 sm:p-5 lg:space-y-6">
      <section className="relative isolate overflow-hidden rounded-[26px] bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><MapPin className="h-6 w-6 text-orange-300" /></div>
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Inteligencia · Captación</p>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Mapa de Crecimiento</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">De dónde vienen los jugadores y qué localidades conviene estudiar para futuras campañas de captación.</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} value={data.total} label="Jugadores activos" color="bg-blue-500" />
        <StatCard icon={Home} value={data.jugadoresLocales} label="De Bustarviejo (sede)" color="bg-green-500" />
        <StatCard icon={MapPin} value={data.jugadoresExternos} label="De otros pueblos" color="bg-orange-500" />
        <StatCard icon={TrendingUp} value={data.numLocalidadesExternas} label="Localidades externas" color="bg-purple-500" />
      </div>

      <GrowthMapView localidades={data.localidades} />

      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> Sede</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Potencial alto</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Potencial medio</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-500 inline-block" /> Potencial bajo</span>
        <span className="text-slate-400">· El tamaño del círculo = nº de jugadores</span>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3">Ranking de localidades</h2>
        <div className="grid lg:grid-cols-2 gap-2">
          {data.localidades.map((loc) => (
            <LocalityRankingCard key={loc.key} loc={loc} />
          ))}
        </div>
      </div>

      <Card className="overflow-hidden rounded-2xl border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Análisis de captación con IA</h3>
                <p className="text-sm text-slate-600">
                  Detecta qué pueblos no tienen club propio y dónde lanzar campaña.
                </p>
              </div>
            </div>
            <Button onClick={runAnalysis} disabled={analyzing} className="bg-orange-600 hover:bg-orange-700">
              {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {analyzing ? "Analizando..." : "Generar análisis"}
            </Button>
          </div>

          {analysis && (
            <div className="mt-4 bg-white rounded-xl p-4 border border-orange-100 prose prose-sm max-w-none prose-headings:text-slate-800 prose-p:text-slate-600">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}