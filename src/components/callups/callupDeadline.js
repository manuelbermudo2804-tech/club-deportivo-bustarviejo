// Lógica única del plazo de respuesta de una convocatoria.
// fecha_limite_respuesta se guarda como "YYYY-MM-DDTHH:mm" en hora local.

export const getDeadlineDate = (callup) => {
  if (!callup?.fecha_limite_respuesta) return null;
  const d = new Date(callup.fecha_limite_respuesta);
  return isNaN(d.getTime()) ? null : d;
};

export const isDeadlinePassed = (callup) => {
  const d = getDeadlineDate(callup);
  return !!d && d.getTime() < Date.now();
};

// Se puede responder si la convocatoria está abierta y no ha vencido el plazo
export const canRespond = (callup) =>
  !callup?.cerrada &&
  callup?.estado_convocatoria !== 'cancelada' &&
  !isDeadlinePassed(callup);

export const formatDeadline = (callup) => {
  const d = getDeadlineDate(callup);
  if (!d) return "";
  return d.toLocaleString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  });
};