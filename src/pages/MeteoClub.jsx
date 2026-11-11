import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toGroupId } from "@/lib/chatGroupId";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CloudSun } from "lucide-react";
import { fetchPrevision, meteoEnFranja } from "@/lib/meteoApi";
import { evaluarMeteo, getGrupoCategoria, esIndoor } from "@/lib/meteoRules";
import MeteoEntrenoCard from "@/components/meteo/MeteoEntrenoCard";
import MeteoDecidirDialog from "@/components/meteo/MeteoDecidirDialog";
import MeteoSimulador from "@/components/meteo/MeteoSimulador";
import MeteoCriterios from "@/components/meteo/MeteoCriterios";
import MeteoHistorial from "@/components/meteo/MeteoHistorial";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function MeteoClub() {
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [horarios, setHorarios] = useState([]);
  const [decisiones, setDecisiones] = useState([]);
  const [hourly, setHourly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogItem, setDialogItem] = useState(null);

  const hoy = new Date();
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const diaSemana = DIAS[hoy.getDay()];

  const cargar = async () => {
    try {
      const [u, cfgs, hs, ds, prev] = await Promise.all([
        base44.auth.me(),
        base44.entities.MeteoConfig.list(),
        base44.entities.TrainingSchedule.filter({ activo: true }),
        base44.entities.MeteoDecision.filter({ fecha: fechaHoy }),
        fetchPrevision().catch(() => null),
      ]);
      setUser(u);
      setConfig(cfgs?.[0] || null);
      setHorarios(hs || []);
      setDecisiones(ds || []);
      setHourly(prev);
    } catch {
      toast.error("No se pudieron cargar los datos de Meteo Club");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const isAdmin = user?.role === "admin";

  // Entrenamientos de hoy (excluye baloncesto: es indoor) y que ya hayan comenzado
  const entrenosHoy = useMemo(() => {
    return (horarios || []).filter((h) => {
      if (h.dia_semana !== diaSemana) return false;
      if (esIndoor(h.categoria)) return false;
      if (h.fecha_inicio && h.fecha_inicio > fechaHoy) return false;
      return true;
    });
  }, [horarios, diaSemana, fechaHoy]);

  const proximoInicio = useMemo(() => {
    const futuras = (horarios || [])
      .filter((h) => !esIndoor(h.categoria) && h.fecha_inicio && h.fecha_inicio > fechaHoy)
      .map((h) => h.fecha_inicio)
      .sort();
    return futuras[0] || null;
  }, [horarios, fechaHoy]);

  const items = useMemo(() => {
    return entrenosHoy.map((h) => {
      const meteo = hourly ? meteoEnFranja(hourly, fechaHoy, h.hora_inicio, h.hora_fin) : null;
      const grupo = getGrupoCategoria(h.categoria);
      const ev = meteo ? evaluarMeteo(meteo, grupo, config) : { nivel: "verde", motivos: [], recomendacion: "Sin previsión disponible", sugerirSemicubierto: false };
      return {
        horario_id: h.id,
        categoria: h.categoria,
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin,
        ubicacion: h.ubicacion,
        meteo: meteo || {},
        ...ev,
        decision: decisiones.find((d) => d.horario_id === h.id) || null,
      };
    }).sort((a, b) => (a.hora_inicio || "").localeCompare(b.hora_inicio || ""));
  }, [entrenosHoy, hourly, config, decisiones, fechaHoy]);

  const resumen = items.reduce((acc, i) => { acc[i.nivel] = (acc[i.nivel] || 0) + 1; return acc; }, {});
  const semicubierto = config?.instalacion_semicubierta || "la pista semicubierta";

  const confirmarDecision = async ({ decision, motivo, nuevaHora, avisar, mensaje }) => {
    const item = dialogItem;
    const payload = {
      fecha: fechaHoy,
      categoria: item.categoria,
      horario_id: item.horario_id,
      hora_inicio: item.hora_inicio,
      hora_fin: item.hora_fin,
      decision,
      nivel_recomendado: item.nivel,
      recomendacion_sistema: item.recomendacion,
      motivo,
      ubicacion_alternativa: decision === "semicubierto" ? semicubierto : "",
      nueva_hora: nuevaHora || "",
      datos_meteo: item.meteo,
      decidido_por_email: user?.email,
      decidido_por_nombre: user?.full_name,
      aviso_enviado: !!avisar,
      mensaje_aviso: mensaje || "",
    };

    if (item.decision?.id) await base44.entities.MeteoDecision.update(item.decision.id, payload);
    else await base44.entities.MeteoDecision.create(payload);

    if (avisar && mensaje) {
      await base44.entities.Announcement.create({
        titulo: `Entrenamiento ${item.categoria} · hoy ${item.hora_inicio}`,
        contenido: mensaje,
        prioridad: "Importante",
        destinatarios_tipo: item.categoria,
        publicado: true,
        requiere_confirmacion: true,
        fecha_publicacion: new Date().toISOString(),
      });
    }

    // Si se cancela, publicar también el aviso en el chat de esa categoría.
    // client_id determinista para evitar duplicados si se vuelve a guardar la decisión.
    if (decision === "cancelar" && avisar && mensaje) {
      const grupoId = toGroupId(item.categoria);
      const clientId = `meteo_cancel_${fechaHoy}_${item.horario_id}`;
      const existentes = await base44.entities.ChatMessage.filter({ client_id: clientId });
      if (!existentes?.length) {
        await base44.entities.ChatMessage.create({
          tipo: user?.role === "admin" ? "admin_a_grupo" : "entrenador_a_grupo",
          remitente_email: user?.email || "",
          remitente_nombre: user?.full_name || "Meteo Club",
          mensaje,
          prioridad: "Importante",
          grupo_id: grupoId,
          deporte: item.categoria,
          categoria: item.categoria,
          client_id: clientId,
          leido_por: user?.email ? [{
            email: user.email,
            nombre: user.full_name || "",
            fecha: new Date().toISOString(),
          }] : [],
        });
      }
    }

    toast.success(
      decision === "cancelar" && avisar
        ? "Cancelación comunicada a las familias y al chat de la categoría"
        : avisar
          ? "Decisión guardada y familias avisadas"
          : "Decisión guardada"
    );
    const ds = await base44.entities.MeteoDecision.filter({ fecha: fechaHoy });
    setDecisiones(ds || []);
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-6 overflow-x-hidden px-3 pb-8 pt-4 sm:px-5 lg:space-y-7 lg:px-8 lg:pt-7">
      <section className="relative isolate overflow-hidden rounded-[28px] border border-slate-800/70 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.22),_transparent_42%),linear-gradient(125deg,#101827_0%,#172033_54%,#332016_100%)] p-5 text-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.55)] sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute right-8 top-5 h-36 w-36 rounded-full border border-white/10 sm:right-16 sm:top-7 sm:h-44 sm:w-44" />
        <div aria-hidden="true" className="pointer-events-none absolute right-16 top-12 h-24 w-24 rounded-full border border-orange-200/10 sm:right-24 sm:top-14 sm:h-32 sm:w-32" />
        <div className="relative flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-orange-200/20 bg-gradient-to-br from-orange-300/25 to-orange-500/10 shadow-inner shadow-white/10 sm:h-16 sm:w-16"><CloudSun className="h-7 w-7 text-orange-200 drop-shadow-[0_2px_8px_rgba(251,146,60,0.45)] sm:h-8 sm:w-8" /></div>
          <div className="min-w-0">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-orange-200/90">Área deportiva · Organización de entrenamientos</p>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Meteo Club</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Decisiones de entrenamiento según el tiempo en Bustarviejo.</p>
          </div>
        </div>
      </section>

      <Tabs defaultValue="hoy">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 shadow-sm backdrop-blur sm:grid-cols-4 lg:inline-flex">
          <TabsTrigger value="hoy" className="min-w-0 gap-1.5 rounded-xl px-2 py-2.5 text-xs data-[state=active]:bg-slate-900 data-[state=active]:text-white sm:gap-2 sm:text-sm">Hoy</TabsTrigger>
          <TabsTrigger value="historial" className="min-w-0 gap-1.5 rounded-xl px-2 py-2.5 text-xs data-[state=active]:bg-slate-900 data-[state=active]:text-white sm:gap-2 sm:text-sm">Historial</TabsTrigger>
          {isAdmin && <TabsTrigger value="prueba" className="min-w-0 gap-1.5 rounded-xl px-2 py-2.5 text-xs data-[state=active]:bg-slate-900 data-[state=active]:text-white sm:gap-2 sm:text-sm">🧪 Modo prueba</TabsTrigger>}
          {isAdmin && <TabsTrigger value="criterios" className="min-w-0 gap-1.5 rounded-xl px-2 py-2.5 text-xs data-[state=active]:bg-slate-900 data-[state=active]:text-white sm:gap-2 sm:text-sm">Criterios</TabsTrigger>}
        </TabsList>

        <TabsContent value="hoy" className="mt-5 space-y-4">
          {loading ? (
            <p className="text-slate-500">Cargando previsión...</p>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-4xl mb-2">📅</p>
                <p className="font-semibold text-slate-900">Hoy no hay entrenamientos al aire libre</p>
                <p className="text-sm text-slate-500 mt-1">
                  {proximoInicio
                    ? `Los entrenamientos comienzan el ${proximoInicio}.`
                    : `${diaSemana}: sin entrenamientos programados. Baloncesto queda fuera por ser en pista cubierta.`}
                </p>
                {isAdmin && (
                  <p className="text-sm text-slate-500 mt-3">Mientras tanto puedes probarlo todo en la pestaña <strong>🧪 Modo prueba</strong>.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Entrenamientos de hoy</p><p className="mt-0.5 text-sm font-bold text-slate-800">{diaSemana}</p></div>
                <div className="flex items-center gap-2 text-xs font-semibold"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">● {resumen.verde || 0}</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">● {resumen.ambar || 0}</span><span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">● {resumen.rojo || 0}</span></div>
              </div>
              {items.map((i) => (
                <MeteoEntrenoCard key={i.horario_id} item={i} onDecidir={setDialogItem} />
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="historial" className="mt-4">
          <MeteoHistorial />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="prueba" className="mt-4">
            <MeteoSimulador config={config} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="criterios" className="mt-4">
            <MeteoCriterios config={config} onSaved={cargar} />
          </TabsContent>
        )}
      </Tabs>

      <MeteoDecidirDialog
        open={!!dialogItem}
        onOpenChange={(v) => { if (!v) setDialogItem(null); }}
        item={dialogItem}
        semicubierto={semicubierto}
        onConfirm={confirmarDecision}
      />
    </div>
  );
}