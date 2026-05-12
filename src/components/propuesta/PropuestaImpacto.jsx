import React from "react";
import { motion } from "framer-motion";
import { Users, Trophy, Heart, Smartphone, MapPin, TrendingUp } from "lucide-react";

const STATS = [
  { icon: Users, value: "350+", label: "Jugadores y jugadoras", color: "from-orange-500 to-orange-600" },
  { icon: Trophy, value: "15", label: "Equipos federados", color: "from-green-500 to-green-600" },
  { icon: Heart, value: "800+", label: "Familias vinculadas", color: "from-rose-500 to-rose-600" },
  { icon: Smartphone, value: "5.200+", label: "Usuarios activos en la app/mes", color: "from-blue-500 to-blue-600" },
  { icon: MapPin, value: "Sierra Norte", label: "Referente comarcal", color: "from-purple-500 to-purple-600" },
  { icon: TrendingUp, value: "+22%", label: "Crecimiento últimas 3 temporadas", color: "from-amber-500 to-amber-600" },
];

export default function PropuestaImpacto() {
  return (
    <section className="bg-white py-16 lg:py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-block text-xs font-bold tracking-widest uppercase text-orange-600 mb-3">
            Por qué CD Bustarviejo
          </div>
          <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-4">
            Un club con tracción, con familia y con futuro
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
            No somos un club más. Somos el motor deportivo y social de la Sierra Norte de Madrid, con una comunidad fiel que respira fútbol cada fin de semana.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 shadow-md`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl lg:text-4xl font-black text-slate-900 mb-1">{stat.value}</div>
                <div className="text-sm text-slate-600 font-medium leading-snug">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}