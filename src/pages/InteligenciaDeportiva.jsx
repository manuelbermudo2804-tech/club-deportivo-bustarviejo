import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BrainCircuit, CheckCircle2, RefreshCw, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";

const SKILLS = [
  ["tecnica", "Técnica"], ["tactica", "Táctica"], ["fisica", "Física"],
  ["actitud", "Actitud"], ["trabajo_equipo", "Trabajo en equipo"],
];
const DAY = 86400000;
const dateKey = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? String(date).slice(0, 10) : d.toISOString().slice(0, 10);
};
const avg = (items, key) => {
  const vals = items.map((item) => Number(item[key])).filter(Number.isFinite);
  return vals.length ? vals.reduce((sum, val) => sum + val, 0) / vals.length : null;
};

function analyzePlayer(player, attendances, evaluations, today) {
  const playerCategories = [...new Set([player.categoria_principal, player.deporte, ...(player.categorias || [])].filter(Boolean))];
  const records = attendances
    .filter((session) => playerCategories.includes(session.categoria) && dateKey(session.fecha) <= today)
    .map((session) => ({ session, record: session.asistencias?.find((entry) => entry.jugador_id === player.id) }))
    .filter((item) => item.record && ["presente", "ausente", "justificado", "tardanza"].includes(item.record.estado));

  const cutoff = dateKey(new Date(new Date(`${today}T12:00:00`).getTime() - 42 * DAY));
  const previousCutoff = dateKey(new Date(new Date(`${today}T12:00:00`).getTime() - 84 * DAY));
  const recent = records.filter(({ session }) => dateKey(session.fecha) >= cutoff);
  const previous = records.filter(({ session }) => dateKey(session.fecha) >= previousCutoff && dateKey(session.fecha) < cutoff);
  const attendanceRate = (items) => items.length ? items.filter(({ record }) => ["presente", "tardanza"].includes(record.estado)).length / items.length * 100 : null;
  const recentRate = attendanceRate(recent);
  const previousRate = attendanceRate(previous);
  const evals = evaluations.filter((evaluation) => evaluation.jugador_id === player.id && evaluation.fecha_evaluacion)
    .sort((a, b) => dateKey(a.fecha_evaluacion).localeCompare(dateKey(b.fecha_evaluacion)));
  const latest = evals[evals.length - 1] || null;
  const prior = evals.length >= 2 ? evals[evals.length - 2] : null;
  const latestAverage = latest ? avg([latest], "tecnica") === null ? null : SKILLS.reduce((sum, [key]) => sum + (Number(latest[key]) || 0), 0) / SKILLS.length : null;
  const priorAverage = prior ? SKILLS.reduce((sum, [key]) => sum + (Number(prior[key]) || 0), 0) / SKILLS.length : null;
  const evalDelta = latestAverage !== null && priorAverage !== null ? latestAverage - priorAverage : null;
  const lastEvalAge = latest ? Math.floor((new Date(`${today}T12:00:00`) - new Date(`${dateKey(latest.fecha_evaluacion)}T12:00:00`)) / DAY) : null;
  const weakestSkill = latest ? SKILLS.map(([key, label]) => ({ key, label, value: Number(latest[key]) })).filter((item) => Number.isFinite(item.value)).sort((a, b) => a.value - b.value)[0] : null;

  const insights = [];
  if (recent.length >= 4 && recentRate !== null && recentRate < 65) {
    insights.push({ priority: "high", title: "Asistencia baja", detail: `Ha asistido al ${Math.round(recentRate)}% de ${recent.length} sesiones registradas en las últimas 6 semanas.`, action: "Hablar con el jugador o la familia para conocer el motivo antes de sacar conclusiones." });
  }
  if (recent.length >= 4 && previous.length >= 3 && recentRate !== null && previousRate !== null && previousRate - recentRate >= 20) {
    insights.push({ priority: "high", title: "Caída reciente de asistencia", detail: `${Math.round(previousRate)}% en el periodo anterior frente a ${Math.round(recentRate)}% en las últimas 6 semanas.`, action: "Revisar si hay barreras de horario, motivación, transporte o disponibilidad." });
  }
  if (evalDelta !== null && evalDelta <= -0.6) {
    insights.push({ priority: "high", title: "Evaluación a la baja", detail: `La media de las cinco áreas bajó ${Math.abs(evalDelta).toFixed(1)} puntos entre las dos últimas evaluaciones.`, action: `Contrastar la observación con el entrenador y acordar un objetivo concreto${weakestSkill ? ` en ${weakestSkill.label.toLowerCase()}` : ""}.` });
  } else if (evalDelta !== null && evalDelta >= 0.6) {
    insights.push({ priority: "positive", title: "Mejora apreciable", detail: `La media de las áreas evaluadas subió ${evalDelta.toFixed(1)} puntos entre las dos últimas evaluaciones.`, action: "Reconocer el progreso y mantener las tareas que parecen estar funcionando." });
  }
  if (recent.length >= 4 && recentRate >= 80 && evalDelta !== null && evalDelta <= -0.4) {
    insights.push({ priority: "medium", title: "Asiste, pero necesita apoyo deportivo", detail: `Asistencia reciente del ${Math.round(recentRate)}% y descenso en la última evaluación.`, action: "No aumentar la carga automáticamente: hablar con el jugador y revisar técnica, confianza y comprensión de tareas." });
  }
  if (latest && lastEvalAge > 60) {
    insights.push({ priority: "medium", title: "Evaluación desactualizada", detail: `La última evaluación tiene ${lastEvalAge} días.`, action: "Realizar una nueva evaluación antes de tomar decisiones sobre su evolución." });
  }
  if (insights.length === 0 && evals.length >= 2 && recent.length >= 3) {
    insights.push({ priority: "stable", title: "Sin señales destacadas", detail: "Con los datos disponibles no aparecen cambios fuertes en asistencia o evaluación.", action: "Mantener el seguimiento habitual; esto no sustituye la observación del entrenador." });
  }
  return {
    player, category: playerCategories[0] || "Sin categoría", attendanceCount: recent.length,
    recentRate, previousRate, evalCount: evals.length, latest, latestAverage, evalDelta, lastEvalAge,
    insights,
  };
}

