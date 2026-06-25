/**
 * Hook de red de seguridad para PublicForm del PageBuilder.
 * - Registra eventos clave (page_view, form_started, submit_attempt, submit_error,
 *   submit_success, validation_failed, file_upload_error, form_abandoned)
 *   en UploadDiagnostic vía la función pública `logPublicEvent`.
 * - Guarda un snapshot del formulario en localStorage para poder rescatar
 *   inscripciones perdidas si el usuario abandona o el envío falla.
 *
 * No bloquea nunca: si logPublicEvent falla, se silencia.
 */
import { useEffect, useRef } from "react";

const getSessionId = (slug) => {
  try {
    const k = `pf_session_${slug || "default"}`;
    let sid = sessionStorage.getItem(k);
    if (!sid) {
      sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(k, sid);
    }
    return sid;
  } catch {
    return `s_${Date.now().toString(36)}`;
  }
};

const snapshotKey = (slug) => `pf_draft_${slug || "default"}`;

const safeFetch = (url, body) => {
  try {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch {}
};

export default function usePublicFormTracker({ landingSlug, landingId, getValues, isSent }) {
  const sessionIdRef = useRef(getSessionId(landingSlug));
  const formStartedLoggedRef = useRef(false);
  const valuesRef = useRef({});
  const abandonedLoggedRef = useRef(false);
  const sentRef = useRef(!!isSent);

  // Mantener refs vivas
  useEffect(() => { valuesRef.current = getValues?.() || {}; });
  useEffect(() => { sentRef.current = !!isSent; }, [isSent]);

  const baseEvent = (accion, detalles = {}, severidad = "info") => ({
    event_type: "app_error",
    context: `PublicLanding[${landingSlug || "?"}] · ${accion}`,
    error_message: detalles.motivo || detalles.mensaje || accion,
    user_email: detalles.email || valuesRef.current?.email || "anónimo",
    page_path: typeof window !== "undefined" ? `/l/${landingSlug}` : null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    device: typeof navigator !== "undefined" && /Mobile|Android|iPhone/.test(navigator.userAgent) ? "móvil" : "desktop",
    extra_data: { accion, severidad, landing_id: landingId, ...detalles },
    severity: severidad === "error" ? "error" : severidad === "warning" ? "warning" : "info",
    session_id: sessionIdRef.current,
  });

  const trackEvent = (accion, detalles = {}, severidad = "info") => {
    if (typeof window === "undefined") return;
    safeFetch(`${window.location.origin}/functions/logPublicEvent`, baseEvent(accion, detalles, severidad));
  };

  // ---- Page view (1 vez por sesión de pestaña) ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    const visitKey = `pf_visit_${landingSlug || "default"}`;
    try {
      if (sessionStorage.getItem(visitKey)) return;
      sessionStorage.setItem(visitKey, "1");
    } catch {}
    trackEvent("page_view", {
      referrer: typeof document !== "undefined" ? (document.referrer || "") : "",
      screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      language: navigator?.language || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landingSlug]);

  // ---- Abandono de formulario (cierre/ocultación de pestaña con datos rellenos) ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleHide = () => {
      if (abandonedLoggedRef.current || sentRef.current) return;
      const v = valuesRef.current || {};
      const filledCount = Object.values(v).filter((x) => x !== undefined && x !== null && String(x).trim() !== "" && x !== false).length;
      if (filledCount < 2) return; // ignoramos abandonos triviales
      abandonedLoggedRef.current = true;
      safeFetch(`${window.location.origin}/functions/logPublicEvent`, baseEvent("form_abandoned", {
        mensaje: "Usuario abandonó el formulario sin enviar",
        form_data: v,
        campos_rellenos: filledCount,
      }, "warning"));
    };
    const onVis = () => { if (document.visibilityState === "hidden") handleHide(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", handleHide);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", handleHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landingSlug, landingId]);

  // ---- Snapshot del formulario en localStorage para rescate ----
  const saveDraft = () => {
    try {
      const data = { values: valuesRef.current, ts: Date.now(), slug: landingSlug };
      localStorage.setItem(snapshotKey(landingSlug), JSON.stringify(data));
    } catch {}
  };

  const clearDraft = () => {
    try { localStorage.removeItem(snapshotKey(landingSlug)); } catch {}
  };

  const logFormStartedOnce = () => {
    if (formStartedLoggedRef.current) return;
    formStartedLoggedRef.current = true;
    trackEvent("form_started");
  };

  // ---- Pre-registro: guarda el equipo en cuanto hay nombre de equipo + contacto ----
  // Así nunca se pierde un equipo que empezó a apuntarse aunque no termine el formulario.
  const preRegistroSavedRef = useRef(false);

  const pickByKeyword = (v, keywords) => {
    for (const [k, val] of Object.entries(v || {})) {
      if (val === undefined || val === null || String(val).trim() === "") continue;
      const lk = k.toLowerCase();
      if (keywords.some((kw) => lk.includes(kw))) return String(val).trim();
    }
    return "";
  };

  const savePreRegistro = (completada = false) => {
    if (typeof window === "undefined") return;
    const v = valuesRef.current || {};
    const nombre_equipo = v.nombre_equipo || pickByKeyword(v, ["equipo"]) || "";
    const email = v.email || pickByKeyword(v, ["email", "correo"]) || "";
    const telefono = v.telefono || pickByKeyword(v, ["telefono", "teléfono", "movil", "móvil", "tel"]) || "";
    const nombre = v.nombre || v.responsable || pickByKeyword(v, ["responsable", "nombre"]) || "";
    const contacto = email || telefono;
    // Solo guardamos si hay algo identificable + un dato de contacto
    if (!completada && (!(nombre_equipo || nombre) || !contacto)) return;
    if (preRegistroSavedRef.current && !completada) {
      // Ya guardado: solo re-guardamos al completar o periódicamente desde saveDraft
    }
    preRegistroSavedRef.current = true;
    safeFetch(`${window.location.origin}/functions/savePreInscripcion`, {
      landing_slug: landingSlug,
      landing_page_id: landingId,
      session_id: sessionIdRef.current,
      nombre_equipo,
      nombre,
      email,
      telefono,
      datos: v,
      completada,
    });
  };

  return {
    trackEvent,
    logFormStartedOnce,
    saveDraft,
    clearDraft,
    savePreRegistro,
    sessionId: sessionIdRef.current,
  };
}