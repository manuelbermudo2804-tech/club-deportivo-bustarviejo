import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const QUOTES = [
  { text: "El talento gana partidos, pero el trabajo en equipo gana campeonatos.", author: "Michael Jordan" },
  { text: "No cuentes los días, haz que los días cuenten.", author: "Muhammad Ali" },
  { text: "El éxito no es un accidente. Es trabajo duro, aprendizaje y sacrificio.", author: "Pelé" },
  { text: "No importa cuántas veces caigas, importa cuántas veces te levantes.", author: "Anónimo" },
  { text: "El que quiere hacer algo encuentra un medio; el que no, una excusa.", author: "Anónimo" },
  { text: "Sé más fuerte que tu excusa más fuerte.", author: "Anónimo" },
  { text: "Los campeones entrenan, los perdedores se quejan.", author: "Anónimo" },
  { text: "La disciplina es el puente entre las metas y los logros.", author: "Jim Rohn" },
  { text: "El trabajo duro vence al talento cuando el talento no trabaja duro.", author: "Tim Notke" },
  { text: "Juega con la cabeza, pelea con el corazón.", author: "Anónimo" },
  { text: "No entrenes hasta que lo consigas. Entrena hasta que no puedas fallar.", author: "Anónimo" },
  { text: "Los límites existen solo en tu mente.", author: "Anónimo" },
  { text: "Cada entrenamiento es una oportunidad de ser mejor.", author: "Anónimo" },
  { text: "Nunca dejes que el miedo decida tu futuro.", author: "Anónimo" },
  { text: "Hoy duele, mañana serás más fuerte.", author: "Anónimo" },
  { text: "El esfuerzo de hoy es el éxito de mañana.", author: "Anónimo" },
  { text: "Si puedes soñarlo, puedes hacerlo.", author: "Walt Disney" },
  { text: "La clave no es ganar siempre, es no rendirse nunca.", author: "Anónimo" },
  { text: "Los grandes jugadores no nacen, se hacen.", author: "Anónimo" },
  { text: "Un equipo unido es invencible.", author: "Anónimo" },
];

export default function MinorMotivationalQuote() {
  const quote = useMemo(() => {
    // Same quote per day (seed from day of year)
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    return QUOTES[dayOfYear % QUOTES.length];
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
    >
      <Card className="border-none shadow-lg bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
        <CardContent className="p-5 relative">
          <div className="absolute top-3 left-4 text-5xl text-white/5 font-serif leading-none">"</div>
          <div className="relative z-10">
            <p className="text-white/90 text-sm italic leading-relaxed pl-4 border-l-2 border-orange-500/50">
              {quote.text}
            </p>
            <p className="text-orange-400/80 text-xs font-medium mt-2 text-right">
              — {quote.author}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}