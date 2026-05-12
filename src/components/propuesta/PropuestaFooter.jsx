import React from "react";
import { Globe, Instagram, Facebook, Send, Mail, Phone, MapPin } from "lucide-react";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

const SOCIAL = [
  { icon: Globe, label: "Web oficial", url: "https://www.cdbustarviejo.com", handle: "cdbustarviejo.com", color: "hover:bg-orange-500" },
  { icon: Instagram, label: "Instagram", url: "https://www.instagram.com/cdbustarviejo", handle: "@cdbustarviejo", color: "hover:bg-gradient-to-br hover:from-purple-500 hover:to-pink-500" },
  { icon: Facebook, label: "Facebook", url: "https://www.facebook.com/cdbustarviejo", handle: "/cdbustarviejo", color: "hover:bg-blue-600" },
  { icon: Send, label: "Telegram", url: "https://t.me/cdbustarviejo", handle: "@cdbustarviejo", color: "hover:bg-[#229ED9]" },
];

export default function PropuestaFooter() {
  return (
    <footer className="bg-slate-950 text-white pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6">
        {/* Bloque presencia digital */}
        <div className="text-center mb-12">
          <div className="inline-block text-xs font-bold tracking-widest uppercase text-orange-400 mb-3">
            Nuestra presencia
          </div>
          <h3 className="text-2xl lg:text-3xl font-black mb-3">
            Donde podrás <span className="text-orange-400">ver vuestra marca</span>
          </h3>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            CD Bustarviejo está activo en todos los canales que importan. Vuestra marca os acompañará en cada publicación.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          {SOCIAL.map((s) => {
            const Icon = s.icon;
            return (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group bg-white/5 border border-white/10 rounded-2xl p-4 transition-all ${s.color} hover:border-transparent hover:scale-[1.03]`}
              >
                <Icon className="w-6 h-6 mb-2 text-slate-300 group-hover:text-white transition-colors" />
                <div className="text-xs font-bold text-slate-400 group-hover:text-white/80 uppercase tracking-wide">{s.label}</div>
                <div className="text-sm font-semibold text-white truncate">{s.handle}</div>
              </a>
            );
          })}
        </div>

        {/* Divisor */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-10" />

        {/* Datos del club */}
        <div className="grid md:grid-cols-3 gap-8 mb-10">
          <div className="flex items-start gap-3">
            <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-14 h-14 rounded-xl object-cover shadow-lg flex-shrink-0" />
            <div>
              <p className="font-black text-white">Club Deportivo Bustarviejo</p>
              <p className="text-xs text-slate-400 mt-1">Más que un club, una familia desde la Sierra Norte de Madrid.</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-3">Contacto Directo</p>
            <a href="mailto:presidente@cdbustarviejo.com" className="flex items-center gap-2 text-sm text-slate-300 hover:text-orange-400 transition-colors mb-2">
              <Mail className="w-3.5 h-3.5" /> presidente@cdbustarviejo.com
            </a>
            <a href="tel:+34670018673" className="flex items-center gap-2 text-sm text-slate-300 hover:text-orange-400 transition-colors">
              <Phone className="w-3.5 h-3.5" /> 670 018 673
            </a>
            <p className="text-xs text-slate-500 mt-2 ml-5">Manuel Bermudo · Presidente</p>
          </div>

          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-3">Ubicación</p>
            <div className="flex items-start gap-2 text-sm text-slate-300">
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>Bustarviejo<br />Sierra Norte de Madrid · España</span>
            </div>
          </div>
        </div>

        {/* Línea final */}
        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} CD Bustarviejo · Propuesta confidencial para GVC Gaesco
          </p>
          <p className="text-xs text-slate-600">
            Temporada 2026/27 · Documento orientativo
          </p>
        </div>
      </div>
    </footer>
  );
}