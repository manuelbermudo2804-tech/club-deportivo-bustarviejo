import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function WelcomeScreen({ onComplete }) {
  const completedRef = useRef(false);
  const [stage, setStage] = useState(1);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(2), 500),
      setTimeout(() => setStage(3), 1200),
      setTimeout(() => setStage(4), 2000),
      setTimeout(() => {
        if (!completedRef.current && onComplete) {
          completedRef.current = true;
          onComplete();
        }
      }, 3500)
    ];
    
    return () => timers.forEach(t => clearTimeout(t));
  }, [onComplete]);

  const handleTap = () => {
    if (!completedRef.current && onComplete) {
      completedRef.current = true;
      onComplete();
    }
  };

  return (
    <motion.div
      onClick={handleTap}
      onTouchEnd={handleTap}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 30%, #15803d 70%, #166534 100%)',
        touchAction: 'manipulation'
      }}
    >
      <div className="relative z-10 text-center px-6 max-w-md">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={stage >= 1 ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-6"
        >
          <img 
            src={CLUB_LOGO_URL} 
            alt="CD Bustarviejo"
            className="w-32 h-32 mx-auto object-contain rounded-2xl shadow-2xl"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={stage >= 2 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">¡Bienvenido!</h1>
          <p className="text-xl text-white/90 mb-1">CD Bustarviejo</p>
          <p className="text-sm text-white/70">Fundado en 1989</p>
        </motion.div>

        <motion.div 
          className="mt-6 flex justify-center gap-4"
          initial={{ opacity: 0 }}
          animate={stage >= 3 ? { opacity: 1 } : {}}
          transition={{ duration: 0.3 }}
        >
          <span className="text-4xl">⚽</span>
          <span className="text-4xl">🏀</span>
          <span className="text-4xl">🎾</span>
        </motion.div>

        <motion.p 
          className="mt-8 text-white/50 text-sm"
          initial={{ opacity: 0 }}
          animate={stage >= 4 ? { opacity: 0.6 } : {}}
        >
          Toca para continuar
        </motion.p>
      </div>
    </motion.div>
  );
}