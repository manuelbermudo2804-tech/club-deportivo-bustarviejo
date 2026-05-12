import React from "react";
import { motion } from "framer-motion";

const CDB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";
const GVC_LOGO = "https://media.base44.com/images/public/6992c6be619d2da592897991/8e8967490_logo_hori_rgb.gif";

export default function PropuestaHero({ empresa = "GVC Gaesco", logoEmpresa = GVC_LOGO }) {
  return (
    <section className="relative overflow-hidden text-white">
      {/* Foto real del campo de Bustarviejo */}
      <div className="absolute inset-0">
        <img
          src="https://media.base44.com/images/public/6992c6be619d2da592897991/948117dc5_image.png"
          alt="Campo de CD Bustarviejo"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-[#0a4a55]/85" />
      </div>
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(14,122,140,0.5) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(249,115,22,0.4) 0%, transparent 50%)'
      }} />

      <div className="relative max-w-6xl mx-auto px-6 py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm text-xs font-semibold tracking-widest uppercase mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Propuesta de Patrocinio · Temporada 2026 / 2027
          </div>
          <h1 className="text-4xl lg:text-6xl font-black tracking-tight mb-6 leading-tight">
            Una alianza con <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-200">valor real</span>
            <br />
            para vuestra marca
          </h1>
          <p className="text-lg lg:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            CD Bustarviejo y <strong className="text-white">{empresa}</strong> comparten un mismo ADN: rigor, cercanía y compromiso con las nuevas generaciones. Os presentamos una propuesta hecha a vuestra medida.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 bg-white/95 rounded-3xl p-8 lg:p-10 shadow-2xl"
        >
          <div className="text-center">
            <img src={CDB_LOGO} alt="CD Bustarviejo" className="h-24 lg:h-28 mx-auto mb-3" />
            <div className="text-xs font-bold text-slate-600 tracking-widest uppercase">CD Bustarviejo</div>
          </div>

          <div className="flex flex-col items-center text-slate-400">
            <span className="text-3xl font-light">×</span>
            <span className="text-[10px] font-bold tracking-widest mt-1">PARTNERS</span>
          </div>

          <div className="text-center">
            <img src={logoEmpresa} alt={empresa} className="h-16 lg:h-20 mx-auto mb-3 object-contain" />
            <div className="text-xs font-bold text-slate-600 tracking-widest uppercase">{empresa}</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}