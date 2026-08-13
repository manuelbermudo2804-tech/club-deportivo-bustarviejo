// Las 5 opciones que ve el entrenador al decidir. Compartidas entre el
// diálogo real y el simulador para que sean exactamente iguales.
export const DECISION_OPCIONES = [
  { key: "mantener", label: "✅ MANTENER", desc: "Se entrena con normalidad" },
  { key: "semicubierto", label: "🔄 LLEVAR AL SEMICUBIERTO", desc: "Misma hora, otra instalación" },
  { key: "modificar", label: "⚠️ MODIFICAR", desc: "Menos tiempo o sesión ligera" },
  { key: "aplazar", label: "⏰ APLAZAR", desc: "Se cambia la hora" },
  { key: "cancelar", label: "❌ CANCELAR", desc: "No hay entrenamiento" },
  { key: "otro", label: "✏️ OTRO AVISO", desc: "Recoger antes, cambio de campo, cualquier cosa" },
];

// Mensaje que se propone a las familias según la decisión.
export function mensajeAviso({ decision, categoria, horaInicio, semicubierto, nuevaHora }) {
  const base = `${categoria} · hoy ${horaInicio}`;
  if (decision === "semicubierto") return `🔄 Cambio de instalación. El entrenamiento de ${base} se traslada a ${semicubierto}. Misma hora.`;
  if (decision === "modificar") return `⚠️ El entrenamiento de ${base} se mantiene con sesión adaptada por el tiempo.`;
  if (decision === "aplazar") return `⏰ El entrenamiento de ${base} se aplaza${nuevaHora ? ` a las ${nuevaHora}` : ""}.`;
  if (decision === "cancelar") return `❌ El entrenamiento de ${base} queda cancelado por el tiempo.`;
  if (decision === "otro") return `ℹ️ Aviso sobre el entrenamiento de ${base}: `;
  return "";
}