import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

// Confetti particles
const Confetti = () => {
  const colors = ['#ea580c', '#16a34a', '#eab308', '#3b82f6', '#ec4899'];
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 4 + Math.random() * 8
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: -20,
            width: p.size,
            height: p.size,
            backgroundColor: p.color
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ 
            y: '100vh', 
            opacity: [1, 1, 0],
            rotate: 360 * (Math.random() > 0.5 ? 1 : -1)
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "linear",
            repeat: Infinity
          }}
        />
      ))}
    </div>
  );
};

// Floating sports icons
const FloatingSports = () => {
  const sports = ['⚽', '🏀', '🎾', '⚽', '🏀', '🎾', '⚽', '🏀'];
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {sports.map((emoji, i) => (
        <motion.div
          key={i}
          className="absolute text-4xl"
          style={{
            left: `${10 + (i * 12)}%`,
            top: `${20 + (i % 3) * 25}%`
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 0.3, 0.3, 0],
            scale: [0, 1.2, 1, 0.8],
            y: [0, -30, -20, -50],
            rotate: [0, 10, -10, 0]
          }}
          transition={{
            duration: 3,
            delay: 0.5 + i * 0.15,
            ease: "easeInOut"
          }}
        >
          {emoji}
        </motion.div>
      ))}
    </div>
  );
};

// Pulsing rings
const PulsingRings = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    {[1, 2, 3].map((ring) => (
      <motion.div
        key={ring}
        className="absolute rounded-full border-2 border-white/30"
        initial={{ width: 160, height: 160, opacity: 0 }}
        animate={{ 
          width: [160, 300 + ring * 100],
          height: [160, 300 + ring * 100],
          opacity: [0.6, 0]
        }}
        transition={{
          duration: 2,
          delay: ring * 0.3,
          repeat: Infinity,
          ease: "easeOut"
        }}
      />
    ))}
  </div>
);

export default function WelcomeScreen({ onComplete }) {
  const completedRef = useRef(false);
  const [stage, setStage] = useState(1); // Empezar directamente en stage 1

  useEffect(() => {
    // Progression stages - empezar desde stage 1 directamente
    const timers = [
      setTimeout(() => setStage(2), 500),   // Text appears
      setTimeout(() => setStage(3), 1200),  // Sports appear
      setTimeout(() => setStage(4), 2000),  // Final stage
      setTimeout(() => {
        if (!completedRef.current && onComplete) {
          completedRef.current = true;
          onComplete();
        }
      }, 4500) // Duración total 4.5 segundos
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