import React, { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Formulario público brutal con campos dinámicos según la configuración.
export default function PublicForm({ landingId, landingSlug, formulario, branding }) {
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const color = branding?.color_principal || "#ea580c";
  const colorSec = branding?.color_secundario || "#15803d";
  const campos = formulario?.campos || [];

  const update = (id, v) => setValues((p) => ({ ...p, [id]: v }));

  const validar = () => {
    for (const c of campos) {
      if (c.requerido) {
        const v = values[c.id];
        if (v === undefined || v === null || v === "" || (c.tipo === "aceptacion" && !v)) {
          toast.error(`Completa el campo: ${c.etiqueta}`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;
    setSubmitting(true);
    try {
      const nombre = values.nombre || values.responsable || values.nombre_equipo || "Sin nombre";
      const email = values.email || "";
      const telefono = values.telefono || "";

      await base44.entities.LandingSubmission.create({
        landing_page_id: landingId,
        landing_slug: landingSlug,
        nombre,
        email,
        telefono,
        datos: values,
        estado: "nuevo",
        user_agent: navigator.userAgent,
        referrer: document.referrer || "directo",
      });

      setSuccess(true);
    } catch (err) {
      console.error(err);
      toast.error("Hubo un problema. Inténtalo de nuevo en unos segundos.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
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
          <p className="text-lg text-slate-600">
            {formulario?.mensaje_exito || "Hemos recibido tu inscripción. Te contactaremos pronto."}
          </p>
        </motion.div>
      </div>
    );
  }

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

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 lg:p-10 space-y-5">
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

                  {c.ayuda && (
                    <p className="text-xs text-slate-500 mt-1">{c.ayuda}</p>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-4 px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-xl hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:cursor-wait"
            style={{
              background: `linear-gradient(135deg, ${color}, ${colorSec})`,
              boxShadow: `0 15px 40px -10px ${color}80`,
            }}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando…
              </span>
            ) : (
              formulario?.cta_envio || "Enviar"
            )}
          </button>
        </form>
      </div>
    </section>
  );
}