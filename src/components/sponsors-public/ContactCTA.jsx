import React from "react";
import { motion } from "framer-motion";
import { Mail, Phone, ArrowRight } from "lucide-react";

const CLUB_EMAIL = "cdbustarviejo@gmail.com";
const CLUB_PHONE = "";

export default function ContactCTA() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-hidden" id="contacto">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <span className="text-5xl mb-4 block">🤝</span>
          <h2 className="text-3xl lg:text-5xl font-black text-white mb-4">
            ¿Hablamos?
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Cuéntanos tu idea y diseñaremos juntos un paquete de patrocinio 
            que se adapte a tu negocio y presupuesto.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <a
              href={`mailto:${CLUB_EMAIL}?subject=Interés en patrocinio CD Bustarviejo`}
              className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold px-8 py-4 rounded-2xl shadow-xl hover:shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 text-lg"
            >
              <Mail className="w-5 h-5" />
              Enviar Email
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 max-w-lg mx-auto">
            <p className="text-slate-400 text-sm mb-3">También puedes escribirnos a:</p>
            <a href={`mailto:${CLUB_EMAIL}`} className="text-orange-400 font-bold text-lg hover:text-orange-300 transition-colors block">
              {CLUB_EMAIL}
            </a>
            <p className="text-slate-500 text-xs mt-4">
              Te responderemos en menos de 48 horas con toda la información que necesites.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}