// Usuarios en pruebas del panel unificado (varios roles en una sola pantalla).
// Mientras esté en pruebas, solo estos emails lo ven.
const MULTI_PANEL_EMAILS = [
  "beatrizm_gonzalez@hotmail.com",
];

export function isMultiPanelUser(email) {
  if (!email) return false;
  return MULTI_PANEL_EMAILS.includes(email.trim().toLowerCase());
}