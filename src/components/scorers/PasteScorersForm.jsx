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

  // Detectar temporada
  for (const l of lines) {
    if (/^\d{4}[-\/]\d{4}$/.test(l)) {
      temporada = l.replace('-', '/');
      break;
    }
  }

  if (!temporada) {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    temporada = m >= 9 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
  }

  // Patrón 1: línea completa "JUGADOR EQUIPO GOLES" o "POS JUGADOR EQUIPO GOLES"
  for (const l of lines) {
    const matchFull = l.match(/^(\d+)\s+(.+?)\s+(.+?)\s+(\d+)$/);
    if (matchFull) {
      players.push({
        jugador_nombre: matchFull[2].trim(),
        equipo: matchFull[3].trim(),
        goles: parseInt(matchFull[4], 10),
      });
      continue;
    }
  }

  // Patrón 2: RFFM multi-línea (posición, nombre, equipo, goles en líneas separadas)
  if (players.length === 0) {
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];

      // ¿Es un número de posición (1-99)?
      if (/^\d{1,2}$/.test(l)) {
        const pos = parseInt(l, 10);
        // Buscar nombre (siguiente línea no numérica)
        let nombre = "";
        let equipo = "";
        let goles = 0;
        let j = i + 1;

        // Nombre del jugador
        if (j < lines.length && !/^\d+$/.test(lines[j])) {
          nombre = lines[j];
          j++;
        }
        // Equipo
        if (j < lines.length && !/^\d+$/.test(lines[j])) {
          equipo = lines[j];
          j++;
        }
        // Goles (número)
        if (j < lines.length && /^\d+$/.test(lines[j])) {
          goles = parseInt(lines[j], 10);
          j++;
        }

        if (nombre && equipo && goles > 0) {
          players.push({
            jugador_nombre: nombre.trim(),
            equipo: equipo.trim(),
            goles,
          });
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
    if (!text.trim()) {
      toast.error("Pega el texto de los goleadores");
      return;
    }

    const { temporada, players } = parseScorersText(text);

    if (players.length === 0) {
      toast.error("No se pudieron detectar goleadores en el texto pegado");
      return;
    }

    onDataExtracted({
      temporada,
      categoria,
      players,
    });

    toast.success(`✅ Detectados ${players.length} goleadores`);
  };

  const detectedCount = (() => {
    if (!text.trim()) return 0;
    try {
      return parseScorersText(text).players.length;
    } catch { return 0; }
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
          <p className="text-sm text-green-900">
            <strong>Categoría:</strong> {categoria || "—"}
          </p>
          <p className="text-xs text-green-700 mt-1">
            Copia la tabla de goleadores de la RFFM y pégala aquí.
          </p>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Pega aquí los goleadores de la RFFM...\n\nFormato esperado:\n1\nNOMBRE JUGADOR\nEQUIPO\n10\n2\nOTRO JUGADOR\nOTRO EQUIPO\n7"}
          rows={10}
          className="font-mono text-xs"
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>💡 Cómo hacerlo:</strong> En la RFFM, selecciona la tabla de goleadores, copia (Ctrl+C) y pega aquí (Ctrl+V).
          </p>
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