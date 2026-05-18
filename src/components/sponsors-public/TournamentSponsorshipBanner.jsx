import React, { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Calendar, CheckCircle2, Lock, Send, Loader2, Sparkles, Megaphone, Star, Award, Camera, Instagram, Smartphone, Gift } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const BENEFICIOS = [
  { icon: Trophy, texto: "El torneo lleva tu nombre", detalle: '"Torneo [Tu Marca] 2026" — naming oficial en toda la comunicación' },
  { icon: Star, texto: "Logo principal en cartelería oficial", detalle: "Cartel del torneo, app, web y redes del club" },
  { icon: Instagram, texto: "Posts dedicados en RRSS", detalle: "Anuncio del torneo, durante el evento y entrega de trofeos" },
  { icon: Award, texto: "Entrega de trofeos por tu marca", detalle: "Foto oficial con los ganadores sosteniendo tu logo" },
  { icon: Smartphone, texto: "Banner destacado en la app", detalle: "Visible para todas las familias del club" },
  { icon: Gift, texto: "Detalle especial para tu negocio", detalle: "Acordamos juntos algún extra que aporte valor real a tu marca" },
];

export default function TournamentSponsorshipBanner({
  padelFecha,
  futsalFecha,
  padelOcupado,
  futsalOcupado,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [torneoSeleccionado, setTorneoSeleccionado] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({
    nombre_empresa: "",
    nombre_contacto: "",
    email: "",
    telefono: "",
    mensaje: "",
  });

  const PAQUETES = [
    {
      id: "padel",
      icon: "🎾",
      titulo: "Torneo de Pádel",
      precio: 400,
      fecha: padelFecha || "Fechas por confirmar",
      ocupado: padelOcupado,
      color: "from-blue-500 to-cyan-600",
      bg: "from-blue-50 to-cyan-50",
      border: "border-blue-300",
      image: "https://media.base44.com/images/public/6992c6be619d2da592897991/dbef36286_generated_image.png",
    },
    {
      id: "futbol_sala",
      icon: "⚽",
      titulo: "Torneo de Fútbol Sala",
      precio: 400,
      fecha: futsalFecha || "Fechas por confirmar",
      ocupado: futsalOcupado,
      color: "from-orange-500 to-red-600",
      bg: "from-orange-50 to-red-50",
      border: "border-orange-300",
      image: "https://media.base44.com/images/public/6992c6be619d2da592897991/e34d5a4d3_generated_image.png",
    },
    {
      id: "pack_ambos",
      icon: "🔥",
      titulo: "Pack Ambos Torneos",
      subtitulo: "Pádel + Fútbol Sala",
      precio: 700,
      precioAhorro: 100,
      fecha: "Ambos torneos",
      ocupado: padelOcupado && futsalOcupado,
      destacado: true,
      color: "from-purple-600 to-pink-600",
      bg: "from-purple-50 to-pink-50",
      border: "border-purple-300",
      image: null,
    },
  ];

  const openModal = (torneoId) => {
    setTorneoSeleccionado(torneoId);
    setEnviado(false);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre_empresa || !form.nombre_contacto || !form.email || !form.telefono) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("submitTournamentSponsor", {
        torneo: torneoSeleccionado,
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

  const paqueteActual = PAQUETES.find((p) => p.id === torneoSeleccionado);

  return (
    <>
      <section className="relative py-16 px-4 bg-gradient-to-br from-slate-900 via-purple-900 to-orange-900 text-white overflow-hidden">
        {/* Patrón decorativo */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 2px, transparent 2px)', backgroundSize: '40px 40px' }} />

        <div className="relative max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-400/40 text-orange-200 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              NOVEDAD · Solo 1 plaza por torneo
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-3 leading-tight">
              🏆 Patrocina nuestros <span className="text-orange-400">torneos</span>
            </h2>
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
              Da <strong className="text-white">nombre oficial</strong> a un torneo y lleva tu marca a participantes, familias y vecinos de Bustarviejo
            </p>
          </motion.div>

          {/* Paquetes */}
          <div className="grid md:grid-cols-3 gap-5 mb-8">
            {PAQUETES.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`relative rounded-2xl overflow-hidden bg-white shadow-2xl ${p.destacado ? "md:scale-105 ring-2 ring-orange-400 ring-offset-2 ring-offset-purple-900" : ""}`}
              >
                {p.destacado && !p.ocupado && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-black px-4 py-1 rounded-b-lg shadow tracking-widest">
                    🔥 AHORRA {p.precioAhorro}€
                  </div>
                )}

                {/* Sello OCUPADO */}
                {p.ocupado && (
                  <>
                    <div className="absolute inset-0 z-20 bg-slate-900/40 backdrop-blur-[1px]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 -rotate-12">
                      <div className="bg-red-600 text-white px-6 py-2 rounded-lg shadow-2xl border-4 border-white">
                        <p className="font-black text-2xl tracking-widest">YA RESERVADO</p>
                      </div>
                    </div>
                  </>
                )}

                {/* Header con imagen o gradiente */}
                {p.image ? (
                  <div className={`relative h-44 overflow-hidden ${p.ocupado ? 'grayscale opacity-60' : ''}`}>
                    <img
                      src={p.image}
                      alt={p.titulo}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${p.color} opacity-60 mix-blend-multiply`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
                      <div className="text-4xl mb-1 drop-shadow-lg">{p.icon}</div>
                      <h3 className="text-xl font-black drop-shadow-md leading-tight">{p.titulo}</h3>
                      {p.subtitulo && <p className="text-xs opacity-90 mt-0.5 drop-shadow">{p.subtitulo}</p>}
                      <div className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full self-start border border-white/30">
                        <Calendar className="w-3 h-3" />
                        {p.fecha}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`relative h-44 bg-gradient-to-br ${p.color} p-5 flex flex-col items-center justify-center text-center text-white ${p.ocupado ? 'grayscale opacity-60' : ''} overflow-hidden`}>
                    {/* Decoración: trofeo + brillo */}
                    <div className="absolute -top-4 -right-4 text-white/10 text-9xl rotate-12">🏆</div>
                    <div className="absolute -bottom-6 -left-6 text-white/10 text-8xl -rotate-12">⭐</div>
                    <div className="relative text-5xl mb-1 drop-shadow-lg">{p.icon}</div>
                    <h3 className="relative text-xl font-black">{p.titulo}</h3>
                    {p.subtitulo && <p className="relative text-xs opacity-90 mt-0.5">{p.subtitulo}</p>}
                    <div className="relative inline-flex items-center gap-1 mt-2 text-[11px] font-semibold bg-white/25 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/30">
                      <Calendar className="w-3 h-3" />
                      {p.fecha}
                    </div>
                  </div>
                )}

                {/* Precio + CTA */}
                <div className={`p-5 text-center ${p.ocupado ? 'opacity-60' : ''}`}>
                  <div className="mb-3">
                    <div className="text-3xl font-black text-slate-900">{p.precio}€</div>
                    {p.precioAhorro && !p.ocupado && (
                      <div className="text-xs text-slate-400 line-through">{p.precio + p.precioAhorro}€</div>
                    )}
                  </div>
                  {p.ocupado ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs font-bold text-red-700 flex items-center justify-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        Se ha adelantado otro patrocinador
                      </p>
                      <p className="text-[10px] text-red-500 mt-1">¡Mala suerte! Te avisaremos si se libera.</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => openModal(p.id)}
                      className={`w-full bg-gradient-to-r ${p.color} hover:scale-105 active:scale-95 text-white font-bold text-sm py-2.5 rounded-xl shadow-lg transition-all`}
                    >
                      Quiero esta plaza →
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Beneficios resumen */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
          >
            <p className="text-center text-orange-300 text-xs font-bold uppercase tracking-widest mb-4">
              Lo que recibe el Patrocinador Oficial
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {BENEFICIOS.map((b, i) => {
                const Icon = b.icon;
                return (
                  <div key={i} className="flex gap-3 items-start bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{b.texto}</p>
                      <p className="text-xs text-slate-300 mt-0.5">{b.detalle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-[11px] text-slate-400 mt-4 italic">
              ✨ Personalizamos cada patrocinio contigo para que sea único y aporte valor real a tu negocio
            </p>
          </motion.div>
        </div>
      </section>

      {/* Modal de solicitud */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          {enviado ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">¡Solicitud recibida!</h3>
              <p className="text-slate-600 text-sm mb-4">
                Te hemos enviado un email de confirmación. Nos pondremos en contacto contigo en breve.
              </p>
              <Button onClick={() => setModalOpen(false)} className="bg-orange-600 hover:bg-orange-700">
                Cerrar
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {paqueteActual?.icon} {paqueteActual?.titulo}
                </DialogTitle>
                <DialogDescription>
                  Patrocinio: <strong className="text-orange-600">{paqueteActual?.precio}€</strong> · Plaza única
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3 mt-2">
                <div>
                  <Label htmlFor="t-empresa">Empresa *</Label>
                  <Input
                    id="t-empresa"
                    value={form.nombre_empresa}
                    onChange={(e) => setForm({ ...form, nombre_empresa: e.target.value })}
                    placeholder="Tu negocio"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="t-contacto">Tu nombre *</Label>
                  <Input
                    id="t-contacto"
                    value={form.nombre_contacto}
                    onChange={(e) => setForm({ ...form, nombre_contacto: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="t-email">Email *</Label>
                    <Input
                      id="t-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="t-tel">Teléfono *</Label>
                    <Input
                      id="t-tel"
                      type="tel"
                      value={form.telefono}
                      onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="t-msg">Mensaje (opcional)</Label>
                  <Textarea
                    id="t-msg"
                    value={form.mensaje}
                    onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                    rows={2}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold py-5"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Enviar solicitud</>
                  )}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}