import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Target, Users2 } from "lucide-react";

export default function PropuestaFemenino() {
  return (
    <section className="relative py-16 lg:py-24 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at 30% 20%, #ec4899 0%, transparent 40%), radial-gradient(circle at 70% 80%, #a855f7 0%, transparent 40%)'
      }} />

      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold tracking-widest uppercase shadow-lg mb-4">
            <Sparkles className="w-3 h-3" />
            Nuestro Compromiso
          </div>
          <h2 className="text-3xl lg:text-5xl font-black text-slate-900 mb-4 leading-tight">
            Apostamos fuerte por el<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-purple-600">Fútbol Femenino</span> 💜
          </h2>
          <p className="text-lg text-slate-700 max-w-3xl mx-auto leading-relaxed">
            Sabemos que esto es lo que más os ilusiona, y a nosotros también. Estamos entusiasmados con el crecimiento de nuestro equipo femenino y queremos que sea <strong>vuestro proyecto bandera</strong> con nosotros.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {[
            { icon: Users2, title: "30 jugadoras", text: "Niñas y jóvenes comprometidas con el deporte y los valores del equipo." },
            { icon: Target, title: "Categorías mixtas y propias", text: "Apostamos por categorías femeninas propias desde la base hasta senior." },
            { icon: Sparkles, title: "Modelo de referencia", text: "Únete a un proyecto pionero en la comarca, con repercusión y visibilidad real." },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center mb-4 shadow-md">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.text}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg border-l-4 border-rose-500"
        >
          <p className="text-slate-700 italic leading-relaxed text-center text-lg">
            "Vincular a <strong className="text-rose-600">GVC Gaesco</strong> al fútbol femenino del CDB no es solo poner un logo: es construir juntos un proyecto con propósito, que inspire a niñas, familias y a toda la comarca."
          </p>
          <p className="text-center mt-3 text-sm text-slate-500 font-semibold">— Junta Directiva CD Bustarviejo</p>
        </motion.div>
      </div>
    </section>
  );
}