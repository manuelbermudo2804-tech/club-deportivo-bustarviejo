import React, { useState, useEffect } from "react";
import { Trophy, Users, Euro, Sparkles, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

// URL de la imagen hero generada (Copa del Mundo + colores del club)
const HERO_BG_URL = "https://media.base44.com/images/public/6992c6be619d2da592897991/03f55d3ee_generated_image.png";
const ESCUDO_CLUB = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

// Hero espectacular con imagen de fondo de la Copa + countdown al primer partido del Mundial
export default function PorraHeroLanding({ config, onCrearPorra, totalParticipantes = 0, bote = 0 }) {
  const [tiempo, setTiempo] = useState({ dias: 0, horas: 0, min: 0, seg: 0 });

  useEffect(() => {
    if (!config?.fecha_limite_predicciones) return;
    const target = new Date(config.fecha_limite_predicciones).getTime();
    const tick = () => {
      const ahora = Date.now();
      const diff = Math.max(0, target - ahora);
      const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
      const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const min = Math.floor((diff / (1000 * 60)) % 60);
      const seg = Math.floor((diff / 1000) % 60);
      setTiempo({ dias, horas, min, seg });
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [config]);

  return (
    <div className="relative overflow-hidden">
      {/* Imagen de fondo espectacular */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: `url('${HERO_BG_URL}')`,
          backgroundPosition: 'center center',
        }}
      />
      
      {/* Overlay para mejorar legibilidad y reforzar colores del club */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-900/40 via-red-800/30 to-orange-900/70" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

      {/* Banderas flotantes decorativas */}
      <div className="absolute inset-0 opacity-30 pointer-events-none hidden md:block">
        <div className="absolute top-20 left-[10%] text-4xl animate-bounce" style={{animationDelay: '0s', animationDuration: '3s'}}>🇪🇸</div>
        <div className="absolute top-40 right-[12%] text-4xl animate-bounce" style={{animationDelay: '0.4s', animationDuration: '3.5s'}}>🇦🇷</div>
        <div className="absolute bottom-32 left-[8%] text-4xl animate-bounce" style={{animationDelay: '0.8s', animationDuration: '4s'}}>🇧🇷</div>
        <div className="absolute bottom-20 right-[10%] text-4xl animate-bounce" style={{animationDelay: '1.2s', animationDuration: '3.2s'}}>🇫🇷</div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-10 md:py-16 text-white text-center">
        {/* Escudo CDB con anillo dorado */}
        <div className="mb-5 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-60 animate-pulse"></div>
            <div className="relative bg-white rounded-full p-2 shadow-2xl border-4 border-yellow-400">
              <img 
                src={ESCUDO_CLUB} 
                alt="CD Bustarviejo"
                className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover"
              />
            </div>
            <div className="absolute -top-2 -right-2">
              <Sparkles className="w-7 h-7 text-yellow-300 animate-spin" style={{animationDuration: '3s'}} />
            </div>
          </div>
        </div>

        {/* Badge superior */}
        <div className="mb-3">
          <span className="inline-block bg-yellow-400 text-red-900 font-black px-4 py-1.5 rounded-full text-xs md:text-sm tracking-wider uppercase shadow-2xl border-2 border-white/40">
            🌎 MUNDIAL FIFA 2026 · USA · CANADÁ · MÉXICO
          </span>
        </div>

        {/* Título épico */}
        <h1 
          className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-2 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
          style={{ textShadow: '0 0 20px rgba(255, 200, 0, 0.5), 0 4px 8px rgba(0,0,0,0.8)' }}
        >
          LA PORRA
        </h1>
        <p className="text-xl md:text-3xl font-black mb-1 text-yellow-300 drop-shadow-lg uppercase tracking-wide">
          del Mundial 2026
        </p>
        <p className="text-sm md:text-lg font-bold mb-6 text-white/95 drop-shadow-lg">
          by <span className="text-yellow-200">CD Bustarviejo</span>
        </p>

        {/* Frase impactante */}
        <p className="text-sm md:text-base mb-6 text-white/90 max-w-2xl mx-auto drop-shadow-lg font-medium">
          🏆 <strong>48 selecciones · 104 partidos · 1 campeón.</strong>
          <br />¿Te atreves a predecirlo todo?
        </p>

        {/* Countdown */}
        {config?.fecha_limite_predicciones && (
          <div className="mb-7">
            <p className="text-xs md:text-sm uppercase tracking-widest mb-3 text-yellow-200 font-black flex items-center justify-center gap-2 drop-shadow-lg">
              <Flame className="w-4 h-4" /> Cierre de predicciones en <Flame className="w-4 h-4" />
            </p>
            <div className="flex justify-center gap-2 md:gap-3">
              {[
                { v: tiempo.dias, l: 'Días' },
                { v: tiempo.horas, l: 'Horas' },
                { v: tiempo.min, l: 'Min' },
                { v: tiempo.seg, l: 'Seg' },
              ].map((b, i) => (
                <div key={i} className="bg-black/50 backdrop-blur-md rounded-2xl px-3 py-3 md:px-5 md:py-4 min-w-[68px] md:min-w-[90px] border-2 border-yellow-400/60 shadow-2xl">
                  <div className="text-3xl md:text-5xl font-black tabular-nums text-yellow-300 drop-shadow-lg">{String(b.v).padStart(2, '0')}</div>
                  <div className="text-[10px] md:text-xs uppercase tracking-wider text-white/80 font-bold">{b.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats destacadas */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 max-w-2xl mx-auto mb-7">
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-3 md:p-4 border-2 border-yellow-400/40 shadow-xl">
            <Users className="w-5 h-5 md:w-7 md:h-7 mx-auto mb-1 text-yellow-300" />
            <div className="text-xl md:text-3xl font-black text-white">{totalParticipantes}</div>
            <div className="text-[9px] md:text-xs uppercase tracking-wider text-white/80 font-bold">Participantes</div>
          </div>
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-3 md:p-4 border-2 border-yellow-400/40 shadow-xl">
            <Euro className="w-5 h-5 md:w-7 md:h-7 mx-auto mb-1 text-yellow-300" />
            <div className="text-xl md:text-3xl font-black text-white">{bote.toFixed(0)}€</div>
            <div className="text-[9px] md:text-xs uppercase tracking-wider text-white/80 font-bold">Bote total</div>
            {bote > 0 && (() => {
              const pctClub = Number(config?.comision_club_porcentaje) || 10;
              const premios = bote * (1 - pctClub / 100);
              const club = bote * (pctClub / 100);
              return (
                <div className="mt-1.5 pt-1.5 border-t border-yellow-400/20 text-[8px] md:text-[10px] text-white/70 leading-tight">
                  <div>🏆 {premios.toFixed(0)}€ premios</div>
                  <div>💚 {club.toFixed(0)}€ club ({pctClub}%)</div>
                </div>
              );
            })()}
          </div>
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-3 md:p-4 border-2 border-yellow-400/40 shadow-xl">
            <Trophy className="w-5 h-5 md:w-7 md:h-7 mx-auto mb-1 text-yellow-300" />
            <div className="text-xl md:text-3xl font-black text-white">{config?.precio_entrada || 15}€</div>
            <div className="text-[9px] md:text-xs uppercase tracking-wider text-white/80 font-bold">Entrada</div>
          </div>
        </div>

        {/* CTA principal */}
        <Button 
          onClick={onCrearPorra}
          className="bg-yellow-400 hover:bg-yellow-300 text-red-900 font-black text-lg md:text-2xl px-8 md:px-14 py-6 md:py-8 rounded-2xl shadow-[0_0_40px_rgba(255,200,0,0.6)] hover:scale-105 transition-all border-4 border-white/60"
        >
          <Trophy className="w-6 h-6 md:w-7 md:h-7 mr-2" />
          ¡APUNTAR MI PORRA YA!
        </Button>

        <p className="mt-4 text-xs md:text-sm text-white/90 drop-shadow-lg font-medium">
          ⚡ Solo {config?.precio_entrada || 15}€ · 🥇🥈🥉 Premios al 1º, 2º y 3º · 💚 El {config?.comision_club_porcentaje || 10}% va para apoyar a los equipos del CD Bustarviejo
        </p>
      </div>

      {/* Onda decorativa inferior */}
      <div className="relative">
        <svg className="w-full h-12 md:h-20 block" viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,40 C480,80 960,0 1440,40 L1440,80 L0,80 Z" fill="white"></path>
        </svg>
      </div>
    </div>
  );
}