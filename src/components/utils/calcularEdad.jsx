/**
 * Calcula la edad exacta en años basada en la fecha de nacimiento
 * @param {string|Date} fechaNacimiento - Fecha de nacimiento en formato ISO o Date object
 * @returns {number|null} - Edad en años, o null si no hay fecha válida
 */
export function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;

  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);

  if (isNaN(nacimiento.getTime())) return null; // Fecha inválida

  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  const dia = hoy.getDate() - nacimiento.getDate();

  // Si aún no ha cumplido años este año
  if (mes < 0 || (mes === 0 && dia < 0)) {
    edad--;
  }

  return Math.max(0, edad); // Asegurar que no sea negativa
}

/**
 * Obtiene la categoría sugerida según la edad y el deporte actual
 * @param {number} edad - Edad en años
 * @param {string} deporteActual - Deporte/categoría actual del jugador
 * @returns {string|null} - Categoría sugerida, o null si no aplica
 */
export function getSuggestedCategory(edad, deporteActual) {
  if (!edad && edad !== 0) return null;

  const esJugadoraFemenina = deporteActual === "Fútbol Femenino";

  // Para jugadoras de fútbol femenino o categorías mixtas de chicas
  if (esJugadoraFemenina || deporteActual?.includes("Femenino")) {
    if (edad <= 5) return "Fútbol Pre-Benjamín (Mixto)";
    if (edad <= 7) return "Fútbol Benjamín (Mixto)";
    if (edad <= 9) return "Fútbol Alevín (Mixto)";
    if (edad <= 11) return "Fútbol Infantil (Mixto)";
    return "Fútbol Femenino"; // A partir de 12 años
  }

  // Para jugadores masculinos o baloncesto - RANGOS OFICIALES EXACTOS
  if (edad >= 4 && edad <= 5) return "Fútbol Pre-Benjamín (Mixto)";
  if (edad >= 6 && edad <= 7) return "Fútbol Benjamín (Mixto)";
  if (edad >= 8 && edad <= 9) return "Fútbol Alevín (Mixto)";
  if (edad >= 10 && edad <= 11) return "Fútbol Infantil (Mixto)";
  if (edad >= 12 && edad <= 15) return "Fútbol Cadete";
  if (edad >= 16 && edad <= 18) return "Fútbol Juvenil";
  if (edad >= 19) return "Fútbol Aficionado";

  return null;
}