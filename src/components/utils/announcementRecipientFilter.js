// Regla compartida de destinatarios para anuncios, alertas, banners y confirmaciones.
const normalizeEmail = (v) => String(v || "").trim().toLowerCase();
const normalizeCategory = (v) => String(v || "").trim().toLowerCase();

export function announcementTargetsUser(announcement, user, playerCategories = []) {
  if (!announcement || !user?.email) return false;
  const raw = announcement.destinatarios_emails;
  const targetedEmails = (Array.isArray(raw) ? raw : String(raw || "").split(","))
    .map(normalizeEmail).filter(Boolean);
  const emailMatches = targetedEmails.includes(normalizeEmail(user.email));

  // En modo individual, la lista de emails sustituye por completo al grupo/categoría.
  // Los anuncios antiguos no tienen este campo y mantienen su comportamiento anterior.
  if (announcement.destinatarios_modo === "individual") return emailMatches;

  const targetCategory = normalizeCategory(announcement.destinatarios_tipo);
  if (!targetCategory || targetCategory === "todos") return true;
  const categories = [
    ...(Array.isArray(playerCategories) ? playerCategories : []),
    ...(Array.isArray(user.categorias_entrena) ? user.categorias_entrena : []),
    ...(Array.isArray(user.categorias_coordina) ? user.categorias_coordina : []),
  ].map(normalizeCategory).filter(Boolean);
  return emailMatches || categories.includes(targetCategory);
}
