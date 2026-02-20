import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Normaliza un nombre para comparar:
 * "SANZ MUÑOZ, CLARA" → "clara sanz muñoz"
 * "Clara Sanz Muñoz"  → "clara sanz muñoz"
 */
function normalizeName(name) {
  if (!name) return "";
  let n = name.toLowerCase().trim();
  // Si tiene formato "APELLIDO, NOMBRE" → invertir
  if (n.includes(",")) {
    const parts = n.split(",").map(p => p.trim());
    n = parts.reverse().join(" ");
  }
  // Eliminar dobles espacios y acentos para match más flexible
  return n.replace(/\s+/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function MinorGoalsCard({ playerName, playerCategory }) {
  const { data: scorers = [] } = useQuery({
    queryKey: ["minorScorers", playerCategory],
    queryFn: () => base44.entities.Goleador.filter({ categoria: playerCategory, equipo: "C.D. BUSTARVIEJO" }),
    enabled: !!playerCategory,
    staleTime: 300000,
  });

  const myGoals = useMemo(() => {
    if (!playerName || !scorers.length) return null;
    const norm = normalizeName(playerName);
    return scorers.find(s => normalizeName(s.jugador_nombre) === norm);
  }, [playerName, scorers]);

  if (!myGoals) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", delay: 0.2 }}
    >
      <Card className="border-none shadow-xl bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 overflow-hidden">
        <CardContent className="p-5 relative">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          </div>
          
          <div className="relative z-10 flex items-center gap-4">
            <motion.div 
              className="text-5xl"
              animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
            >
              ⚽
            </motion.div>
            <div className="flex-1">
              <h3 className="text-white font-black text-lg">
                {myGoals.goles === 1 ? "¡Has marcado 1 gol!" : `¡Has marcado ${myGoals.goles} goles!`}
              </h3>
              <p className="text-white/80 text-sm mt-0.5">
                Temporada {myGoals.temporada} · {playerCategory}
              </p>
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Badge className="bg-white text-amber-700 text-xl font-black border-none px-3 py-1.5 shadow-lg">
                {myGoals.goles}
              </Badge>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}