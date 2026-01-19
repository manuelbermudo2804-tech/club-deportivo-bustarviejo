import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

export default function BirthdayModal({ nombre, edad, onClose, tipo = 'parent' }) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    if (showConfetti) {
      // Confetti burst
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        if (Date.now() > end) return;

        confetti({
          particleCount: 3,
          angle: Math.random() * 360,
          spread: 70,
          origin: { x: Math.random(), y: Math.random() * 0.5 }
        });

        requestAnimationFrame(frame);
      };
      frame();

      setTimeout(() => setShowConfetti(false), duration);
    }
  }, [showConfetti]);

  const colores = {
    jugador_menor: 'from-pink-500 to-purple-600',
    jugador_adulto: 'from-orange-500 to-red-600',
    padre: 'from-green-500 to-emerald-600',
    socio: 'from-blue-500 to-cyan-600',
    entrenador: 'from-indigo-500 to-purple-600',
    coordinador: 'from-teal-500 to-blue-600'
  };

  const colorBg = colores[tipo] || colores.padre;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`bg-gradient-to-br ${colorBg} rounded-3xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden`}
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      >
        {/* Fondo decorativo animado */}
        <motion.div
          className="absolute -top-20 -right-20 w-40 h-40 bg-white/20 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        {/* Contenido */}
        <div className="relative z-10 text-center text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Emojis animados */}
          <motion.div
            className="text-7xl mb-4 flex justify-center gap-2"
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span>🎂</span>
            <span>✨</span>
            <span>🎉</span>
          </motion.div>

          {/* Texto principal */}
          <motion.h1
            className="text-5xl font-black mb-2 drop-shadow-lg"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ¡FELIZ CUMPLEAÑOS!
          </motion.h1>

          {/* Nombre */}
          <motion.p
            className="text-3xl font-bold mb-1 drop-shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {nombre}
          </motion.p>

          {/* Edad */}
          <motion.p
            className="text-2xl font-bold mb-6 drop-shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            ¡{edad} años increíbles!
          </motion.p>

          {/* Mensaje */}
          <motion.div
            className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <p className="text-lg font-semibold drop-shadow-md">
              🎈 Que disfrutes cada momento de este día especial 🎈
            </p>
            <p className="text-sm mt-2 font-medium drop-shadow-md">
              Desde toda la familia del CD Bustarviejo 💚⚽
            </p>
          </motion.div>

          {/* Botón */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Button
              onClick={onClose}
              className="w-full bg-white text-gray-900 hover:bg-gray-100 font-bold text-lg py-3 rounded-xl shadow-xl"
            >
              ¡A CELEBRAR! 🥳
            </Button>
          </motion.div>
        </div>

        {/* Decoración de puntos */}
        <motion.div
          className="absolute bottom-4 left-4 w-3 h-3 bg-white/40 rounded-full"
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-1/2 right-8 w-2 h-2 bg-white/40 rounded-full"
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        />
      </motion.div>
    </motion.div>
  );
}