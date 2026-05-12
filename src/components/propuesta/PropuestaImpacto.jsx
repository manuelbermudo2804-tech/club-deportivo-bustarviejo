import React from "react";
import { motion } from "framer-motion";
import { Users, Trophy, Shield, Star, Target, Mountain, Heart, MapPin, Sparkles } from "lucide-react";

const STATS = [
  { icon: Users, value: "+170", label: "Deportistas activos", color: "from-blue-500 to-cyan-500" },
  { icon: Trophy, value: "8", label: "Categorías deportivas", color: "from-orange-500 to-red-500" },
  { icon: Shield, value: "+25", label: "Entrenadores y equipo técnico", color: "from-green-500 to-emerald-500" },
  { icon: Star, value: "+200", label: "Familias vinculadas al club", color: "from-purple-500 to-pink-500" },
  { icon: Target, value: "4", label: "Fútbol, Basket, Pádel, F. Sala", color: "from-yellow-500 to-orange-500" },
  { icon: Mountain, value: "365", label: "Días de actividad en temporada", color: "from-slate-500 to-slate-700" },
];

const PILARES = [
  { icon: Heart, title: "Pasión local", text: "El latido deportivo de la Sierra Norte de Madrid." },
  { icon: Shield, title: "Valores", text: "Espacio seguro para crecer, aprender y desarrollarse." },
  { icon: Sparkles, title: "Igualdad", text: "Apuesta firme por la inclusión y el deporte femenino." },
  { icon: MapPin, title: "Arraigo", text: "Generaciones de familias unidas por un mismo escudo." },
];

export default function PropuestaImpacto() {
  return (
    <section className="relative bg-gradient-to-b from-white via-slate-50 to-white py-16 lg:py-24 overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-100 rounded-full blur-3xl opacity-40 translate-y-1/2 -translate-x-1/3" />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Cabecera centrada */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <div className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-orange-600 mb-4 px-4 py-1.5 bg-orange-50 rounded-full border border-orange-100">
            Por qué CD Bustarviejo
          </div>
          <h2 className="text-4xl lg:text-6xl font-black text-slate-900 mb-6 leading-[1.05] tracking-tight">
            Más que un club,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-orange-500 to-green-600">
              una familia
            </span>
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            El CD Bustarviejo es el <strong className="text-slate-900">latido deportivo de un pueblo de la Sierra Norte de Madrid</strong>. Generaciones de familias comparten cada semana la pasión por el deporte en un entorno único, rodeados de naturaleza.
          </p>
        </motion.div>

        {/* Pilares destacados */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-16">
          {PILARES.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="group relative bg-white rounded-2xl p-6 shadow-md border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-green-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">{p.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{p.text}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Banner cifras clave */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden shadow-2xl mb-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
        >
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, #f97316 0%, transparent 50%), radial-gradient(circle at 80% 50%, #16a34a 0%, transparent 50%)'
          }} />
          <div className="relative grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/10">
            {[
              { v: "+170", l: "Deportistas" },
              { v: "+200", l: "Familias" },
              { v: "+25", l: "Equipo técnico" },
              { v: "8", l: "Categorías" },
            ].map((s, i) => (
              <div key={i} className="p-6 lg:p-8 text-center text-white">
                <div className="text-4xl lg:text-6xl font-black bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent">{s.v}</div>
                <div className="text-xs lg:text-sm uppercase tracking-widest text-slate-400 mt-2 font-semibold">{s.l}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats detallados */}
        <div className="text-center mb-8">
          <h3 className="text-2xl lg:text-3xl font-black text-slate-900">El club en cifras</h3>
          <p className="text-slate-500 mt-2">Datos reales de la temporada actual</p>
        </div>
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