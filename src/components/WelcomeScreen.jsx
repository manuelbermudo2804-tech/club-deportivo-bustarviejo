import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CLUB_LOGO_URL = "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png";

export default function WelcomeScreen({ onComplete }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');
    
    if (hasSeenWelcome) {
      setShow(false);
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      sessionStorage.setItem('hasSeenWelcome', 'true');
      setShow(false);
      setTimeout(onComplete, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            duration: 0.6,
            ease: [0.34, 1.56, 0.64, 1]
          }}
          className="text-center"
        >
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="mb-8"
          >
            <img 
              src={CLUB_LOGO_URL} 
              alt="CD Bustarviejo"
              className="w-48 h-48 mx-auto drop-shadow-2xl rounded-3xl bg-white p-4"
            />
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-5xl font-bold text-white mb-3 drop-shadow-lg">
              CD Bustarviejo
            </h1>
            <p className="text-2xl text-orange-100 font-semibold">
              Fundado en 1989
            </p>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="h-1 w-32 bg-white mx-auto mt-4 rounded-full"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8"
          >
            <p className="text-white text-lg">
              Bienvenido a la aplicación del club
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}