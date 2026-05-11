import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Trophy, Sparkles, ArrowRight } from "lucide-react";

// Banner promocional de la Porra Mundial 2026
// Se muestra SOLO dentro de la app (Home dashboards) cuando banner_promocional_activo = true
// Diseño llamativo estilo "Lotería" para generar interés
export default function PorraPromoBanner() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const configs = await base44.entities.PorraConfig.list();
        if (!cancel) setConfig(configs[0] || null);
      } catch {}
    })();
    return () => { cancel = true; };
  }, []);

  if (!config?.banner_promocional_activo || !config?.activa) return null;

  const texto = config.banner_texto || "🏆 ¡La Porra del Mundial 2026 ya está aquí!";

  return (
    <Link to="/MiPorra" className="block group">
      <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 rounded-2xl p-4 lg:p-5 shadow-2xl border-4 border-yellow-400 hover:scale-[1.02] active:scale-[0.98] transition-all">
        {/* Banderas decorativas flotantes */}
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <div className="absolute top-2 left-4 text-2xl animate-bounce" style={{animationDelay: '0s', animationDuration: '3s'}}>🇪🇸</div>
          <div className="absolute top-2 right-4 text-2xl animate-bounce" style={{animationDelay: '0.4s', animationDuration: '3.5s'}}>🇦🇷</div>
          <div className="absolute bottom-2 left-12 text-2xl animate-bounce" style={{animationDelay: '0.8s', animationDuration: '4s'}}>🇧🇷</div>
          <div className="absolute bottom-2 right-12 text-2xl animate-bounce" style={{animationDelay: '1.2s', animationDuration: '3.2s'}}>🇫🇷</div>
        </div>

        {/* Brillo animado */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/20 rounded-full blur-3xl animate-pulse"></div>

        <div className="relative flex items-center gap-3 lg:gap-4">
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-300 rounded-full blur-md animate-pulse"></div>
              <div className="relative w-12 h-12 lg:w-14 lg:h-14 bg-white rounded-full flex items-center justify-center shadow-xl border-2 border-yellow-300">
                <Trophy className="w-7 h-7 lg:w-8 lg:h-8 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm lg:text-lg leading-tight drop-shadow-lg">
              {texto}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
              <p className="text-yellow-100 text-xs lg:text-sm font-bold">
                Apúntate ya · Solo {config.precio_entrada || 15}€ · Premios al 1º, 2º y 3º
              </p>
            </div>
          </div>

          <div className="flex-shrink-0 hidden sm:flex items-center gap-1 bg-white text-red-700 font-black px-3 py-2 rounded-xl shadow-lg group-hover:translate-x-1 transition-transform text-sm">
            JUGAR
            <ArrowRight className="w-4 h-4" />
          </div>
          <div className="flex-shrink-0 sm:hidden text-white">
            <ArrowRight className="w-6 h-6" />
          </div>
        </div>
      </div>
    </Link>
  );
}