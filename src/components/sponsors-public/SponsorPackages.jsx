import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Star, Trophy, Shield, Heart } from "lucide-react";

const packages = [
  {
    name: "Bronce",
    emoji: "🥉",
    price: "Desde 150€",
    period: "/temporada",
    color: "from-amber-700 to-amber-800",
    border: "border-amber-300",
    bg: "bg-amber-50",
    popular: false,
    benefits: [
      "Logo en la web del club",
      "Mención en redes sociales (1 publicación)",
      "Logo en el banner rotativo de la app",
      "Certificado de colaborador",
    ]
  },
  {
    name: "Plata",
    emoji: "🥈",
    price: "Desde 350€",
    period: "/temporada",
    color: "from-slate-400 to-slate-600",
    border: "border-slate-300",
    bg: "bg-slate-50",
    popular: false,
    benefits: [
      "Todo lo de Bronce, más:",
      "Logo en cartelería de partidos",
      "Mención en redes sociales (trimestral)",
      "Logo en equipaciones de entrenamiento",
      "Entrada VIP a eventos del club",
    ]
  },
  {
    name: "Oro",
    emoji: "🥇",
    price: "Desde 600€",
    period: "/temporada",
    color: "from-yellow-500 to-amber-600",
    border: "border-yellow-400",
    bg: "bg-yellow-50",
    popular: true,
    benefits: [
      "Todo lo de Plata, más:",
      "Logo en camisetas de partido",
      "Publicidad en vallas del campo",
      "Mención en redes sociales (mensual)",
      "Descuentos exclusivos para socios del club",
      "Reportes de impacto trimestrales",
    ]
  },
  {
    name: "Principal",
    emoji: "⭐",
    price: "A consultar",
    period: "",
    color: "from-orange-500 to-red-600",
    border: "border-orange-400",
    bg: "bg-orange-50",
    popular: false,
    benefits: [
      "Todo lo de Oro, más:",
      "Naming de categoría o equipo",
      "Presencia destacada en toda la comunicación",
      "Acceso a eventos privados del club",
      "Co-branding en merchandising oficial",
      "Paquete personalizado según necesidades",
      "Máxima visibilidad en app y redes",
    ]
  },
];

export default function SponsorPackages() {
  return (
    <section className="py-20 lg:py-28 bg-white" id="paquetes">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block bg-purple-100 text-purple-700 font-semibold text-sm px-4 py-1.5 rounded-full mb-4">
            Paquetes de Patrocinio
          </span>
          <h2 className="text-3xl lg:text-5xl font-black text-slate-900 mb-4">
            Elige tu nivel de <span className="text-purple-600">colaboración</span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Todos los paquetes son orientativos y personalizables. 
            Podemos adaptarnos a tus necesidades y presupuesto.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {packages.map((pkg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`relative rounded-3xl border-2 ${pkg.border} ${pkg.bg} p-6 flex flex-col hover:shadow-xl transition-all hover:-translate-y-1 ${pkg.popular ? 'ring-2 ring-yellow-400 shadow-xl scale-[1.02]' : 'shadow-lg'}`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                  ⭐ MÁS POPULAR
                </div>
              )}

              <div className="text-center mb-6">
                <span className="text-4xl mb-2 block">{pkg.emoji}</span>
                <h3 className="text-xl font-black text-slate-900">{pkg.name}</h3>
                <div className="mt-2">
                  <span className="text-2xl lg:text-3xl font-black bg-gradient-to-r bg-clip-text text-transparent" style={{backgroundImage: `linear-gradient(to right, var(--tw-gradient-from), var(--tw-gradient-to))`}}>
                    <span className={`bg-gradient-to-r ${pkg.color} bg-clip-text text-transparent`}>{pkg.price}</span>
                  </span>
                  {pkg.period && <span className="text-sm text-slate-500">{pkg.period}</span>}
                </div>
              </div>

              <ul className="space-y-3 flex-1">
                {pkg.benefits.map((benefit, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{benefit}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#contacto"
                className={`mt-6 block text-center font-bold py-3 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                  pkg.popular
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-lg'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                Solicitar información
              </a>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-slate-400 text-sm mt-8"
        >
          * Precios orientativos. Todos los paquetes son personalizables según tus necesidades.
          <br />Los precios no incluyen IVA.
        </motion.p>
      </div>
    </section>
  );
}