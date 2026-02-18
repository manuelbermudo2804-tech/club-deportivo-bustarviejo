import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardPaste, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Known header words from RFFM tables (case-insensitive)
// Each line is tested individually, so multi-word headers like "Sanción puntos" need their own check
const HEADER_WORDS = /^(equipo|puntos|jugados|ganados|empates|empatados|perdidos|gf|gc|goles?\s*(a\s*)?favor|goles?\s*(en\s*)?contra|sanci[oó]n\s*puntos|diferencia|pos|posici[oó]n|estado)$/i;

// Additional header fragments that may appear as separate lines when copying from RFFM
const HEADER_FRAGMENTS = /^(sanci[oó]n|puntos|equipo|jugados|ganados|empates|empatados|perdidos|goles|favor|contra|diferencia|pos|posici[oó]n|estado|pj|g|e|p|pts)$/i;

function isHeaderLine(line) {
  if (HEADER_WORDS.test(line)) return true;
  if (HEADER_FRAGMENTS.test(line)) return true;
  return false;
}

function parseStandingsText(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  let temporada = "";
  let grupo = "";

  // STRATEGY: Try tab-separated single-line format FIRST (most common from RFFM copy-paste)
  // If that fails, fall back to multi-line format
  
  const metaLines = [];
  const candidateRows = [];
  
  for (const l of lines) {
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
    // Skip header lines
    if (isHeaderLine(l)) continue;
    
    candidateRows.push(l);
  }

  const standings = [];

  // === APPROACH 1: Single-line rows (tab or multi-space separated) ===
  // Format: "1\tC.D. PEDREZUELA 'A'\t36\t12\t12\t0\t0\t98\t26\t0"
  // or:    "1  C.D. PEDREZUELA 'A'  36  12  12  0  0  98  26  0"
  for (const line of candidateRows) {
    // Split by tabs first; if no tabs, try 2+ spaces
    let parts;
    if (line.includes('\t')) {
      parts = line.split('\t').map(s => s.trim()).filter(Boolean);
    } else {
      // Try splitting by 2+ spaces (but team names can have single spaces)
      parts = line.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
    }
    
    // We need: pos, name, pts, pj, g, e, p, gf, gc [, sancion]  → at least 9 parts
    if (parts.length >= 9) {
      const pos = parseInt(parts[0], 10);
      if (Number.isFinite(pos) && pos >= 1 && pos <= 100) {
        // Find where team name ends and numbers begin
        // parts[1] should be the team name; rest should be numbers
        const nombre = parts[1];
        const nums = parts.slice(2).map(s => parseInt(s, 10)).filter(n => Number.isFinite(n));
        
        if (nombre && !/^\d+$/.test(nombre) && nums.length >= 7) {
          standings.push({
            posicion: pos,
            nombre_equipo: nombre,
            puntos: nums[0],
            partidos_jugados: nums[1],
            ganados: nums[2],
            empatados: nums[3],
            perdidos: nums[4],
            goles_favor: nums[5],
            goles_contra: nums[6],
          });
          continue;
        }
      }
    }

    // Also try regex on the raw line (handles mixed separators)
    const normalized = line.replace(/\t+/g, '  ');
    const fullMatch = normalized.match(/^(\d{1,3})\s{2,}(.+?)\s{2,}(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
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
  }

  // === APPROACH 2: Multi-line format (each field on its own line) ===
  // Only use if approach 1 found nothing
  if (standings.length === 0) {
    let i = 0;
    while (i < candidateRows.length) {
      const line = candidateRows[i];

      const posMatch = line.match(/^(\d{1,3})$/);
      if (posMatch && i + 1 < candidateRows.length) {
        const posicion = parseInt(posMatch[1], 10);
        if (!/^\d+$/.test(candidateRows[i + 1])) {
          const nombreEquipo = candidateRows[i + 1];
          const nums = [];
          let j = i + 2;
          while (j < candidateRows.length && /^\d+$/.test(candidateRows[j])) {
            nums.push(parseInt(candidateRows[j], 10));
            j++;
          }
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

      // Single-line fallback with single spaces
      const singleMatch = line.match(/^(\d{1,2})\s+(.+?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
      if (singleMatch) {
        standings.push({
          posicion: parseInt(singleMatch[1], 10),
          nombre_equipo: singleMatch[2].trim(),
          puntos: parseInt(singleMatch[3], 10),
          partidos_jugados: parseInt(singleMatch[4], 10),
          ganados: parseInt(singleMatch[5], 10),
          empatados: parseInt(singleMatch[6], 10),
          perdidos: parseInt(singleMatch[7], 10),
          goles_favor: parseInt(singleMatch[8], 10),
          goles_contra: parseInt(singleMatch[9], 10),
        });
      }

      i++;
    }
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