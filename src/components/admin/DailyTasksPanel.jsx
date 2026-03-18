import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, CheckCircle2, XCircle, Zap, Bell, Cake, RotateCw,
  KeyRound, Users, Shield, Clock
} from "lucide-react";
import { toast } from "sonner";

const TASKS = [
  { id: "callups", label: "Cerrar convocatorias pasadas", icon: Bell, emoji: "📋", cost: "0" },
  { id: "renewals", label: "Cierre renovaciones vencidas", icon: RotateCw, emoji: "🔄", cost: "0" },
  { id: "codes", label: "Expirar códigos de acceso", icon: KeyRound, emoji: "🔑", cost: "0" },
  { id: "birthdays", label: "Felicitaciones de cumpleaños", icon: Cake, emoji: "🎂", cost: "1 crédito si hay cumpleaños" },
  { id: "member_reminders", label: "Recordatorios socios", icon: Users, emoji: "🎫", cost: "1 crédito si hay recordatorios" },
  { id: "minor_access", label: "Avisos acceso juvenil", icon: Shield, emoji: "📱", cost: "1 crédito si hay avisos" },
];

// ════════════════════════════════════
// TAREAS FRONTEND (0 créditos)
// ════════════════════════════════════

async function taskCloseCallups() {
  const today = new Date().toISOString().split("T")[0];
  const all = await base44.entities.Convocatoria.filter({ cerrada: false }, "-fecha_partido", 200);
  let closed = 0, deleted = 0;
  for (const c of all) {
    if (!c.fecha_partido || c.fecha_partido >= today || c.estado_convocatoria === "cancelada") continue;
    if (!c.publicada) {
      await base44.entities.Convocatoria.delete(c.id);
      deleted++;
    } else {
      await base44.entities.Convocatoria.update(c.id, { cerrada: true });
      closed++;
    }
  }
  // Limpiar ProximoPartido viejos
  const proximos = await base44.entities.ProximoPartido.list("-updated_date", 200);
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  let cleaned = 0;
  for (const p of proximos) {
    if (p.jugado && p.fecha_iso && p.fecha_iso < cutoff) {
      await base44.entities.ProximoPartido.delete(p.id);
      cleaned++;
    }
  }
  return `${closed} cerradas, ${deleted} borradas, ${cleaned} limpiadas`;
}

async function taskCloseRenewals() {
  const configs = await base44.entities.SeasonConfig.filter({ activa: true });
  const cfg = configs[0];
  if (!cfg?.permitir_renovaciones || !cfg?.fecha_limite_renovaciones) return "Sin fecha límite configurada";
  const limite = new Date(cfg.fecha_limite_renovaciones);
  const hoy = new Date();
  limite.setHours(0,0,0,0); hoy.setHours(0,0,0,0);
  if (hoy <= limite) return "Aún no ha pasado la fecha límite";
  const pend = await base44.entities.Player.filter({
    estado_renovacion: "pendiente", temporada_renovacion: cfg.temporada
  });
  if (pend.length === 0) return "0 pendientes";
  for (const p of pend) {
    await base44.entities.Player.update(p.id, {
      estado_renovacion: "no_renueva", activo: false,
      fecha_renovacion: new Date().toISOString(),
      observaciones: `${p.observaciones||""}\n[Sistema] No renovado antes de fecha límite`.trim()
    });
  }
  return `${pend.length} jugadores cerrados`;
}

async function taskExpireCodes() {
  const codes = await base44.entities.AccessCode.filter({ estado: "pendiente" });
  const now = new Date();
  let expired = 0;
  for (const code of codes) {
    if (code.fecha_expiracion && new Date(code.fecha_expiracion) < now) {
      await base44.entities.AccessCode.update(code.id, { estado: "expirado" });
      expired++;
    }
  }
  return `${expired} expirados de ${codes.length}`;
}

// ════════════════════════════════════
// TAREAS CON EMAIL (1 crédito backend solo si hay algo que enviar)
// ════════════════════════════════════

