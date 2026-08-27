import { buildWeekAgenda } from "@/components/dashboard/miSemanaHelper";

// Agenda unificada de la semana: lo de sus hijos (👨‍👩‍👧) y lo de sus equipos (🧢),
// todo en una sola lista ordenada por día y hora.
export function buildUnifiedAgenda({ myPlayers = [], schedules = [], callups = [], email }) {
  // 1) Familia: entrenos y partidos de sus hijos
  const publicados = callups.filter((c) => c.publicada === true);
  const familia = buildWeekAgenda(myPlayers, schedules, publicados).items.map((it) => ({
    ...it,
    ambito: "familia",
  }));

  // 2) Equipo: convocatorias que ella dirige esta semana
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(hoy);
  fin.setDate(hoy.getDate() + 7);

  const equipo = callups
    .filter((c) => c.entrenador_email === email && c.fecha_partido)
    .filter((c) => {
      const f = new Date(c.fecha_partido + "T00:00:00");
      return f >= hoy && f <= fin;
    })
    .map((c) => ({
      ambito: "equipo",
      tipo: "partido",
      fecha: new Date(c.fecha_partido + "T00:00:00"),
      hora: c.hora_partido || "",
      titulo: c.rival ? `vs ${c.rival}` : (c.titulo || "Partido"),
      subtitulo: c.categoria + (c.publicada ? "" : " · sin publicar"),
      ubicacion: c.ubicacion || "",
      jugadores: [],
    }));

  return [...familia, ...equipo].sort((a, b) => {
    const df = a.fecha - b.fecha;
    if (df !== 0) return df;
    return (a.hora || "").localeCompare(b.hora || "");
  });
}