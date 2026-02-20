import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardPaste, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function isScoreLine(s) {
  return /^\d+\s*[-–]\s*\d+$/.test(s.trim());
}

function isPendingScore(s) {
  return /^-$/.test(s.trim());
}

function isNoiseLine(s) {
  const t = s.trim();
  if (!t) return true;
  // Date like 18/02/2026
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(t)) return true;
  // Time like 18:00h or 10:00h
  if (/^\d{1,2}:\d{2}h?$/i.test(t)) return true;
  // "Lugar:" lines
  if (/^lugar:/i.test(t)) return true;
  // "VER ACTA" lines
  if (/ver\s*acta/i.test(t)) return true;
  // Section headers at the end
  if (/^(resultados|calendario|clasificaci[oó]n|goleadores)$/i.test(t)) return true;
  // Temporada line
  if (/^temporada\s+\d{4}[-\/]\d{4}/i.test(t)) return true;
  // Competition name line (PRIMERA BENJAMÍN etc)
  if (/grupo\s+\d+/i.test(t)) return true;
  // Jornada header with date in parentheses
  if (/^jornada\s+\d+/i.test(t)) return true;
  // Pure numbers
  if (/^\d+$/.test(t)) return true;
  // Season format
  if (/^\d{4}[-\/]\d{4}$/.test(t)) return true;
  return false;
}

function isTeamName(s) {
  if (!s || !s.trim()) return false;
  const t = s.trim();
  if (isNoiseLine(t)) return false;
  if (isScoreLine(t)) return false;
  if (isPendingScore(t)) return false;
  // Must have at least one letter
  return /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(t);
}

function parseResultsText(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  let temporada = "";
  let jornada = 1;
  const matches = [];

  // Extract metadata
  for (const l of lines) {
    if (/^\d{4}[-\/]\d{4}$/.test(l)) { temporada = l.replace('-', '/'); continue; }
    const tmMatch = l.match(/temporada\s+(\d{4}[-\/]\d{4})/i);
    if (tmMatch) { temporada = tmMatch[1].replace('-', '/'); continue; }
    const jm = l.match(/jornada\s*(\d+)/i);
    if (jm) { jornada = parseInt(jm[1], 10); continue; }
  }

  if (!temporada) {
    const d = new Date(); const y = d.getFullYear(); const m = d.getMonth() + 1;
    temporada = m >= 9 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
  }

  // Strategy 1: Single-line format "EQUIPO LOCAL 2 - 1 EQUIPO VISITANTE"
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

  // Strategy 2: RFFM multi-line block format
  // Pattern: EQUIPO_LOCAL \n SCORE \n ...noise (date, time, lugar, acta)... \n EQUIPO_VISITANTE
  // Blocks repeat. Extract only meaningful lines (teams + scores)
  if (matches.length === 0) {
    // Filter to only team names and score lines (including pending "-")
    const meaningful = [];
    for (const l of lines) {
      const t = l.trim();
      if (isScoreLine(t)) {
        const sm = t.match(/^(\d+)\s*[-–]\s*(\d+)$/);
        meaningful.push({ type: "score", g1: parseInt(sm[1], 10), g2: parseInt(sm[2], 10) });
      } else if (isPendingScore(t)) {
        meaningful.push({ type: "pending" });
      } else if (isTeamName(t)) {
        meaningful.push({ type: "team", name: t });
      }
      // noise lines are skipped
    }

    // Now pair: team, score/pending, team → one match
    let i = 0;
    while (i < meaningful.length) {
      if (meaningful[i].type === "team") {
        const local = meaningful[i].name;
        // Next should be score or pending
        if (i + 1 < meaningful.length && (meaningful[i + 1].type === "score" || meaningful[i + 1].type === "pending")) {
          const scoreItem = meaningful[i + 1];
          // Next after score should be visitante team
          if (i + 2 < meaningful.length && meaningful[i + 2].type === "team") {
            const visitante = meaningful[i + 2].name;
            if (scoreItem.type === "score") {
              matches.push({ local, visitante, goles_local: scoreItem.g1, goles_visitante: scoreItem.g2 });
            } else {
              // Pending match (no score yet)
              matches.push({ local, visitante, goles_local: null, goles_visitante: null, pendiente: true });
            }
            i += 3;
            continue;
          }
        }
      }
      i++;
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