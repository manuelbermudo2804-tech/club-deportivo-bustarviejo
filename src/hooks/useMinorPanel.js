import { useState, useEffect } from "react";

// Pestaña activa del panel del menor: "jugador" o "entrenador".
// Se comparte entre el dashboard y la barra inferior mediante localStorage + evento.
const KEY = "minor_panel";
const EVENT = "minorPanelChange";

export function getMinorPanel() {
  try { return localStorage.getItem(KEY) || "jugador"; } catch { return "jugador"; }
}

export function setMinorPanel(value) {
  try { localStorage.setItem(KEY, value); } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
}

export default function useMinorPanel() {
  const [panel, setPanel] = useState(getMinorPanel);

  useEffect(() => {
    const handler = (e) => setPanel(e.detail || getMinorPanel());
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  return [panel, setMinorPanel];
}