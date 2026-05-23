// Helper para generar mensajes de WhatsApp para recordatorios de pago
// El admin pulsa el botón → se abre WhatsApp con el mensaje pre-rellenado

/**
 * Normaliza un número de teléfono al formato internacional E.164 (sin +)
 * Asume España (34) si no tiene prefijo internacional
 */
export function normalizePhoneForWhatsApp(telefono) {
  if (!telefono) return null;
  // Quitar todo lo que no sea número
  let clean = String(telefono).replace(/[^0-9]/g, '');
  if (!clean) return null;
  // Si empieza por 00, quitar el 00
  if (clean.startsWith('00')) clean = clean.slice(2);
  // Si tiene 9 dígitos (móvil/fijo español sin prefijo), añadir 34
  if (clean.length === 9) clean = '34' + clean;
  return clean;
}

/**
 * Construye el mensaje de recordatorio para WhatsApp (en texto plano)
 * Acepta una familia con la misma estructura que usa PaymentReminders
 */
export function buildWhatsAppReminderMessage({ family, clubIban, clubBank, selectedPayments = null }) {
  const nombreTutor = family.nombre_tutor || 'familia';
  let mensaje = `Hola ${nombreTutor} 👋\n\nTe escribo desde *CD Bustarviejo* para recordarte los pagos pendientes:\n\n`;

  let totalRecordatorio = 0;
  family.jugadores.forEach(jugador => {
    if (!jugador.hasPendingPayments) return;

    // Si se han seleccionado pagos específicos, filtrar
    const monthsToInclude = selectedPayments
      ? jugador.pendingMonths.filter(m => (selectedPayments[jugador.id] || []).includes(m.mes))
      : jugador.pendingMonths;

    if (monthsToInclude.length === 0) return;

    mensaje += `👤 *${jugador.nombre}* (${jugador.deporte}):\n`;
    monthsToInclude.forEach(m => {
      mensaje += `   • ${m.mes}: ${m.cantidad}€\n`;
      totalRecordatorio += m.cantidad;
    });
    mensaje += `\n`;
  });

  mensaje += `💰 *Total pendiente: ${totalRecordatorio}€*\n\n`;
  mensaje += `🏦 *Datos bancarios:*\n`;
  mensaje += `IBAN: ${clubIban}\n`;
  mensaje += `Banco: ${clubBank}\n`;
  mensaje += `Beneficiario: CD Bustarviejo\n\n`;
  mensaje += `Por favor, realiza el pago y sube el justificante en la app 📱\n\n`;
  mensaje += `Cualquier duda, escríbenos por aquí 🙂\n\n`;
  mensaje += `Gracias,\n*CD Bustarviejo*`;

  return mensaje;
}

/**
 * Abre WhatsApp con el mensaje pre-rellenado
 * Devuelve true si se pudo abrir, false si faltan datos
 */
export function openWhatsAppReminder({ telefono, mensaje }) {
  const phone = normalizePhoneForWhatsApp(telefono);
  if (!phone) return false;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}