// Cierre automático de la campaña de lotería por fecha límite.
export const ventaCerrada = (campana) =>
  !!campana?.fecha_cierre && new Date(campana.fecha_cierre).getTime() <= Date.now();

export const textoCierre = (campana) =>
  campana?.fecha_cierre
    ? new Date(campana.fecha_cierre).toLocaleString("es-ES", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })
    : "";

// ISO guardado <-> valor del campo "fecha y hora" del formulario (hora local)
export const isoALocal = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const localAIso = (valor) => (valor ? new Date(valor).toISOString() : "");