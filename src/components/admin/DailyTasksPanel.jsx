import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, CheckCircle2, XCircle, Zap, Bell, Cake, RotateCw,
  KeyRound, Users, Shield, Clock, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

const TASKS = [
  { id: "callups", label: "Cerrar convocatorias pasadas", icon: Bell, emoji: "📋" },
  { id: "renewals", label: "Cierre renovaciones vencidas", icon: RotateCw, emoji: "🔄" },
  { id: "codes", label: "Expirar códigos de acceso", icon: KeyRound, emoji: "🔑" },
  { id: "birthdays", label: "Felicitaciones de cumpleaños", icon: Cake, emoji: "🎂" },
  { id: "member_reminders", label: "Recordatorios socios", icon: Users, emoji: "🎫" },
  { id: "minor_access", label: "Avisos acceso juvenil", icon: Shield, emoji: "📱" },
];

export default function DailyTasksPanel() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [lastRun, setLastRun] = useState(null);
  const [alreadyRanToday, setAlreadyRanToday] = useState(false);

  useEffect(() => {
    const todayKey = new Date().toISOString().split("T")[0];
    const saved = localStorage.getItem("dailyTasks_lastRun");
    if (saved === todayKey) {
      setAlreadyRanToday(true);
      setLastRun(todayKey);
    }
  }, []);

  // Pedir permiso de notificaciones al montar
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const runAll = async () => {
    setRunning(true);
    setResults(null);
    try {
      const { data } = await base44.functions.invoke("dailyAdminTasks", { tasks: "all" });
      setResults(data.results);
      const todayKey = new Date().toISOString().split("T")[0];
      localStorage.setItem("dailyTasks_lastRun", todayKey);
      setLastRun(todayKey);
      setAlreadyRanToday(true);
      toast.success("¡Todas las tareas ejecutadas correctamente!");
    } catch (err) {
      toast.error("Error ejecutando tareas: " + (err.message || "desconocido"));
    } finally {
      setRunning(false);
    }
  };

  const getTaskStatus = (taskId) => {
    if (!results) return null;
    const r = results[taskId];
    if (!r) return null;
    if (r.error) return "error";
    return "ok";
  };

  const getTaskSummary = (taskId) => {
    if (!results) return "";
    const r = results[taskId];
    if (!r) return "";
    if (r.error) return r.error;
    switch (taskId) {
      case "callups": return `${r.closed || 0} cerradas, ${r.deleted || 0} borradas`;
      case "renewals": return `${r.processed || 0} procesados`;
      case "codes": return `${r.expired || 0} expirados de ${r.checked || 0}`;
      case "birthdays": return r.total_procesados != null ? `${r.total_procesados} emails` : "Ejecutado";
      case "member_reminders": return `${r.reminders_sent || 0} recordatorios`;
      case "minor_access": return `${r.notified_count || 0} avisos`;
      default: return "OK";
    }
  };

  // Alarma: programar recordatorio a las 9:00
  const scheduleReminder = () => {
    if (!("Notification" in window)) {
      toast.error("Tu navegador no soporta notificaciones");
      return;
    }
    if (Notification.permission !== "granted") {
      Notification.requestPermission().then(perm => {
        if (perm === "granted") doSchedule();
        else toast.error("Necesitas permitir notificaciones");
      });
    } else {
      doSchedule();
    }
  };

  const doSchedule = () => {
    const now = new Date();
    const target = new Date();
    target.setHours(9, 0, 0, 0);
    if (now >= target) target.setDate(target.getDate() + 1);
    const ms = target.getTime() - now.getTime();

    // Guardar el timeout ID
    const saved = localStorage.getItem("dailyTasks_reminder");
    if (saved === "active") {
      toast.info("Ya tienes la alarma activada para las 9:00");
      return;
    }

    setTimeout(() => {
      new Notification("⚡ CD Bustarviejo — Tareas Diarias", {
        body: "¡Recuerda ejecutar las tareas diarias del club!",
        icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
        tag: "daily-tasks-reminder",
        requireInteraction: true,
      });
      localStorage.removeItem("dailyTasks_reminder");
    }, ms);

    localStorage.setItem("dailyTasks_reminder", "active");
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    toast.success(`⏰ Alarma programada: sonará en ${hours}h ${mins}min (mañana a las 9:00)`);
  };

  return (
    <Card className="border-2 border-orange-400 shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-orange-600 via-orange-700 to-green-700 p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Zap className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold">⚡ Tareas Diarias del Club</h2>
              <p className="text-orange-100 text-sm">Ejecuta todo con un solo botón</p>
            </div>
          </div>
          {lastRun && (
            <Badge className="bg-white/20 text-white border-white/30">
              <Clock className="w-3 h-3 mr-1" />
              Último: {lastRun}
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* Lista de tareas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TASKS.map((task) => {
            const status = getTaskStatus(task.id);
            const summary = getTaskSummary(task.id);
            return (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  status === "ok" ? "bg-green-50 border-green-300" :
                  status === "error" ? "bg-red-50 border-red-300" :
                  "bg-slate-50 border-slate-200"
                }`}
              >
                <span className="text-lg">{task.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-800 truncate">{task.label}</p>
                  {summary && (
                    <p className={`text-xs truncate ${status === "error" ? "text-red-600" : "text-green-700"}`}>
                      {summary}
                    </p>
                  )}
                </div>
                {status === "ok" && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
                {status === "error" && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                {running && !status && <Loader2 className="w-4 h-4 text-orange-500 animate-spin flex-shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Aviso si ya se ejecutó hoy */}
        {alreadyRanToday && !results && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-800">Ya ejecutaste las tareas hoy. Puedes volver a ejecutarlas si quieres.</p>
          </div>
        )}

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={runAll}
            disabled={running}
            size="lg"
            className="flex-1 bg-gradient-to-r from-orange-600 to-green-700 hover:from-orange-700 hover:to-green-800 text-white font-bold text-base shadow-lg shadow-orange-600/30"
            style={{ minHeight: "56px" }}
          >
            {running ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Ejecutando tareas...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                {alreadyRanToday ? "Volver a ejecutar todo" : "⚡ Ejecutar TODAS las tareas"}
              </>
            )}
          </Button>

          <Button
            onClick={scheduleReminder}
            variant="outline"
            size="lg"
            className="border-2 border-orange-300 text-orange-700 hover:bg-orange-50 font-bold"
            style={{ minHeight: "56px" }}
          >
            <Bell className="w-5 h-5 mr-2" />
            ⏰ Alarma 9:00
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Cada ejecución consume 1 crédito. Las tareas que envían emails consumen 1 crédito adicional por email.
        </p>
      </CardContent>
    </Card>
  );
}