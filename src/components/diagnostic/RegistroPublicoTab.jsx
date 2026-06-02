import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw, User, Smartphone, Clock, RotateCcw, Eye, MousePointerClick,
  AlertTriangle, CheckCircle2, LogOut, Activity, Filter
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

// ─── Helpers ───────────────────────────────────────────────────────────────
const ACTION_META = {
  page_view:         { label: "Visita",       icon: Eye,                color: "text-slate-600 bg-slate-100",      ring: "border-slate-200" },
  form_started:      { label: "Empezó",       icon: MousePointerClick,  color: "text-blue-700 bg-blue-100",        ring: "border-blue-200" },
  submit_attempt:    { label: "Intentó enviar", icon: MousePointerClick, color: "text-indigo-700 bg-indigo-100",   ring: "border-indigo-200" },
  validation_failed: { label: "Validación KO", icon: AlertTriangle,      color: "text-orange-700 bg-orange-100",   ring: "border-orange-200" },
  submit_error:      { label: "Error servidor", icon: AlertTriangle,     color: "text-red-700 bg-red-100",         ring: "border-red-200" },
  submit_success:    { label: "Enviado OK",    icon: CheckCircle2,       color: "text-green-700 bg-green-100",     ring: "border-green-200" },
  form_abandoned:    { label: "Abandonó",      icon: LogOut,             color: "text-amber-700 bg-amber-100",     ring: "border-amber-200" },
};

const getAccion = (evt) => evt.extra_data?.accion || "evento";
const metaOf = (accion) => ACTION_META[accion] || { label: accion, icon: AlertTriangle, color: "text-slate-600 bg-slate-100", ring: "border-slate-200" };

async function recoverToAccessRequest(evt, onDone) {
  const data = evt.extra_data?.form_data;
  if (!data?.email || !data?.nombre_progenitor || !data?.categoria) {
    toast.error("Este evento no tiene datos suficientes para recuperar.");
    return;
  }
  try {
    const existing = await base44.entities.AccessRequest.filter({ email: data.email });
    if (existing.length > 0) {
      toast.info("Ya existe una solicitud con ese email en la bandeja.");
      onDone?.();
      return;
    }
    await base44.entities.AccessRequest.create({
      email: data.email,
      nombre_progenitor: data.nombre_progenitor,
      telefono: data.telefono || "",
      categoria: data.categoria,
      prefiere_whatsapp: !!data.prefiere_whatsapp,
      estado: "pendiente",
      user_agent: evt.user_agent || "",
    });
    toast.success("✅ Recuperada a Códigos de Acceso");
    onDone?.();
  } catch (e) {
    toast.error("Error al recuperar: " + (e.message || "desconocido"));
  }
}

