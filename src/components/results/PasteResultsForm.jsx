import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardPaste, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function isDateString(s) {
  return /^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(s.trim());
}

function isScoreLine(s) {
  return /^\d+\s*[-–]\s*\d+$/.test(s.trim());
}

function isTeamName(s) {
  if (!s || !s.trim()) return false;
  const t = s.trim();
  if (/^\d+$/.test(t)) return false;
  if (isDateString(t)) return false;
  if (isScoreLine(t)) return false;
  if (/^\d{4}[-\/]\d{4}$/.test(t)) return false;
  if (/jornada\s*\d+/i.test(t)) return false;
  // Must have at least one letter
  return /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(t);
}

function parseResultsText(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  let temporada = "";
  let jornada = 1;
  const matches = [];

  for (const l of lines) {
    if (/^\d{4}[-\/]\d{4}$/.test(l)) { temporada = l.replace('-', '/'); continue; }
    const jm = l.match(/jornada\s*(\d+)/i);
    if (jm) { jornada = parseInt(jm[1], 10); continue; }
  }

  if (!temporada) {
    const d = new Date(); const y = d.getFullYear(); const m = d.getMonth() + 1;
    temporada = m >= 9 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
  }

  // Strategy 1: Single-line format "EQUIPO LOCAL 2 - 1 EQUIPO VISITANTE"
  // Make sure the "visitante" part is actually a team, not a date
  for (const l of lines) {
    const mf = l.match(/^(.+?)\s+(\d+)\s*[-–]\s*(\d+)\s+(.+)$/);
    if (mf) {
      const localCandidate = mf[1].trim();
      const visitanteCandidate = mf[4].trim();
      if (isTeamName(localCandidate) && isTeamName(visitanteCandidate)) {
        matches.push({ local: localCandidate, visitante: visitanteCandidate, goles_local: parseInt(mf[2], 10), goles_visitante: parseInt(mf[3], 10) });
      }
    }
  }

  // Strategy 2: Multi-line format from RFFM copy-paste
  // Can be: EQUIPO1 / score / EQUIPO2 / fecha
  // Or:     EQUIPO1 / score / fecha / EQUIPO2 / score / fecha...  (wrong, but handle)
  // Or:     EQUIPO1 / EQUIPO2 / score / fecha  (unlikely but handle)
  if (matches.length === 0) {
    // Find all score lines and try to find teams around them
    for (let i = 0; i < lines.length; i++) {
      const sm = lines[i].match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (!sm) continue;

      const golesLocal = parseInt(sm[1], 10);
      const golesVisitante = parseInt(sm[2], 10);

      // Look backwards for local team (skip dates)
      let local = null;
      for (let b = i - 1; b >= 0; b--) {
        if (isTeamName(lines[b])) { local = lines[b].trim(); break; }
        if (!isDateString(lines[b])) break; // stop if unknown line
      }

      // Look forwards for visitante team (skip dates)
      let visitante = null;
      for (let f = i + 1; f < lines.length; f++) {
        if (isTeamName(lines[f])) { visitante = lines[f].trim(); break; }
        if (!isDateString(lines[f])) break;
      }

      if (local && visitante) {
        matches.push({ local, visitante, goles_local: golesLocal, goles_visitante: golesVisitante });
      }
    }
  }

  // Strategy 3: Format "EQUIPO1 score date" per line (only one team visible)
  // This means the text has: EQUIPO1 \n 0 - 15 \n 18/02/2026 \n EQUIPO2 \n 0 - 8 \n ...
  // But actually each match might be: LOCAL / SCORE / DATE with visitante missing
  // In RFFM the format is typically: LOCAL \n SCORE \n DATE \n VISITANTE (next block)
  // Let's try grouping: team, score, date, team, score, date → pair them
  if (matches.length === 0) {
    const teams = [];
    const scores = [];
    for (const l of lines) {
      const sm = l.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (sm) {
        scores.push({ g1: parseInt(sm[1], 10), g2: parseInt(sm[2], 10) });
      } else if (isTeamName(l)) {
        teams.push(l.trim());
      }
    }
    // Each score should correspond to 2 teams
    if (scores.length > 0 && teams.length >= scores.length * 2) {
      for (let s = 0; s < scores.length; s++) {
        matches.push({
          local: teams[s * 2],
          visitante: teams[s * 2 + 1],
          goles_local: scores[s].g1,
          goles_visitante: scores[s].g2,
        });
      }
    }
  }

  return { temporada, jornada, matches };
}

export default function PasteResultsForm({ categoria, onDataExtracted, onCancel }) {
  const [text, setText] = useState("");
  const [jornadaOverride, setJornadaOverride] = useState("");

  const handleParse = () => {
    if (!text.trim()) { toast.error("Pega el texto de los resultados"); return; }
    const { temporada, jornada, matches } = parseResultsText(text);
    if (matches.length === 0) { toast.error("No se pudieron detectar partidos en el texto pegado"); return; }
    const finalJornada = jornadaOverride ? parseInt(jornadaOverride, 10) : jornada;
    onDataExtracted({ temporada, categoria, jornada: finalJornada, matches });
    toast.success(`✅ Detectados ${matches.length} partidos — Jornada ${finalJornada}`);
  };

  const detectedCount = (() => {
    if (!text.trim()) return 0;
    try { return parseResultsText(text).matches.length; } catch { return 0; }
  })();

  return (
    <Card className="border-2 border-green-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardPaste className="w-5 h-5 text-green-600" />
          Pegar Resultados (Texto)
          <Badge className="bg-green-100 text-green-700 ml-2">⚡ Instantáneo</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3">
          <p className="text-sm text-green-900"><strong>Categoría:</strong> {categoria || "—"}</p>
          <p className="text-xs text-green-700 mt-1">Copia los resultados de la RFFM y pégalos aquí.</p>
        </div>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={"Pega aquí los resultados de la RFFM...\n\nFormatos aceptados:\nEQUIPO LOCAL 2 - 1 EQUIPO VISITANTE\no\nEQUIPO LOCAL\n2 - 1\nEQUIPO VISITANTE"} rows={10} className="font-mono text-xs" />
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">Jornada (opcional):</label>
          <input type="number" value={jornadaOverride} onChange={(e) => setJornadaOverride(e.target.value)} placeholder="Auto" className="w-20 border rounded-md px-2 py-1 text-sm" />
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800"><strong>💡 Cómo hacerlo:</strong> En la RFFM, selecciona los resultados, copia (Ctrl+C) y pega aquí (Ctrl+V).</p>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleParse} disabled={!text.trim()} className="bg-green-600 hover:bg-green-700 flex-1">
            <Zap className="w-4 h-4 mr-2" />
            Parsear Datos ({detectedCount} partidos detectados)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}