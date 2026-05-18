import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, CheckCircle2, AlertTriangle, Clock, Mail, Phone, ExternalLink, User, Camera, Filter } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const STEP_LABELS_FAMILY = ["Jugador", "Categoría", "Documentos", "Tutor", "2º Progenitor", "Médica", "Normativa", "Autorizaciones", "Resumen"];
const STEP_LABELS_ADULT = ["Jugador", "Categoría", "Documentos", "Mis Datos", "Médica", "Normativa", "Autorizaciones", "Resumen"];

function getStepLabel(wizardName, stepNum) {
  const labels = (wizardName || "").includes("Adult") ? STEP_LABELS_ADULT : STEP_LABELS_FAMILY;
  return labels[stepNum] ?? `Paso ${stepNum}`;
}

/**
 * Cruza eventos de wizard/uploads con la entidad Player
 * para saber si una familia que empezó el alta acabó creando un jugador.
 */
export default function AltasEnCursoTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | abandoned | inprogress | completed

  // Cargar eventos de wizard + uploads de los últimos 14 días
  const { data: events = [], isLoading: loadingEvents, refetch: refetchEvents } = useQuery({
    queryKey: ["altas-en-curso-events"],
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const [wizardEvents, uploadEvents] = await Promise.all([
        base44.entities.UploadDiagnostic.filter({ event_type: "wizard_step" }, "-created_date", 500),
        base44.entities.UploadDiagnostic.filter({ event_type: "upload_success" }, "-created_date", 500),
      ]);
      return [...wizardEvents, ...uploadEvents].filter(e => e.created_date >= since);
    },
    refetchInterval: 30000,
  });

  // Cargar todos los Player creados en los últimos 14 días para cruzar
  const { data: recentPlayers = [], refetch: refetchPlayers } = useQuery({
    queryKey: ["altas-recent-players"],
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const all = await base44.entities.Player.list("-created_date", 200);
      return all.filter(p => p.created_date >= since);
    },
    refetchInterval: 60000,
  });

  // Construir el listado de "altas en curso" por email
  const altas = useMemo(() => {
    const byEmail = {};

    events.forEach((e) => {
      const email = e.user_email;
      if (!email || email === "anonymous") return;
      if (!byEmail[email]) {
        byEmail[email] = {
          email,
          firstActivity: e.created_date,
          lastActivity: e.created_date,
          maxStep: -1,
          stepLabel: "—",
          wizardName: null,
          totalSteps: 0,
          uploadsCount: 0,
          validationFails: 0,
          finished: false,
          device: e.device || "",
          events: [],
        };
      }
      const a = byEmail[email];
      a.events.push(e);
      if (e.created_date < a.firstActivity) a.firstActivity = e.created_date;
      if (e.created_date > a.lastActivity) a.lastActivity = e.created_date;
      if (!a.device && e.device) a.device = e.device;

      if (e.event_type === "wizard_step") {
        const stepNum = e.extra_data?.step_num ?? 0;
        const action = e.extra_data?.action;
        if (e.extra_data?.wizard) a.wizardName = e.extra_data.wizard;
        if (e.extra_data?.total_steps) a.totalSteps = e.extra_data.total_steps;
        if (stepNum > a.maxStep) {
          a.maxStep = stepNum;
          a.stepLabel = getStepLabel(a.wizardName, stepNum);
        }
        if (action === "finish") a.finished = true;
        if (action === "validation_fail") a.validationFails++;
      }
      if (e.event_type === "upload_success") {
        a.uploadsCount++;
      }
    });

    // Cruzar con Player creado por ese email
    const playersByEmail = {};
    recentPlayers.forEach((p) => {
      const e = p.email_padre || p.created_by;
      if (e) {
        if (!playersByEmail[e]) playersByEmail[e] = [];
        playersByEmail[e].push(p);
      }
    });

    const list = Object.values(byEmail).map((a) => {
      const players = playersByEmail[a.email] || [];
      // Buscar player creado DESPUÉS del primer evento (relacionado con esta alta)
      const matchPlayer = players.find(p => new Date(p.created_date) >= new Date(a.firstActivity));
      const hasPlayer = !!matchPlayer;
      const hoursSinceLast = (Date.now() - new Date(a.lastActivity).getTime()) / (1000 * 60 * 60);

      let status;
      if (hasPlayer || a.finished) status = "completed";
      else if (hoursSinceLast < 2) status = "inprogress";
      else status = "abandoned";

      return {
        ...a,
        status,
        playerCreated: matchPlayer,
        hoursSinceLast,
      };
    });

    return list.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
  }, [events, recentPlayers]);

  const filtered = useMemo(() => {
    let r = altas;
    if (statusFilter !== "all") r = r.filter(a => a.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(a => a.email.toLowerCase().includes(q));
    }
    return r;
  }, [altas, search, statusFilter]);

  const stats = useMemo(() => {
    const total = altas.length;
    const completed = altas.filter(a => a.status === "completed").length;
    const abandoned = altas.filter(a => a.status === "abandoned").length;
    const inprogress = altas.filter(a => a.status === "inprogress").length;
    return { total, completed, abandoned, inprogress };
  }, [altas]);

  const isLoading = loadingEvents;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <p className="text-sm text-slate-600 flex-1 min-w-[200px]">
          Personas que han iniciado el alta de un jugador en los últimos 14 días. Cruza eventos del wizard + subidas con jugadores creados.
        </p>
        <Button variant="outline" size="sm" onClick={() => { refetchEvents(); refetchPlayers(); }}>
          <RefreshCw className="w-4 h-4 mr-1" /> Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-slate-500">Altas iniciadas</div>
        </CardContent></Card>
        <Card className="border-green-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-xs text-green-700">✅ Completadas</div>
        </CardContent></Card>
        <Card className="border-blue-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.inprogress}</div>
          <div className="text-xs text-blue-700">🔄 En curso (&lt;2h)</div>
        </CardContent></Card>
        <Card className="border-amber-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.abandoned}</div>
          <div className="text-xs text-amber-700">⚠️ Abandonadas</div>
        </CardContent></Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {[
            { v: "all", label: "Todas" },
            { v: "abandoned", label: "⚠️ Abandonadas" },
            { v: "inprogress", label: "🔄 En curso" },
            { v: "completed", label: "✅ Completadas" },
          ].map(o => (
            <Button
              key={o.v}
              size="sm"
              variant={statusFilter === o.v ? "default" : "outline"}
              onClick={() => setStatusFilter(o.v)}
            >{o.label}</Button>
          ))}
        </div>
      </div>

      {/* Listado */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Cargando altas...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">
          <p className="text-lg">No hay altas en este filtro</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-slate-100">
            {filtered.map((a) => (
              <AltaRow key={a.email} alta={a} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AltaRow({ alta }) {
  const statusConfig = {
    completed: { color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle2, label: "Completada" },
    inprogress: { color: "bg-blue-100 text-blue-800 border-blue-300", icon: Clock, label: "En curso" },
    abandoned: { color: "bg-amber-100 text-amber-800 border-amber-300", icon: AlertTriangle, label: "Abandonada" },
  };
  const cfg = statusConfig[alta.status];
  const Icon = cfg.icon;

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(
    `Hola, soy del CD Bustarviejo. He visto que has empezado a dar de alta a un/a jugador/a en nuestra app pero no has terminado. ¿Te puedo ayudar en algo? 😊`
  )}`;
  const mailtoLink = `mailto:${alta.email}?subject=${encodeURIComponent("¿Te ayudamos con el alta? - CD Bustarviejo")}&body=${encodeURIComponent(
    `Hola,\n\nHe visto que has empezado el alta de un jugador/a en nuestra app pero no la has terminado. ¿Hay algo en lo que pueda ayudarte?\n\nUn saludo,\nCD Bustarviejo`
  )}`;

  return (
    <div className="p-3 hover:bg-slate-50">
      <div className="flex items-start gap-3">
        <Badge variant="outline" className={`${cfg.color} flex-shrink-0`}>
          <Icon className="w-3 h-3 mr-1" /> {cfg.label}
        </Badge>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm break-all">{alta.email}</div>
          <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {alta.status === "completed" && alta.playerCreated && (
              <span className="text-green-700 flex items-center gap-1">
                <User className="w-3 h-3" /> {alta.playerCreated.nombre}
              </span>
            )}
            {alta.maxStep >= 0 && (
              <span className={alta.status === "abandoned" ? "text-amber-700 font-semibold" : "text-slate-600"}>
                Último paso: <strong>{alta.stepLabel}</strong>
                {alta.totalSteps > 0 && ` (${alta.maxStep + 1}/${alta.totalSteps})`}
              </span>
            )}
            {alta.uploadsCount > 0 && (
              <span className="flex items-center gap-1 text-slate-500">
                <Camera className="w-3 h-3" /> {alta.uploadsCount} subidas
              </span>
            )}
            {alta.validationFails > 0 && (
              <span className="text-red-600">⚠️ {alta.validationFails} errores</span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {alta.device} · Última actividad: {formatDistanceToNow(new Date(alta.lastActivity), { locale: es, addSuffix: true })}
          </div>
        </div>

        {alta.status === "abandoned" && (
          <div className="flex gap-1 flex-shrink-0">
            <a href={mailtoLink} title="Enviar email">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Mail className="w-3.5 h-3.5" />
              </Button>
            </a>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" title="WhatsApp">
              <Button variant="outline" size="icon" className="h-8 w-8 text-green-600">
                <Phone className="w-3.5 h-3.5" />
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}