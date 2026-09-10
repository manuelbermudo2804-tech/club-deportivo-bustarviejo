/**
 * Validación de correos dentro de una misma familia.
 * Regla: el correo del jugador/menor NO puede ser el mismo que el de sus
 * progenitores, y el del segundo progenitor no puede repetir otro correo
 * ya usado en la ficha. Si se repite, la app no sabría a quién dar acceso.
 */

const norm = (email) => (email || "").trim().toLowerCase();

/**
 * Comprueba el correo del jugador/menor contra los de los progenitores.
 * Devuelve un mensaje de error, o null si es válido.
 */
export const validarEmailJugador = (emailJugador, player) => {
  const email = norm(emailJugador);
  if (!email) return null;
  if (email === norm(player?.email_padre)) {
    return "Este correo es el del primer progenitor. El jugador necesita un correo propio y distinto.";
  }
  if (email === norm(player?.email_tutor_2)) {
    return "Este correo es el del segundo progenitor. El jugador necesita un correo propio y distinto.";
  }
  return null;
};

/**
 * Comprueba el correo del segundo progenitor contra el resto de la ficha.
 * Devuelve un mensaje de error, o null si es válido.
 */
export const validarEmailSegundoProgenitor = (emailTutor2, player) => {
  const email = norm(emailTutor2);
  if (!email) return null;
  if (email === norm(player?.email_padre)) {
    return "Este correo ya es el del primer progenitor. El segundo progenitor necesita su propio correo.";
  }
  if (email === norm(player?.email_jugador) || email === norm(player?.acceso_menor_email)) {
    return "Este correo es el que usa el jugador para entrar. Usa un correo distinto para el segundo progenitor.";
  }
  return null;
};