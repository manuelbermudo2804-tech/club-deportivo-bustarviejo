import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardPaste, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Known header words from RFFM tables (case-insensitive)
const HEADER_WORDS = /^(equipo|puntos|jugados|ganados|empates|empatados|perdidos|gf|gc|goles?\s*(a\s*)?favor|goles?\s*(en\s*)?contra|sanci[oó]n\s*puntos|diferencia|pos|posici[oó]n)$/i;

function parseStandingsText(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  let temporada = "";
  let grupo = "";

  // Pass 1: Extract metadata and skip ALL header lines (not just first 6)
  const dataLines = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    // Season line
    if (/^\d{4}[-\/]\d{4}$/.test(l)) {
      temporada = l.replace('-', '/');
      continue;
    }
    // Group / competition name line
    if (/grupo|aficionado|juvenil|cadete|infantil|alevin|benjamin|pre.?benjamin|femenin|primera|segunda|tercera|preferente/i.test(l) && !/^C\.D\.|^A\.D\.|^U\.D\.|^S\.D\.|^E\.F\.|^C\.F\./i.test(l)) {
      grupo = l;
      continue;
    }
    // Header word lines (Equipo, Puntos, Jugados, etc.)
    if (HEADER_WORDS.test(l)) {
      continue;
    }
    dataLines.push(l);
  }

  const standings = [];
  
  let i = 0;
  while (i < dataLines.length) {
    const line = dataLines[i];
    
    // Pattern: position number alone on a line, followed by team name, then numbers
    const posMatch = line.match(/^(\d{1,3})$/);
    if (posMatch && i + 1 < dataLines.length) {
      const posicion = parseInt(posMatch[1], 10);
      // Next non-number line is the team name
      if (!/^\d+$/.test(dataLines[i + 1])) {
        const nombreEquipo = dataLines[i + 1];
        
        // Collect all consecutive numbers after the team name
        const nums = [];
        let j = i + 2;
        while (j < dataLines.length && /^\d+$/.test(dataLines[j])) {
          nums.push(parseInt(dataLines[j], 10));
          j++;
        }

        // Need at least 7 numbers: Pts, PJ, G, E, P, GF, GC (may have extra like "Sanción puntos")
        if (nombreEquipo && nums.length >= 7) {
          standings.push({
            posicion,
            nombre_equipo: nombreEquipo.trim(),
            puntos: nums[0],
            partidos_jugados: nums[1],
            ganados: nums[2],
            empatados: nums[3],
            perdidos: nums[4],
            goles_favor: nums[5],
            goles_contra: nums[6],
          });
          i = j;
          continue;
        }
      }
    }
    
    // Fallback: all data on one line
    const fullMatch = line.match(/^(\d{1,2})\s+(.+?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
    if (fullMatch) {
      standings.push({
        posicion: parseInt(fullMatch[1], 10),
        nombre_equipo: fullMatch[2].trim(),
        puntos: parseInt(fullMatch[3], 10),
        partidos_jugados: parseInt(fullMatch[4], 10),
        ganados: parseInt(fullMatch[5], 10),
        empatados: parseInt(fullMatch[6], 10),
        perdidos: parseInt(fullMatch[7], 10),
        goles_favor: parseInt(fullMatch[8], 10),
        goles_contra: parseInt(fullMatch[9], 10),
      });
    }
    
    i++;
  }

  return { temporada, grupo, standings };
}

export default function PasteStandingsForm({ preselectedCategory, onDataExtracted, onCancel }) {
  const [text, setText] = useState("");
  const [jornadaOverride, setJornadaOverride] = useState("");

  const handleParse = () => {
    if (!text.trim()) {
      toast.error("Pega el texto de la clasificación");
      return;
    }

    const { temporada, grupo, standings } = parseStandingsText(text);

    if (standings.length === 0) {
      toast.error("No se pudieron detectar equipos en el texto pegado");
      return;
    }

    const maxPJ = Math.max(...standings.map(s => s.partidos_jugados || 0), 1);
    const jornada = jornadaOverride ? parseInt(jornadaOverride, 10) : maxPJ;

    onDataExtracted({
      temporada: temporada || "2025/2026",
      categoria: preselectedCategory,
      jornada,
      standings,
    });

    toast.success(`✅ Detectados ${standings.length} equipos — Jornada ${jornada}`);
  };

  return (
    <Card className="border-2 border-green-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardPaste className="w-5 h-5 text-green-600" />
          Pegar Clasificación (Texto)
          <Badge className="bg-green-100 text-green-700 ml-2">⚡ Instantáneo</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3">
          <p className="text-sm text-green-900">
            <strong>Categoría:</strong> {preselectedCategory || "—"}
          </p>
          <p className="text-xs text-green-700 mt-1">
            Copia la tabla de la RFFM y pégala aquí. Se detectan automáticamente los datos.
          </p>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Pega aquí el texto copiado de la RFFM...\n\nEjemplo:\n2025-2026\nSEGUNDA AFICIONADO - Grupo 2\nEquipo\nPuntos\n...\n1\nC.D. EJEMPLO\n30\n15\n9\n3\n3\n28\n15\n0"}
          rows={10}
          className="font-mono text-xs"
        />

        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">Jornada (opcional):</label>
          <input
            type="number"
            value={jornadaOverride}
            onChange={(e) => setJornadaOverride(e.target.value)}
            placeholder="Auto"
            className="w-20 border rounded-md px-2 py-1 text-sm"
          />
          <span className="text-xs text-slate-500">Si no la pones, se calcula automáticamente</span>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>💡 Cómo hacerlo:</strong> En la web de la RFFM, selecciona toda la tabla (Ctrl+A o selecciona con el ratón), copia (Ctrl+C) y pega aquí (Ctrl+V).
          </p>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            onClick={handleParse}
            disabled={!text.trim()}
            className="bg-green-600 hover:bg-green-700 flex-1"
          >
            <Zap className="w-4 h-4 mr-2" />
            Parsear Datos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}