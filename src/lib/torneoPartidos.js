// Helpers para trabajar con partidos de un torneo en las vistas públicas.

const FASE_LABEL = {
  liguilla: "Fase de grupos",
  oro: "🥇 Copa Oro",
  plata: "🥈 Copa Plata",
  bronce: "🥉 Copa Bronce",
};

const RONDA_LABEL = {
  octavos: "Octavos",
  cuartos: "Cuartos",
  semifinal: "Semifinal",
  final: "Final",
  tercer_puesto: "3er puesto",
};

// Nombre visible de un equipo (equipo real o placeholder tipo "1º Grupo A")
export function nombreEquipo(equipos, equipoId, placeholder) {
  if (equipoId) {
    const e = equipos.find((x) => x.id === equipoId);
    if (e) return e.nombre;
  }
  return placeholder || "Por definir";
}

export function escudoEquipo(equipos, equipoId) {
  if (!equipoId) return null;
  const e = equipos.find((x) => x.id === equipoId);
  return e?.escudo_url || null;
}

// Etiqueta legible de la fase/ronda de un partido
export function faseLabel(partido) {
  if (partido.fase === "liguilla") {
    return partido.grupo_nombre ? `Grupo ${partido.grupo_nombre}` : FASE_LABEL.liguilla;
  }
  const base = FASE_LABEL[partido.fase] || "Eliminatoria";
  const ronda = RONDA_LABEL[partido.ronda] || partido.ronda;
  return ronda ? `${base} · ${ronda}` : base;
}

// Formatea la fecha/hora de un partido de forma corta (sáb 18:30)
export function horaCorta(fechaHora) {
  if (!fechaHora) return null;
  try {
    const d = new Date(fechaHora);
    return d.toLocaleString("es-ES", {
      weekday: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return null;
  }
}

// Enriquece los partidos con nombres y escudos ya resueltos
export function enriquecerPartidos(partidos, equipos, grupos = []) {
  return partidos.map((p) => {
    const grupo = grupos.find((g) => g.id === p.grupo_id);
    return {
      ...p,
      grupo_nombre: grupo?.nombre || null,
      local_nombre: nombreEquipo(equipos, p.equipo_local_id, p.equipo_local_placeholder),
      visitante_nombre: nombreEquipo(equipos, p.equipo_visitante_id, p.equipo_visitante_placeholder),
      local_escudo: escudoEquipo(equipos, p.equipo_local_id),
      visitante_escudo: escudoEquipo(equipos, p.equipo_visitante_id),
    };
  });
}