/**
 * Logger central de diagnóstico.
 * Guarda errores, eventos del wizard y errores JS globales
 * en la entidad UploadDiagnostic (compartida con el centro de diagnóstico).
 *
 * Diseñado para ser ULTRA seguro: nunca tira excepciones al caller,
 * nunca bloquea la UI. Si falla guardando, lo intenta una vez con setTimeout.
 */
import { base44 } from "@/api/base44Client";

// Detección básica de dispositivo (sin librerías)
function detectDevice() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  const isPwa = typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true);
  const mode = isPwa ? "PWA" : "Browser";
  if (/iPad|iPhone|iPod/.test(ua)) {
    const m = ua.match(/OS (\d+)/);
    return `iOS${m ? m[1] : ""} ${mode}`;
  }
  if (/Android/i.test(ua)) {
    const m = ua.match(/Android (\d+)/);
    return `Android${m ? m[1] : ""} ${mode}`;
  }
  if (/Windows/i.test(ua)) return `Windows ${mode}`;
  if (/Mac/i.test(ua)) return `Mac ${mode}`;
  return `Desktop ${mode}`;
}

function isPwa() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

async function getUserEmail() {
  try {
    const u = await base44.auth.me();
    return u?.email || "anonymous";
  } catch {
    return "anonymous";
  }
}

async function writeEvent(payload) {
  try {
    await base44.entities.UploadDiagnostic.create(payload);
  } catch {
    // Reintento silencioso a los 2s (por si fue rate-limit transitorio)
    setTimeout(() => {
      try { base44.entities.UploadDiagnostic.create(payload); } catch {}
    }, 2000);
  }
}

/**
 * Registra un error de la app (manejado en try/catch).
 * @param {string} context  Identificador legible (ej: "ParentPayments.handleSubmit")
 * @param {Error|string} error  Error capturado
 * @param {object} [extra]  Datos extra opcionales
 */
export async function logError(context, error, extra = {}) {
  try {
    const email = await getUserEmail();
    await writeEvent({
      user_email: email,
      event_type: "app_error",
      context: String(context || "unknown").slice(0, 200),
      error_message: (error?.message || String(error) || "").slice(0, 500),
      device: detectDevice(),
      is_pwa: isPwa(),
      user_agent: navigator?.userAgent?.slice(0, 300) || "",
      page_path: window?.location?.pathname || "",
      severity: extra.severity || "error",
      extra_data: {
        stack: error?.stack?.slice(0, 1000) || null,
        ...extra,
      },
    });
  } catch {}
}

/**
 * Registra un error JavaScript no manejado (vigilante global).
 */
export async function logJsError({ message, source, lineno, colno, error, type = "error" }) {
  try {
    const email = await getUserEmail();
    await writeEvent({
      user_email: email,
      event_type: "js_error",
      context: `${type}:${source || "window"}`.slice(0, 200),
      error_message: String(message || error?.message || "Unknown JS error").slice(0, 500),
      device: detectDevice(),
      is_pwa: isPwa(),
      user_agent: navigator?.userAgent?.slice(0, 300) || "",
      page_path: window?.location?.pathname || "",
      severity: "error",
      extra_data: {
        source: source || null,
        line: lineno || null,
        column: colno || null,
        stack: error?.stack?.slice(0, 1000) || null,
      },
    });
  } catch {}
}

/**
 * Registra el paso de un wizard (alta de jugador u otros).
 * @param {string} wizardName  Identificador del wizard (ej: "PlayerFormWizard")
 * @param {number} stepNum  Número del paso (1, 2, 3...)
 * @param {string} stepName  Nombre legible del paso
 * @param {object} [extra]  { action: "enter"|"complete"|"abandon", durationMs }
 */
export async function trackWizardStep(wizardName, stepNum, stepName, extra = {}) {
  try {
    const email = await getUserEmail();
    await writeEvent({
      user_email: email,
      event_type: "wizard_step",
      context: `${wizardName}:step_${stepNum}`,
      device: detectDevice(),
      is_pwa: isPwa(),
      page_path: window?.location?.pathname || "",
      extra_data: {
        wizard: wizardName,
        step_num: stepNum,
        step_name: stepName,
        action: extra.action || "enter",
        duration_ms: extra.durationMs || null,
        ...extra,
      },
    });
  } catch {}
}

/**
 * Instala los vigilantes globales de errores JS.
 * Se debe llamar UNA SOLA VEZ al arrancar la app.
 */
let installed = false;
export function installGlobalErrorHandlers() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // Throttle: máximo 10 errores por minuto para evitar bucles
  const recent = [];
  const shouldLog = () => {
    const now = Date.now();
    while (recent.length && now - recent[0] > 60000) recent.shift();
    if (recent.length >= 10) return false;
    recent.push(now);
    return true;
  };

  window.addEventListener("error", (e) => {
    if (!shouldLog()) return;
    // Ignorar errores de extensiones y ResizeObserver (ruido)
    const msg = String(e?.message || "");
    if (msg.includes("ResizeObserver") || msg.includes("Script error") || msg.includes("extension")) return;
    logJsError({
      message: e.message,
      source: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      error: e.error,
      type: "error",
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    if (!shouldLog()) return;
    const reason = e?.reason;
    const msg = String(reason?.message || reason || "");
    // Ignorar errores típicos de cancelación
    if (msg.includes("AbortError") || msg.includes("cancelled")) return;
    logJsError({
      message: msg,
      error: reason instanceof Error ? reason : null,
      type: "unhandledrejection",
    });
  });
}