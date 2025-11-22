import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Logo actualizado con timestamp para evitar caché
const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg?v=" + Date.now();

export default function WelcomeScreen({ onComplete }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 500);
    }, 3500);

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
        {/* Balones flotantes animados con más deportes */}
        <motion.div
          animate={{ 
            x: [0, 120, 0],
            y: [0, -100, 0],
            rotate: [0, 360, 0]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-10 left-5 text-7xl md:text-8xl opacity-90"
        >
          ⚽
        </motion.div>
        
        <motion.div
          animate={{ 
            x: [0, -140, 0],
            y: [0, 80, 0],
            rotate: [0, -360, 0]
          }}
          transition={{ 
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
          className="absolute top-32 right-10 text-6xl md:text-7xl opacity-80"
        >
          🏀
        </motion.div>

        <motion.div
          animate={{ 
            x: [0, 100, 0],
            y: [0, 100, 0],
            rotate: [0, 180, 0]
          }}
          transition={{ 
            duration: 3.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3
          }}
          className="absolute bottom-24 left-12 text-6xl md:text-7xl opacity-85"
        >
          🎾
        </motion.div>

        <motion.div
          animate={{ 
            x: [0, -110, 0],
            y: [0, -70, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ 
            duration: 3.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.7
          }}
          className="absolute bottom-16 right-16 text-5xl md:text-6xl opacity-90"
        >
          🏐
        </motion.div>

        <motion.div
          animate={{ 
            x: [0, 90, 0],
            y: [0, -50, 0],
            rotate: [0, 270, 0]
          }}
          transition={{ 
            duration: 3.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute top-1/2 left-8 text-5xl md:text-6xl opacity-75"
        >
          🥅
        </motion.div>

        <motion.div
          animate={{ 
            x: [0, -100, 0],
            y: [0, 60, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 3.4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.2
          }}
          className="absolute top-1/2 right-12 text-5xl md:text-6xl opacity-80"
        >
          🏆
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
            <motion.div
              className="relative"
              animate={{ 
                y: [0, -15, 0],
                rotate: [0, 3, 0, -3, 0]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <motion.img 
                src={CLUB_LOGO_URL} 
                alt="CD Bustarviejo"
                className="w-52 h-52 md:w-72 md:h-72 mx-auto drop-shadow-2xl object-contain filter brightness-110"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  duration: 1.2,
                  ease: "backOut",
                  type: "spring",
                  stiffness: 100
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-white/20"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0, 0.3]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
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