import { getRecentErrors } from "@/lib/diagnosticLogger";

// Construye el contexto técnico que se adjunta automáticamente a cada feedback,
// para que el admin no dependa de que el usuario sepa explicar qué le pasó.
export function buildContextoTecnico(user) {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const esPwa =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true);

  let dispositivo = "Ordenador";
  if (/iPad|iPhone|iPod/.test(ua)) dispositivo = `iPhone/iPad${(ua.match(/OS (\d+)/) || [])[1] ? " iOS " + ua.match(/OS (\d+)/)[1] : ""}`;
  else if (/Android/i.test(ua)) dispositivo = `Android${(ua.match(/Android (\d+)/) || [])[1] ? " " + ua.match(/Android (\d+)/)[1] : ""}`;

  const rol =
    user?.role === "admin"
      ? "admin"
      : user?.es_entrenador
      ? "entrenador"
      : user?.es_coordinador
      ? "coordinador"
      : user?.es_tesorero
      ? "tesorero"
      : user?.tipo_panel || "usuario";

  const lineas = [
    `Rol: ${rol}`,
    `Dispositivo: ${dispositivo}`,
    `App instalada (PWA): ${esPwa ? "Sí" : "No"}`,
    `Ruta: ${typeof window !== "undefined" ? window.location.pathname : "?"}`,
    `Pantalla: ${typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "?"}`,
    `Conexión: ${navigator?.onLine === false ? "Sin conexión" : navigator?.connection?.effectiveType || "?"}`,
    `Navegador: ${ua.slice(0, 200)}`,
  ];

  return lineas.join("\n");
}

export function buildErroresRecientes() {
  const errores = getRecentErrors();
  if (errores.length === 0) return "";
  return errores
    .map((e) => `· ${e.hora.slice(11, 19)} [${e.pagina}] ${e.contexto}: ${e.mensaje}`)
    .join("\n");
}