/**
 * Calcula la edad exacta de una persona a partir de su fecha de nacimiento
 * @param {string} fechaNacimiento - Fecha en formato ISO (YYYY-MM-DD)
 * @returns {number|null} - Edad en años, o null si no hay fecha
 */
export const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return null;
  
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mesActual = hoy.getMonth();
  const mesNacimiento = nacimiento.getMonth();
  
  // Si aún no ha llegado el cumpleaños este año, restar 1
  if (mesActual < mesNacimiento || (mesActual === mesNacimiento && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  
  return edad;
};

/**
 * Sugiere la categoría ideal basada en la edad
 * @param {number} edad - Edad en años
 * @returns {string|null} - Categoría sugerida o null
 */
export const sugerirCategoriaPorEdad = (edad) => {
  if (edad === null) return null;
  
  if (edad < 6) return "Fútbol Pre-Benjamín (Mixto)";
  if (edad < 8) return "Fútbol Benjamín (Mixto)";
  if (edad < 10) return "Fútbol Alevín (Mixto)";
  if (edad < 12) return "Fútbol Infantil (Mixto)";
  if (edad < 14) return "Fútbol Cadete";
  if (edad < 17) return "Fútbol Juvenil";
  return "Fútbol Aficionado";
};

/**
 * Verifica si la categoría es correcta para la edad
 * @param {number} edad - Edad en años
 * @param {string} categoria - Categoría actual
 * @returns {boolean} - true si es correcta, false si no
 */
export const esCategoriaCorrectaParaEdad = (edad, categoria) => {
  if (edad === null) return true; // Si no hay edad, no validar
  
  const categoriaIdeal = sugerirCategoriaPorEdad(edad);
  return categoria === categoriaIdeal;
};