import React from "react";
import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "Patrocinar al CD Bustarviejo ha sido la mejor inversión que hemos hecho en la comunidad. Nuestro negocio local ha ganado visibilidad y cariño de las familias.",
    author: "Comercio local de Bustarviejo",
    role: "Patrocinador Plata"
  },
  {
    quote: "Ver el escudo del club junto a nuestro logo nos llena de orgullo. Sabemos que estamos contribuyendo al bienestar de los chavales del pueblo.",
    author: "Empresa de la Sierra Norte",
    role: "Patrocinador Oro"
  },
  {
    quote: "El CD Bustarviejo es mucho más que fútbol. Es el alma del pueblo. Apoyarles es apoyar a nuestros hijos y a nuestra comunidad.",
    author: "Padre y patrocinador",
    role: "Patrocinador Bronce"
  }
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block bg-blue-100 text-blue-700 font-semibold text-sm px-4 py-1.5 rounded-full mb-4">
            Nuestros Colaboradores
          </span>
          <h2 className="text-3xl lg:text-5xl font-black text-slate-900">
            Lo dicen <span className="text-blue-600">ellos</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all relative"
            >
              <div className="absolute -top-3 left-6 text-5xl text-orange-300 font-serif leading-none">"</div>
              <p className="text-slate-700 italic leading-relaxed mb-6 pt-4">{t.quote}</p>
              <div className="border-t border-slate-100 pt-4">
                <p className="font-bold text-slate-900 text-sm">{t.author}</p>
                <p className="text-xs text-orange-600 font-medium">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}