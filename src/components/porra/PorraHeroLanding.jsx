import React, { useState, useEffect } from "react";
import { Trophy, Calendar, Users, Euro, Sparkles, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

// Hero espectacular con countdown al primer partido del Mundial
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
      {/* Fondo con gradiente animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-700 via-orange-600 to-yellow-500"></div>
      
      {/* Patrón de balones de fútbol decorativos */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 text-9xl rotate-12">⚽</div>
        <div className="absolute top-32 right-20 text-7xl -rotate-12">⚽</div>
        <div className="absolute bottom-20 left-1/4 text-8xl rotate-45">⚽</div>
        <div className="absolute bottom-40 right-1/3 text-6xl">⚽</div>
      </div>

      {/* Banderas flotantes decorativas */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-20 left-1/4 text-5xl animate-bounce" style={{animationDelay: '0s'}}>🇪🇸</div>
        <div className="absolute top-40 right-1/4 text-5xl animate-bounce" style={{animationDelay: '0.3s'}}>🇦🇷</div>
        <div className="absolute top-60 left-1/3 text-5xl animate-bounce" style={{animationDelay: '0.6s'}}>🇧🇷</div>
        <div className="absolute bottom-32 right-1/4 text-5xl animate-bounce" style={{animationDelay: '0.9s'}}>🇫🇷</div>
        <div className="absolute bottom-20 left-1/2 text-5xl animate-bounce" style={{animationDelay: '1.2s'}}>🏴󠁧󠁢󠁥󠁮󠁧󠁿</div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-20 text-white text-center">
        {/* Logo CDB */}
        <div className="mb-6 flex justify-center">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 shadow-2xl border-4 border-white/30">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg" 
              alt="CD Bustarviejo"
              className="w-20 h-20 rounded-full"
            />
          </div>
        </div>

        {/* Trofeo gigante animado */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <Trophy className="w-32 h-32 md:w-40 md:h-40 text-yellow-300 drop-shadow-2xl animate-pulse" strokeWidth={1.5} />
            <Sparkles className="absolute -top-2 -right-2 w-10 h-10 text-yellow-200 animate-spin" style={{animationDuration: '3s'}} />
            <Sparkles className="absolute -bottom-2 -left-2 w-8 h-8 text-yellow-200 animate-spin" style={{animationDuration: '4s'}} />
          </div>
        </div>

        {/* Título épico */}
        <div className="mb-2">
          <span className="inline-block bg-yellow-400 text-red-900 font-black px-4 py-1 rounded-full text-sm tracking-wider uppercase shadow-lg">
            🌎 MUNDIAL FIFA 2026
          </span>
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-3 drop-shadow-2xl">
          PORRA MUNDIAL
        </h1>
        <p className="text-2xl md:text-3xl font-bold mb-2 text-yellow-200 drop-shadow-lg">
          by CD Bustarviejo
        </p>
        <p className="text-base md:text-lg mb-8 text-white/90 max-w-2xl mx-auto">
          🏆 Acierta los resultados, gana premios y ayuda al club. <strong>48 selecciones, 104 partidos, un campeón.</strong>
        </p>

        {/* Countdown */}
        {config?.fecha_limite_predicciones && (
          <div className="mb-8">
            <p className="text-sm uppercase tracking-widest mb-3 text-yellow-200 font-bold flex items-center justify-center gap-2">
              <Flame className="w-4 h-4" /> Cierre de predicciones en
            </p>
            <div className="flex justify-center gap-2 md:gap-4">
              {[
                { v: tiempo.dias, l: 'Días' },
                { v: tiempo.horas, l: 'Horas' },
                { v: tiempo.min, l: 'Min' },
                { v: tiempo.seg, l: 'Seg' },
              ].map((b, i) => (
                <div key={i} className="bg-white/15 backdrop-blur-md rounded-2xl px-3 py-3 md:px-5 md:py-4 min-w-[70px] md:min-w-[90px] border border-white/30 shadow-xl">
                  <div className="text-3xl md:text-5xl font-black tabular-nums">{String(b.v).padStart(2, '0')}</div>
                  <div className="text-[10px] md:text-xs uppercase tracking-wider opacity-80 font-bold">{b.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats destacadas */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto mb-8">
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 md:p-5 border border-white/30 shadow-lg">
            <Users className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 text-yellow-200" />
            <div className="text-2xl md:text-3xl font-black">{totalParticipantes}</div>
            <div className="text-[10px] md:text-xs uppercase tracking-wider opacity-80 font-bold">Participantes</div>
          </div>
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 md:p-5 border border-white/30 shadow-lg">
            <Euro className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 text-yellow-200" />
            <div className="text-2xl md:text-3xl font-black">{bote.toFixed(0)}€</div>
            <div className="text-[10px] md:text-xs uppercase tracking-wider opacity-80 font-bold">Bote total</div>
          </div>
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 md:p-5 border border-white/30 shadow-lg">
            <Trophy className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 text-yellow-200" />
            <div className="text-2xl md:text-3xl font-black">{config?.precio_entrada || 15}€</div>
            <div className="text-[10px] md:text-xs uppercase tracking-wider opacity-80 font-bold">Entrada</div>
          </div>
        </div>

        {/* CTA principal */}
        <Button 
          onClick={onCrearPorra}
          className="bg-yellow-400 hover:bg-yellow-300 text-red-900 font-black text-lg md:text-xl px-8 md:px-12 py-6 md:py-7 rounded-2xl shadow-2xl hover:scale-105 transition-all border-4 border-white/40"
        >
          <Trophy className="w-6 h-6 mr-2" />
          ¡APUNTAR MI PORRA YA!
        </Button>

        <p className="mt-4 text-sm text-white/80">
          ⚡ Solo {config?.precio_entrada || 15}€ · Premios al 1º, 2º y 3º · El {config?.comision_club_porcentaje || 10}% va a {config?.destino_comision_club || 'el club'}
        </p>
      </div>

      {/* Onda decorativa inferior */}
      <div className="relative">
        <svg className="w-full h-12 md:h-20" viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,40 C480,80 960,0 1440,40 L1440,80 L0,80 Z" fill="white"></path>
        </svg>
      </div>
    </div>
  );
}