const PRIORITY = {
  high: { label: "Revisar pronto", className: "border-red-200 bg-red-50 text-red-800", icon: ShieldAlert },
  medium: { label: "Seguimiento", className: "border-amber-200 bg-amber-50 text-amber-800", icon: AlertTriangle },
  positive: { label: "Evolución positiva", className: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: ArrowUpRight },
  stable: { label: "Estable", className: "border-slate-200 bg-slate-50 text-slate-700", icon: CheckCircle2 },
};

export default function InteligenciaDeportiva() {
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("actionable");
  const [user, setUser] = useState(null);
  React.useEffect(() => { base44.auth.me().then(setUser).catch(() => setUser({})); }, []);

  const authorized = !!user && (user.role === "admin" || user.es_entrenador || user.es_coordinador || user.es_coordinador_deportivo);
  const playersQuery = useQuery({ queryKey: ["sports-intelligence-players"], queryFn: () => base44.entities.Player.filter({ activo: true }), enabled: authorized, staleTime: 60000 });
  const attendanceQuery = useQuery({ queryKey: ["sports-intelligence-attendance"], queryFn: () => base44.entities.Attendance.list("-fecha", 1000), enabled: authorized, staleTime: 60000 });
  const evaluationQuery = useQuery({ queryKey: ["sports-intelligence-evaluations"], queryFn: () => base44.entities.PlayerEvaluation.list("-fecha_evaluacion", 1000), enabled: authorized, staleTime: 60000 });
  const loading = !user || (authorized && (playersQuery.isLoading || attendanceQuery.isLoading || evaluationQuery.isLoading));
  const error = playersQuery.error || attendanceQuery.error || evaluationQuery.error;
  const refresh = async () => {
    try {
      await Promise.all([playersQuery.refetch(), attendanceQuery.refetch(), evaluationQuery.refetch()]);
      toast.success("Datos deportivos actualizados");
    } catch { toast.error("No se pudieron actualizar todos los datos"); }
  };

  const analyses = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (playersQuery.data || []).map((player) => analyzePlayer(player, attendanceQuery.data || [], evaluationQuery.data || [], today));
  }, [playersQuery.data, attendanceQuery.data, evaluationQuery.data]);
  const categories = [...new Set(analyses.map((item) => item.category).filter((item) => item !== "Sin categoría"))].sort();
  const visible = analyses.filter((item) => category === "all" || [item.category, item.player.deporte, item.player.categoria_principal, ...(item.player.categorias || [])].includes(category))
    .map((item) => ({ ...item, visibleInsights: item.insights.filter((insight) => priority === "all" || (priority === "actionable" ? ["high", "medium"].includes(insight.priority) : insight.priority === priority)) }))
    .filter((item) => priority === "all" || item.visibleInsights.length > 0)
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, positive: 2, stable: 3 };
      const ap = Math.min(...a.visibleInsights.map((i) => rank[i.priority] ?? 4), 4);
      const bp = Math.min(...b.visibleInsights.map((i) => rank[i.priority] ?? 4), 4);
      return ap - bp || (a.player.nombre || "").localeCompare(b.player.nombre || "", "es");
    });
  const highCount = analyses.filter((item) => item.insights.some((insight) => insight.priority === "high")).length;
  const followupCount = analyses.filter((item) => item.insights.some((insight) => insight.priority === "medium")).length;
  const positiveCount = analyses.filter((item) => item.insights.some((insight) => insight.priority === "positive")).length;
  const withData = analyses.filter((item) => item.attendanceCount > 0 || item.evalCount > 0).length;

  if (user && !authorized) return <div className="p-8"><Card><CardContent className="p-8 text-center">Esta herramienta está disponible para entrenadores, coordinación y administración.</CardContent></Card></div>;
  if (loading) return <div className="mx-auto max-w-6xl p-6 text-center text-slate-500">Analizando asistencia y evaluaciones…</div>;
  if (error) return <div className="mx-auto max-w-6xl p-6"><Card><CardContent className="p-6"><p className="font-semibold text-red-700">No se han podido cargar todos los datos deportivos.</p><Button onClick={refresh} className="mt-3"><RefreshCw className="mr-2 h-4 w-4" />Reintentar</Button></CardContent></Card></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-10 sm:p-6 lg:p-8">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-400/15"><BrainCircuit className="h-7 w-7 text-indigo-200" /></div><div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-200">CD Bustarviejo · Área deportiva</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Inteligencia deportiva</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">Cruza tendencias de asistencia y evaluaciones para detectar dónde conviene intervenir, reconocer mejoras y decidir el siguiente paso. No es otro panel de medias: muestra señales con evidencia y una acción sugerida.</p></div></div>
          <Button variant="outline" onClick={refresh} className="shrink-0 border-white/30 bg-white/10 text-white hover:bg-white/20"><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-4"><Users className="h-5 w-5 text-indigo-600" /><div><p className="text-2xl font-black">{analyses.length}</p><p className="text-xs text-slate-500">Jugadores activos</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><ShieldAlert className="h-5 w-5 text-red-600" /><div><p className="text-2xl font-black">{highCount}</p><p className="text-xs text-slate-500">Señales prioritarias</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><Activity className="h-5 w-5 text-amber-600" /><div><p className="text-2xl font-black">{followupCount}</p><p className="text-xs text-slate-500">Para seguimiento</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><ArrowUpRight className="h-5 w-5 text-emerald-600" /><div><p className="text-2xl font-black">{positiveCount}</p><p className="text-xs text-slate-500">Mejoras apreciables</p></div></CardContent></Card>
      </div>

      <Card><CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5"><div><label className="mb-2 block text-sm font-semibold text-slate-700">Equipo / categoría</label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue placeholder="Todas las categorías" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las categorías</SelectItem>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div><label className="mb-2 block text-sm font-semibold text-slate-700">Qué quieres revisar</label><Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="actionable">Prioridades y seguimiento</SelectItem><SelectItem value="high">Solo prioritarias</SelectItem><SelectItem value="medium">Seguimiento</SelectItem><SelectItem value="positive">Mejoras</SelectItem><SelectItem value="stable">Sin señales destacadas</SelectItem><SelectItem value="all">Todas las señales</SelectItem></SelectContent></Select></div></CardContent></Card>

      {visible.length === 0 ? <Card><CardContent className="p-10 text-center"><CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" /><h2 className="font-bold text-slate-800">No hay señales para estos filtros</h2><p className="mt-1 text-sm text-slate-500">Puede ser buena señal o que aún falten registros suficientes. No se inventan conclusiones cuando no hay datos.</p><p className="mt-2 text-xs text-slate-400">Con algún dato de asistencia o evaluación: {withData} de {analyses.length} jugadores.</p></CardContent></Card> : <div className="space-y-4">{visible.map((item) => <Card key={item.player.id} className="overflow-hidden"><CardContent className="p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-bold text-slate-900">{item.player.nombre}</h2><p className="text-sm text-slate-500">{item.category} · {item.attendanceCount} sesiones recientes · {item.evalCount} evaluaciones</p></div><div className="flex flex-wrap gap-2">{item.recentRate !== null && <Badge variant="outline">Asistencia 6 sem.: {Math.round(item.recentRate)}%</Badge>}{item.evalDelta !== null && <Badge variant="outline" className={item.evalDelta < -0.2 ? "border-red-200 text-red-700" : item.evalDelta > 0.2 ? "border-emerald-200 text-emerald-700" : ""}>Cambio evaluación: {item.evalDelta > 0 ? "+" : ""}{item.evalDelta.toFixed(1)}</Badge>}</div></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{item.visibleInsights.map((insight, index) => { const style = PRIORITY[insight.priority] || PRIORITY.stable; const Icon = style.icon; return <div key={`${insight.title}-${index}`} className={`rounded-xl border p-4 ${style.className}`}><div className="flex items-start gap-2"><Icon className="mt-0.5 h-4 w-4 shrink-0" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{insight.title}</h3><span className="text-[10px] font-semibold uppercase tracking-wide">{style.label}</span></div><p className="mt-1 text-sm">{insight.detail}</p><p className="mt-2 text-sm font-medium">Siguiente paso: {insight.action}</p></div></div></div>; })}</div></CardContent></Card>)}</div>}
      <p className="text-xs leading-relaxed text-slate-500">Criterios orientativos, no diagnósticos: asistencia baja requiere al menos 4 registros en 6 semanas; caída, al menos 3 registros en el periodo anterior; evolución, al menos 2 evaluaciones. Las ausencias justificadas cuentan como sesión registrada pero no como asistencia. Las señales deben contrastarse con el entrenador y el contexto personal del jugador.</p>
    </div>
  );
}
