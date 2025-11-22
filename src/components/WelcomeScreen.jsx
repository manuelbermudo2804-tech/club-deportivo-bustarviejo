import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function WelcomeScreen({ onComplete }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 500);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center p-4 overflow-hidden"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {/* Balones flotantes animados */}
        <motion.div
          animate={{ 
            x: [0, 100, 0],
            y: [0, -80, 0],
            rotate: 360
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 left-10 text-6xl"
        >
          ⚽
        </motion.div>
        
        <motion.div
          animate={{ 
            x: [0, -120, 0],
            y: [0, 70, 0],
            rotate: -360
          }}
          transition={{ 
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
          className="absolute top-40 right-16 text-5xl"
        >
          🏀
        </motion.div>

        <motion.div
          animate={{ 
            x: [0, 80, 0],
            y: [0, 90, 0],
            rotate: 180
          }}
          transition={{ 
            duration: 2.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3
          }}
          className="absolute bottom-32 left-20 text-5xl"
        >
          🎾
        </motion.div>

        <motion.div
          animate={{ 
            x: [0, -90, 0],
            y: [0, -60, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 2.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.7
          }}
          className="absolute bottom-20 right-24 text-4xl"
        >
          🏐
        </motion.div>

        {/* Contenido principal */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            duration: 0.6,
            ease: [0.34, 1.56, 0.64, 1]
          }}
          className="text-center w-full max-w-md relative z-10"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              duration: 1,
              ease: "backOut"
            }}
            className="mb-8"
          >
            {CLUB_LOGO_URL ? (
              <motion.img 
                src={CLUB_LOGO_URL} 
                alt="CD Bustarviejo"
                className="w-48 h-48 md:w-64 md:h-64 mx-auto drop-shadow-2xl object-contain"
                animate={{ 
                  y: [0, -10, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            ) : (
              <motion.div
                className="w-48 h-48 md:w-64 md:h-64 mx-auto bg-white/10 rounded-3xl flex items-center justify-center"
                animate={{ 
                  y: [0, -10, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="text-center">
                  <div className="text-6xl mb-2">⚽</div>
                  <div className="text-6xl">🏀</div>
                </div>
              </motion.div>
            )}
          </motion.div>
          
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.h1 
              className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              ¡Bienvenido!
            </motion.h1>
            <p className="text-2xl md:text-3xl text-white font-bold mb-2">
              CD Bustarviejo
            </p>
            <p className="text-lg md:text-xl text-orange-100 font-semibold">
              Fundado en 1989
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6 flex justify-center gap-4 text-4xl"
          >
            <motion.span
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 10, 0]
              }}
              transition={{ 
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              ⚽
            </motion.span>
            <motion.span
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, -10, 0]
              }}
              transition={{ 
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.2
              }}
            >
              🏀
            </motion.span>
            <motion.span
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 10, 0]
              }}
              transition={{ 
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.4
              }}
            >
              🎾
            </motion.span>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}