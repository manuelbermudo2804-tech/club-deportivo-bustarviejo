import React, { useEffect, useRef } from "react";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function WelcomeScreen({ onComplete }) {
  const hasCompletedRef = useRef(false);

  const handleComplete = () => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    if (onComplete) {
      onComplete();
    }
  };

  useEffect(() => {
    // Timeout corto para iOS - 1.5 segundos
    const timer = setTimeout(() => {
      handleComplete();
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      onClick={handleComplete}
      className="fixed inset-0 z-[99999] bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center p-4 overflow-hidden"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, touchAction: 'manipulation' }}
    >
      {/* Iconos estáticos simples para iOS */}
      <div className="absolute top-10 left-5 text-6xl opacity-70">⚽</div>
      <div className="absolute top-20 right-10 text-5xl opacity-60">🏀</div>
      <div className="absolute bottom-24 left-12 text-5xl opacity-65">🎾</div>
      <div className="absolute bottom-16 right-16 text-4xl opacity-70">🏆</div>

      {/* Contenido principal - sin animaciones complejas */}
      <div className="text-center w-full max-w-md relative z-10">
        <div className="mb-6">
          <img 
            src={CLUB_LOGO_URL} 
            alt="CD Bustarviejo"
            className="w-40 h-40 md:w-56 md:h-56 mx-auto drop-shadow-2xl object-contain"
            loading="eager"
          />
        </div>
        
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
            ¡Bienvenido!
          </h1>
          <p className="text-xl md:text-2xl text-white font-bold mb-1">
            CD Bustarviejo
          </p>
          <p className="text-base md:text-lg text-orange-100 font-semibold">
            Fundado en 1989
          </p>
        </div>

        <div className="mt-4 flex justify-center gap-3 text-3xl">
          <span>⚽</span>
          <span>🏀</span>
          <span>🎾</span>
        </div>
        
        <p className="text-white/70 text-xs mt-6">Toca para continuar</p>
      </div>
    </div>
  );
}