// Utilidades para los "días sin entrenamiento" (fiestas, puentes, etc.)

export function fechaISO(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * ¿Ese día no hay entrenamiento para esa categoría?
 * @param {Array} cancelaciones registros de SinEntrenamiento
 * @param {string|Date} fecha
 * @param {string} categoria
 */
export function esDiaSinEntreno(cancelaciones = [], fecha, categoria) {
  if (!fecha) return false;
  const iso = typeof fecha === "string" ? fecha.slice(0, 10) : fechaISO(fecha);
  return (cancelaciones || []).some((c) => {
    if (!c?.fecha) return false;
    const desde = c.fecha.slice(0, 10);
    const hasta = (c.fecha_fin || c.fecha).slice(0, 10);
    if (iso < desde || iso > hasta) return false;
    const cats = c.categorias || [];
    return cats.length === 0 || (categoria && cats.includes(categoria));
  });
}

/** Motivo del día sin entrenamiento (para mostrarlo), o null */
export function motivoSinEntreno(cancelaciones = [], fecha, categoria) {
  const iso = typeof fecha === "string" ? fecha.slice(0, 10) : fechaISO(fecha);
  const hit = (cancelaciones || []).find((c) => {
    if (!c?.fecha) return false;
    const desde = c.fecha.slice(0, 10);
    const hasta = (c.fecha_fin || c.fecha).slice(0, 10);
    if (iso < desde || iso > hasta) return false;
    const cats = c.categorias || [];
    return cats.length === 0 || (categoria && cats.includes(categoria));
  });
  return hit?.motivo || null;
}