import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
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

    toast.success(avisar ? "Decisión guardada y familias avisadas" : "Decisión guardada");
    const ds = await base44.entities.MeteoDecision.filter({ fecha: fechaHoy });
    setDecisiones(ds || []);
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <CloudSun className="w-8 h-8 text-orange-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meteo Club</h1>
          <p className="text-slate-500 text-sm">Decisiones de entrenamiento según el tiempo en Bustarviejo</p>
        </div>
      </div>

      <Tabs defaultValue="hoy">
        <TabsList>
          <TabsTrigger value="hoy">Hoy</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          {isAdmin && <TabsTrigger value="prueba">🧪 Modo prueba</TabsTrigger>}
          {isAdmin && <TabsTrigger value="criterios">Criterios</TabsTrigger>}
        </TabsList>

        <TabsContent value="hoy" className="space-y-3 mt-4">
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
              <p className="text-sm text-slate-600">
                {diaSemana} · 🟢 {resumen.verde || 0} · 🟠 {resumen.ambar || 0} · 🔴 {resumen.rojo || 0}
              </p>
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