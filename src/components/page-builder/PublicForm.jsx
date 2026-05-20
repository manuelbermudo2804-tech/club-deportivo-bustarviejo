import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Users, AlertCircle, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import PaymentOptionsSelector from "./PaymentOptionsSelector";

// Formulario público brutal con campos dinámicos según la configuración.
export default function PublicForm({ landingId, landingSlug, formulario, branding, limites, pago, plazasOcupadas = 0, paymentSuccess = false, isPreview = false }) {
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(paymentSuccess);

  // Inicialización de pago
  const pagoActivo = !!pago?.activo && (pago?.opciones || []).length > 0;
  const opciones = pago?.opciones || [];
  const [opcionId, setOpcionId] = useState(opciones[0]?.id || "");
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    if (paymentSuccess) setSuccess(true);
  }, [paymentSuccess]);

  const color = branding?.color_principal || "#ea580c";
  const colorSec = branding?.color_secundario || "#15803d";
  const campos = formulario?.campos || [];

  const plazasMax = parseInt(limites?.plazas_maximas) || 0;
  const mostrarPlazas = !!limites?.mostrar_plazas && plazasMax > 0;
  const plazasAgotadas = plazasMax > 0 && plazasOcupadas >= plazasMax;
  const plazasRestantes = plazasMax > 0 ? Math.max(0, plazasMax - plazasOcupadas) : null;
  const porcentaje = plazasMax > 0 ? Math.min(100, (plazasOcupadas / plazasMax) * 100) : 0;

  const opcionElegida = opciones.find((o) => o.id === opcionId) || opciones[0];
  const importeTotal = opcionElegida ? Number((opcionElegida.precio * cantidad).toFixed(2)) : 0;

  const update = (id, v) => setValues((p) => ({ ...p, [id]: v }));

  const validar = () => {
    for (const c of campos) {
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
          return false;
        }
      }
    }
    if (pagoActivo && !opcionElegida) {
      toast.error("Selecciona una opción de pago");
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
    setSubmitting(true);
    try {
      const nombre = values.nombre || values.responsable || values.nombre_equipo || "Sin nombre";
      const email = values.email || "";
      const telefono = values.telefono || "";

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
          opcion_id: opcionElegida.id,
          cantidad,
          user_agent: navigator.userAgent,
          referrer: document.referrer || "directo",
          origin: window.location.origin,
        });
        if (res?.data?.error) throw new Error(res.data.error);
        if (res?.data?.url) {
          try {
            sessionStorage.setItem(`landing_payment_${landingId}`, JSON.stringify({ values, ts: Date.now() }));
          } catch {}
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
        user_agent: navigator.userAgent,
        referrer: document.referrer || "directo",
      });
      if (res?.data?.error) throw new Error(res.data.error);

      setSuccess(true);
    } catch (err) {
      console.error(err);
      const msg = err?.message || "Hubo un problema. Inténtalo de nuevo en unos segundos.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    const mensaje = pagoActivo
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
            <CheckCircle2 className="w-10 h-10" style={{ color }} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-3">¡Listo!</h2>
          <p className="text-lg text-slate-600">{mensaje}</p>
        </motion.div>
      </div>
    );
  }

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

        {plazasAgotadas && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-xl font-black text-red-900 mb-1">Plazas agotadas</h3>
            <p className="text-red-700">
              {limites?.mensaje_plazas_agotadas || "Lo sentimos, ya no quedan plazas disponibles."}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`bg-white rounded-3xl shadow-xl border border-slate-200 p-6 lg:p-10 space-y-5 ${plazasAgotadas ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="grid grid-cols-2 gap-4">
            {campos.map((c) => {
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

                  {["texto", "email", "telefono", "dni", "numero"].includes(c.tipo) && (
                    <input
                      type={c.tipo === "email" ? "email" : c.tipo === "telefono" ? "tel" : c.tipo === "numero" ? "number" : "text"}
                      placeholder={c.placeholder || ""}
                      value={values[c.id] || ""}
                      onChange={(e) => update(c.id, e.target.value)}
                      required={c.requerido}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition"
                    />
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