async function taskBirthdays() {
  // Primero comprobar desde frontend si hay cumpleaños
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const mdKey = `${mm}-${dd}`;

  // Comprobar si ya se enviaron hoy
  try {
    const logs = await base44.entities.BirthdayLog.filter({ email_enviado: true });
    const todayStr = today.toISOString().split("T")[0];
    const alreadySent = logs.some(l => l.fecha_envio_email?.split("T")[0] === todayStr);
    if (alreadySent) return "Ya enviados hoy ✅";
  } catch {}

  const players = await base44.entities.Player.filter({ activo: true });
  let count = 0;
  for (const p of players) {
    if (p.fecha_nacimiento?.slice(5, 10) === mdKey) count++;
  }
  const members = await base44.entities.ClubMember.filter({ activo: true });
  for (const m of members) {
    if (m.fecha_nacimiento?.slice(5, 10) === mdKey) count++;
  }

  if (count === 0) return "0 cumpleaños hoy";

  // Solo ahora llamamos al backend (1 crédito) porque hay emails que enviar
  const { data } = await base44.functions.invoke("sendBirthdayWishes", {});
  return `${data?.total_procesados || count} felicitaciones enviadas 🎂`;
}

async function taskMemberReminders() {
  // Comprobar desde frontend si hay socios que recordar
  const configs = await base44.entities.SeasonConfig.filter({ activa: true });
  const cfg = configs[0];
  if (!cfg) return "Sin temporada activa";

  const temporada = cfg.temporada;
  const allMembers = await base44.entities.ClubMember.filter({ temporada });
  const now = new Date();

  const needReminder = allMembers.filter(m => {
    if (m.estado_pago !== "Pagado" || m.renovacion_automatica || m.es_socio_padre || !m.fecha_vencimiento) return false;
    const diff = Math.ceil((new Date(m.fecha_vencimiento) - now) / 86400000);
    const count = m.recordatorio_renovacion_count || 0;
    return (diff <= 30 && diff > 15 && count < 1) || (diff <= 15 && diff > 7 && count < 2) || (diff <= 7 && diff > 0 && count < 3);
  });

  if (needReminder.length === 0) return "0 recordatorios pendientes";

  // Solo ahora llamamos al backend (1 crédito)
  const { data } = await base44.functions.invoke("memberRenewalReminders", {});
  return `${data?.reminders_sent || needReminder.length} recordatorios enviados 📧`;
}

async function taskMinorAccess() {
  // Comprobar desde frontend si hay jugadores cerca de 13 años
  const players = await base44.entities.Player.filter({ activo: true });
  const today = new Date();
  let candidates = 0;

  for (const p of players) {
    if (!p.fecha_nacimiento || !p.email_padre) continue;
    if (p.acceso_menor_autorizado || p.acceso_menor_revocado || p.acceso_menor_email) continue;
    const birth = new Date(p.fecha_nacimiento);
    const thirteenth = new Date(birth.getFullYear() + 13, birth.getMonth(), birth.getDate());
    const diff = Math.round((thirteenth - today) / 86400000);
    if (diff > 7 || diff < -3) continue;
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    if (age > 13) continue;
    if (p.acceso_menor_notificado_fecha) {
      const daysSince = Math.round((today - new Date(p.acceso_menor_notificado_fecha)) / 86400000);
      if (daysSince < 30) continue;
    }
    candidates++;
  }

  if (candidates === 0) return "0 avisos pendientes";

  // Solo ahora llamamos al backend (1 crédito)
  const { data } = await base44.functions.invoke("notifyMinorAccess", {});
  return `${data?.notified_count || candidates} avisos enviados 📱`;
}

// ════════════════════════════════════
// PANEL
// ════════════════════════════════════

const TASK_RUNNERS = {
  callups: taskCloseCallups,
  renewals: taskCloseRenewals,
  codes: taskExpireCodes,
  birthdays: taskBirthdays,
  member_reminders: taskMemberReminders,
  minor_access: taskMinorAccess,
};

