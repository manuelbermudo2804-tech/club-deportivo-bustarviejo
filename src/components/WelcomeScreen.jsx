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
      exit={{ opacity: 0, scale: 1.1 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 30%, #15803d 70%, #166534 100%)',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      {/* Background effects */}
      <Confetti />
      <FloatingSports />
      <PulsingRings />

      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 50%)'
          ]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-md">
        {/* Logo with spectacular entrance */}
        <motion.div
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={stage >= 1 ? { 
            scale: [0, 1.3, 1], 
            rotate: [-180, 10, 0],
            opacity: 1 
          } : {}}
          transition={{ 
            duration: 0.8, 
            ease: [0.34, 1.56, 0.64, 1]
          }}
          className="relative mx-auto mb-6"
        >
          {/* Glow effect behind logo */}
          <motion.div
            className="absolute inset-0 rounded-3xl blur-2xl"
            style={{ background: 'rgba(255,255,255,0.4)' }}
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.6, 0.4]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <img 
            src={CLUB_LOGO_URL} 
            alt="CD Bustarviejo"
            className="relative w-40 h-40 mx-auto object-contain rounded-2xl shadow-2xl"
          />
          
          {/* Sparkles around logo */}
          {stage >= 2 && (
            <>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  className="absolute text-2xl"
                  style={{
                    top: '50%',
                    left: '50%',
                  }}
                  initial={{ scale: 0, x: 0, y: 0 }}
                  animate={{ 
                    scale: [0, 1, 0],
                    x: Math.cos(i * Math.PI / 3) * 100,
                    y: Math.sin(i * Math.PI / 3) * 100,
                  }}
                  transition={{ 
                    duration: 1,
                    delay: i * 0.1,
                  }}
                >
                  ✨
                </motion.div>
              ))}
            </>
          )}
        </motion.div>

        {/* Welcome text with typewriter effect */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={stage >= 2 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <motion.h1 
            className="text-4xl md:text-5xl font-black text-white mb-2"
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
            animate={stage >= 2 ? {
              scale: [1, 1.05, 1]
            } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            ¡Bienvenido!
          </motion.h1>
          
          <motion.p 
            className="text-2xl md:text-3xl font-bold text-white/90 mb-1"
            initial={{ opacity: 0 }}
            animate={stage >= 2 ? { opacity: 1 } : {}}
            transition={{ delay: 0.3 }}
          >
            CD Bustarviejo
          </motion.p>
          
          <motion.p 
            className="text-sm text-white/70"
            initial={{ opacity: 0 }}
            animate={stage >= 2 ? { opacity: 1 } : {}}
            transition={{ delay: 0.5 }}
          >
            Fundado en 1989
          </motion.p>
        </motion.div>

        {/* Animated sports icons */}
        <motion.div 
          className="mt-8 flex justify-center gap-4"
          initial={{ opacity: 0, scale: 0 }}
          animate={stage >= 3 ? { opacity: 1, scale: 1 } : {}}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          {['⚽', '🏀', '🎾'].map((emoji, i) => (
            <motion.span
              key={emoji}
              className="text-5xl"
              initial={{ y: 50, opacity: 0, rotate: -30 }}
              animate={stage >= 3 ? { 
                y: 0, 
                opacity: 1, 
                rotate: 0 
              } : {}}
              transition={{ 
                delay: 0.1 * i,
                type: "spring",
                stiffness: 300
              }}
              whileHover={{ scale: 1.3, rotate: 15 }}
            >
              {emoji}
            </motion.span>
          ))}
        </motion.div>

        {/* Slogan with gradient */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={stage >= 4 ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
        >
          <motion.p 
            className="text-lg font-semibold text-white/90 px-6 py-3 rounded-full inline-block"
            style={{ 
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)'
            }}
            animate={{ 
              boxShadow: [
                '0 0 20px rgba(255,255,255,0.1)',
                '0 0 40px rgba(255,255,255,0.2)',
                '0 0 20px rgba(255,255,255,0.1)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            💪 Pasión por el deporte
          </motion.p>
        </motion.div>

        {/* Tap to continue */}
        <motion.p 
          className="mt-10 text-white/50 text-sm"
          initial={{ opacity: 0 }}
          animate={stage >= 4 ? { opacity: [0.3, 0.7, 0.3] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Toca para continuar
        </motion.p>
      </div>
    </motion.div>
  );
}