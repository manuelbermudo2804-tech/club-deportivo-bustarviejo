// Helper para calcular la "agenda de la semana" de una familia
// a partir de sus jugadores, horarios de entrenamiento y convocatorias.
// Sin llamadas a red: recibe los datos ya cargados y devuelve una lista ordenada.

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Devuelve el lunes 00:00 de la semana de una fecha dada
function inicioSemana(base = new Date()) {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Dom..6=Sáb
  const diff = dow === 0 ? -6 : 1 - dow; // retroceder al lunes
  d.setDate(d.getDate() + diff);
  return d;
}

function finSemana(base = new Date()) {
  const ini = inicioSemana(base);
  const fin = new Date(ini);
  fin.setDate(ini.getDate() + 6);
  fin.setHours(23, 59, 59, 999);
  return fin;
}

// hora "HH:MM" -> minutos desde medianoche (para detectar solapes)
function horaAMinutos(hora) {
  if (!hora || typeof hora !== "string") return null;
  const [h, m] = hora.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h)) return null;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

const DIA_A_INDEX = {
  "Lunes": 1, "Martes": 2, "Miércoles": 3, "Jueves": 4, "Viernes": 5,
};

/**
 * Construye la agenda de la semana actual.
 * @param {Array} players - jugadores de la familia (con categoria_principal / deporte / categorias)
 * @param {Array} schedules - TrainingSchedule activos
 * @param {Array} callups - Convocatorias publicadas (ya filtradas por categorías de los hijos)
 * @returns {{ items: Array, conflicts: Array }}
 */
export function buildWeekAgenda(players = [], schedules = [], callups = []) {
  const ini = inicioSemana();
  const fin = finSemana();

  // Categorías de cada jugador -> para asociar entrenos/partidos a un hijo
  const playerCats = players.map((p) => ({
    nombre: (p.nombre || "").split(" ")[0] || p.nombre || "Jugador",
    id: p.id,
    cats: new Set([p.categoria_principal, p.deporte, ...(p.categorias || [])].filter(Boolean)),
  }));

  const items = [];

  // 1) ENTRENAMIENTOS (recurrentes de lun-vie)
  (schedules || []).forEach((s) => {
    if (s.activo === false) return;
    const idx = DIA_A_INDEX[s.dia_semana];
    if (!idx) return;
    const quienes = playerCats.filter((pc) => pc.cats.has(s.categoria)).map((pc) => pc.nombre);
    if (quienes.length === 0) return;
    const fecha = new Date(ini);
    fecha.setDate(ini.getDate() + (idx - 1));
    items.push({
      tipo: "entreno",
      fecha,
      diaLabel: DIAS[fecha.getDay()],
      hora: s.hora_inicio || "",
      horaFin: s.hora_fin || "",
      inicioMin: horaAMinutos(s.hora_inicio),
      titulo: "Entrenamiento",
      subtitulo: s.categoria,
      ubicacion: s.ubicacion || "",
      jugadores: quienes,
    });
  });

  // 2) PARTIDOS / CONVOCATORIAS de esta semana
  (callups || []).forEach((c) => {
    if (!c.fecha_partido) return;
    const fecha = new Date(c.fecha_partido + "T00:00:00");
    if (fecha < ini || fecha > fin) return;
    const quienes = playerCats.filter((pc) => pc.cats.has(c.categoria)).map((pc) => pc.nombre);
    if (quienes.length === 0) return;
    items.push({
      tipo: c.tipo === "Partido" ? "partido" : "evento",
      fecha,
      diaLabel: DIAS[fecha.getDay()],
      hora: c.hora_partido || "",
      horaConcentracion: c.hora_concentracion || "",
      inicioMin: horaAMinutos(c.hora_partido),
      titulo: c.rival ? `vs ${c.rival}` : (c.titulo || "Partido"),
      subtitulo: c.categoria + (c.local_visitante ? ` · ${c.local_visitante}` : ""),
      ubicacion: c.ubicacion || "",
      jugadores: quienes,
    });
  });

  // Orden cronológico (día + hora)
  items.sort((a, b) => {
    const df = a.fecha - b.fecha;
    if (df !== 0) return df;
    return (a.inicioMin ?? 9999) - (b.inicioMin ?? 9999);
  });

  // 3) CHOQUES ENTRE HERMANOS: mismo día, jugadores distintos, horas solapadas (<90 min)
  const conflicts = [];
  if (playerCats.length > 1) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        if (a.fecha.getTime() !== b.fecha.getTime()) continue;
        if (a.inicioMin == null || b.inicioMin == null) continue;
        // deben implicar hijos distintos
        const mismosHijos = a.jugadores.join() === b.jugadores.join();
        const hijosDistintos = a.jugadores.some((n) => !b.jugadores.includes(n)) || b.jugadores.some((n) => !a.jugadores.includes(n));
        if (mismosHijos || !hijosDistintos) continue;
        if (Math.abs(a.inicioMin - b.inicioMin) <= 90) {
          const nombres = [...new Set([...a.jugadores, ...b.jugadores])].join(" y ");
          conflicts.push({
            diaLabel: a.diaLabel,
            texto: `${nombres} tienen actividad casi a la vez el ${a.diaLabel.toLowerCase()} (${a.hora} y ${b.hora})`,
          });
        }
      }
    }
  }

  return { items, conflicts };
}