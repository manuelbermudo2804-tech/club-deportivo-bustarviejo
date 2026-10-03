export const fmtFecha = (f) => (f ? f.split("-").reverse().join("/") : "");

export function estadoRM(fecha) {
  if (!fecha) return { label: "Sin reconocimiento", cls: "bg-red-100 text-red-700 border-red-200", orden: 0 };
  const dias = Math.ceil((new Date(fecha) - new Date()) / 86400000);
  if (dias < 0) return { label: `Caducado ${fmtFecha(fecha)}`, cls: "bg-red-100 text-red-700 border-red-200", orden: 1, dias };
  if (dias <= 60) return { label: `Vence ${fmtFecha(fecha)} (${dias}d)`, cls: "bg-orange-100 text-orange-700 border-orange-200", orden: 2, dias };
  return { label: `Vigente hasta ${fmtFecha(fecha)}`, cls: "bg-green-100 text-green-700 border-green-200", orden: 3, dias };
}