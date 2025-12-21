import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, Users, Trophy, Heart } from "lucide-react";

const CLUB_LOGO_URL = `https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg`;
const TEAM_IMAGE_URL = `https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/a2eee6d6a_ChatGPTImage18dic202513_47_22.png`;

export default function WelcomeScreen({ onEnter }) {
  const [show, setShow] = useState(true);

  const handleEnter = () => {
    setShow(false);
    setTimeout(() => {
      onEnter();
    }, 600);
  };

  const stats = [
    { icon: Users, label: "Pasión", sublabel: "Formando campeones" },
    { icon: Trophy, label: "Desde 1989", sublabel: "Más de 35 años" },
    { icon: Heart, label: "Gran Familia", sublabel: "Comunidad unida" }
  ];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[9999] overflow-hidden"
        >
          {/* Background Image with Overlay */}
          <div className="absolute inset-0">
            <img 
              src={TEAM_IMAGE_URL} 
              alt="CD Bustarviejo Team"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
          </div>

          {/* Content */}
          <div className="relative h-full flex flex-col justify-between p-6 lg:p-12">
            {/* Top Section - Logo */}
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="flex justify-center pt-8"
            >
              <div className="relative">
                <motion.div
                  animate={{ 
                    boxShadow: [
                      "0 0 20px rgba(249, 115, 22, 0.5)",
                      "0 0 40px rgba(249, 115, 22, 0.8)",
                      "0 0 20px rgba(249, 115, 22, 0.5)",
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="rounded-3xl"
                >
                  <img 
                    src={CLUB_LOGO_URL} 
                    alt="CD Bustarviejo"
                    className="w-32 h-32 lg:w-40 lg:h-40 rounded-3xl object-cover border-4 border-white shadow-2xl"
                  />
                </motion.div>
              </div>
            </motion.div>

            {/* Middle Section - Text */}
            <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6 lg:space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="space-y-3 lg:space-y-4"
              >
                <h1 className="text-5xl lg:text-7xl font-black text-white leading-tight">
                  CD Bustarviejo
                </h1>
                <div className="flex items-center justify-center gap-3">
                  <div className="h-1 w-12 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
                  <p className="text-2xl lg:text-3xl font-bold text-orange-400">
                    Más que un Club
                  </p>
                  <div className="h-1 w-12 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
                </div>
                <p className="text-lg lg:text-xl text-white/90 max-w-2xl mx-auto px-4">
                  Pasión, esfuerzo y compañerismo desde 1989
                </p>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="grid grid-cols-3 gap-4 lg:gap-8 max-w-3xl w-full px-4"
              >
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                    className="bg-white/10 backdrop-blur-md rounded-2xl p-4 lg:p-6 border border-white/20"
                  >
                    <stat.icon className="w-8 h-8 lg:w-10 lg:h-10 text-orange-400 mx-auto mb-2" />
                    <p className="text-xl lg:text-2xl font-bold text-white">{stat.label}</p>
                    <p className="text-sm lg:text-base text-white/80">{stat.sublabel}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Bottom Section - CTA */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="flex flex-col items-center space-y-4 pb-8"
            >
              <Button
                onClick={handleEnter}
                size="lg"
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold text-lg px-12 py-6 rounded-full shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105 group"
              >
                Entrar a la App
                <ChevronRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <p className="text-white/60 text-sm">
                Bienvenido a tu club digital
              </p>
            </motion.div>
          </div>

          {/* Floating particles effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-orange-500/30 rounded-full"
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                  scale: Math.random() * 0.5 + 0.5,
                }}
                animate={{
                  y: [null, Math.random() * window.innerHeight],
                  x: [null, Math.random() * window.innerWidth],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: Math.random() * 10 + 10,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}