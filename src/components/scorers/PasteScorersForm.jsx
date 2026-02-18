import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardPaste, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function parseScorersText(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  let temporada = "";
  const players = [];

  for (const l of lines) {
    if (/^\d{4}[-\/]\d{4}$/.test(l)) { temporada = l.replace('-', '/'); break; }
  }

  if (!temporada) {
    const d = new Date(); const y = d.getFullYear(); const m = d.getMonth() + 1;
    temporada = m >= 9 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
  }

  // === APPROACH 1: Tab-separated single-line rows ===
  // Format: "1\tNOMBRE\tEQUIPO\t10" or with position
  for (const l of lines) {
    const mf = l.match(/^(\d+)\s+(.+?)\s+(.+?)\s+(\d+)$/);
    if (mf) {
      players.push({ jugador_nombre: mf[2].trim(), equipo: mf[3].trim(), goles: parseInt(mf[4], 10) });
    }
  }

  // === APPROACH 2: RFFM multi-line format ===
  // Each scorer block:
  //   APELLIDO APELLIDO, NOMBRE         (name - contains comma)
  //   C.D. EQUIPO A                     (team - starts with letter, no comma)
  //   Grupo 72  OR  CADETE - INF...     (group/competition line - skip)
  //   38                                (goals number)
  //   (1P)                              (optional penalties - skip)
  //
  // The "group" line can be short ("Grupo 72") or very long
  // ("CADETE - INFANTIL FEMENINO F7 SIERRA OESTE"). We detect it as:
  // any line that is NOT a number, NOT a penalty, and comes between team and goals.
  if (players.length === 0) {
    const isNameLine = (l) => /,/.test(l) && !/^\d+$/.test(l) && !/^\(\d+P\)$/i.test(l);
    const isTeamLine = (l) => /^[A-ZÁÉÍÓÚÑÜ]/.test(l) && !/^\d/.test(l) && !/^\(\d+P\)$/i.test(l) && !/,/.test(l);
    const isGoalsLine = (l) => /^\d+$/.test(l);
    const isPenaltyLine = (l) => /^\(\d+P\)$/i.test(l);
    // A "skip" line is anything between team and goals that isn't goals or penalty
    // (group name, competition name, etc.)
    const isSkipLine = (l) => !isGoalsLine(l) && !isPenaltyLine(l) && !isNameLine(l);

    // Also detect header lines to skip: "Jugador", "Equipo", "Grupo", "Goles", "Temporada XXXX"
    const isHeaderLine = (l) => /^(jugador|equipo|grupo|goles|temporada\s)/i.test(l);
    // Detect season/competition title lines at the top
    const isTitleLine = (l) => /^(cadete|infantil|juvenil|alevin|benjam|pre-?benjam|aficionado|femenino|senior)/i.test(l) && !isTeamLine(l);

    let i = 0;
    while (i < lines.length) {
      // Skip known header/title lines
      if (isHeaderLine(lines[i]) || isTitleLine(lines[i])) { i++; continue; }

      // Look for a name line (contains comma)
      if (isNameLine(lines[i])) {
        const nombre = lines[i];
        let equipo = "";
        let goles = 0;
        let j = i + 1;

        // Next should be team (starts with letter, no comma)
        if (j < lines.length && isTeamLine(lines[j])) {
          equipo = lines[j];
          j++;
        }

        // Skip any non-number lines between team and goals (group/competition name)
        while (j < lines.length && isSkipLine(lines[j]) && !isTeamLine(lines[j])) {
          j++;
        }

        // Next should be goals (number)
        if (j < lines.length && isGoalsLine(lines[j])) {
          goles = parseInt(lines[j], 10);
          j++;
        }

        // Skip optional "(XP)" penalty line
        if (j < lines.length && isPenaltyLine(lines[j])) {
          j++;
        }

        if (nombre && equipo && goles > 0) {
          players.push({ jugador_nombre: nombre.trim(), equipo: equipo.trim(), goles });
          i = j;
          continue;
        }
      }

      // === Fallback: position number then name/team/goals ===
      if (/^\d{1,3}$/.test(lines[i])) {
        let nombre = "", equipo = "", goles = 0, j = i + 1;
        if (j < lines.length && !/^\d+$/.test(lines[j])) { nombre = lines[j]; j++; }
        if (j < lines.length && !/^\d+$/.test(lines[j]) && !isGoalsLine(lines[j])) { equipo = lines[j]; j++; }
        // Skip any non-number lines (group/competition)
        while (j < lines.length && !isGoalsLine(lines[j]) && !isPenaltyLine(lines[j]) && !isNameLine(lines[j])) { j++; }
        if (j < lines.length && isGoalsLine(lines[j])) { goles = parseInt(lines[j], 10); j++; }
        if (j < lines.length && isPenaltyLine(lines[j])) { j++; }
        if (nombre && equipo && goles > 0) {
          players.push({ jugador_nombre: nombre.trim(), equipo: equipo.trim(), goles });
          i = j;
          continue;
        }
      }

      i++;
    }
  }

  return { temporada, players };
}

export default function PasteScorersForm({ categoria, onDataExtracted, onCancel }) {
  const [text, setText] = useState("");

  const handleParse = () => {
    if (!text.trim()) { toast.error("Pega el texto de los goleadores"); return; }
    const { temporada, players } = parseScorersText(text);
    if (players.length === 0) { toast.error("No se pudieron detectar goleadores en el texto pegado"); return; }
    onDataExtracted({ temporada, categoria, players });
    toast.success(`✅ Detectados ${players.length} goleadores`);
  };

  const detectedCount = (() => {
    if (!text.trim()) return 0;
    try { return parseScorersText(text).players.length; } catch { return 0; }
  })();

  return (
    <Card className="border-2 border-green-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardPaste className="w-5 h-5 text-green-600" />
          Pegar Goleadores (Texto)
          <Badge className="bg-green-100 text-green-700 ml-2">⚡ Instantáneo</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3">
          <p className="text-sm text-green-900"><strong>Categoría:</strong> {categoria || "—"}</p>
          <p className="text-xs text-green-700 mt-1">Copia la tabla de goleadores de la RFFM y pégala aquí.</p>
        </div>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={"Pega aquí los goleadores de la RFFM...\n\nFormato esperado:\n1\nNOMBRE JUGADOR\nEQUIPO\n10\n2\nOTRO JUGADOR\nOTRO EQUIPO\n7"} rows={10} className="font-mono text-xs" />
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800"><strong>💡 Cómo hacerlo:</strong> En la RFFM, selecciona la tabla de goleadores, copia (Ctrl+C) y pega aquí (Ctrl+V).</p>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleParse} disabled={!text.trim()} className="bg-green-600 hover:bg-green-700 flex-1">
            <Zap className="w-4 h-4 mr-2" />
            Parsear Datos ({detectedCount} goleadores detectados)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}