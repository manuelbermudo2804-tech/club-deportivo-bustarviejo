import React from "react";
import { Globe, Instagram, Facebook, Send, ShieldCheck, Heart } from "lucide-react";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

const SOCIALS = [
  { href: "https://www.cdbustarviejo.com", label: "Web", Icon: Globe },
  { href: "https://www.instagram.com/cdbustarviejo", label: "Instagram", Icon: Instagram },
  { href: "https://www.facebook.com/cdbustarviejo", label: "Facebook", Icon: Facebook },
  { href: "https://t.me/cdbustarviejo", label: "Telegram", Icon: Send },
];

export default function ColaboraHero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-green-600 text-white">
      {/* Glow decorativo */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-green-400/20 rounded-full blur-3xl" />

      <div className="relative px-4 pt-20 pb-16 text-center max-w-3xl mx-auto">
        <img
          src={CLUB_LOGO}
          alt="Escudo CD Bustarviejo"
          className="w-24 h-24 rounded-2xl object-cover mx-auto mb-5 shadow-2xl ring-4 ring-white/40 bg-white"
        />

        <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-[11px] font-bold tracking-wider uppercase px-3.5 py-1.5 rounded-full mb-4">
          <Heart className="w-3.5 h-3.5" /> Club Deportivo Bustarviejo · Sierra Norte de Madrid
        </span>

        <h1 className="text-3xl lg:text-5xl font-black mb-3 leading-tight drop-shadow-sm">
          Colabora con el CD Bustarviejo
        </h1>
        <p className="text-white/90 text-base lg:text-lg max-w-2xl mx-auto leading-relaxed">
          Apoya al club y gana visibilidad real entre las familias del pueblo y la sierra.
          Elige tu colaboración y paga online en 1 minuto.
        </p>

        {/* Iconos sociales como píldoras */}
        <div className="flex items-center justify-center gap-3 mt-6">
          {SOCIALS.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm hover:bg-white hover:text-orange-600 transition-all hover:scale-110 shadow-lg ring-1 ring-white/20"
            >
              <Icon className="w-5 h-5" />
            </a>
          ))}
        </div>

        <div className="inline-flex items-center gap-2 mt-6 text-white/80 text-xs bg-black/10 px-4 py-2 rounded-full">
          <ShieldCheck className="w-4 h-4" />
          Pago seguro con tarjeta vía Stripe · Entidad sin ánimo de lucro registrada
        </div>
      </div>
    </div>
  );
}