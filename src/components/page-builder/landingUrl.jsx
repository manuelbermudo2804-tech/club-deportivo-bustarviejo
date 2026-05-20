// Dominio público canónico para los enlaces que se comparten fuera de la app.
// Forzamos siempre app.cdbustarviejo.com aunque el admin esté navegando desde
// otro dominio (preview de Base44, base44.app, dominio antiguo, etc.).
export const PUBLIC_LANDING_ORIGIN = "https://app.cdbustarviejo.com";

export function buildLandingUrl(slug) {
  if (!slug) return "";
  return `${PUBLIC_LANDING_ORIGIN}/l/${slug}`;
}