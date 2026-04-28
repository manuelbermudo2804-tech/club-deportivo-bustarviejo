// Helper unificado para saber si un jugador pertenece a una categoría.
// Soporta los 3 campos posibles: categoria_principal, deporte (legacy) y categorias[] (lista de inscripciones múltiples).
// Es tolerante a espacios extra y diferencias de mayúsculas/minúsculas para evitar
// que jugadores no aparezcan por errores menores de tipeo o normalización.

const norm = (s) => (s == null ? "" : String(s).trim().toLowerCase());

export function playerInCategory(player, category) {
  if (!player || !category) return false;
  const target = norm(category);
  if (!target) return false;
  if (norm(player.categoria_principal) === target) return true;
  if (!player.categoria_principal && norm(player.deporte) === target) return true;
  if (Array.isArray(player.categorias) && player.categorias.some(c => norm(c) === target)) return true;
  return false;
}

// Devuelve la categoría "principal efectiva" del jugador para mostrar/agrupar
export function playerPrimaryCategory(player) {
  const v = player?.categoria_principal || player?.deporte || null;
  return v ? String(v).trim() : null;
}

// Devuelve TODAS las categorías a las que pertenece el jugador (única, sin duplicados, normalizadas en trim)
export function playerAllCategories(player) {
  if (!player) return [];
  const set = new Set();
  const add = (v) => { if (v) set.add(String(v).trim()); };
  add(player.categoria_principal);
  add(player.deporte);
  (player.categorias || []).forEach(add);
  return Array.from(set).filter(Boolean);
}