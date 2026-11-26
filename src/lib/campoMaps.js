// Regla ÚNICA para el enlace de Google Maps de un campo de la Federación.
// Es la misma que usan las funciones del servidor (rffmScheduleMonitor y publicData):
// si cambias algo aquí, cámbialo también allí.
// - Nombres completos ("TORRELAGUNA - PVO. MPAL ANTONIO MARTÍN F7") se buscan tal cual.
// - Solo el pueblo ("BUSTARVIEJO (HA)") o abreviados ("ALGETE - URBANIZ. STO. DOMINGO")
//   se buscan como "Campo de fútbol <sitio>, <pueblo>".
import { base44 } from "@/api/base44Client";

// Fichas de campo de la Federación (coordenadas exactas). Se cargan una vez al abrir la app
// y tienen prioridad sobre la búsqueda por nombre.
const normCampo = (n) => String(n || "").replace(/\s*\(H\.?A\.?\)/gi, "").replace(/\s+/g, " ").trim().toUpperCase();
let camposPorNombre = new Map();
base44.entities.CampoRffm.list("-updated_date", 500)
  .then((campos) => { camposPorNombre = new Map((campos || []).filter((c) => c.maps_url).map((c) => [normCampo(c.nombre), c.maps_url])); })
  .catch(() => {});

export function campoMapsUrl(nombre, localidad) {
  const ficha = camposPorNombre.get(normCampo(nombre));
  if (ficha) return ficha;
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