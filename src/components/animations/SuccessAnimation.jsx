import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export function CheckmarkAnimation({ show, onComplete, message = "¡Completado!" }) {
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="bg-white rounded-3xl p-8 shadow-2xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center"
            >
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto mb-4" strokeWidth={2.5} />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="text-2xl font-bold text-slate-900"
              >
                {message}
              </motion.p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfettiAnimation({ show, onComplete }) {
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    if (show) {
      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * window.innerWidth,
        color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][Math.floor(Math.random() * 5)],
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2
      }));
      setConfetti(pieces);

      if (onComplete) {
        const timer = setTimeout(onComplete, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[9998] pointer-events-none overflow-hidden">
          {confetti.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{ 
                x: piece.x, 
                y: -20,
                rotate: 0,
                opacity: 1
              }}
              animate={{ 
                y: window.innerHeight + 20,
                rotate: 360 * 3,
                opacity: [1, 1, 0]
              }}
              transition={{ 
                delay: piece.delay,
                duration: piece.duration,
                ease: "easeIn"
              }}
              style={{
                position: 'absolute',
                width: '10px',
                height: '10px',
                backgroundColor: piece.color,
                borderRadius: '2px'
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

export function CombinedSuccessAnimation({ 
  show, 
  onComplete, 
  message = "¡Completado!",
  withConfetti = false 
}) {
  return (
    <>
      {withConfetti && <ConfettiAnimation show={show} />}
      <CheckmarkAnimation show={show} onComplete={onComplete} message={message} />
    </>
  );
}