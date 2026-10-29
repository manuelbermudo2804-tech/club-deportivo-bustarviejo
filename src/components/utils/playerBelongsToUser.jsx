// Devuelve true si la ficha de jugador pertenece a este usuario:
// familia (padre/tutor), jugador adulto o acceso juvenil del menor.
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export function playerBelongsToUser(player, email) {
  const target = normalizeEmail(email);
  if (!player || !target) return false;
  return [
    player.email_padre,
    player.email_tutor_2,
    player.email_jugador,
    player.acceso_menor_email,
  ].some(value => normalizeEmail(value) === target);
}

export default playerBelongsToUser;
