// Helper unificado para saber si un jugador pertenece a una categoría.
// Soporta los 3 campos posibles: categoria_principal, deporte (legacy) y categorias[] (lista de inscripciones múltiples).
// Esto evita que jugadores nuevos no aparezcan en plantillas, asistencia, evaluación o minutos
// cuando se inscriben en varias categorías a la vez.

export function playerInCategory(player, category) {
  if (!player || !category) return false;
  if (player.categoria_principal === category) return true;
  if (!player.categoria_principal && player.deporte === category) return true;
  if (Array.isArray(player.categorias) && player.categorias.includes(category)) return true;
  return false;
}

// Devuelve la categoría "principal efectiva" del jugador para mostrar/agrupar
export function playerPrimaryCategory(player) {
  return player?.categoria_principal || player?.deporte || null;
}

// Devuelve TODAS las categorías a las que pertenece el jugador (única, sin duplicados)
export function playerAllCategories(player) {
  if (!player) return [];
  const set = new Set();
  if (player.categoria_principal) set.add(player.categoria_principal);
  if (player.deporte) set.add(player.deporte);
  (player.categorias || []).forEach(c => c && set.add(c));
  return Array.from(set);
}