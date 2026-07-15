// Motor genérico de clasificación de liguilla para el constructor de torneos.
// Funciona con deportes de "goles" (fútbol, futsal, baloncesto) y de "sets" (pádel, voleibol).
// La clasificación NUNCA se guarda: se calcula siempre a partir de los partidos finalizados.

/**
 * Calcula la tabla de clasificación de un grupo.
 * @param {Array} equipos - TorneoEquipo del grupo
 * @param {Array} partidos - TorneoPartido de fase "liguilla" del grupo
 * @param {Object} torneo - config del torneo (puntos_victoria, puntos_empate, puntos_derrota)
 * @returns {Array} filas ordenadas con estadísticas por equipo
 */
export function calcularClasificacionGrupo(equipos, partidos, torneo) {
  const pV = torneo?.puntos_victoria ?? 3;
  const pE = torneo?.puntos_empate ?? 1;
  const pD = torneo?.puntos_derrota ?? 0;

  const stats = {};
  equipos.forEach((e) => {
    stats[e.id] = {
      equipo_id: e.id,
      nombre: e.nombre,
      escudo_url: e.escudo_url || null,
      jugados: 0,
      ganados: 0,
      empatados: 0,
      perdidos: 0,
      favor: 0, // goles/sets a favor
      contra: 0, // goles/sets en contra
      diferencia: 0,
      puntos: 0,
    };
  });

  partidos
    .filter((p) => p.finalizado && p.marcador_local != null && p.marcador_visitante != null)
    .forEach((p) => {
      const local = stats[p.equipo_local_id];
      const visitante = stats[p.equipo_visitante_id];
      if (!local || !visitante) return;

      const ml = p.marcador_local;
      const mv = p.marcador_visitante;

      local.jugados++;
      visitante.jugados++;
      local.favor += ml;
      local.contra += mv;
      visitante.favor += mv;
      visitante.contra += ml;

      if (ml > mv) {
        local.ganados++;
        local.puntos += pV;
        visitante.perdidos++;
        visitante.puntos += pD;
      } else if (ml < mv) {
        visitante.ganados++;
        visitante.puntos += pV;
        local.perdidos++;
        local.puntos += pD;
      } else {
        local.empatados++;
        visitante.empatados++;
        local.puntos += pE;
        visitante.puntos += pE;
      }
    });

  const filas = Object.values(stats).map((s) => ({
    ...s,
    diferencia: s.favor - s.contra,
  }));

  // Orden: Puntos → Diferencia → A favor → nombre
  filas.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.diferencia !== a.diferencia) return b.diferencia - a.diferencia;
    if (b.favor !== a.favor) return b.favor - a.favor;
    return a.nombre.localeCompare(b.nombre);
  });

  return filas.map((f, i) => ({ ...f, posicion: i + 1 }));
}

// Etiqueta de la columna de anotación según el deporte
export function labelAnotacion(torneo) {
  return torneo?.tipo_puntuacion === "sets" ? "Sets" : "Goles";
}