import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Users, AlertCircle, ShieldCheck, Upload, Tag, BellRing } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import PaymentOptionsSelector from "./PaymentOptionsSelector";
import usePublicFormTracker from "./usePublicFormTracker";

// Validadores
const validDNI = (s) => {
  const v = (s || "").toUpperCase().trim();
  if (!/^[0-9]{8}[A-Z]$/.test(v)) return false;
  const letras = "TRWAGMYFPDXBNJZSQVHLCKE";
  return letras[parseInt(v.slice(0, 8)) % 23] === v[8];
};
const validIBAN = (s) => {
  const v = (s || "").replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v)) return false;
  // Validación módulo 97
  const rearranged = v.slice(4) + v.slice(0, 4);
  const expanded = rearranged.replace(/[A-Z]/g, (c) => c.charCodeAt(0) - 55);
  // Mod 97 por chunks
  let rem = "";
  for (const ch of expanded) {
    rem = String((parseInt(rem + ch) % 97));
  }
  return parseInt(rem) === 1;
};
const getUTMs = () => {
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get("utm_source") || "",
      utm_medium: p.get("utm_medium") || "",
      utm_campaign: p.get("utm_campaign") || "",
    };
  } catch { return { utm_source: "", utm_medium: "", utm_campaign: "" }; }
};

