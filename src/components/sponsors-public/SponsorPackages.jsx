import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Plus, Shirt, Flag, CreditCard, Users, ArrowRight, Hand, Gift, Smartphone, Globe, Mail, Instagram } from "lucide-react";
import { base44 } from "@/api/base44Client";
import SponsorInterestModal from "./SponsorInterestModal";
import DeadlineCountdown from "./DeadlineCountdown";

const addons = [
  { name: "Camiseta OFICIAL - Pecho", price: "400€", sub: "Camiseta oficial de partidos · ~130 jugadores llevan tu logo", icon: Shirt, highlight: true },
  { name: "Camiseta OFICIAL - Trasera", price: "250€", sub: "Camiseta oficial de partidos · máxima visibilidad por detrás", icon: Shirt },
  { name: "Chándal oficial del club", price: "250€", sub: "Chándal oficial del club · lo llevan jugadores y staff fuera del campo", icon: Shirt },
  { name: "Camiseta ENTRENAMIENTO y CALENTAMIENTO", price: "250€", sub: "Camiseta usada en entrenamientos y en el calentamiento previo a los partidos", icon: Shirt },
  { name: "Camiseta OFICIAL - Manga", price: "150€", sub: "Camiseta oficial de partidos · posición lateral", icon: Shirt },
  { name: "Camiseta OFICIAL - Trasero derecha", price: "150€", sub: "Camiseta oficial de partidos · parte trasera, lado derecho", icon: Shirt },
  { name: "Camiseta OFICIAL - Trasero izquierda", price: "150€", sub: "Camiseta oficial de partidos · parte trasera, lado izquierdo", icon: Shirt },
  { name: "Pancarta en el campo", price: "150€", sub: "1ª temporada · 100€ la siguiente", icon: Flag },
];

const baseIncludes = [
  "Logo en la App del club — completamente nueva (usada por todas las familias y deportistas)",
  "Logo en la Web oficial del club — completamente renovada",
  "Mención en el boletín del club",
  "Publicación en redes sociales del club",
];

