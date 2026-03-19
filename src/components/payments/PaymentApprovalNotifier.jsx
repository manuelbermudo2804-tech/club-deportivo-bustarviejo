/**
 * PaymentApprovalNotifier — DESACTIVADO
 * 
 * La lógica de notificación de pagos aprobados ahora se ejecuta desde el BACKEND
 * mediante una entity automation en Payment (update) → función onPaymentApproved.
 * 
 * Esto elimina ~5.760 queries/día que generaba el polling cada 15 segundos.
 * 
 * El componente se mantiene como stub para no romper las importaciones en Layout.
 */
export default function PaymentApprovalNotifier() {
  return null;
}