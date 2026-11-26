// Regla ÚNICA para el enlace de Google Maps de un campo de la Federación.
// Es la misma que usan las funciones del servidor (rffmScheduleMonitor y publicData):
// si cambias algo aquí, cámbialo también allí.
// - Nombres completos ("TORRELAGUNA - PVO. MPAL ANTONIO MARTÍN F7") se buscan tal cual.
// - Solo el pueblo ("BUSTARVIEJO (HA)") o abreviados ("ALGETE - URBANIZ. STO. DOMINGO")
//   se buscan como "Campo de fútbol <sitio>, <pueblo>".
export function campoMapsUrl(nombre, localidad) {
  const limpio = String(nombre || "").replace(/\s*\(H\.?A\.?\)/gi, "").trim();
  if (!limpio) return "";
  const conGuion = limpio.includes(" - ");
  const problematico = !conGuion || /URBANIZ\.|\bSTO\.|\bSTA\./i.test(limpio);
  let query = limpio;
  if (problematico) {
    const pueblo = localidad || limpio.split(" - ")[0].trim();
    const sitio = (conGuion ? limpio.split(" - ").slice(1).join(" - ") : limpio)
      .replace(/URBANIZ\./gi, "Urbanización").replace(/\bSTO\./gi, "Santo").replace(/\bSTA\./gi, "Santa").trim();
    query = `Campo de fútbol ${sitio}, ${pueblo}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// Enlace a mostrar para una convocatoria: el guardado (puede estar corregido a mano) o la regla.
export function callupMapsUrl(callup) {
  return callup?.enlace_ubicacion || campoMapsUrl(callup?.ubicacion);
}