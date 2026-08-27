import { createPageUrl } from "@/utils";

const esMayorEdad = (fechaNac) => {
  if (!fechaNac) return false;
  const hoy = new Date();
  const n = new Date(fechaNac);
  let edad = hoy.getFullYear() - n.getFullYear();
  const m = hoy.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) edad--;
  return edad >= 18;
};

// Lista única de cosas que requieren su atención, cada una etiquetada
// con el ámbito al que pertenece (familia o equipo).
export function buildAtencion({ myPlayers = [], callups = [], payments = [], email }) {
  const items = [];
  const hoyStr = new Date().toISOString().split("T")[0];
  const misIds = myPlayers.map((p) => p.id);

  // --- FAMILIA ---
  const pagosPendientes = payments.filter((p) => p.estado === "Pendiente").length;
  if (pagosPendientes > 0) {
    items.push({
      ambito: "familia",
      texto: `${pagosPendientes} ${pagosPendientes === 1 ? "cuota pendiente" : "cuotas pendientes"} de pago`,
      url: createPageUrl("ParentPayments"),
      tono: "rojo",
    });
  }

  let firmas = 0;
  myPlayers.forEach((p) => {
    if (p.enlace_firma_jugador && p.firma_jugador_completada !== true) firmas++;
    if (p.enlace_firma_tutor && p.firma_tutor_completada !== true && !esMayorEdad(p.fecha_nacimiento)) firmas++;
  });
  if (firmas > 0) {
    items.push({
      ambito: "familia",
      texto: `${firmas} ${firmas === 1 ? "firma de federación pendiente" : "firmas de federación pendientes"}`,
      url: createPageUrl("FederationSignatures"),
      tono: "ambar",
    });
  }

  let porConfirmar = 0;
  callups.forEach((c) => {
    if (!c.publicada || c.fecha_partido < hoyStr) return;
    (c.jugadores_convocados || []).forEach((j) => {
      if (misIds.includes(j.jugador_id) && j.confirmacion === "pendiente") porConfirmar++;
    });
  });
  if (porConfirmar > 0) {
    items.push({
      ambito: "familia",
      texto: `${porConfirmar} ${porConfirmar === 1 ? "convocatoria" : "convocatorias"} por confirmar`,
      url: createPageUrl("ParentCallups"),
      tono: "ambar",
    });
  }

  // --- EQUIPO ---
  const misCallups = callups.filter((c) => c.entrenador_email === email && c.fecha_partido >= hoyStr);

  const borradores = misCallups.filter((c) => c.publicada !== true).length;
  if (borradores > 0) {
    items.push({
      ambito: "equipo",
      texto: `${borradores} ${borradores === 1 ? "convocatoria sin publicar" : "convocatorias sin publicar"}`,
      url: createPageUrl("CoachCallups"),
      tono: "rojo",
    });
  }

  let sinRespuesta = 0;
  misCallups.filter((c) => c.publicada === true).forEach((c) => {
    (c.jugadores_convocados || []).forEach((j) => {
      if (j.confirmacion === "pendiente") sinRespuesta++;
    });
  });
  if (sinRespuesta > 0) {
    items.push({
      ambito: "equipo",
      texto: `${sinRespuesta} ${sinRespuesta === 1 ? "familia" : "familias"} sin responder a tus convocatorias`,
      url: createPageUrl("CoachCallups"),
      tono: "ambar",
    });
  }

  return items;
}