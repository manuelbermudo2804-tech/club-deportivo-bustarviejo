import React from "react";
import { motion } from "framer-motion";
import { Trophy, Users, Shield, Star, Target, Mountain } from "lucide-react";

const stats = [
  { value: "+130", label: "Deportistas activos", icon: Users, color: "from-blue-500 to-cyan-500" },
  { value: "6", label: "Categorías deportivas", icon: Trophy, color: "from-orange-500 to-red-500" },
  { value: "~20", label: "Entrenadores y equipo técnico", icon: Shield, color: "from-green-500 to-emerald-500" },
  { value: "100+", label: "Familias en el club", icon: Star, color: "from-purple-500 to-pink-500" },
  { value: "4", label: "Fútbol, Basket, Pádel, F. Sala", icon: Target, color: "from-yellow-500 to-orange-500" },
  { value: "365", label: "Días de actividad en temporada", icon: Mountain, color: "from-slate-500 to-slate-700" },
];

const values = [
  {
    emoji: "🤝",
    title: "Compromiso social e inclusión",
    desc: "Ofrecemos facilidades de pago a familias con dificultades. Apostamos por la integración multicultural y la igualdad de oportunidades. Ningún niño o niña se queda fuera."
  },
  {
    emoji: "⚽",
    title: "Referentes del deporte femenino",
    desc: "Somos un club comprometido con el fútbol femenino. Trabajamos cada día para que todas las niñas y mujeres de Bustarviejo tengan su espacio, sus referentes y las mismas oportunidades en el deporte."
  },
  {
    emoji: "🌿",
    title: "Arraigo local",
    desc: "Somos el motor deportivo y social de Bustarviejo. El deporte vertebra nuestra comunidad y une a las familias del pueblo."
  },
  {
    emoji: "🌱",
    title: "Cantera de talento",
    desc: "Desde Pre-Benjamín hasta el equipo Aficionado, acompañamos el crecimiento deportivo y personal de nuestros y nuestras deportistas."
  }
];

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6 }
};

export default function ImpactSection() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-slate-50 to-white" id="impacto">
      <div className="max-w-6xl mx-auto px-4">
        {/* Stats */}
        <motion.div {...fadeInUp} className="text-center mb-16">
          <span className="inline-block bg-green-100 text-green-700 font-semibold text-sm px-4 py-1.5 rounded-full mb-4">
            Nuestro Impacto
          </span>
          <h2 className="text-3xl lg:text-5xl font-black text-slate-900 mb-4">
            Cifras que hablan <span className="text-green-600">por sí solas</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-20">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="relative group"
            >
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all hover:-translate-y-1 text-center">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
                <p className="text-3xl lg:text-4xl font-black text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Values */}
        <motion.div {...fadeInUp} className="text-center mb-12">
          <h3 className="text-2xl lg:text-4xl font-black text-slate-900">
            ¿Por qué <span className="text-orange-600">patrocinarnos</span>?
          </h3>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto">
            Tu inversión impacta directamente en la vida de cientos de jóvenes y sus familias
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {values.map((val, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="flex gap-4 bg-white rounded-2xl p-6 shadow-md border border-slate-100 hover:shadow-lg transition-all"
            >
              <span className="text-4xl flex-shrink-0">{val.emoji}</span>
              <div>
                <h4 className="font-bold text-lg text-slate-900 mb-1">{val.title}</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{val.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}