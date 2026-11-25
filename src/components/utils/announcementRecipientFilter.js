// Regla compartida de destinatarios para anuncios, alertas, banners y confirmaciones.
const normalizeEmail = (v) => String(v || "").trim().toLowerCase();
const normalizeCategory = (v) => String(v || "").trim().toLowerCase();

export function getAnnouncementCategories(announcement) {
  const raw = announcement?.destinatarios_tipos;
  const values = Array.isArray(raw) ? raw : (raw ? [raw] : [announcement?.destinatarios_tipo || "Todos"]);
  const cleaned = [...new Set(values.map(v => String(v || "").trim()).filter(Boolean))];
  return cleaned.includes("Todos") || cleaned.length === 0 ? ["Todos"] : cleaned;
}

export function announcementTargetsUser(announcement, user, playerCategories = []) {
  if (!announcement || !user?.email) return false;
  const raw = announcement.destinatarios_emails;
  const targetedEmails = (Array.isArray(raw) ? raw : String(raw || "").split(","))
    .map(normalizeEmail).filter(Boolean);
  const emailMatches = targetedEmails.includes(normalizeEmail(user.email));

  // En modo individual, la lista de emails sustituye por completo al grupo/categoría.
  // Los anuncios antiguos no tienen este campo y mantienen su comportamiento anterior.
  if (announcement.destinatarios_modo === "individual") return emailMatches;

  const targetCategories = getAnnouncementCategories(announcement).map(normalizeCategory);
  if (!targetCategories.length || targetCategories.includes("todos")) return true;
  const categories = [
    ...(Array.isArray(playerCategories) ? playerCategories : []),
    ...(Array.isArray(user.categorias_entrena) ? user.categorias_entrena : []),
    ...(Array.isArray(user.categorias_coordina) ? user.categorias_coordina : []),
  ].map(normalizeCategory).filter(Boolean);
  return emailMatches || targetCategories.some(category => categories.includes(category));
}
