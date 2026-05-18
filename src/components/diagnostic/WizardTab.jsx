import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

function formatMs(ms) {
  if (!ms || ms < 0) return "—";
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}min`;
}

export default function WizardTab() {
  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ["wizard-events"],
    queryFn: () => base44.entities.UploadDiagnostic.filter({ event_type: "wizard_step" }, "-created_date", 500),
    refetchInterval: 30000,
  });

  // Agrupar por sesión (un wizard completo)
  const sessions = useMemo(() => {
    // Agrupar por user_email + wizardName + ventana de 2h
    const grouped = {};
    events.forEach((e) => {
      const wizard = e.extra_data?.wizard || "unknown";
      const ts = new Date(e.created_date).getTime();
      // Buscar sesión existente del mismo usuario+wizard en últimas 2h
      const key = `${e.user_email}__${wizard}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ ...e, ts });
    });

    // Para cada usuario+wizard, separar en sesiones (gap > 2h = nueva sesión)
    const allSessions = [];
    Object.entries(grouped).forEach(([key, evts]) => {
      const sorted = evts.sort((a, b) => a.ts - b.ts);
      let currentSession = [];
      sorted.forEach((evt) => {
        if (currentSession.length === 0) {
          currentSession.push(evt);
        } else {
          const lastTs = currentSession[currentSession.length - 1].ts;
          if (evt.ts - lastTs > 2 * 60 * 60 * 1000) {
            allSessions.push({ key, events: currentSession });
            currentSession = [evt];
          } else {
            currentSession.push(evt);
          }
        }
      });
      if (currentSession.length > 0) allSessions.push({ key, events: currentSession });
    });

    return allSessions
      .map((s) => {
        const first = s.events[0];
        const last = s.events[s.events.length - 1];
        const finishEvt = s.events.find((e) => e.extra_data?.action === "finish");
        const validationFails = s.events.filter((e) => e.extra_data?.action === "validation_fail").length;
        const maxStep = Math.max(...s.events.map((e) => e.extra_data?.step_num ?? 0));
        const totalSteps = s.events[0]?.extra_data?.total_steps || 0;
        return {
          user: first.user_email,
          wizard: first.extra_data?.wizard,
          device: first.device,
          startedAt: first.ts,
          lastActivity: last.ts,
          completed: !!finishEvt,
          totalDuration: finishEvt ? finishEvt.extra_data?.duration_ms : last.ts - first.ts,
          maxStep,
          totalSteps,
          validationFails,
          eventsCount: s.events.length,
        };
      })
      .sort((a, b) => b.lastActivity - a.lastActivity);
  }, [events]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const completed = sessions.filter((s) => s.completed).length;
    const abandoned = total - completed;
    const completedDurations = sessions.filter((s) => s.completed && s.totalDuration).map((s) => s.totalDuration);
    const avgDuration = completedDurations.length ? completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length : 0;

    // Paso donde más abandonan
    const abandonByStep = {};
    sessions.filter((s) => !s.completed).forEach((s) => {
      abandonByStep[s.maxStep] = (abandonByStep[s.maxStep] || 0) + 1;
    });
    const worstStep = Object.entries(abandonByStep).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      completed,
      abandoned,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
      avgDuration,
      worstStep: worstStep ? { step: worstStep[0], count: worstStep[1] } : null,
    };
  }, [sessions]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Seguimiento del formulario de alta de jugadores: cuánto tarda la gente y dónde se atasca.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-1" /> Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-slate-500">Sesiones</div>
        </CardContent></Card>
        <Card className="border-green-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completionRate}%</div>
          <div className="text-xs text-green-600">Finalizan ({stats.completed}/{stats.total})</div>
        </CardContent></Card>
        <Card className="border-amber-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.abandoned}</div>
          <div className="text-xs text-amber-600">Abandonados</div>
        </CardContent></Card>
        <Card className="border-blue-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{formatMs(stats.avgDuration)}</div>
          <div className="text-xs text-blue-600">Tiempo medio</div>
        </CardContent></Card>
      </div>

      {stats.worstStep && (
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div className="flex-1">
                <p className="font-bold text-orange-900">Paso más problemático: {stats.worstStep.step}</p>
                <p className="text-sm text-orange-800">{stats.worstStep.count} usuarios abandonaron en ese paso.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Cargando sesiones...</div>
      ) : sessions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">
          <p className="text-lg">No hay datos del wizard aún</p>
          <p className="text-sm mt-1">Las métricas aparecerán cuando alguien abra el formulario de alta.</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas sesiones</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {sessions.slice(0, 30).map((s, idx) => (
                <div key={idx} className="p-3 flex items-start gap-3 hover:bg-slate-50">
                  <div className="flex-shrink-0">
                    {s.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{s.user}</span>
                      <span className="text-xs text-slate-500">{s.wizard?.replace("PlayerFormWizard_", "")}</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {s.completed ? (
                        <span className="text-green-700">✅ Completado en {formatMs(s.totalDuration)}</span>
                      ) : (
                        <span className="text-amber-700">⏸ Llegó al paso {s.maxStep} de {s.totalSteps - 1}</span>
                      )}
                      {s.validationFails > 0 && (
                        <span className="ml-2 text-red-600">⚠️ {s.validationFails} errores de validación</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{s.device}</div>
                  </div>
                  <div className="text-xs text-slate-400 flex-shrink-0">
                    {new Date(s.lastActivity).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}