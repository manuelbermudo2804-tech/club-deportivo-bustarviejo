import { useState, useEffect, useMemo } from "react";
import { createPageUrl } from "@/utils";

// Panel activo para usuarios con varios roles (coordinador, entrenador, familia, jugador...).
// Se guarda en localStorage y se comparte entre el panel, el menú lateral y la barra inferior.
const KEY = "role_panel";
const EVENT = "rolePanelChange";

// Definición de cada panel disponible. El orden marca la prioridad por defecto.
export const PANEL_DEFS = [
  { key: "admin", emoji: "🛡️", label: "Admin", page: "Home" },
  { key: "coordinador", emoji: "🧭", label: "Coordinador", page: "CoordinatorDashboard" },
  { key: "tesorero", emoji: "💰", label: "Tesorería", page: "TreasurerDashboard" },
  { key: "entrenador", emoji: "🧢", label: "Entrenador", page: "CoachDashboard" },
  { key: "familia", emoji: "👨‍👩‍👦", label: "Familia", page: "ParentDashboard" },
  { key: "jugador", emoji: "⚽", label: "Jugador", page: "PlayerDashboard" },
];

export function getPanelDef(key) {
  return PANEL_DEFS.find((p) => p.key === key) || null;
}

export function getPanelUrl(key) {
  const def = getPanelDef(key);
  return def ? createPageUrl(def.page) : null;
}

// Paneles a los que este usuario tiene acceso real (según sus permisos actuales)
export function getAvailablePanels({ isAdmin, isCoordinator, isTreasurer, isCoach, isPlayer, hasPlayers }) {
  const keys = [];
  if (isAdmin) keys.push("admin");
  if (isCoordinator) keys.push("coordinador");
  if (isTreasurer) keys.push("tesorero");
  if (isCoach) keys.push("entrenador");
  if (hasPlayers) keys.push("familia");
  if (isPlayer) keys.push("jugador");
  return keys;
}

export function getStoredRolePanel() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function setRolePanel(value) {
  try { localStorage.setItem(KEY, value); } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
}

/**
 * Devuelve [panelActivo, cambiarPanel]. El panel activo siempre es uno
 * de los disponibles; si el guardado ya no lo está, cae al primero.
 */
export default function useRolePanel(availablePanels) {
  const [stored, setStored] = useState(getStoredRolePanel);

  useEffect(() => {
    const handler = (e) => setStored(e?.detail || getStoredRolePanel());
    const resync = () => setStored(getStoredRolePanel());
    window.addEventListener(EVENT, handler);
    window.addEventListener("popstate", resync);
    window.addEventListener("pageshow", resync);
    window.addEventListener("storage", resync);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("popstate", resync);
      window.removeEventListener("pageshow", resync);
      window.removeEventListener("storage", resync);
    };
  }, []);

  const panel = useMemo(() => {
    if (!availablePanels || availablePanels.length === 0) return null;
    if (stored && availablePanels.includes(stored)) return stored;
    return availablePanels[0];
  }, [stored, availablePanels?.join(",")]);

  return [panel, setRolePanel];
}