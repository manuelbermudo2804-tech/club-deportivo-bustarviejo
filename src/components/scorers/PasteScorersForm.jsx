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
  // Each scorer block is exactly this pattern:
  //   APELLIDO, NOMBRE              (name line - ALWAYS has a comma)
  //   C.D. EQUIPO                   (team line - next line after name, no comma)
  //   CADETE - INFANTIL FEM...      (group/competition - skip)
  //   16                            (goals - a bare number)
  //   (0P)                          (penalties - optional, skip)
  //
  // Strategy: find ALL name lines (lines with comma), then for each one
  // look ahead to grab team, skip group lines, grab goals, skip penalty.
  if (players.length === 0) {
    const isGoalsLine = (l) => /^\d+$/.test(l);
    const isPenaltyLine = (l) => /^\(\d+P\)$/i.test(l);
    // A name line has a comma and is NOT a pure number or penalty
    const isNameLine = (l) => l.includes(',') && !isGoalsLine(l) && !isPenaltyLine(l);

    // First pass: find indices of all name lines
    const nameIndices = [];
    for (let i = 0; i < lines.length; i++) {
      if (isNameLine(lines[i])) nameIndices.push(i);
    }

    // For each name line, scan the lines between it and the NEXT name line (or end)
    for (let k = 0; k < nameIndices.length; k++) {
      const ni = nameIndices[k];
      const nextNi = k + 1 < nameIndices.length ? nameIndices[k + 1] : lines.length;
      const nombre = lines[ni];

      // The line right after the name should be the team
      let equipo = "";
      let goles = 0;
      const blockLines = lines.slice(ni + 1, nextNi);

      // First non-number, non-penalty line is the team
      let teamFound = false;
      for (const bl of blockLines) {
        if (!teamFound && !isGoalsLine(bl) && !isPenaltyLine(bl)) {
          equipo = bl;
          teamFound = true;
          continue;
        }
        if (isGoalsLine(bl)) {
          goles = parseInt(bl, 10);
          break; // got goals, done with this block
        }
        // skip group/competition lines and penalty lines
      }

      if (nombre && equipo && goles > 0) {
        players.push({ jugador_nombre: nombre.trim(), equipo: equipo.trim(), goles });
      }
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