// Usuarios en pruebas del panel por pestañas (varios roles a la vez).
// Mientras esté en pruebas, solo estos emails ven las pestañas de panel.
const MULTI_PANEL_EMAILS = [
  "beatrizm_gonzalez@hotmail.com",
];

export function isMultiPanelUser(email) {
  if (!email) return false;
  return MULTI_PANEL_EMAILS.includes(email.trim().toLowerCase());
}

// Pestañas disponibles según los roles reales del usuario
export function getPanelTabs(user) {
  if (!user) return [];
  const tabs = [];
  if (user.es_coordinador === true) tabs.push("coordinador");
  if (user.es_entrenador === true) tabs.push("entrenador");
  tabs.push("familia");
  return tabs;
}