// ─── Componente principal ──────────────────────────────────────────────────
export default function RegistroPublicoTab() {
  const [filtro, setFiltro] = useState("todo"); // todo | visitas | interaccion | errores | exitos
  const [vista, setVista] = useState("sesiones"); // sesiones | eventos

  const { data: events = [], isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["public-access-events"],
    queryFn: async () => {
      // Traemos todos los eventos de UploadDiagnostic y filtramos los de PublicAccessRequest
      const items = await base44.entities.UploadDiagnostic.filter({}, "-created_date", 500);
      return items.filter(e => (e.context || "").startsWith("PublicAccessRequest"));
    },
    refetchInterval: 10000,
    staleTime: 0,
  });

  // Agrupar por sesión
  const sesiones = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      const sid = e.session_id || `legacy_${e.id}`;
      if (!map.has(sid)) {
        map.set(sid, {
          session_id: sid,
          eventos: [],
          first_at: e.created_date,
          last_at: e.created_date,
          email: null,
          device: e.device,
          user_agent: e.user_agent,
        });
      }
      const s = map.get(sid);
      s.eventos.push(e);
      if (new Date(e.created_date) < new Date(s.first_at)) s.first_at = e.created_date;
      if (new Date(e.created_date) > new Date(s.last_at)) s.last_at = e.created_date;
      if (!s.email && e.user_email && e.user_email !== "anónimo") s.email = e.user_email;
    }
    // Ordenar eventos de cada sesión cronológicamente (antiguo → nuevo)
    for (const s of map.values()) {
      s.eventos.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      s.acciones = s.eventos.map(getAccion);
      s.resultado =
        s.acciones.includes("submit_success") ? "completado" :
        s.acciones.includes("form_abandoned") ? "abandonado" :
        s.acciones.includes("submit_error") || s.acciones.includes("submit_attempt") ? "fallo" :
        s.acciones.includes("form_started") ? "interactuo" :
        "solo_visita";
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.last_at) - new Date(a.last_at));
  }, [events]);

  // Stats globales
  const stats = useMemo(() => {
    const totalSesiones = sesiones.length;
    const visitas = sesiones.filter(s => s.acciones.includes("page_view")).length;
    const interactuaron = sesiones.filter(s => s.acciones.includes("form_started")).length;
    const enviados = sesiones.filter(s => s.acciones.includes("submit_success")).length;
    const abandonados = sesiones.filter(s => s.acciones.includes("form_abandoned")).length;
    const conInteres = sesiones.filter(s => s.resultado !== "solo_visita").length;
    const conversion = visitas > 0 ? Math.round((enviados / visitas) * 100) : 0;
    // En vivo: sesiones con actividad en los últimos 2 minutos
    const hace2min = Date.now() - 2 * 60 * 1000;
    const enVivo = sesiones.filter(s => new Date(s.last_at).getTime() > hace2min).length;
    return { totalSesiones, visitas, interactuaron, enviados, abandonados, conInteres, conversion, enVivo };
  }, [sesiones]);

  // Filtrar sesiones según pestaña activa
  const sesionesFiltradas = useMemo(() => {
    switch (filtro) {
      case "visitas":     return sesiones.filter(s => s.resultado === "solo_visita");
      case "interaccion": return sesiones.filter(s => s.resultado !== "solo_visita");
      case "errores":     return sesiones.filter(s => s.resultado === "fallo" || s.acciones.includes("validation_failed"));
      case "exitos":      return sesiones.filter(s => s.resultado === "completado");
      case "abandonados": return sesiones.filter(s => s.resultado === "abandonado");
      default:            return sesiones;
    }
  }, [sesiones, filtro]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm text-slate-700 font-medium">
            Actividad del formulario público <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">/SolicitarAcceso</code>
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Cada visita, cada interacción, cada abandono. Auto-actualiza cada 10s.
            {dataUpdatedAt && ` · Último: ${format(new Date(dataUpdatedAt), "HH:mm:ss")}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.enVivo > 0 && (
            <Badge className="bg-green-100 text-green-700 border-green-300 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 inline-block" />
              {stats.enVivo} en vivo
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <StatCard label="Visitas" value={stats.visitas} icon={Eye} color="slate" />
        <StatCard label="Interactuaron" value={stats.interactuaron} icon={MousePointerClick} color="blue" />
        <StatCard label="Enviados OK" value={stats.enviados} icon={CheckCircle2} color="green" />
        <StatCard label="Abandonaron" value={stats.abandonados} icon={LogOut} color="amber" />
        <StatCard label="Sesiones" value={stats.totalSesiones} icon={Activity} color="indigo" />
        <StatCard label="Conversión" value={`${stats.conversion}%`} icon={CheckCircle2} color="emerald" />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-500" />
        <FiltroBtn activo={filtro === "todo"}        onClick={() => setFiltro("todo")}        label="Todo"             count={sesiones.length} />
        <FiltroBtn activo={filtro === "visitas"}     onClick={() => setFiltro("visitas")}     label="Solo visitas"     count={sesiones.filter(s => s.resultado === "solo_visita").length} />
        <FiltroBtn activo={filtro === "interaccion"} onClick={() => setFiltro("interaccion")} label="Con interacción"  count={stats.conInteres} />
        <FiltroBtn activo={filtro === "errores"}     onClick={() => setFiltro("errores")}     label="Errores"          count={sesiones.filter(s => s.resultado === "fallo" || s.acciones.includes("validation_failed")).length} />
        <FiltroBtn activo={filtro === "abandonados"} onClick={() => setFiltro("abandonados")} label="Abandonados"      count={stats.abandonados} />
        <FiltroBtn activo={filtro === "exitos"}      onClick={() => setFiltro("exitos")}      label="Completados"      count={stats.enviados} />
        <div className="flex-1" />
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setVista("sesiones")}
            className={`px-3 py-1 text-xs rounded-md font-medium transition ${vista === "sesiones" ? "bg-white shadow-sm text-slate-900" : "text-slate-600"}`}
          >Sesiones</button>
          <button
            onClick={() => setVista("eventos")}
            className={`px-3 py-1 text-xs rounded-md font-medium transition ${vista === "eventos" ? "bg-white shadow-sm text-slate-900" : "text-slate-600"}`}
          >Eventos crudos</button>
        </div>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Cargando actividad...</div>
      ) : sesionesFiltradas.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">
          <p className="text-lg">📭 Sin actividad en este filtro</p>
          <p className="text-sm mt-1">Las visitas y eventos aparecerán aquí en tiempo real</p>
        </CardContent></Card>
      ) : vista === "sesiones" ? (
        <div className="space-y-2">
          {sesionesFiltradas.slice(0, 100).map(s => (
            <SessionRow key={s.session_id} sesion={s} onRecover={refetch} />
          ))}
        </div>
      ) : (
        <EventList events={events.slice(0, 200)} onRecover={refetch} />
      )}
    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    slate:   "border-slate-200 text-slate-700",
    blue:    "border-blue-200 text-blue-700",
    green:   "border-green-200 text-green-700",
    amber:   "border-amber-200 text-amber-700",
    indigo:  "border-indigo-200 text-indigo-700",
    emerald: "border-emerald-200 text-emerald-700",
  };
  return (
    <Card className={colors[color]}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold">{value}</div>
            <div className="text-xs opacity-70">{label}</div>
          </div>
          <Icon className="w-5 h-5 opacity-40" />
        </div>
      </CardContent>
    </Card>
  );
}

function FiltroBtn({ activo, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition border ${
        activo
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
      }`}
    >
      {label} <span className={`ml-1 ${activo ? "opacity-70" : "text-slate-400"}`}>({count})</span>
    </button>
  );
}

