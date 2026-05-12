import React, { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, CheckCircle2, ShoppingBag, Mail, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PropuestaResumenForm({ seleccionados, empresa = "GVC Gaesco", origen = "gvcgaesco" }) {
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", mensaje: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const totalNumerico = seleccionados.reduce((sum, p) => sum + (p.precio || 0), 0);
  const hayAConvenir = seleccionados.some((p) => p.precio === null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.email) {
      toast.error("Indica al menos tu nombre y email");
      return;
    }
    if (seleccionados.length === 0) {
      toast.error("Selecciona al menos un paquete arriba");
      return;
    }
    setSending(true);
    try {
      await base44.functions.invoke("submitPropuestaPatrocinio", {
        empresa,
        origen,
        contacto_nombre: form.nombre,
        contacto_email: form.email,
        contacto_telefono: form.telefono,
        mensaje: form.mensaje,
        paquetes_seleccionados: seleccionados.map((p) => ({
          id: p.id, nombre: p.titulo, precio: p.precio,
        })),
        total_estimado: totalNumerico,
      });
      setSent(true);
      toast.success("¡Propuesta enviada! Nos pondremos en contacto contigo.");
    } catch (err) {
      console.error(err);
      toast.error("Error al enviar. Inténtalo de nuevo o contacta directamente.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <section className="bg-gradient-to-br from-green-50 to-emerald-50 py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
            <CheckCircle2 className="w-20 h-20 text-green-600 mx-auto mb-4" />
          </motion.div>
          <h2 className="text-3xl font-black text-slate-900 mb-3">¡Propuesta enviada! 🙌</h2>
          <p className="text-slate-600 mb-6">
            Hemos recibido vuestra selección. Manuel Bermudo se pondrá en contacto en menos de 24h para concretar todos los detalles.
          </p>
          <p className="text-sm text-slate-500">Gracias por confiar en el CD Bustarviejo.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="resumen" className="bg-gradient-to-br from-slate-900 to-slate-800 py-16 lg:py-24 text-white">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-10">
          <div className="inline-block text-xs font-bold tracking-widest uppercase text-orange-400 mb-3">
            Tu Propuesta
          </div>
          <h2 className="text-3xl lg:text-4xl font-black mb-3">Resumen y envío</h2>
          <p className="text-white/70">Revisa tu selección y mándanosla. Sin compromiso — nos sentamos a hablarlo.</p>
        </div>

        <div className="bg-white text-slate-900 rounded-3xl p-6 lg:p-8 shadow-2xl">
          {/* Resumen */}
          <div className="mb-6 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-slate-900">Paquetes seleccionados</h3>
            </div>
            {seleccionados.length === 0 ? (
              <p className="text-slate-400 text-sm italic">Ningún paquete seleccionado todavía. Vuelve arriba y marca los que te interesen.</p>
            ) : (
              <>
                <ul className="space-y-2 mb-4">
                  {seleccionados.map((p) => (
                    <li key={p.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                      <span className="font-medium text-slate-800">{p.titulo}</span>
                      <span className="font-bold text-slate-900">
                        {p.precio === null ? "A convenir" : `${p.precio.toLocaleString('es-ES')} €`}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between items-center pt-3 border-t-2 border-slate-300">
                  <span className="text-lg font-black text-slate-900">TOTAL ESTIMADO</span>
                  <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-rose-600">
                    {totalNumerico.toLocaleString('es-ES')} €
                    {hayAConvenir && <span className="text-xs text-slate-500 font-normal block text-right">+ partida a convenir</span>}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2 italic">* Importe orientativo · IVA no incluido · Temporada 2026/27, prorrogable.</p>
              </>
            )}
          </div>

          {/* Formulario contacto */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1.5 text-slate-700 mb-1.5">
                  <User className="w-3.5 h-3.5" /> Nombre y apellidos *
                </Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Persona de contacto"
                  required
                />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 text-slate-700 mb-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email *
                </Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contacto@gvcgaesco.com"
                  required
                />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-1.5 text-slate-700 mb-1.5">
                <Phone className="w-3.5 h-3.5" /> Teléfono
              </Label>
              <Input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="(opcional)"
              />
            </div>
            <div>
              <Label className="text-slate-700 mb-1.5 block">Mensaje / matices</Label>
              <Textarea
                value={form.mensaje}
                onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                placeholder="¿Hay algo concreto que te gustaría matizar o proponer? (opcional)"
                rows={3}
              />
            </div>

            <Button
              type="submit"
              disabled={sending || seleccionados.length === 0}
              size="lg"
              className="w-full bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white font-bold text-base shadow-lg disabled:opacity-50"
            >
              {sending ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="w-5 h-5 mr-2" /> Enviar mi propuesta al CD Bustarviejo</>
              )}
            </Button>
            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              Tus datos los trata el CD Bustarviejo con la única finalidad de gestionar esta propuesta de patrocinio. No se ceden a terceros.
            </p>
          </form>
        </div>

        {/* Contacto directo */}
        <div className="mt-10 text-center">
          <p className="text-white/60 text-sm mb-2">¿Prefieres hablar directamente?</p>
          <p className="font-bold text-white text-lg">Manuel Bermudo Santacruz</p>
          <p className="text-white/80 text-sm">Presidente CD Bustarviejo</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            <a href="mailto:presidente@cdbustarviejo.com" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 transition border border-white/20 text-sm font-semibold">
              <Mail className="w-4 h-4" /> presidente@cdbustarviejo.com
            </a>
            <a href="tel:+34670018673" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 transition border border-white/20 text-sm font-semibold">
              <Phone className="w-4 h-4" /> 670 018 673
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}