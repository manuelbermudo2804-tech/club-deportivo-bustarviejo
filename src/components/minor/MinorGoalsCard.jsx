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
  // Compara palabras sin depender del orden, acentos, comas o espacios.
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/).filter(Boolean).sort().join(" ");
}

function currentSeason() {
  const now = new Date();
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return String(startYear) + "/" + String(startYear + 1);
}

function namesMatch(a, b) {
  const left = normalizeName(a).split(" ").filter(Boolean);
  const right = normalizeName(b).split(" ").filter(Boolean);
  if (left.join(" ") === right.join(" ")) return true;
  if (left.length !== right.length || !left.length) return false;

  // Permitir un error tipográfico mínimo solo si el nombre completo tiene una única coincidencia.
  const remaining = [...right];
  for (const token of left) {
    let index = remaining.indexOf(token);
    if (index < 0 && token.length >= 5) {
      index = remaining.findIndex(candidate => {
        if (candidate.length < 5 || Math.abs(candidate.length - token.length) > 1) return false;
        let i = 0, j = 0, edits = 0;
        while (i < token.length && j < candidate.length) {
          if (token[i] === candidate[j]) { i++; j++; continue; }
          edits++;
          if (edits > 1) return false;
          if (token.length > candidate.length) i++;
          else if (candidate.length > token.length) j++;
          else { i++; j++; }
        }
        if (i < token.length || j < candidate.length) edits++;
        return edits <= 1;
      });
    }
    if (index < 0) return false;
    remaining.splice(index, 1);
  }
  return remaining.length === 0;
}

export default function MinorGoalsCard({ playerName, playerCategory, compact = false }) {
  const season = currentSeason();
  const { data: scorers = [] } = useQuery({
    queryKey: ["minorScorers", season],
    queryFn: async () => {
      // Buscar en todas las categorías: la categoría del perfil puede diferir de la importada.
      const records = await base44.entities.Goleador.filter({ temporada: season });
      return records.filter(s => (s.equipo || "").toUpperCase().includes("BUSTARVIEJO"));
    },
    enabled: !!playerName,
    staleTime: 300000,
  });

  const myGoals = useMemo(() => {
    if (!playerName || !scorers.length) return null;
    const exactMatches = scorers.filter(s => normalizeName(s.jugador_nombre) === normalizeName(playerName));
    const matches = exactMatches.length
      ? exactMatches
      : scorers.filter(s => namesMatch(s.jugador_nombre, playerName));
    // No asignar estadísticas si la coincidencia aproximada no es única.
    if (matches.length !== 1 && !exactMatches.length) return null;
    if (!matches.length) return null;
    return { ...matches[0], goles: matches.reduce((total, s) => total + (Number(s.goles) || 0), 0) };
  }, [playerName, scorers]);

  if (!myGoals) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", delay: 0.2 }}
    >
      <Card className={`h-full border border-orange-200 shadow-md bg-gradient-to-br from-amber-400 to-orange-500 overflow-hidden ${compact ? "min-h-[122px]" : ""}`}>
        <CardContent className={`h-full p-4 relative flex items-center ${compact ? "min-h-[122px]" : ""}`}>
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          </div>
          
          <div className="relative z-10 flex items-center gap-3 w-full min-w-0">
            <motion.div 
              className={`${compact ? "text-3xl" : "text-5xl"} flex-shrink-0`}
              animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
            >
              ⚽
            </motion.div>
            <div className="flex-1">
              <h3 className={`text-white font-black ${compact ? "text-sm leading-5 break-words" : "text-lg"}`}>
                {myGoals.goles === 1 ? "¡Has marcado 1 gol!" : `¡Has marcado ${myGoals.goles} goles!`}
              </h3>
              <p className="text-white/90 text-xs mt-1 break-words">
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