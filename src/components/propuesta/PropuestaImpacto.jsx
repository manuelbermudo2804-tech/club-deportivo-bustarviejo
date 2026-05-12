import React from "react";
import { motion } from "framer-motion";
import { Users, Trophy, Shield, Star, Target, Mountain } from "lucide-react";

const STATS = [
  { icon: Users, value: "+130", label: "Deportistas activos", color: "from-blue-500 to-cyan-500" },
  { icon: Trophy, value: "6", label: "Categorías deportivas", color: "from-orange-500 to-red-500" },
  { icon: Shield, value: "~20", label: "Entrenadores y equipo técnico", color: "from-green-500 to-emerald-500" },
  { icon: Star, value: "100+", label: "Familias en el club", color: "from-purple-500 to-pink-500" },
  { icon: Target, value: "4", label: "Fútbol, Basket, Pádel, F. Sala", color: "from-yellow-500 to-orange-500" },
  { icon: Mountain, value: "365", label: "Días de actividad en temporada", color: "from-slate-500 to-slate-700" },
];

export default function PropuestaImpacto() {
  return (
    <section className="bg-white py-16 lg:py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Texto */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-block text-xs font-bold tracking-widest uppercase text-orange-600 mb-3">
              Por qué CD Bustarviejo
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-5 leading-tight">
              Más que un club,<br />
              <span className="text-orange-600">una familia</span>
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              El CD Bustarviejo es el <strong>latido deportivo de un pueblo de la Sierra Norte de Madrid</strong>. Generaciones de familias comparten cada semana la pasión por el deporte en un entorno único, rodeados de naturaleza.
            </p>
            <p className="text-slate-700 leading-relaxed mb-4">
              Ofrecemos a niños, niñas y jóvenes un espacio seguro donde <strong>crecer, aprender valores y desarrollarse</strong> como personas: fútbol, baloncesto, pádel y fútbol sala. Desde Pre-Benjamín hasta el equipo Aficionado.
            </p>
            <p className="text-slate-700 leading-relaxed">
              Apostamos firmemente por la <strong>inclusión, la igualdad y el deporte femenino</strong>. Cada temporada, más de 130 deportistas y sus familias forman parte del club. Y seguimos creciendo.
            </p>
          </motion.div>

          {/* Imagen */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-br from-orange-200 to-green-200 rounded-3xl blur-2xl opacity-40" />
            <div className="relative rounded-3xl shadow-2xl w-full aspect-[4/3] overflow-hidden">
              <img
                src="https://media.base44.com/images/public/6992c6be619d2da592897991/eb2439635_fondo_optimizado.jpg"
                alt="CD Bustarviejo"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <p className="font-black text-2xl lg:text-3xl">+130 deportistas</p>
                <p className="text-sm opacity-90 mt-1">y sus familias, unidos por el deporte</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 hover:shadow-lg transition-all text-center"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-3 shadow-md`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl lg:text-4xl font-black text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1 leading-snug">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}