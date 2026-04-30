import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertCircle } from "lucide-react";
import { normalizeName } from "./validators";

// Avisa en vivo si los nombres de jugadores ya están inscritos en el mismo torneo.
// players: array de strings (nombres). modalidad: string (label del torneo).
export default function DuplicateWarning({ players = [], modalidad, teamName = "" }) {
  const [duplicates, setDuplicates] = useState([]);
  const [duplicateTeam, setDuplicateTeam] = useState(null);

  useEffect(() => {
    if (!modalidad) return;
    const validPlayers = players.filter(p => p && p.trim().length >= 3);
    if (validPlayers.length === 0 && !teamName?.trim()) {
      setDuplicates([]);
      setDuplicateTeam(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const existing = await base44.entities.SanIsidroRegistration.filter({ modalidad });

        // Duplicados de jugadores
        const existingNames = new Map();
        existing.forEach(r => {
          [r.jugador_1, r.jugador_2, r.jugador_3].forEach(n => {
            if (n) existingNames.set(normalizeName(n), { name: n, team: r.nombre_equipo });
          });
        });
        const dupes = validPlayers
          .map(p => ({ input: p, match: existingNames.get(normalizeName(p)) }))
          .filter(d => d.match);
        setDuplicates(dupes);

        // Nombre de equipo duplicado
        if (teamName?.trim()) {
          const sameTeam = existing.find(r => normalizeName(r.nombre_equipo) === normalizeName(teamName));
          setDuplicateTeam(sameTeam || null);
        } else {
          setDuplicateTeam(null);
        }
      } catch {}
    }, 500); // debounce

    return () => clearTimeout(timer);
  }, [players.join("|"), modalidad, teamName]);

  if (duplicates.length === 0 && !duplicateTeam) return null;

  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 space-y-1.5 animate-fade-in">
      <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
        <AlertCircle className="w-4 h-4" />
        Atención: posibles duplicados
      </div>
      {duplicateTeam && (
        <p className="text-xs text-red-700">
          🚫 Ya existe un equipo llamado <strong>"{duplicateTeam.nombre_equipo}"</strong> en este torneo. Elige otro nombre.
        </p>
      )}
      {duplicates.map((d, i) => (
        <p key={i} className="text-xs text-red-700">
          🚫 <strong>{d.input}</strong> ya está apuntado en el equipo <strong>"{d.match.team}"</strong>.
        </p>
      ))}
      <p className="text-[11px] text-red-600 italic pt-1">
        Cada jugador solo puede inscribirse una vez en este torneo.
      </p>
    </div>
  );
}