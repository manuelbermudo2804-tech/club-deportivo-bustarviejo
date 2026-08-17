// Devuelve true si la ficha de jugador pertenece a este usuario:
// familia (padre/tutor), jugador adulto (su propio email) o acceso juvenil del menor.
export function playerBelongsToUser(player, email) {
  if (!player || !email) return false;
  return (
    player.email_padre === email ||
    player.email_tutor_2 === email ||
    player.email_jugador === email ||
    player.acceso_menor_email === email
  );
}

export default playerBelongsToUser;