import { base44 } from "@/api/base44Client";

/**
 * Casos de cambio de correo de una familia: si el email con el que entra el usuario
 * ya figura en la ficha de algún jugador (tutor o jugador adulto), le damos acceso
 * directo sin pedirle código.
 * Devuelve el tipo_panel asignado o null si no hay coincidencia.
 */
export async function autoValidateByPlayerEmail(email) {
  if (!email) return null;
  const lower = email.toLowerCase();

  const [asTutor1, asTutor2, asPlayer] = await Promise.all([
    base44.entities.Player.filter({ email_padre: lower }),
    base44.entities.Player.filter({ email_tutor_2: lower }),
    base44.entities.Player.filter({ email_jugador: lower }),
  ]);

  let tipoPanel = null;
  if (asTutor1.length > 0 || asTutor2.length > 0) tipoPanel = "familia";
  else if (asPlayer.length > 0) tipoPanel = "jugador";
  if (!tipoPanel) return null;

  await base44.auth.updateMe({
    tipo_panel: tipoPanel,
    codigo_acceso_validado: true,
    fecha_validacion_codigo: new Date().toISOString(),
    acceso_automatico_por_ficha: true,
  });

  return tipoPanel;
}