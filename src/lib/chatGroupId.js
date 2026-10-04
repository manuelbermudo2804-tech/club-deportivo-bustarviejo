// Identificador único del chat de equipo a partir de la categoría.
// Ej: "Fútbol Alevín (Mixto)" -> "futbol_alevin". Usar SIEMPRE este helper.
export const toGroupId = (s = "") =>
  (s || "")
    .toString()
    .replace(/\(.*?\)/g, "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();