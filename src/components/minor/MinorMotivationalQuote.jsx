import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const QUOTES = [
  { text: "El talento gana partidos, pero el trabajo en equipo gana campeonatos.", author: "Michael Jordan" },
  { text: "No cuentes los días, haz que los días cuenten.", author: "Muhammad Ali" },
  { text: "El éxito no es un accidente. Es trabajo duro, perseverancia y amor por lo que haces.", author: "Pelé" },
  { text: "Cuanto más difícil es la victoria, mayor es la felicidad de ganar.", author: "Pelé" },
  { text: "Soy el mejor porque trabajo más que nadie.", author: "Cristiano Ronaldo" },
  { text: "Tienes que luchar para alcanzar tu sueño.", author: "Lionel Messi" },
  { text: "La diferencia entre lo imposible y lo posible está en la determinación.", author: "Tommy Lasorda" },
  { text: "No se trata de ser el mejor. Se trata de ser mejor que ayer.", author: "Wayne Gretzky" },
  { text: "El único modo de hacer un gran trabajo es amar lo que haces.", author: "Steve Jobs" },
  { text: "Cada entrenamiento cuenta. Cada esfuerzo suma.", author: "CD Bustarviejo" },
  { text: "La disciplina es el puente entre las metas y los logros.", author: "Jim Rohn" },
  { text: "Un equipo no es un grupo de personas que trabajan juntas, es un grupo que confía entre sí.", author: "Simon Sinek" },
  { text: "Nunca dejes que nadie te diga que no puedes hacer algo.", author: "Will Smith" },
  { text: "Los campeones siguen jugando hasta que lo hacen bien.", author: "Billie Jean King" },
  { text: "El dolor es temporal, el orgullo dura para siempre.", author: "Anónimo" },
  { text: "No entrenas para ser bueno. Entrenas para ser imparable.", author: "Anónimo" },
  { text: "Hoy es un buen día para dar el 100%.", author: "CD Bustarviejo" },
  { text: "Los grandes jugadores hacen grandes a los que juegan con ellos.", author: "Anónimo" },
  { text: "La actitud lo es todo. Entrena con ganas.", author: "CD Bustarviejo" },
  { text: "Cree en ti. Eres más fuerte de lo que piensas.", author: "Anónimo" },
  { text: "El trabajo duro vence al talento cuando el talento no trabaja duro.", author: "Tim Notke" },
  { text: "Juega con el corazón. Lo demás viene solo.", author: "CD Bustarviejo" },
  { text: "Ganar no lo es todo, pero querer ganar sí lo es.", author: "Vince Lombardi" },
  { text: "La presión es un privilegio.", author: "Billie Jean King" },
  { text: "Sé la razón por la que tu equipo no se rinde.", author: "Anónimo" },
  { text: "Los sueños no funcionan si tú no trabajas.", author: "John C. Maxwell" },
  { text: "Un campeón es alguien que se levanta cuando no puede.", author: "Jack Dempsey" },
  { text: "No importa lo lento que vayas, siempre y cuando no te detengas.", author: "Confucio" },
  { text: "Sal al campo como si fuera tu último partido.", author: "CD Bustarviejo" },
  { text: "Tu única competencia eres tú mismo ayer.", author: "Anónimo" },
  { text: "Disfruta cada balón. El fútbol es alegría.", author: "CD Bustarviejo" },
];

export default function MinorMotivationalQuote() {
  const quote = useMemo(() => {
    // Same quote all day, changes at midnight
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return QUOTES[seed % QUOTES.length];
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
    >
      <Card className="border-none shadow-md bg-white overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-orange-400 via-green-400 to-blue-400" />
        <CardContent className="px-5 py-4">
          <div className="flex gap-3">
            <span className="text-2xl leading-none mt-0.5">💬</span>
            <div>
              <p className="text-sm text-slate-700 italic leading-relaxed">"{quote.text}"</p>
              <p className="text-xs text-slate-400 mt-1.5 font-semibold">— {quote.author}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}