const RESULTADO_BADGE = {
  completado:  { label: "✅ Completó",      cls: "bg-green-100 text-green-700 border-green-300" },
  abandonado:  { label: "🚪 Abandonó",      cls: "bg-amber-100 text-amber-700 border-amber-300" },
  fallo:       { label: "⚠️ Falló",          cls: "bg-red-100 text-red-700 border-red-300" },
  interactuo:  { label: "✍️ Interactuó",    cls: "bg-blue-100 text-blue-700 border-blue-300" },
  solo_visita: { label: "👁 Solo visita",   cls: "bg-slate-100 text-slate-600 border-slate-300" },
};

function SessionRow({ sesion, onRecover }) {
  const [expandido, setExpandido] = useState(false);
  const badge = RESULTADO_BADGE[sesion.resultado];
  const duracionSeg = Math.round((new Date(sesion.last_at) - new Date(sesion.first_at)) / 1000);
  const haceRato = formatDistanceToNow(new Date(sesion.last_at), { locale: es, addSuffix: true });
  // Datos del form si los hay (el más reciente que los tenga)
  const ultimoConDatos = [...sesion.eventos].reverse().find(e => e.extra_data?.form_data);
  const formData = ultimoConDatos?.extra_data?.form_data;
  const isRecoverable = !!(formData?.email && formData?.nombre_progenitor && formData?.categoria);

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      {/* Cabecera de sesión */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full p-3 flex items-start gap-3 hover:bg-slate-50 transition text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs ${badge.cls}`}>{badge.label}</Badge>
            <span className="text-sm font-medium text-slate-900 truncate">
              {sesion.email || "anónimo"}
            </span>
            <span className="text-xs text-slate-400">· {haceRato}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" />{sesion.device || "?"}</span>
            <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{sesion.eventos.length} eventos</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{duracionSeg}s en página</span>
          </div>
          {/* Mini timeline visual */}
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {sesion.eventos.map((evt, i) => {
              const m = metaOf(getAccion(evt));
              const Icon = m.icon;
              return (
                <React.Fragment key={evt.id}>
                  <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${m.color}`} title={`${m.label} · ${format(new Date(evt.created_date), "HH:mm:ss")}`}>
                    <Icon className="w-2.5 h-2.5" />
                    {m.label}
                  </div>
                  {i < sesion.eventos.length - 1 && <span className="text-slate-300">→</span>}
                </React.Fragment>
              );
            })}
          </div>
        </div>
        <div className="text-xs text-slate-400 flex-shrink-0">
          {expandido ? "▲" : "▼"}
        </div>
      </button>

      {/* Detalles expandidos */}
      {expandido && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-3 space-y-2">
          {/* Timeline detallado */}
          <div className="space-y-1.5">
            {sesion.eventos.map((evt) => {
              const accion = getAccion(evt);
              const m = metaOf(accion);
              const Icon = m.icon;
              return (
                <div key={evt.id} className={`flex items-start gap-2 p-2 rounded-lg bg-white border ${m.ring}`}>
                  <div className={`p-1.5 rounded ${m.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">{m.label}</span>
                      <span className="text-slate-400">{format(new Date(evt.created_date), "HH:mm:ss")}</span>
                      {evt.extra_data?.motivo && (
                        <Badge variant="outline" className="text-[10px] py-0">{evt.extra_data.motivo}</Badge>
                      )}
                    </div>
                    {evt.error_message && evt.error_message !== accion && (
                      <div className="text-slate-600 mt-0.5">{evt.error_message}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Datos rellenados + recuperar */}
          {formData && (
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-1">
              <div className="font-semibold text-slate-700 mb-1">📋 Datos que rellenó:</div>
              {formData.nombre_progenitor && <div><strong>Nombre:</strong> {formData.nombre_progenitor}</div>}
              {formData.email && <div><strong>Email:</strong> {formData.email}</div>}
              {formData.telefono && <div><strong>Teléfono:</strong> {formData.telefono}</div>}
              {formData.categoria && <div><strong>Categoría:</strong> {formData.categoria}</div>}
              {isRecoverable && sesion.resultado !== "completado" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 border-green-300 text-green-700 hover:bg-green-50"
                  onClick={() => recoverToAccessRequest(ultimoConDatos, onRecover)}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Recuperar a Códigos de Acceso
                </Button>
              )}
            </div>
          )}

          {sesion.user_agent && (
            <div className="text-[10px] text-slate-400 break-all">UA: {sesion.user_agent}</div>
          )}
        </div>
      )}
    </div>
  );
}

function EventList({ events, onRecover }) {
  return (
    <div className="space-y-1.5">
      {events.map(evt => {
        const accion = getAccion(evt);
        const m = metaOf(accion);
        const Icon = m.icon;
        const formData = evt.extra_data?.form_data;
        const isRecoverable = !!(formData?.email && formData?.nombre_progenitor && formData?.categoria);
        return (
          <div key={evt.id} className={`border rounded-lg p-2.5 bg-white ${m.ring}`}>
            <div className="flex items-start gap-2">
              <div className={`p-1.5 rounded ${m.color} flex-shrink-0`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Badge variant="outline" className="text-[10px]">{m.label}</Badge>
                  {evt.extra_data?.motivo && (
                    <Badge className="text-[10px] bg-orange-100 text-orange-700 border-orange-300">{evt.extra_data.motivo}</Badge>
                  )}
                  <span className="text-slate-400">{format(new Date(evt.created_date), "dd/MM HH:mm:ss", { locale: es })}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{evt.user_email || "anónimo"}</span>
                  <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" />{evt.device || "?"}</span>
                </div>
                {isRecoverable && (accion === "submit_error" || accion === "submit_attempt" || accion === "form_abandoned") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1.5 h-7 text-[11px] border-green-300 text-green-700 hover:bg-green-50"
                    onClick={() => recoverToAccessRequest(evt, onRecover)}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Recuperar
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}