// Formulario público brutal con campos dinámicos según la configuración.
export default function PublicForm({ landingId, landingSlug, formulario, branding, limites, pago, cupones = [], listaEspera = null, plazasOcupadas = 0, paymentSuccess = false, isPreview = false }) {
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(paymentSuccess);
  const [archivos, setArchivos] = useState({}); // { campoId: { nombre, url } }
  const [uploadingField, setUploadingField] = useState(null);
  const [honeypot, setHoneypot] = useState(""); // anti-bot
  const [waitlistMode, setWaitlistMode] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  // Cupón
  const [cuponCodigo, setCuponCodigo] = useState("");
  const [cuponValidado, setCuponValidado] = useState(null); // { descuento_importe, importe_final, mensaje }
  const [validandoCupon, setValidandoCupon] = useState(false);

  // Inicialización de pago
  const pagoActivo = !!pago?.activo && (pago?.opciones || []).length > 0;
  const opciones = pago?.opciones || [];
  const [opcionId, setOpcionId] = useState(opciones[0]?.id || "");
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    if (paymentSuccess) setSuccess(true);
  }, [paymentSuccess]);

  // Red de seguridad: page_view, form_started, form_abandoned, snapshot
  const { trackEvent, logFormStartedOnce, saveDraft, clearDraft } = usePublicFormTracker({
    landingSlug,
    landingId,
    getValues: () => values,
    isSent: success || waitlistSuccess,
  });

  // Snapshot del borrador en cuanto cambian valores (debounced suave)
  useEffect(() => {
    if (success || waitlistSuccess) return;
    const t = setTimeout(() => { saveDraft(); }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const color = branding?.color_principal || "#ea580c";
  const colorSec = branding?.color_secundario || "#15803d";
  const campos = formulario?.campos || [];

  const plazasMax = parseInt(limites?.plazas_maximas) || 0;
  const mostrarPlazas = !!limites?.mostrar_plazas && plazasMax > 0;
  const plazasAgotadas = plazasMax > 0 && plazasOcupadas >= plazasMax;
  const plazasRestantes = plazasMax > 0 ? Math.max(0, plazasMax - plazasOcupadas) : null;
  const porcentaje = plazasMax > 0 ? Math.min(100, (plazasOcupadas / plazasMax) * 100) : 0;

  const opcionElegida = opciones.find((o) => o.id === opcionId) || opciones[0];
  const importeBase = opcionElegida ? Number((opcionElegida.precio * cantidad).toFixed(2)) : 0;
  const importeTotal = cuponValidado ? cuponValidado.importe_final : importeBase;

  const update = (id, v) => {
    logFormStartedOnce();
    setValues((p) => ({ ...p, [id]: v }));
  };

  // Campos visibles según condicional
  const visibleCampos = useMemo(() => {
    return (campos || []).filter((c) => {
      if (!c.condicion_campo) return true;
      const expected = (c.condicion_valor || "").toString().trim();
      const actual = (values[c.condicion_campo] || "").toString().trim();
      if (!expected) return !!actual; // basta con que tenga valor
      return actual.toLowerCase() === expected.toLowerCase();
    });
  }, [campos, values]);

  // Subida de archivo
  const handleFileUpload = async (campoId, file, maxMB = 5) => {
    if (!file) return;
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`Archivo demasiado grande (max ${maxMB}MB)`);
      trackEvent("file_too_big", { campo_id: campoId, size_mb: (file.size / 1024 / 1024).toFixed(2), max_mb: maxMB }, "warning");
      return;
    }
    setUploadingField(campoId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/functions/landingUploadFile`, { method: "POST", body: fd }).catch(() => null);
      let file_url = null;
      if (res && res.ok) {
        const j = await res.json();
        file_url = j?.file_url;
      } else {
        // fallback: usar UploadFile via SDK
        const upRes = await base44.integrations.Core.UploadFile({ file });
        file_url = upRes?.file_url;
      }
      if (!file_url) throw new Error("Sin URL");
      setArchivos((p) => ({ ...p, [campoId]: { nombre: file.name, url: file_url } }));
      update(campoId, file_url);
      toast.success("Archivo subido");
    } catch (err) {
      console.error(err);
      toast.error("Error subiendo archivo");
      trackEvent("file_upload_error", { campo_id: campoId, mensaje: err?.message || "upload_failed", nombre: file?.name }, "error");
    } finally {
      setUploadingField(null);
    }
  };

  // Validar cupón
  const handleValidarCupon = async () => {
    if (!cuponCodigo) return;
    setValidandoCupon(true);
    try {
      const res = await base44.functions.invoke("landingValidateCoupon", {
        landing_page_id: landingId,
        codigo: cuponCodigo,
        importe_base: importeBase,
      });
      const d = res?.data || {};
      if (d.valido) {
        setCuponValidado(d);
        toast.success(d.mensaje || "Cupón aplicado");
      } else {
        setCuponValidado(null);
        toast.error(d.mensaje || "Cupón no válido");
      }
    } catch {
      toast.error("Error validando cupón");
    } finally {
      setValidandoCupon(false);
    }
  };

  // Apuntarse a la lista de espera
  const handleWaitlist = async (e) => {
    e?.preventDefault();
    const email = values.email;
    if (!email) { toast.error("Necesitamos tu email"); return; }
    setSubmitting(true);
    try {
      await base44.functions.invoke("landingWaitlist", {
        landing_page_id: landingId,
        nombre: values.nombre || "",
        email,
        telefono: values.telefono || "",
        user_agent: navigator.userAgent,
        referrer: document.referrer || "directo",
      });
      setWaitlistSuccess(true);
    } catch {
      toast.error("Error apuntándote a la lista");
    } finally {
      setSubmitting(false);
    }
  };

  const validar = () => {
    for (const c of visibleCampos) {
      // Validación específica DNI/IBAN
      if (c.tipo === "dni" && values[c.id] && !validDNI(values[c.id])) {
        toast.error(`DNI inválido en "${c.etiqueta}"`);
        trackEvent("validation_failed", { motivo: "dni_invalido", campo: c.etiqueta }, "warning");
        return false;
      }
      if (c.tipo === "iban" && values[c.id] && !validIBAN(values[c.id])) {
        toast.error(`IBAN inválido en "${c.etiqueta}"`);
        trackEvent("validation_failed", { motivo: "iban_invalido", campo: c.etiqueta }, "warning");
        return false;
      }
      if (c.tipo === "lista_jugadores") {
        const n = parseInt(values[`${c.id}_count`]) || 0;
        if (c.requerido && n < 1) {
          toast.error(`Selecciona un número de jugadores en: ${c.etiqueta}`);
          return false;
        }
        const subs = c.sub_campos || [];
        for (let i = 0; i < n; i++) {
          for (const sc of subs) {
            if (sc.requerido) {
              const v = values[`${c.id}__${i}__${sc.id}`];
              if (v === undefined || v === null || v === "") {
                toast.error(`Jugador ${i + 1}: completa "${sc.etiqueta}"`);
                return false;
              }
            }
          }
        }
        continue;
      }
      if (c.requerido) {
        const v = values[c.id];
        if (v === undefined || v === null || v === "" || (c.tipo === "aceptacion" && !v)) {
          toast.error(`Completa el campo: ${c.etiqueta}`);
          trackEvent("validation_failed", { motivo: "campo_requerido_vacio", campo: c.etiqueta, tipo: c.tipo }, "warning");
          return false;
        }
      }
    }
    if (pagoActivo && !opcionElegida) {
      toast.error("Selecciona una opción de pago");
      trackEvent("validation_failed", { motivo: "sin_opcion_pago" }, "warning");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isPreview) {
      toast.info("Vista previa: el envío real está deshabilitado");
      return;
    }
    if (!validar()) return;
    trackEvent("submit_attempt", { pago_activo: pagoActivo, importe: importeTotal, form_data: values });
    setSubmitting(true);
    try {
      const nombre = values.nombre || values.responsable || values.nombre_equipo || "Sin nombre";
      const email = values.email || "";
      const telefono = values.telefono || "";

      const utms = getUTMs();
      const archivosArr = Object.entries(archivos).map(([campo_id, info]) => ({ campo_id, ...info }));

      if (pagoActivo) {
        if (!email) {
          toast.error("Para pagar es necesario un email válido. Añade un campo Email obligatorio.");
          setSubmitting(false);
          return;
        }
        const res = await base44.functions.invoke("landingPaymentCheckout", {
          landing_page_id: landingId,
          landing_slug: landingSlug,
          nombre,
          email,
          telefono,
          datos: values,
          archivos: archivosArr,
          opcion_id: opcionElegida.id,
          cantidad,
          cupon_codigo: cuponValidado ? cuponCodigo : "",
          honeypot,
          user_agent: navigator.userAgent,
          referrer: document.referrer || "directo",
          origin: window.location.origin,
          ...utms,
        });
        if (res?.data?.error) throw new Error(res.data.error);
        if (res?.data?.url) {
          try {
            sessionStorage.setItem(`landing_payment_${landingId}`, JSON.stringify({ values, ts: Date.now() }));
          } catch {}
          trackEvent("payment_redirect", { session_id: res.data.session_id, importe: importeTotal });
          window.location.href = res.data.url;
          return;
        }
        throw new Error("No se pudo iniciar el pago");
      }

      const res = await base44.functions.invoke("landingPublic", {
        action: "submit",
        landing_page_id: landingId,
        landing_slug: landingSlug,
        nombre,
        email,
        telefono,
        datos: values,
        archivos: archivosArr,
        honeypot,
        user_agent: navigator.userAgent,
        referrer: document.referrer || "directo",
        ...utms,
      });
      if (res?.data?.error) throw new Error(res.data.error);

      trackEvent("submit_success", { submission_id: res?.data?.submission_id, form_data: values });
      clearDraft();
      setSuccess(true);
    } catch (err) {
      console.error(err);
      const msg = err?.message || "Hubo un problema. Inténtalo de nuevo en unos segundos.";
      toast.error(msg);
      trackEvent("submit_error", { mensaje: msg, pago_activo: pagoActivo, form_data: values }, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (success || waitlistSuccess) {
    const mensaje = waitlistSuccess
      ? "Te apuntamos a la lista de espera. Si se libera una plaza, te avisaremos por email."
      : pagoActivo
        ? (pago?.mensaje_exito_pago || "¡Pago confirmado! Te hemos enviado un email con todos los detalles.")
        : (formulario?.mensaje_exito || "Hemos recibido tu inscripción. Te contactaremos pronto.");
    return (
      <div id="formulario" className="max-w-2xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-10 rounded-3xl bg-white border border-slate-200 shadow-xl"
        >
          <div
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: `${color}20` }}
          >
            {waitlistSuccess
              ? <BellRing className="w-10 h-10" style={{ color }} />
              : <CheckCircle2 className="w-10 h-10" style={{ color }} />}
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-3">{waitlistSuccess ? "¡Apuntado!" : "¡Listo!"}</h2>
          <p className="text-lg text-slate-600">{mensaje}</p>
        </motion.div>
      </div>
    );
  }

  // Si plazas agotadas + lista de espera activa, mostrar form alternativo
  const mostrarListaEspera = plazasAgotadas && listaEspera?.activa;

  const ctaTexto = pagoActivo
    ? `${pago?.cta_pago || "Pagar e inscribirme"} · ${importeTotal.toFixed(2)} €`
    : (formulario?.cta_envio || "Enviar");

  return (
    <section id="formulario" className="py-16 lg:py-24 px-6 bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-3 tracking-tight">
            {formulario?.titulo || "Inscríbete"}
          </h2>
          {formulario?.descripcion && (
            <p className="text-lg text-slate-600">{formulario.descripcion}</p>
          )}
        </div>

        {mostrarPlazas && (
          <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <Users className="w-5 h-5" style={{ color }} />
                <span>Plazas disponibles</span>
              </div>
              <div className="text-sm font-bold" style={{ color: plazasAgotadas ? "#dc2626" : color }}>
                {plazasOcupadas} / {plazasMax}
              </div>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${porcentaje}%`,
                  background: plazasAgotadas
                    ? "linear-gradient(90deg, #dc2626, #b91c1c)"
                    : `linear-gradient(90deg, ${color}, ${colorSec})`,
                }}
              />
            </div>
            {!plazasAgotadas && plazasRestantes !== null && (
              <p className="text-xs text-slate-500 mt-2 text-center">
                {plazasRestantes === 1
                  ? "¡Solo queda 1 plaza!"
                  : plazasRestantes <= 5
                    ? `⚠️ ¡Solo quedan ${plazasRestantes} plazas!`
                    : `Quedan ${plazasRestantes} plazas`}
              </p>
            )}
          </div>
        )}

        {plazasAgotadas && !mostrarListaEspera && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-xl font-black text-red-900 mb-1">Plazas agotadas</h3>
            <p className="text-red-700">
              {limites?.mensaje_plazas_agotadas || "Lo sentimos, ya no quedan plazas disponibles."}
            </p>
          </div>
        )}

        {mostrarListaEspera && (
          <div className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <BellRing className="w-8 h-8 flex-shrink-0 mt-1" style={{ color }} />
              <div className="flex-1">
                <h3 className="text-xl font-black text-slate-900 mb-1">
                  {listaEspera.titulo || "Lista de espera"}
                </h3>
                <p className="text-slate-700 mb-3">
                  {listaEspera.descripcion || "Las plazas están agotadas, pero te avisaremos si se libera alguna."}
                </p>
                <form onSubmit={handleWaitlist} className="space-y-2">
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    value={values.nombre || ""}
                    onChange={(e) => update("nombre", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Tu email"
                    value={values.email || ""}
                    onChange={(e) => update("email", e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono (opcional)"
                    value={values.telefono || ""}
                    onChange={(e) => update("telefono", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-5 py-3 rounded-xl text-white font-bold text-sm shadow-lg disabled:opacity-60"
                    style={{ background: `linear-gradient(135deg, ${color}, ${colorSec})` }}
                  >
                    {submitting ? "Apuntando…" : "Apúntame a la lista de espera"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`bg-white rounded-3xl shadow-xl border border-slate-200 p-6 lg:p-10 space-y-5 ${mostrarListaEspera ? "hidden" : ""} ${(plazasAgotadas && !mostrarListaEspera) ? "opacity-50 pointer-events-none" : ""}`}>
          {/* Honeypot anti-bot — invisible para humanos.
              IMPORTANTE: usamos un name neutro + autoComplete="new-password" para que
              el autocompletado del navegador (sobre todo móviles) NO rellene este campo
              y marque por error a personas reales como bots. */}
          <input
            type="text"
            name="company_website_hp"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="new-password"
            inputMode="none"
            className="absolute -left-[9999px] opacity-0 pointer-events-none h-0 w-0"
            aria-hidden="true"
          />
          <div className="grid grid-cols-2 gap-4">
            {visibleCampos.map((c) => {
              const colClass =
                c.ancho === "half" ? "col-span-2 sm:col-span-1" :
                c.ancho === "third" ? "col-span-2 sm:col-span-1" :
                "col-span-2";

              return (
                <div key={c.id} className={colClass}>
                  {c.tipo !== "aceptacion" && c.tipo !== "checkbox" && (
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      {c.etiqueta} {c.requerido && <span style={{ color }}>*</span>}
                    </label>
                  )}

                  {["texto", "email", "telefono", "dni", "iban", "numero"].includes(c.tipo) && (
                    <input
                      type={c.tipo === "email" ? "email" : c.tipo === "telefono" ? "tel" : c.tipo === "numero" ? "number" : "text"}
                      placeholder={c.placeholder || (c.tipo === "iban" ? "ES00 0000 0000 0000 0000 0000" : "")}
                      value={values[c.id] || ""}
                      onChange={(e) => update(c.id, e.target.value)}
                      required={c.requerido}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition"
                    />
                  )}

                  {c.tipo === "archivo" && (
                    <div>
                      <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-500 cursor-pointer transition bg-slate-50">
                        {archivos[c.id] ? (
                          <>
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                            <span className="text-sm font-semibold text-slate-900 break-all px-2 text-center">{archivos[c.id].nombre}</span>
                            <span className="text-xs text-slate-500">Haz clic para cambiar</span>
                          </>
                        ) : uploadingField === c.id ? (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin" style={{ color }} />
                            <span className="text-sm text-slate-600">Subiendo…</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-slate-400" />
                            <span className="text-sm font-semibold text-slate-700">Selecciona un archivo</span>
                            <span className="text-xs text-slate-500">{c.accept || "PDF, JPG, PNG"} · max {c.max_mb || 5}MB</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept={c.accept || undefined}
                          onChange={(e) => handleFileUpload(c.id, e.target.files?.[0], c.max_mb || 5)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  {c.tipo === "fecha" && (
                    <input
                      type="date"
                      value={values[c.id] || ""}
                      onChange={(e) => update(c.id, e.target.value)}
                      required={c.requerido}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition"
                    />
                  )}

                  {c.tipo === "textarea" && (
                    <textarea
                      placeholder={c.placeholder || ""}
                      value={values[c.id] || ""}
                      onChange={(e) => update(c.id, e.target.value)}
                      required={c.requerido}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition resize-none"
                    />
                  )}

                  {c.tipo === "select" && (
                    <select
                      value={values[c.id] || ""}
                      onChange={(e) => update(c.id, e.target.value)}
                      required={c.requerido}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition bg-white"
                    >
                      <option value="">Selecciona…</option>
                      {(c.opciones || []).map((op) => <option key={op} value={op}>{op}</option>)}
                    </select>
                  )}

                  {c.tipo === "radio" && (
                    <div className="space-y-2">
                      {(c.opciones || []).map((op) => (
                        <label key={op} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                          <input
                            type="radio"
                            name={c.id}
                            value={op}
                            checked={values[c.id] === op}
                            onChange={(e) => update(c.id, e.target.value)}
                            required={c.requerido}
                            className="w-4 h-4"
                            style={{ accentColor: color }}
                          />
                          <span className="text-slate-700">{op}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {(c.tipo === "checkbox" || c.tipo === "aceptacion") && (
                    <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                      <input
                        type="checkbox"
                        checked={!!values[c.id]}
                        onChange={(e) => update(c.id, e.target.checked)}
                        required={c.requerido}
                        className="w-5 h-5 mt-0.5 flex-shrink-0"
                        style={{ accentColor: color }}
                      />
                      <span className="text-sm text-slate-700">
                        {c.etiqueta} {c.requerido && <span style={{ color }}>*</span>}
                      </span>
                    </label>
                  )}

                  {c.tipo === "lista_jugadores" && (() => {
                    const min = c.min ?? 1;
                    const max = c.max ?? 12;
                    const count = parseInt(values[`${c.id}_count`]) || 0;
                    const subs = c.sub_campos || [];
                    const opcionesNum = [];
                    for (let i = min; i <= max; i++) opcionesNum.push(i);
                    return (
                      <div className="space-y-3">
                        <select
                          value={values[`${c.id}_count`] || ""}
                          onChange={(e) => update(`${c.id}_count`, e.target.value)}
                          required={c.requerido}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition bg-white"
                        >
                          <option value="">Selecciona nº de jugadores…</option>
                          {opcionesNum.map((n) => <option key={n} value={n}>{n} jugadores</option>)}
                        </select>

                        {count > 0 && subs.length > 0 && (
                          <div className="space-y-3">
                            {Array.from({ length: count }, (_, i) => (
                              <div key={i} className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50">
                                <div className="font-bold text-slate-800 mb-3 text-sm" style={{ color }}>
                                  Jugador {i + 1}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  {subs.map((sc) => (
                                    <div key={sc.id} className="col-span-2 sm:col-span-1">
                                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        {sc.etiqueta} {sc.requerido && <span style={{ color }}>*</span>}
                                      </label>
                                      <input
                                        type={sc.tipo === "email" ? "email" : sc.tipo === "telefono" ? "tel" : sc.tipo === "numero" ? "number" : sc.tipo === "fecha" ? "date" : "text"}
                                        value={values[`${c.id}__${i}__${sc.id}`] || ""}
                                        onChange={(e) => update(`${c.id}__${i}__${sc.id}`, e.target.value)}
                                        required={sc.requerido}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition bg-white text-sm"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {c.ayuda && (
                    <p className="text-xs text-slate-500 mt-1">{c.ayuda}</p>
                  )}
                </div>
              );
            })}
          </div>

          {pagoActivo && (
            <div className="pt-5 border-t-2 border-slate-100">
              <PaymentOptionsSelector
                opciones={opciones}
                selectedId={opcionId}
                cantidad={cantidad}
                onSelect={setOpcionId}
                onCantidadChange={setCantidad}
                color={color}
                colorSec={colorSec}
              />

              {/* Cupón */}
              {(cupones || []).length > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1 mb-2">
                    <Tag className="w-3.5 h-3.5" /> ¿Tienes un código de descuento?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cuponCodigo}
                      onChange={(e) => { setCuponCodigo(e.target.value.toUpperCase()); setCuponValidado(null); }}
                      placeholder="EJEMPLO20"
                      disabled={!!cuponValidado}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm uppercase"
                    />
                    {!cuponValidado ? (
                      <button
                        type="button"
                        onClick={handleValidarCupon}
                        disabled={!cuponCodigo || validandoCupon}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{ background: color }}
                      >
                        {validandoCupon ? "..." : "Aplicar"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setCuponValidado(null); setCuponCodigo(""); }}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  {cuponValidado && (
                    <div className="mt-2 text-sm text-green-700 font-semibold">
                      ✅ {cuponValidado.mensaje} · Total: <strong>{cuponValidado.importe_final.toFixed(2)}€</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || plazasAgotadas}
            className="w-full mt-4 px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-xl hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:cursor-wait"
            style={{
              background: `linear-gradient(135deg, ${color}, ${colorSec})`,
              boxShadow: `0 15px 40px -10px ${color}80`,
            }}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                {pagoActivo ? "Redirigiendo a pago seguro…" : "Enviando…"}
              </span>
            ) : (
              ctaTexto
            )}
          </button>

          {pagoActivo && (
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-2">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              Pago 100% seguro procesado por Stripe · Tus datos están protegidos
            </div>
          )}
        </form>
      </div>
    </section>
  );
}