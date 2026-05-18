import React, { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Users, MapPin, Smartphone, Megaphone, Award, Image as ImageIcon, CheckCircle2, Star, Sparkles, Mail, Phone, ArrowLeft, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import usePublicPageTracker from "../components/public/usePublicPageTracker";

// 📌 EDITAR AQUÍ las fechas cuando se confirmen (formato libre)
const FECHA_PADEL = "Junio 2026 · fecha por confirmar";
const FECHA_FUTSAL = "Junio 2026 · fecha por confirmar";

const PAQUETES = [
  {
    id: "padel",
    icon: "🎾",
    titulo: "Torneo de Pádel",
    fecha: FECHA_PADEL,
    precio: 400,
    color: "from-blue-500 to-cyan-600",
    borderColor: "border-blue-200",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  {
    id: "futbol_sala",
    icon: "⚽",
    titulo: "Torneo de Fútbol Sala",
    fecha: FECHA_FUTSAL,
    precio: 400,
    color: "from-orange-500 to-red-600",
    borderColor: "border-orange-200",
    badgeColor: "bg-orange-100 text-orange-700",
  },
  {
    id: "pack_ambos",
    icon: "🔥",
    titulo: "Pack Ambos Torneos",
    subtitulo: "Pádel + Fútbol Sala",
    fecha: "Ambos torneos · fechas por confirmar",
    precio: 700,
    precioAhorro: 100,
    destacado: true,
    color: "from-purple-600 to-pink-600",
    borderColor: "border-purple-300",
    badgeColor: "bg-purple-100 text-purple-700",
  },
];

const BENEFICIOS = [
  { icon: Trophy, texto: "El torneo lleva tu nombre", detalle: '"Torneo [Tu Marca] 2026"' },
  { icon: ImageIcon, texto: "Lona física en el recinto", detalle: "Visibilidad durante todo el evento" },
  { icon: Star, texto: "Logo grande en toda la cartelería", detalle: "Cartel, redes y app del club" },
  { icon: Megaphone, texto: "Posts dedicados en RRSS", detalle: "Instagram + Telegram (antes, durante, después)" },
  { icon: Award, texto: "Foto oficial con los ganadores", detalle: "Sosteniendo tu logo/banner" },
  { icon: Users, texto: "Mención en megafonía", detalle: "Durante el torneo y entrega de trofeos" },
  { icon: Smartphone, texto: "Visibilidad en la app del club", detalle: "+600 usuarios activos" },
  { icon: Sparkles, texto: "Entrega trofeos personalmente", detalle: "Si lo deseas (foto de marca brutal)" },
];

export default function PatrocinaTorneos() {
  usePublicPageTracker("PatrocinaTorneos");
  const [seleccionado, setSeleccionado] = useState("pack_ambos");
  const [submitting, setSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({
    nombre_empresa: "",
    nombre_contacto: "",
    email: "",
    telefono: "",
    mensaje: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre_empresa || !form.nombre_contacto || !form.email || !form.telefono) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("submitTournamentSponsor", {
        torneo: seleccionado,
        ...form,
      });
      if (res?.data?.success) {
        setEnviado(true);
        toast.success("¡Solicitud enviada! Te contactaremos pronto.");
      } else {
        throw new Error(res?.data?.error || "Error desconocido");
      }
    } catch (err) {
      toast.error("Error: " + (err.message || "Inténtalo de nuevo"));
    } finally {
      setSubmitting(false);
    }
  };

  const paqueteActual = PAQUETES.find((p) => p.id === seleccionado);
  const whatsappText = encodeURIComponent(
    `Hola, me interesa el patrocinio del ${paqueteActual.titulo} del CD Bustarviejo (${paqueteActual.precio}€). ¿Podemos hablar?`
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50">
      {/* Back button */}
      <a
        href="https://www.cdbustarviejo.com"
        className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-white/95 backdrop-blur-sm text-slate-800 font-semibold text-sm px-4 py-2.5 rounded-full shadow-lg hover:bg-white hover:scale-105 active:scale-95 transition-all border border-slate-200"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </a>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 text-white py-20 px-4">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-400/30 text-orange-200 text-sm font-semibold px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              SOLO 1 PLAZA POR TORNEO · EXCLUSIVIDAD TOTAL
            </div>
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              Tu marca, en los <span className="text-orange-400">torneos</span> más esperados
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Conviértete en <strong className="text-white">Patrocinador Oficial</strong> del Torneo de Pádel o Fútbol Sala del CD Bustarviejo
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <Users className="w-4 h-4 text-orange-400" />
                <span>+200 participantes esperados</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <MapPin className="w-4 h-4 text-orange-400" />
                <span>Bustarviejo + Sierra Norte</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <Smartphone className="w-4 h-4 text-orange-400" />
                <span>+600 usuarios en la app</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* PAQUETES */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">Elige tu patrocinio</h2>
            <p className="text-lg text-slate-600">Una plaza única por torneo. Una vez asignada, no se ofrece a nadie más.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PAQUETES.map((p) => (
              <motion.div
                key={p.id}
                whileHover={{ y: -4 }}
                onClick={() => setSeleccionado(p.id)}
                className={`relative cursor-pointer rounded-2xl border-2 transition-all ${
                  seleccionado === p.id
                    ? `border-orange-500 shadow-2xl scale-[1.02]`
                    : `${p.borderColor} hover:shadow-lg`
                } ${p.destacado ? "ring-2 ring-purple-300 ring-offset-2" : ""}`}
              >
                {p.destacado && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                    🔥 MÁS VENDIDO · AHORRA {p.precioAhorro}€
                  </div>
                )}
                <div className={`bg-gradient-to-br ${p.color} rounded-t-2xl p-6 text-white text-center`}>
                  <div className="text-5xl mb-2">{p.icon}</div>
                  <h3 className="text-xl font-bold">{p.titulo}</h3>
                  {p.subtitulo && <p className="text-sm opacity-90 mt-1">{p.subtitulo}</p>}
                  {p.fecha && (
                    <p className="text-xs font-semibold mt-2 inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                      📅 {p.fecha}
                    </p>
                  )}
                </div>
                <div className="bg-white rounded-b-2xl p-6 text-center">
                  <div className="mb-4">
                    <div className="text-4xl font-black text-slate-900">{p.precio}€</div>
                    {p.precioAhorro && (
                      <div className="text-sm text-slate-400 line-through">{p.precio + p.precioAhorro}€</div>
                    )}
                  </div>
                  <div className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full ${p.badgeColor}`}>
                    {seleccionado === p.id ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        SELECCIONADO
                      </>
                    ) : (
                      <>Pulsa para seleccionar</>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="py-16 px-4 bg-white border-y border-slate-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">Lo que recibe el Patrocinador Oficial</h2>
            <p className="text-lg text-slate-600">Visibilidad real, exclusiva y completa</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {BENEFICIOS.map((b, i) => {
              const Icon = b.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-4 p-5 rounded-xl bg-gradient-to-br from-slate-50 to-orange-50 border border-slate-200"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-md">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{b.texto}</h3>
                    <p className="text-sm text-slate-600 mt-0.5">{b.detalle}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-8 bg-amber-50 border-2 border-amber-200 rounded-xl p-5 text-center">
            <p className="text-sm text-amber-900">
              📌 <strong>Nota:</strong> La lona física la imprime el patrocinador (le proporcionamos las medidas). Todo lo demás corre por cuenta del club.
            </p>
          </div>
        </div>
      </section>

      {/* FORMULARIO */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">¿Te interesa?</h2>
            <p className="text-lg text-slate-600">Déjanos tus datos y te contactamos en breve</p>
          </div>

          {enviado ? (
            <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-10 text-center">
                <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">¡Solicitud recibida!</h3>
                <p className="text-slate-700 mb-6">
                  Te hemos enviado un email de confirmación. Nos pondremos en contacto contigo en breve.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <a
                    href={`https://wa.me/34609082733?text=${whatsappText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-full transition-all"
                  >
                    <Phone className="w-4 h-4" />
                    O escríbenos por WhatsApp
                  </a>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-orange-200 shadow-xl">
              <CardContent className="p-8">
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
                  <p className="text-sm font-semibold text-slate-700 mb-1">Solicitas:</p>
                  <p className="text-xl font-black text-orange-700">
                    {paqueteActual.icon} {paqueteActual.titulo} · {paqueteActual.precio}€
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="empresa">Nombre de la empresa *</Label>
                    <Input
                      id="empresa"
                      value={form.nombre_empresa}
                      onChange={(e) => setForm({ ...form, nombre_empresa: e.target.value })}
                      placeholder="Ej: Tienda Pádel Madrid"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contacto">Persona de contacto *</Label>
                    <Input
                      id="contacto"
                      value={form.nombre_contacto}
                      onChange={(e) => setForm({ ...form, nombre_contacto: e.target.value })}
                      placeholder="Tu nombre"
                      required
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="tu@email.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="telefono">Teléfono *</Label>
                      <Input
                        id="telefono"
                        type="tel"
                        value={form.telefono}
                        onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                        placeholder="600 123 456"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="mensaje">Mensaje (opcional)</Label>
                    <Textarea
                      id="mensaje"
                      value={form.mensaje}
                      onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                      placeholder="¿Alguna pregunta o petición especial?"
                      rows={3}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold text-base py-6 rounded-xl shadow-lg"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Quiero ser Patrocinador Oficial
                      </>
                    )}
                  </Button>
                  <div className="text-center pt-2">
                    <p className="text-xs text-slate-500 mb-2">o contáctanos directamente:</p>
                    <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                      <a href="mailto:info@cdbustarviejo.com" className="inline-flex items-center gap-1.5 text-orange-700 font-semibold hover:underline">
                        <Mail className="w-4 h-4" />
                        info@cdbustarviejo.com
                      </a>
                      <span className="text-slate-300">·</span>
                      <a href="tel:+34609082733" className="inline-flex items-center gap-1.5 text-orange-700 font-semibold hover:underline">
                        <Phone className="w-4 h-4" />
                        609 08 27 33
                      </a>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 text-center text-sm">
        <p className="text-white font-bold mb-1">CD Bustarviejo</p>
        <p>Tu marca, en los torneos de nuestro club 🧡💚</p>
      </footer>
    </div>
  );
}