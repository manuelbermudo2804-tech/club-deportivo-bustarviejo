import { useState, useEffect } from "react";

// Pestaña activa del panel multi-rol: "coordinador" | "entrenador" | "familia".
// Se comparte entre la página del panel y la barra inferior (localStorage + evento),
// igual que el panel del jugador menor.
const KEY = "role_panel";
const EVENT = "rolePanelChange";

export function getRolePanel() {
  try { return localStorage.getItem(KEY) || ""; } catch { return ""; }
}

export function setRolePanel(value) {
  try { localStorage.setItem(KEY, value); } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
}

export default function useRolePanel() {
  const [panel, setPanel] = useState(getRolePanel);

  useEffect(() => {
    const handler = (e) => setPanel(e?.detail || getRolePanel());
    const resync = () => setPanel(getRolePanel());
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

  return [panel, setRolePanel];
}