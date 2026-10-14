import { useEffect } from "react";

// Los modos claro/oscuro/automático se han retirado: rompían la lectura de chats.
// Este componente solo limpia el tema guardado para que todos vean la app en su modo normal.
export default function ThemeToggle() {
  useEffect(() => {
    document.body.classList.remove("theme-dark", "theme-light");
    localStorage.removeItem("theme");
  }, []);
  return null;
}