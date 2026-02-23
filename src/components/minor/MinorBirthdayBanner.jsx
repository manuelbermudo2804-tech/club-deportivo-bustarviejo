import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function MinorBirthdayBanner({ player }) {
  if (!player?.fecha_nacimiento) return null;

  const today = new Date();
  const birth = new Date(player.fecha_nacimiento);

  const isToday = today.getDate() === birth.getDate() && today.getMonth() === birth.getMonth();
  if (!isToday) return null;

  const edad = today.getFullYear() - birth.getFullYear();
  const firstName = player.nombre?.split(" ")[0] || "Campeón";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", bounce: 0.5 }}
    >
      <Card className="border-none shadow-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 overflow-hidden relative">
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-xl"
              initial={{ opacity: 0, y: 50 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: [50, -20, -60, -100],
                x: [0, (i % 2 === 0 ? 10 : -10), 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.3,
                repeatDelay: 1,
              }}
              style={{ left: `${8 + i * 8}%`, top: "60%" }}
            >
              {["🎉", "🎊", "⭐", "🎈", "🎁", "✨"][i % 6]}
            </motion.div>
          ))}
        </div>
        <CardContent className="p-6 relative z-10 text-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            className="text-5xl mb-2"
          >
            🎂
          </motion.div>
          <h2 className="text-2xl font-black text-white">
            ¡Feliz cumpleaños, {firstName}!
          </h2>
          <p className="text-white/90 text-base mt-1 font-medium">
            ¡Hoy cumples {edad} años! 🥳
          </p>
          <p className="text-white/70 text-sm mt-2">
            Todo el CD Bustarviejo te desea un día increíble ⚽💚
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}