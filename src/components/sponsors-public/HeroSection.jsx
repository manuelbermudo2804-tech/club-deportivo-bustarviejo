import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import HeroCountdownBadge from "./HeroCountdownBadge";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";
const HERO_BG = "https://media.base44.com/images/public/6992c6be619d2da592897991/948117dc5_image.png";

export default function HeroSection() {
  const [deadline, setDeadline] = useState(null);

  useEffect(() => {
    base44.functions.invoke("getSponsorInterestCounts", {})
      .then(res => {
        if (res.data?.fecha_limite) setDeadline(res.data.fecha_limite);
      })
      .catch(() => {});
  }, []);
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={HERO_BG} alt="Campo de Fútbol de Bustarviejo" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      </div>

      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-orange-400/30 rounded-full"
            style={{ left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.img
          src={CLUB_LOGO}
          alt="CD Bustarviejo"
          className="w-28 h-28 lg:w-36 lg:h-36 rounded-3xl mx-auto mb-6 shadow-2xl ring-4 ring-orange-500/50 object-cover"
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", bounce: 0.4, delay: 0.2 }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-orange-400 font-semibold text-sm lg:text-base uppercase tracking-[0.2em] mb-3">
            Colabora con nosotros
          </p>
          <h1 className="text-4xl lg:text-6xl xl:text-7xl font-black text-white leading-tight mb-4">
            Invierte en el
            <span className="block bg-gradient-to-r from-orange-400 via-yellow-400 to-green-400 bg-clip-text text-transparent">
              futuro de Bustarviejo
            </span>
          </h1>
          <p className="text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Más de <strong className="text-white">130 deportistas y sus familias</strong> forman parte de nuestro club. 
            Tu marca puede ser parte de esta historia.
          </p>
        </motion.div>

        <HeroCountdownBadge deadline={deadline} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6 flex flex-col sm:flex-row gap-3 justify-center"
        >
          <a
            href="#paquetes"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold px-8 py-4 rounded-2xl shadow-xl hover:shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 text-lg"
          >
            Ver Paquetes de Patrocinio
          </a>
          <a
            href="#contacto"
            className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/20 transition-all text-lg"
          >
            Contactar
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="w-8 h-8 text-white/50 animate-bounce" />
        </motion.div>
      </div>
    </section>
  );
}