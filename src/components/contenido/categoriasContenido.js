// Equipos disponibles al subir contenido al club
export const EQUIPOS_CONTENIDO = [
  "Fútbol Pre-Benjamín (Mixto)",
  "Fútbol Benjamín (Mixto)",
  "Fútbol Alevín (Mixto)",
  "Fútbol Alevín Femenino",
  "Fútbol Infantil (Mixto)",
  "Fútbol Cadete",
  "Fútbol Juvenil",
  "Fútbol Aficionado",
  "Fútbol Femenino",
  "Baloncesto (Mixto)",
  "Del club en general",
];

export const getTemporadaActual = () => {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() + 1 >= 9 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
};