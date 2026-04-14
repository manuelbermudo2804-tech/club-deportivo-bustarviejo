import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Plus, Shirt, Flag, CreditCard, Users, ArrowRight, Hand } from "lucide-react";
import { base44 } from "@/api/base44Client";
import SponsorInterestModal from "./SponsorInterestModal";

const AUCTION_POSITIONS = ["Camiseta PECHO", "Camiseta TRASERA", "Manga", "Trasero derecha", "Trasero izquierda"];

const addons = [
  { name: "Pancarta en el campo", price: "150€", sub: "1ª temporada · 100€ la siguiente", icon: Flag, biddable: true, auction: false },
  { name: "Camiseta PECHO", price: "400€", sub: "~130 jugadores llevan tu logo", icon: Shirt, highlight: true, biddable: true, auction: true },
  { name: "Camiseta TRASERA", price: "250€", sub: "máxima visibilidad por detrás", icon: Shirt, biddable: true, auction: true },
  { name: "Manga", price: "150€", sub: "posición lateral", icon: Shirt, biddable: true, auction: true },
  { name: "Trasero derecha", price: "150€", sub: "pantalón lado derecho", icon: Shirt, biddable: true, auction: true },
  { name: "Trasero izquierda", price: "150€", sub: "pantalón lado izquierdo", icon: Shirt, biddable: true, auction: true },
];

const baseIncludes = [
  "Logo en la App del club — completamente nueva (usada por todas las familias y deportistas)",
  "Logo en la Web oficial del club — completamente renovada",
  "Mención en el boletín del club",
  "Publicación en redes sociales del club",
];

export default function SponsorPackages() {
  const [interestCounts, setInterestCounts] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [deadline, setDeadline] = useState(null);

  useEffect(() => {
    base44.functions.invoke("getSponsorInterestCounts", {})
      .then(res => {
        setInterestCounts(res.data.counts || {});
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
            </div>
          </div>
        </motion.div>

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
              <h3 className="text-xl lg:text-2xl font-black text-slate-900">Opciones adicionales</h3>
              <p className="text-sm text-slate-500">Combínalas con la cuota de colaborador</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {addons.map((addon, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`relative bg-white rounded-2xl p-5 border-2 shadow-md hover:shadow-lg transition-all hover:-translate-y-1 ${
                  addon.highlight ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-slate-200'
                }`}
              >
                {addon.highlight && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow">
                    ⭐ MÁS IMPACTO
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    addon.highlight ? 'bg-yellow-100' : 'bg-slate-100'
                  }`}>
                    <addon.icon className={`w-5 h-5 ${addon.highlight ? 'text-yellow-600' : 'text-slate-500'}`} />
                  </div>
                  <p className="text-2xl font-black text-slate-900">{addon.price}</p>
                </div>
                <p className="font-bold text-slate-800 text-sm">{addon.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{addon.sub}</p>

                {addon.biddable && (
                  <div className="mt-3 space-y-2">
                    {addon.auction && (interestCounts[addon.name] || 0) > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                        <span className="text-amber-600 text-xs">🔥</span>
                        <span className="text-xs font-bold text-amber-800">
                          {interestCounts[addon.name]} interesado{interestCounts[addon.name] > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                    {!addon.auction && (
                      <div className="bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
                        <span className="text-xs font-semibold text-green-700">✅ Precio fijo · Sin subasta</span>
                      </div>
                    )}
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
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <p className="text-xs text-slate-400 mt-4 text-center italic">
            * Todas las opciones adicionales requieren ser colaborador (cuota base de 100€).
            Compromiso mínimo de <strong>2 temporadas</strong>. IVA no incluido.
          </p>

          {deadline && (
            <div className={`mt-6 border-2 rounded-2xl p-4 text-center ${
              isDeadlinePassed
                ? 'bg-slate-100 border-slate-300'
                : 'bg-red-50 border-red-300'
            }`}>
              {isDeadlinePassed ? (
                <>
                  <p className="text-sm font-bold text-slate-700">
                    🔒 El plazo para presentar solicitudes finalizó el {new Date(deadline).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Las posiciones con más de un interesado se resolverán por subasta. El club contactará con los candidatos.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-red-700">
                    ⏰ Fecha límite para presentar solicitudes: {new Date(deadline).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Las posiciones de camiseta con más de un interesado se resolverán por subasta tras esta fecha.
                  </p>
                </>
              )}
            </div>
          )}
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
              con tu negocio. Los socios muestran su carnet activo en tu comercio y tú les aplicas una ventaja.
              <strong> Clientes reales, sin intermediarios.</strong>
            </p>
            <p className="text-slate-700 mb-6 leading-relaxed">
              Y no solo las familias de la app: <strong>cualquier persona de Bustarviejo o la sierra puede hacerse 
              socia a través de nuestra web</strong> y obtener su carnet digital. Eso significa cientos y cientos 
              de potenciales clientes para tu negocio.
            </p>

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