export default function SponsorPackages() {
  const [interestCounts, setInterestCounts] = useState({});
  const [adjudicadas, setAdjudicadas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [deadline, setDeadline] = useState(null);

  useEffect(() => {
    base44.functions.invoke("getSponsorInterestCounts", {})
      .then(res => {
        setInterestCounts(res.data.counts || {});
        setAdjudicadas(res.data.adjudicadas || []);
        if (res.data.fecha_limite) setDeadline(res.data.fecha_limite);
      })
      .catch(() => {});
  }, [modalOpen]);

  // Comprobar si el plazo ha finalizado
  const isDeadlinePassed = deadline ? new Date(deadline + "T23:59:59") < new Date() : false;

  const handleInterest = (positionName) => {
    if (isDeadlinePassed) return;
    setSelectedPosition(positionName);
    setModalOpen(true);
  };

  return (
    <>
    <SponsorInterestModal
      open={modalOpen}
      onOpenChange={setModalOpen}
      posicion={selectedPosition}
      currentCount={interestCounts[selectedPosition] || 0}
    />
    <section className="py-20 lg:py-28 bg-white" id="paquetes">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block bg-orange-100 text-orange-700 font-semibold text-sm px-4 py-1.5 rounded-full mb-4">
            Propuesta de Patrocinio · 2 temporadas
          </span>
          <h2 className="text-3xl lg:text-5xl font-black text-slate-900 mb-4">
            Colabora y gana <span className="text-orange-600">visibilidad real</span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            El club reúne a familias y actividad semanal. Colaborar permite ganar visibilidad 
            y <strong className="text-slate-700">generar clientes reales</strong> entre las familias del pueblo.
          </p>
        </motion.div>

        {/* Base: Colaborador 100€ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mb-12"
        >
          <div className="absolute -inset-2 bg-gradient-to-br from-orange-200 to-green-200 rounded-[2rem] blur-xl opacity-40" />
          <div className="relative bg-white rounded-3xl border-2 border-orange-400 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-orange-100 text-xs font-semibold uppercase tracking-wider">Base obligatoria</p>
                <h3 className="text-2xl lg:text-3xl font-black text-white">Colaborador</h3>
              </div>
              <div className="text-right">
                <p className="text-4xl lg:text-5xl font-black text-white">100€</p>
                <p className="text-orange-200 text-sm">/temporada · compromiso 2 años</p>
              </div>
            </div>

            <div className="p-6 lg:p-8">
              <p className="text-slate-600 mb-4 text-sm font-medium">
                La cuota base que te da presencia en todos los canales digitales del club:
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {baseIncludes.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                <span className="text-2xl">📢</span>
                <div>
                  <p className="font-bold text-slate-900 text-sm">Canales de visibilidad</p>
                  <p className="text-xs text-slate-600 mt-1">
                    App (familias y jugadores) · Web · Redes sociales · Campo · Eventos · Equipaciones
                  </p>
                </div>
              </div>

              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-700 mb-1 font-semibold">
                  ¿Solo quieres colaborar sin añadir posiciones extra?
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  Los precios de las posiciones de abajo son <strong>adicionales</strong> a estos 100€ de cuota base.
                </p>
                <button
                  onClick={() => handleInterest("Colaborador (solo cuota base)")}
                  disabled={isDeadlinePassed}
                  className={`inline-flex items-center justify-center gap-2 font-bold px-6 py-2.5 rounded-xl shadow transition-all text-sm ${
                    isDeadlinePassed
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white hover:scale-105 active:scale-95'
                  }`}
                >
                  <Hand className="w-4 h-4" />
                  {isDeadlinePassed ? "Plazo cerrado" : "Solo cuota base · 100€"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* PATROCINADOR PRINCIPAL DIGITAL - Tarjeta destacada */}
        {(() => {
          const principalName = "Patrocinador Principal Digital";
          const isAdjudicadaPrincipal = adjudicadas.includes(principalName);
          return (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative mb-12"
            >
              <div className="absolute -inset-2 bg-gradient-to-br from-purple-300 via-indigo-300 to-blue-300 rounded-[2rem] blur-xl opacity-50" />
              <div className={`relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl overflow-hidden shadow-2xl border-2 ${isAdjudicadaPrincipal ? 'border-red-400' : 'border-purple-400'}`}>
                {/* Badge superior */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white text-[10px] font-black px-6 py-1 rounded-b-xl shadow-lg tracking-widest">
                  👑 EXCLUSIVO · SOLO 1 COMERCIO
                </div>

                <div className="p-6 lg:p-10 pt-12">
                  <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                    <div>
                      <p className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-1">Patrocinador Principal</p>
                      <h3 className="text-3xl lg:text-4xl font-black text-white">Digital</h3>
                      <p className="text-purple-200 text-sm mt-1">El patrocinador oficial del mundo digital del club</p>
                    </div>
                    <div className="text-right">
                      <p className="text-5xl lg:text-6xl font-black text-white">600€</p>
                      <p className="text-purple-300 text-xs">+ 100€ cuota base = <strong className="text-white">700€ total</strong></p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {/* APP */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Smartphone className="w-5 h-5 text-purple-300" />
                        <p className="font-bold text-white text-sm">📱 En la APP</p>
                      </div>
                      <ul className="text-xs text-purple-100 space-y-1.5">
                        <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" /><span>Logo en la <strong>pantalla de bienvenida</strong> (2 segundos al abrir)</span></li>
                        <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" /><span><strong>Banner destacado</strong> en el dashboard principal</span></li>
                        <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" /><span><strong>Primera posición</strong> en el carrusel de sponsors</span></li>
                      </ul>
                    </div>

                    {/* WEB */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-5 h-5 text-blue-300" />
                        <p className="font-bold text-white text-sm">🌐 En la WEB <span className="text-[10px] text-blue-300 font-semibold">· NUEVA Y RENOVADA</span></p>
                      </div>
                      <ul className="text-xs text-purple-100 space-y-1.5">
                        <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" /><span>Logo destacado en <strong>cabecera</strong> (visible en cada visita)</span></li>
                        <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" /><span>Sección <strong>"Patrocinador Principal"</strong> en la home</span></li>
                        <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" /><span>Logo en el <strong>footer</strong> de todas las páginas</span></li>
                        <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" /><span>Web <strong>completamente nueva</strong>, con tráfico del pueblo y la sierra</span></li>
                      </ul>
                    </div>

                    {/* REDES */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Instagram className="w-5 h-5 text-pink-300" />
                        <p className="font-bold text-white text-sm">📲 En REDES SOCIALES</p>
                      </div>
                      <ul className="text-xs text-purple-100 space-y-1.5">
                        <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" /><span><strong>Mención destacada</strong> como patrocinador principal</span></li>
                        <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" /><span>Presencia en publicaciones relevantes del club</span></li>
                      </ul>
                    </div>

                    {/* EMAILS */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-5 h-5 text-amber-300" />
                        <p className="font-bold text-white text-sm">📧 En EMAILS</p>
                      </div>
                      <ul className="text-xs text-purple-100 space-y-1.5">
                        <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" /><span>Logo en el <strong>footer</strong> de todos los emails oficiales</span></li>
                        <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" /><span>Convocatorias, recibos, anuncios, recordatorios...</span></li>
                      </ul>
                    </div>
                  </div>

                  {/* Alcance */}
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-xl p-4 mb-6">
                    <p className="text-white font-bold text-sm mb-2">📊 Alcance real</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                      <div>
                        <p className="text-2xl font-black text-white">~400</p>
                        <p className="text-[10px] text-purple-200 uppercase tracking-wide">personas en la app</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-white">~200</p>
                        <p className="text-[10px] text-purple-200 uppercase tracking-wide">seguidores en redes</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-white">Miles</p>
                        <p className="text-[10px] text-purple-200 uppercase tracking-wide">visitas a la web</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-white">1</p>
                        <p className="text-[10px] text-purple-200 uppercase tracking-wide">único comercio</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  {isAdjudicadaPrincipal ? (
                    <div className="w-full flex items-center justify-center gap-2 text-sm font-bold px-4 py-3 rounded-xl bg-red-500/20 text-red-300 border border-red-400/40">
                      <CheckCircle2 className="w-4 h-4" />
                      Posición ya ocupada
                    </div>
                  ) : (
                    <button
                      onClick={() => handleInterest(principalName)}
                      disabled={isDeadlinePassed}
                      className={`w-full flex items-center justify-center gap-2 font-black px-6 py-3.5 rounded-xl transition-all text-sm shadow-lg ${
                        isDeadlinePassed
                          ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white hover:scale-[1.02] active:scale-95'
                      }`}
                    >
                      <Hand className="w-4 h-4" />
                      {isDeadlinePassed ? "Plazo cerrado" : "Quiero ser el Patrocinador Principal Digital"}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* Opciones adicionales */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl lg:text-2xl font-black text-slate-900">Otras opciones adicionales</h3>
              <p className="text-sm text-slate-500">Combínalas con la cuota de colaborador</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {addons.map((addon, i) => {
              const isAdjudicada = adjudicadas.includes(addon.name);
              return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`relative bg-white rounded-2xl p-5 border-2 shadow-md transition-all ${
                  isAdjudicada ? 'border-red-300 opacity-75' : addon.highlight ? 'border-yellow-400 ring-2 ring-yellow-200 hover:shadow-lg hover:-translate-y-1' : 'border-slate-200 hover:shadow-lg hover:-translate-y-1'
                }`}
              >
                {isAdjudicada && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow z-10">
                    🔒 ADJUDICADA
                  </div>
                )}
                {!isAdjudicada && addon.highlight && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow">
                    ⭐ MÁS IMPACTO
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isAdjudicada ? 'bg-red-100' : addon.highlight ? 'bg-yellow-100' : 'bg-slate-100'
                  }`}>
                    <addon.icon className={`w-5 h-5 ${isAdjudicada ? 'text-red-400' : addon.highlight ? 'text-yellow-600' : 'text-slate-500'}`} />
                  </div>
                  <p className={`text-2xl font-black ${isAdjudicada ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{addon.price}</p>
                </div>
                <p className={`font-bold text-sm ${isAdjudicada ? 'text-slate-400' : 'text-slate-800'}`}>{addon.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{addon.sub}</p>

                <div className="mt-3">
                  {isAdjudicada ? (
                    <div className="w-full flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-red-100 text-red-700 border border-red-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Posición ya ocupada
                    </div>
                  ) : (
                  <button
                    onClick={() => handleInterest(addon.name)}
                    disabled={isDeadlinePassed}
                    className={`w-full flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm ${
                      isDeadlinePassed
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white hover:scale-105 active:scale-95'
                    }`}
                  >
                    <Hand className="w-3.5 h-3.5" />
                    {isDeadlinePassed ? "Plazo cerrado" : "Me interesa"}
                  </button>
                  )}
                </div>
              </motion.div>
              );
            })}
          </div>

          <p className="text-xs text-slate-400 mt-4 text-center italic">
            * Todas las opciones adicionales requieren ser colaborador (cuota base de 100€).
            Compromiso mínimo de <strong>2 temporadas</strong>. IVA no incluido.
          </p>

          {deadline && <DeadlineCountdown deadline={deadline} />}
        </motion.div>

        {/* Generación de clientes */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-3xl p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl lg:text-2xl font-black text-slate-900">Generación de clientes directa</h3>
            </div>

            <p className="text-slate-700 mb-4 leading-relaxed">
              Nuestro sistema de <strong>Carnet de Socio digital</strong> conecta directamente a las familias del club
              con tu negocio. Los socios muestran su carnet activo en tu comercio y <strong>tú decides libremente qué ventaja ofrecer</strong>.
              <strong> Clientes reales, sin intermediarios.</strong>
            </p>
            <p className="text-slate-700 mb-4 leading-relaxed">
              Y no solo las familias de la app: <strong>cualquier persona de Bustarviejo o la sierra puede hacerse 
              socia a través de nuestra web</strong> y obtener su carnet digital. Eso significa cientos y cientos 
              de potenciales clientes para tu negocio.
            </p>

            {/* Ejemplos de ventajas */}
            <div className="bg-white rounded-2xl border-2 border-green-200 p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-5 h-5 text-green-600" />
                <p className="font-bold text-slate-900">Tú decides la ventaja — ¡libertad total!</p>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Cada comercio elige libremente qué ofrecer a los socios del club. No hay un formato fijo. Ejemplos reales:
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { emoji: "🍔", example: "Hamburguesa completa a 8€", type: "Bar / Restaurante" },
                  { emoji: "🔧", example: "5% de descuento en todos los productos", type: "Ferretería / Tienda" },
                  { emoji: "🐾", example: "10% en piensos y accesorios", type: "Tienda de animales" },
                  { emoji: "💇", example: "Corte de pelo a precio especial", type: "Peluquería" },
                  { emoji: "🍕", example: "Menú del día con bebida incluida", type: "Restaurante" },
                  { emoji: "🏋️", example: "Primera clase gratis", type: "Gimnasio / Academia" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-green-50 rounded-xl p-3">
                    <span className="text-xl flex-shrink-0">{item.emoji}</span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.example}</p>
                      <p className="text-[11px] text-slate-500">{item.type}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-700 font-semibold mt-3 text-center">
                💡 Descuentos, ofertas especiales, menús, regalos, servicios... ¡lo que mejor encaje con tu negocio!
              </p>
            </div>

            {/* Capturas del carnet */}
            <div className="flex justify-center gap-4 lg:gap-8 mb-8">
              <div className="text-center">
                <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-green-400 w-40 sm:w-48 lg:w-56">
                  <img src="https://media.base44.com/images/public/6992c6be619d2da592897991/c0bd0e036_generated_image.png" alt="Carnet de Socio Activo" className="w-full h-auto" />
                </div>
                <p className="text-xs font-bold text-green-600 mt-2">✅ Carnet ACTIVO</p>
              </div>
              <div className="text-center">
                <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-red-300 w-40 sm:w-48 lg:w-56">
                  <img src="https://media.base44.com/images/public/6992c6be619d2da592897991/a666bd91f_generated_image.png" alt="Carnet de Socio Expirado" className="w-full h-auto" />
                </div>
                <p className="text-xs font-bold text-red-500 mt-2">❌ Carnet EXPIRADO</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-4 text-sm font-semibold">
              {["Socio con Carnet ACTIVO", "Visita tu comercio", "Muestra el carnet", "Aplicas ventaja", "Cliente directo"].map((step, i) => (
                <React.Fragment key={i}>
                  <div className="bg-white rounded-xl px-4 py-2 shadow-sm border border-green-200 text-slate-700 text-center">
                    {step}
                  </div>
                  {i < 4 && <ArrowRight className="w-4 h-4 text-green-500 hidden sm:block flex-shrink-0" />}
                </React.Fragment>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-green-700 bg-green-100 rounded-xl px-4 py-3">
              <Users className="w-5 h-5" />
              <p className="text-sm font-bold">Deportistas, familias y socios de la web = cientos de potenciales clientes directos para tu negocio</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
    </>
  );
}