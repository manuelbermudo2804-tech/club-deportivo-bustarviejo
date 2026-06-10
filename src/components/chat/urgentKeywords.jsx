// Detección de mensajes urgentes en chats (cancelaciones, cambios de última hora)
// Solo se activa para mensajes de ENTRENADOR a grupo, para evitar falsos positivos

const URGENT_KEYWORDS = [
  // Cancelaciones
  'cancelado', 'cancelada', 'cancelar', 'cancelamos',
  'suspendido', 'suspendida', 'suspender',
  'anulado', 'anulada', 'anular',
  'no hay entreno', 'no hay entrenamiento', 'no hay partido',
  'sin entreno', 'sin entrenamiento',
  // Cambios urgentes
  'cambio de hora', 'cambia la hora', 'cambiamos la hora',
  'cambio de campo', 'cambio de sitio', 'cambio de lugar', 'cambio de ubicación',
  'cambiamos de campo', 'cambiamos de sitio',
  // Mal tiempo
  'mal tiempo', 'lluvia', 'lloviendo', 'tormenta', 'granizo',
  // Urgencia explícita
  'urgente', '¡urgente!', 'importante', 'atención',
];

/**
 * Detecta si un mensaje contiene palabras clave de urgencia.
 * Solo se aplica a mensajes de entrenador/sistema (no a mensajes normales de familias).
 */
export function isUrgentMessage(message) {
  if (!message) return false;

  // Solo destacar mensajes de entrenador o sistema (no spam de familias)
  const isCoachOrSystem =
    message.tipo === 'entrenador_a_grupo' ||
    message.tipo === 'sistema';
  if (!isCoachOrSystem) return false;

  const text = (message.mensaje || '').toLowerCase().trim();
  if (!text) return false;

  return URGENT_KEYWORDS.some(kw => text.includes(kw));
}