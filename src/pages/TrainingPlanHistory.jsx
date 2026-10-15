import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Clock, Users, BookOpen, CheckCircle2, Trash2, Dumbbell } from "lucide-react";
import { toast } from "sonner";

export default function TrainingPlanHistory() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingNotes, setEditingNotes] = useState({});
  const queryClient = useQueryClient();
  const { data: plans = [], isLoading, isError } = useQuery({
    queryKey: ["training-plans-history"],
    queryFn: () => base44.entities.TrainingPlan.list("-created_date"),
  });
  const updatePlan = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingPlan.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["training-plans-history"] }); toast.success("Historial actualizado"); },
    onError: () => toast.error("No se ha podido actualizar el entrenamiento"),
  });
  const deletePlan = useMutation({
    mutationFn: (id) => base44.entities.TrainingPlan.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["training-plans-history"] }); toast.success("Plan eliminado del historial"); },
    onError: () => toast.error("No se ha podido eliminar el plan"),
  });
  const visiblePlans = plans.filter((plan) => statusFilter === "all" || (plan.estado || "Planificado") === statusFilter);
  const openPlan = (plan) => {
    try {
      const data = JSON.parse(plan.plan_json || "{}");
      const text = [data.titulo_sesion, `Duración: ${data.duracion_total || plan.duracion_total} min`, "", "OBJETIVOS", ...(data.objetivos || []).map((x) => `• ${x}`), "", "CALENTAMIENTO", ...(data.calentamiento?.ejercicios || []).map((x) => `• ${x.nombre} (${x.duracion} min): ${x.descripcion || ""}`), "", "PARTE PRINCIPAL", ...(data.parte_principal || []).flatMap((b) => [`${b.bloque} (${b.duracion} min)`, ...(b.ejercicios || []).map((x) => `• ${x.nombre} (${x.duracion} min): ${x.descripcion || ""}`)]), "", "VUELTA A LA CALMA", ...(data.vuelta_calma?.ejercicios || []).map((x) => `• ${x.nombre} (${x.duracion} min): ${x.descripcion || ""}`), "", "CONSEJOS", ...(data.consejos || []).map((x) => `• ${x}`)].join("\n");
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${(plan.titulo_sesion || "entrenamiento").replace(/[^a-z0-9áéíóúñ_-]+/gi, "-")}.txt`; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error("No se ha podido exportar el plan"); }
  };
  return <main className="mx-auto w-full max-w-6xl space-y-5 px-3 pb-24 pt-5 sm:px-6">
    <header className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-6 text-white shadow-lg">
      <div className="flex items-center gap-3"><div className="rounded-2xl bg-orange-500 p-3"><Dumbbell className="h-7 w-7" /></div><div><p className="text-xs font-bold uppercase tracking-widest text-orange-300">Área técnica · C.D. Bustarviejo</p><h1 className="text-2xl font-bold sm:text-3xl">Historial de entrenamientos</h1><p className="mt-1 text-sm text-slate-300">Consulta los planes creados con IA, registra su realización y guarda observaciones.</p></div></div>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">{plans.length} planes guardados</p><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="Planificado">Planificados</SelectItem><SelectItem value="Realizado">Realizados</SelectItem><SelectItem value="Cancelado">Cancelados</SelectItem></SelectContent></Select></div>
    {isLoading && <Card><CardContent className="p-8 text-center text-slate-500">Cargando historial…</CardContent></Card>}
    {isError && <Card><CardContent className="p-8 text-center text-red-700">No se ha podido cargar el historial. Comprueba que la entidad TrainingPlan esté habilitada en Base44.</CardContent></Card>}
    {!isLoading && !isError && visiblePlans.length === 0 && <Card><CardContent className="py-12 text-center"><BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300"/><p className="font-semibold text-slate-800">Todavía no hay planes en esta vista</p><p className="mt-1 text-sm text-slate-500">Genera una sesión desde Biblioteca de ejercicios y pulsa «Guardar plan» para que aparezca aquí.</p></CardContent></Card>}
    <div className="space-y-4">{visiblePlans.map((plan) => <Card key={plan.id} className="overflow-hidden"><CardHeader className="pb-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-lg">{plan.titulo_sesion}</CardTitle><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline">{plan.deporte}</Badge><Badge>{plan.estado || "Planificado"}</Badge><Badge variant="secondary"><Clock className="mr-1 h-3 w-3"/>{plan.duracion_total} min</Badge><Badge variant="secondary"><Users className="mr-1 h-3 w-3"/>{plan.numero_jugadores || "—"} jugadores</Badge></div></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => openPlan(plan)}>Ver / exportar</Button><Button variant="outline" size="icon" onClick={() => { if (window.confirm("¿Eliminar este plan del historial?")) deletePlan.mutate(plan.id); }} disabled={deletePlan.isPending} aria-label="Eliminar plan"><Trash2 className="h-4 w-4"/></Button></div></div></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div><p className="mb-1 text-xs font-semibold uppercase text-slate-500">Enfoque</p><p className="text-sm">{plan.enfoque || "—"} · {plan.grupo_edad || "Edad no especificada"}</p></div><div><p className="mb-1 text-xs font-semibold uppercase text-slate-500">Objetivos</p><p className="text-sm">{(plan.objetivos || []).join(" · ") || "—"}</p></div></div><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Fecha de entrenamiento</label><input type="date" className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={plan.fecha_entrenamiento || ""} onChange={(e) => updatePlan.mutate({ id: plan.id, data: { fecha_entrenamiento: e.target.value || null } })}/></div><div><label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Estado</label><Select value={plan.estado || "Planificado"} onValueChange={(estado) => updatePlan.mutate({ id: plan.id, data: { estado } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Planificado">Planificado</SelectItem><SelectItem value="Realizado">Realizado</SelectItem><SelectItem value="Cancelado">Cancelado</SelectItem></SelectContent></Select></div></div><div><label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Observaciones después del entrenamiento</label><Textarea rows={2} placeholder="Qué ha funcionado, ajustes para la próxima sesión…" value={editingNotes[plan.id] ?? plan.observaciones_post ?? ""} onChange={(e) => setEditingNotes((prev) => ({ ...prev, [plan.id]: e.target.value }))}/><div className="mt-2 flex justify-end"><Button size="sm" variant="outline" onClick={() => updatePlan.mutate({ id: plan.id, data: { observaciones_post: editingNotes[plan.id] ?? plan.observaciones_post ?? "" } })}><CheckCircle2 className="mr-1 h-4 w-4"/>Guardar observaciones</Button></div></div></CardContent></Card>)}</div>
  </main>;
}