export default function DailyTasksPanel() {
  const [running, setRunning] = useState(false);
  const [taskStatus, setTaskStatus] = useState({});
  const [lastRun, setLastRun] = useState(null);
  const [alreadyRanToday, setAlreadyRanToday] = useState(false);

  useEffect(() => {
    const todayKey = new Date().toISOString().split("T")[0];
    const saved = localStorage.getItem("dailyTasks_lastRun");
    if (saved === todayKey) { setAlreadyRanToday(true); setLastRun(todayKey); }
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const runAll = async () => {
    setRunning(true);
    setTaskStatus({});
    const newStatus = {};

    for (const task of TASKS) {
      setTaskStatus(prev => ({ ...prev, [task.id]: { status: "running" } }));
      try {
        const summary = await TASK_RUNNERS[task.id]();
        newStatus[task.id] = { status: "ok", summary };
        setTaskStatus(prev => ({ ...prev, [task.id]: { status: "ok", summary } }));
      } catch (err) {
        newStatus[task.id] = { status: "error", summary: err.message };
        setTaskStatus(prev => ({ ...prev, [task.id]: { status: "error", summary: err.message } }));
      }
    }

    const todayKey = new Date().toISOString().split("T")[0];
    localStorage.setItem("dailyTasks_lastRun", todayKey);
    setLastRun(todayKey);
    setAlreadyRanToday(true);
    setRunning(false);

    const errors = Object.values(newStatus).filter(s => s.status === "error").length;
    if (errors === 0) toast.success("¡Todas las tareas completadas!");
    else toast.error(`${errors} tarea(s) con error`);
  };

  const scheduleReminder = () => {
    if (!("Notification" in window)) { toast.error("Tu navegador no soporta notificaciones"); return; }
    const doIt = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(9, 0, 0, 0);
      if (now >= target) target.setDate(target.getDate() + 1);
      const ms = target.getTime() - now.getTime();
      if (localStorage.getItem("dailyTasks_reminder") === "active") {
        toast.info("Ya tienes la alarma activada para las 9:00"); return;
      }
      setTimeout(() => {
        new Notification("⚡ CD Bustarviejo — Tareas Diarias", {
          body: "¡Recuerda ejecutar las tareas diarias del club!",
          icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
          tag: "daily-tasks-reminder", requireInteraction: true,
        });
        localStorage.removeItem("dailyTasks_reminder");
      }, ms);
      localStorage.setItem("dailyTasks_reminder", "active");
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      toast.success(`⏰ Alarma: sonará en ${h}h ${m}min (mañana a las 9:00)`);
    };
    if (Notification.permission !== "granted") {
      Notification.requestPermission().then(p => { if (p === "granted") doIt(); else toast.error("Necesitas permitir notificaciones"); });
    } else doIt();
  };

  return (
    <Card className="border-2 border-orange-400 shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-orange-600 via-orange-700 to-green-700 p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Zap className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold">⚡ Tareas Diarias del Club</h2>
              <p className="text-orange-100 text-sm">0 créditos (solo emails si los hay)</p>
            </div>
          </div>
          {lastRun && (
            <Badge className="bg-white/20 text-white border-white/30">
              <Clock className="w-3 h-3 mr-1" /> Último: {lastRun}
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TASKS.map((task) => {
            const st = taskStatus[task.id];
            const status = st?.status;
            const summary = st?.summary || "";
            return (
              <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                status === "ok" ? "bg-green-50 border-green-300" :
                status === "error" ? "bg-red-50 border-red-300" :
                status === "running" ? "bg-orange-50 border-orange-300" :
                "bg-slate-50 border-slate-200"
              }`}>
                <span className="text-lg">{task.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-800 truncate">{task.label}</p>
                  {summary && (
                    <p className={`text-xs truncate ${status === "error" ? "text-red-600" : "text-green-700"}`}>{summary}</p>
                  )}
                  {!summary && !status && (
                    <p className="text-xs text-slate-400">{task.cost}</p>
                  )}
                </div>
                {status === "ok" && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
                {status === "error" && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                {status === "running" && <Loader2 className="w-4 h-4 text-orange-500 animate-spin flex-shrink-0" />}
              </div>
            );
          })}
        </div>

        {alreadyRanToday && !Object.keys(taskStatus).length && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-800">Ya ejecutaste las tareas hoy. Puedes repetirlas si quieres.</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={runAll} disabled={running} size="lg"
            className="flex-1 bg-gradient-to-r from-orange-600 to-green-700 hover:from-orange-700 hover:to-green-800 text-white font-bold text-base shadow-lg shadow-orange-600/30"
            style={{ minHeight: "56px" }}>
            {running ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Ejecutando...</>
            ) : (
              <><Zap className="w-5 h-5 mr-2" />{alreadyRanToday ? "Repetir tareas" : "⚡ Ejecutar TODAS"}</>
            )}
          </Button>
          <Button onClick={scheduleReminder} variant="outline" size="lg"
            className="border-2 border-orange-300 text-orange-700 hover:bg-orange-50 font-bold"
            style={{ minHeight: "56px" }}>
            <Bell className="w-5 h-5 mr-2" />⏰ Alarma 9:00
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Las 3 primeras tareas son gratis (frontend). Los emails solo gastan 1 crédito si hay algo que enviar.
        </p>
      </CardContent>
    </Card>
  );
}