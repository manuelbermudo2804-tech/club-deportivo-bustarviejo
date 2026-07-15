// Motor genérico de cuadros eliminatorios (Copa Oro / Copa Plata) para el constructor de torneos.
// A partir de las clasificaciones de liguilla reparte los equipos en cuadros por nivel
// y calcula el avance de ganadores. Sport-agnóstico (goles o sets).

import { calcularClasificacionGrupo } from "./torneoStandings";

// Potencia de 2 más cercana por debajo o igual (8, 16, 4...) — nº de plazas del cuadro
function potenciaDe2(n) {
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return p;
}

const NOMBRE_RONDA = {
  2: "Final",
  4: "Semifinales",
  8: "Cuartos",
  16: "Octavos",
  32: "1/16",
};

function nombreRonda(plazas) {
  return NOMBRE_RONDA[plazas] || `Ronda de ${plazas}`;
}

/**
 * Devuelve los clasificados de cada grupo por posición.
 * @returns {Object} { 1: [eq1ºA, eq1ºB...], 2: [eq2ºA...] }
 */
export function clasificadosPorPosicion(grupos, equipos, partidos, torneo) {
  const porPos = {};
  grupos.forEach((g) => {
    const eqs = equipos.filter((e) => e.grupo_id === g.id);
    const parts = partidos.filter((p) => p.fase === "liguilla" && p.grupo_id === g.id);
    const filas = calcularClasificacionGrupo(eqs, parts, torneo);
    filas.forEach((f) => {
      if (!porPos[f.posicion]) porPos[f.posicion] = [];
      porPos[f.posicion].push({ equipo_id: f.equipo_id, nombre: f.nombre, grupo: g.nombre });
    });
  });
  return porPos;
}

// Emparejamiento estándar de bracket (1 vs último, 2 vs penúltimo...)
function emparejarSemilla(lista) {
  const pares = [];
  const n = lista.length;
  for (let i = 0; i < n / 2; i++) {
    pares.push([lista[i], lista[n - 1 - i]]);
  }
  return pares;
}

/**
 * Construye los partidos de un cuadro eliminatorio a partir de una lista de equipos sembrados.
 * Genera TODAS las rondas: la primera con equipos reales, las siguientes con placeholders
 * ("Ganador P1", etc.) y enlazadas por partido_siguiente_id (resuelto tras crear en BD).
 *
 * @param {Array} sembrados - [{equipo_id, nombre}] ya ordenados por semilla (mejor primero)
 * @param {string} fase - "oro" | "plata" | "bronce"
 * @returns {Array} partidos "en memoria" con refs internas para enlazar tras persistir
 */
export function construirCuadro(sembrados, fase, torneo, categoria) {
  const plazas = potenciaDe2(sembrados.length);
  if (plazas < 2) return [];
  const participantes = sembrados.slice(0, plazas);

  const partidos = [];
  let ref = 0;

  // Ronda 1 (equipos reales)
  const paresR1 = emparejarSemilla(participantes);
  let rondaActual = paresR1.map((par, idx) => {
    const p = {
      _ref: ref++,
      torneo_id: torneo.id,
      categoria_id: categoria.id,
      fase,
      ronda: nombreRonda(plazas),
      orden_bracket: idx,
      equipo_local_id: par[0].equipo_id,
      equipo_visitante_id: par[1].equipo_id,
      equipo_local_placeholder: par[0].nombre,
      equipo_visitante_placeholder: par[1].nombre,
      finalizado: false,
      _siguiente: null,
    };
    partidos.push(p);
    return p;
  });

  // Rondas siguientes (placeholders enlazados)
  let plazasRonda = plazas / 2;
  while (plazasRonda >= 2) {
    const nuevos = [];
    for (let i = 0; i < plazasRonda / 2; i++) {
      const p = {
        _ref: ref++,
        torneo_id: torneo.id,
        categoria_id: categoria.id,
        fase,
        ronda: nombreRonda(plazasRonda),
        orden_bracket: i,
        equipo_local_id: "",
        equipo_visitante_id: "",
        equipo_local_placeholder: `Ganador P${rondaActual[i * 2]._ref + 1}`,
        equipo_visitante_placeholder: `Ganador P${rondaActual[i * 2 + 1]._ref + 1}`,
        finalizado: false,
        _siguiente: null,
      };
      // enlazar los dos partidos previos hacia este
      rondaActual[i * 2]._siguiente = p._ref;
      rondaActual[i * 2 + 1]._siguiente = p._ref;
      partidos.push(p);
      nuevos.push(p);
    }
    rondaActual = nuevos;
    plazasRonda = plazasRonda / 2;
  }

  return partidos;
}

/**
 * Al finalizar un partido eliminatorio, decide el ganador y devuelve los cambios
 * que hay que aplicar al partido siguiente (colocar al ganador en local o visitante).
 * @returns {Object|null} { partidoSiguienteId, campo, equipoId, placeholder } o null si no avanza
 */
export function avanceGanador(partido, marcadorLocal, marcadorVisitante, partidos) {
  if (marcadorLocal === marcadorVisitante) return { ganadorId: null }; // empate: no avanza (eliminatorias no empatan)
  const ganadorId = marcadorLocal > marcadorVisitante ? partido.equipo_local_id : partido.equipo_visitante_id;
  const ganadorNombre = marcadorLocal > marcadorVisitante ? partido.equipo_local_placeholder : partido.equipo_visitante_placeholder;

  if (!partido.partido_siguiente_id) return { ganadorId, ganadorNombre, siguiente: null };

  const sig = partidos.find((p) => p.id === partido.partido_siguiente_id);
  if (!sig) return { ganadorId, ganadorNombre, siguiente: null };

  // El primer partido que alimenta va a "local", el segundo a "visitante" (por orden_bracket)
  const alimentadores = partidos
    .filter((p) => p.partido_siguiente_id === sig.id)
    .sort((a, b) => (a.orden_bracket || 0) - (b.orden_bracket || 0));
  const esLocal = alimentadores[0]?.id === partido.id;

  return {
    ganadorId,
    ganadorNombre,
    siguiente: {
      id: sig.id,
      campo: esLocal ? "local" : "visitante",
      equipoId: ganadorId,
      placeholder: ganadorNombre,
    },
  };
}

export { nombreRonda };