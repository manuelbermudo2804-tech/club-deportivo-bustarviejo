import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { eachDayOfInterval } from "date-fns";
import { esDiaSinEntreno, motivoSinEntreno, fechaISO } from "@/lib/sinEntrenamiento";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const CAMPO_MUNICIPAL_MAPS =
  "https://www.google.com/maps/place/Campo+de+F%C3%BAtbol+Municipal+Bustarviejo/@40.8569444,-3.7230556,17z";

const norm = (s) => (s || "").trim().toLowerCase();
const normCat = (s) =>
  (s || "").trim().toLowerCase().replace(/\(mixto\)/g, "").replace(/\s+/g, " ").trim();

const mapsUrlFor = (ubicacion) => {
  if (!ubicacion || ubicacion.includes("Campo Municipal") || ubicacion.includes("Municipal de Bustarviejo")) {
    return CAMPO_MUNICIPAL_MAPS;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ubicacion)}`;
};

/**
 * Junta en una sola lista todo lo que ocurre en el club dentro de un rango de fechas:
 * entrenamientos (generados desde los horarios), convocatorias, partidos de liga y eventos.
 * Cada elemento tiene la misma forma, para poder pintarlos juntos en lista, semana o mes.
 */
export default function useAgendaItems({ start, end, temporada, myCategories = [], verTodo = false, user }) {
  const { data: schedules = [], isLoading: l1 } = useQuery({
    queryKey: ["agenda-schedules", temporada],
    queryFn: () => base44.entities.TrainingSchedule.filter({ temporada }),
    enabled: !!temporada,
  });

  const { data: cancelaciones = [] } = useQuery({
    queryKey: ["agenda-sin-entrenamiento"],
    queryFn: () => base44.entities.SinEntrenamiento.list(),
  });

  const { data: callups = [], isLoading: l2 } = useQuery({
    queryKey: ["agenda-callups"],
    queryFn: () => base44.entities.Convocatoria.list("-fecha_partido", 300),
  });

  const { data: partidos = [], isLoading: l3 } = useQuery({
    queryKey: ["agenda-proximos-partidos"],
    queryFn: () => base44.entities.ProximoPartido.filter({ jugado: false }, "fecha_iso", 200),
  });

  const { data: eventos = [], isLoading: l4 } = useQuery({
    queryKey: ["agenda-eventos"],
    queryFn: () => base44.entities.Event.list("-fecha", 300),
  });

  const items = useMemo(() => {
    const startISO = fechaISO(start);
    const endISO = fechaISO(end);
    const enRango = (iso) => !!iso && iso >= startISO && iso <= endISO;
    const esMia = (cat) => verTodo || myCategories.some((c) => normCat(c) === normCat(cat));

    // 1) Entrenamientos: se generan a partir de los horarios semanales
    const activos = schedules.filter((s) => s.activo && esMia(s.categoria));
    const entrenamientos = [];
    if (activos.length > 0) {
      for (const day of eachDayOfInterval({ start, end })) {
        const iso = fechaISO(day);
        const nombreDia = DIAS[day.getDay()];
        for (const s of activos) {
          if (s.dia_semana !== nombreDia) continue;
          if (s.fecha_inicio && iso < s.fecha_inicio.slice(0, 10)) continue;
          const cancelado = esDiaSinEntreno(cancelaciones, iso, s.categoria);
          entrenamientos.push({
            id: `entreno-${s.id}-${iso}`,
            kind: "entrenamiento",
            date: iso,
            hora: s.hora_inicio,
            horaFin: s.hora_fin,
            titulo: "Entrenamiento",
            categoria: s.categoria,
            ubicacion: s.ubicacion || "Campo Municipal de Bustarviejo",
            mapsUrl: mapsUrlFor(s.ubicacion),
            notas: s.notas,
            cancelado,
            motivoCancelacion: cancelado ? motivoSinEntreno(cancelaciones, iso, s.categoria) : null,
          });
        }
      }
    }

    // 2) Convocatorias publicadas
    const convocatorias = callups
      .filter((c) => c.publicada && enRango(c.fecha_partido) && esMia(c.categoria))
      .map((c) => {
        const mios = (c.jugadores_convocados || []).filter(
          (j) =>
            j.email_padre === user?.email ||
            j.email_tutor_2 === user?.email ||
            j.email_jugador === user?.email
        );
        return {
          id: `conv-${c.id}`,
          kind: "convocatoria",
          date: c.fecha_partido,
          hora: c.hora_partido,
          titulo: c.titulo,
          categoria: c.categoria,
          ubicacion: c.ubicacion,
          mapsUrl: c.enlace_ubicacion || mapsUrlFor(c.ubicacion),
          concentracion: c.hora_concentracion,
          rival: c.rival,
          localVisitante: c.local_visitante,
          cancelado: c.estado_convocatoria === "cancelada",
          motivoCancelacion: c.estado_convocatoria === "cancelada" ? c.motivo_cambio : null,
          sinResponder: mios.filter((j) => !j.confirmacion || j.confirmacion === "pendiente").length,
          misJugadores: mios.map((j) => j.jugador_nombre).filter(Boolean),
          convocatoriaId: c.id,
        };
      });

    // 3) Partidos de liga que aún no tienen convocatoria creada
    const yaHayConvocatoria = new Set(
      convocatorias.map((c) => `${normCat(c.categoria)}|${c.date}`)
    );
    const partidosLiga = partidos
      .filter((m) => enRango(m.fecha_iso) && esMia(m.categoria))
      .filter((m) => !yaHayConvocatoria.has(`${normCat(m.categoria)}|${m.fecha_iso}`))
      .map((m) => {
        const esLocal = norm(m.local).includes("bustarviejo");
        const rival = esLocal ? m.visitante : m.local;
        return {
          id: `liga-${m.id}`,
          kind: "partido",
          date: m.fecha_iso,
          hora: m.hora,
          titulo: `Jornada ${m.jornada || "?"} · ${rival || "Rival por confirmar"}`,
          categoria: m.categoria,
          ubicacion: m.campo,
          mapsUrl: mapsUrlFor(m.campo),
          rival,
          localVisitante: esLocal ? "Local" : "Visitante",
          jornada: m.jornada,
        };
      });

    // 4) Eventos del club (los partidos ya vienen por las vías anteriores)
    const eventosClub = eventos
      .filter((e) => (verTodo || e.publicado) && e.tipo !== "Partido" && enRango(e.fecha))
      .filter((e) => {
        const destino = e.destinatario_categoria;
        if (!destino || destino === "Todos") return true;
        return esMia(destino);
      })
      .map((e) => ({
        id: `evento-${e.id}`,
        kind: "evento",
        date: e.fecha,
        hora: e.hora,
        horaFin: e.hora_fin,
        titulo: e.titulo,
        categoria: e.destinatario_categoria === "Todos" ? "Todo el club" : e.destinatario_categoria,
        ubicacion: e.ubicacion,
        mapsUrl: e.ubicacion_url || (e.ubicacion ? mapsUrlFor(e.ubicacion) : null),
        tipo: e.tipo,
        importante: e.importante,
        notas: e.descripcion,
      }));

    return [...entrenamientos, ...convocatorias, ...partidosLiga, ...eventosClub].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.hora || "99:99").localeCompare(b.hora || "99:99");
    });
  }, [schedules, cancelaciones, callups, partidos, eventos, start, end, myCategories, verTodo, user?.email]);

  return { items, isLoading: l1 || l2 || l3 || l4 };
}