import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Plus, Shirt, Flag, CreditCard, Users, ArrowRight } from "lucide-react";

const addons = [
  { name: "Pancarta en el campo", price: "150€", sub: "primer año · 100€/año siguiente", icon: Flag },
  { name: "Camiseta PECHO", price: "400€", sub: "~130 jugadores llevan tu logo", icon: Shirt, highlight: true },
  { name: "Camiseta TRASERA", price: "250€", sub: "máxima visibilidad por detrás", icon: Shirt },
  { name: "Manga", price: "150€", sub: "posición lateral", icon: Shirt },
  { name: "Trasero derecha", price: "150€", sub: "pantalón lado derecho", icon: Shirt },
  { name: "Trasero izquierda", price: "150€", sub: "pantalón lado izquierdo", icon: Shirt },
];

const baseIncludes = [
  "Logo en la App del club — completamente nueva (usada por todas las familias y deportistas)",
  "Logo en la Web oficial del club — completamente renovada",
  "Mención en el boletín del club",
  "Publicación en redes sociales del club",
];

export default function SponsorPackages() {
  return (
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
            Propuesta de Patrocinio Local
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
                <p className="text-orange-200 text-sm">/temporada</p>
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
              </motion.div>
            ))}
          </div>

          <p className="text-xs text-slate-400 mt-4 text-center italic">
            * Todas las opciones adicionales requieren ser colaborador (cuota base de 100€).
            Precios por temporada, IVA no incluido.
          </p>
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

            <p className="text-slate-700 mb-6 leading-relaxed">
              Nuestro sistema de <strong>Carnet de Socio digital</strong> conecta directamente a las familias del club
              con tu negocio. Los socios muestran su carnet activo en tu comercio y tú les aplicas una ventaja.
              <strong> Clientes reales, sin intermediarios.</strong>
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
              <p className="text-sm font-bold">+130 deportistas y sus familias = potenciales clientes directos para tu negocio</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}