const CAMPO_MUNICIPAL_MAPS = "https://maps.app.goo.gl/qZKDqVyS6YuH8uZV8";

export function getCallupMapsUrl(callup) {
  const savedLink = (callup?.enlace_ubicacion || "").trim();
  if (savedLink) return savedLink;

  const location = (callup?.ubicacion || "").trim();
  if (!location) return "";

  // Compatibilidad con convocatorias antiguas del campo local.
  if (/campo municipal|municipal de bustarviejo/i.test(location)) {
    return CAMPO_MUNICIPAL_MAPS;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export function isGoogleMapsUrl(value) {
  try {
    const url = new URL((value || "").trim());
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (
      host === "maps.app.goo.gl" ||
      host === "goo.gl" ||
      host === "google.com" ||
      host.endsWith(".google.com") ||
      host === "google.es" ||
      host.endsWith(".google.es")
    );
  } catch {
    return false;
  }
}
