// Helpers para el sistema de gestión de dorsales

import { base44 } from "@/api/base44Client";

// Calcula la temporada siguiente al formato '2026-2027'
export function getNextSeason(currentSeason) {
  if (!currentSeason || !currentSeason.includes("-")) {
    const y = new Date().getFullYear();
    return `${y}-${y + 1}`;
  }
  const [a, b] = currentSeason.split("-").map((n) => parseInt(n, 10));
  return `${b}-${b + 1}`;
}

// Calcula a qué categoría pertenece un jugador en una temporada dada según su fecha de nacimiento.
// Reglas básicas para fútbol — se puede ampliar si hay más matices.
export function calcularCategoriaParaTemporada(fechaNacimiento, temporada) {
  if (!fechaNacimiento || !temporada) return null;
  const yearStart = parseInt(String(temporada).split("-")[0], 10);
  const nacYear = new Date(fechaNacimiento).getFullYear();
  const edad = yearStart - nacYear; // edad al iniciar la temporada (1 septiembre)

  if (edad <= 7) return "Fútbol Pre-Benjamín (Mixto)";
  if (edad <= 9) return "Fútbol Benjamín (Mixto)";
  if (edad <= 11) return "Fútbol Alevín (Mixto)";
  if (edad <= 13) return "Fútbol Infantil (Mixto)";
  if (edad <= 15) return "Fútbol Cadete";
  if (edad <= 18) return "Fútbol Juvenil";
  return "Fútbol Aficionado";
}

// Carga toda la info necesaria para gestionar dorsales en una temporada
export async function loadDorsalData(temporada) {
  const [players, assignments, configs] = await Promise.all([
    base44.entities.Player.filter({ activo: true }),
    base44.entities.DorsalAssignment.filter({ temporada }),
    base44.entities.DorsalConfig.filter({ temporada }),
  ]);
  return { players, assignments, configs };
}

// Saca historial de un jugador (todas sus asignaciones, ordenadas por temporada)
export async function getDorsalHistoryForPlayer(jugadorId) {
  const items = await base44.entities.DorsalAssignment.filter({ jugador_id: jugadorId });
  return (items || []).sort((a, b) => String(b.temporada).localeCompare(String(a.temporada)));
}

// Cuenta temporadas consecutivas más recientes con el mismo dorsal en el club
export function contarTemporadasConDorsal(historial, dorsal) {
  if (!historial || historial.length === 0) return 0;
  let count = 0;
  for (const h of historial) {
    if (Number(h.dorsal) === Number(dorsal) && h.estado === "asignado") count++;
    else break;
  }
  return count;
}

// Resuelve conflictos: dado un dorsal en una categoría/temporada, decide qué jugador tiene preferencia
// según la regla: más temporadas seguidas con ese dorsal > más antigüedad total > categoría superior.
export function resolverPrioridad(candidatos) {
  // candidatos: [{ jugadorId, nombre, historial[], fechaNacimiento, dorsal }]
  if (!candidatos || candidatos.length <= 1) return candidatos?.[0] || null;

  const scored = candidatos.map((c) => ({
    ...c,
    score_temp_dorsal: contarTemporadasConDorsal(c.historial, c.dorsal),
    score_antiguedad: (c.historial || []).length,
    score_edad: c.fechaNacimiento ? -new Date(c.fechaNacimiento).getTime() : 0, // más viejo = mayor score
  }));

  scored.sort((a, b) => {
    if (b.score_temp_dorsal !== a.score_temp_dorsal) return b.score_temp_dorsal - a.score_temp_dorsal;
    if (b.score_antiguedad !== a.score_antiguedad) return b.score_antiguedad - a.score_antiguedad;
    return b.score_edad - a.score_edad;
  });

  return scored[0];
}

// Devuelve los dorsales libres en una categoría/temporada dado el rango y los asignados
export function getDorsalesLibres(config, assignmentsEnCategoria) {
  const min = config?.dorsal_min || 1;
  const max = config?.dorsal_max || 25;
  const reservados = new Set(config?.dorsales_reservados || []);
  const ocupados = new Set(
    (assignmentsEnCategoria || []).filter((a) => a.estado === "asignado").map((a) => Number(a.dorsal))
  );
  const libres = [];
  for (let i = min; i <= max; i++) {
    if (!reservados.has(i) && !ocupados.has(i)) libres.push(i);
  }
  return libres;
}

// Normaliza nombre para hacer matching difuso desde un Excel
export function normalizarNombre(s) {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}