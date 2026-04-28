/**
 * DEPRECATED — sustituido por la scheduled automation que invoca
 * functions/sendRenewalReminders (1 vez al día, con idempotencia por umbral).
 *
 * Mantenido como no-op para compatibilidad con imports existentes.
 */
export default function RenewalNotificationEngine() {
  return null;
}