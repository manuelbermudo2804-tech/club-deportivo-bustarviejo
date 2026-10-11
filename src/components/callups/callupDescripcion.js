// Oculta el texto automático de RFFM una vez publicada (solo tiene sentido en borrador)
export default function callupDescripcion(callup) {
  const d = callup?.descripcion || "";
  if (callup?.publicada && d.startsWith("Borrador creado automáticamente")) return "";
  return d;
}