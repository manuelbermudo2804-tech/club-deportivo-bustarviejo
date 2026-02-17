import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardPaste, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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

  for (const l of lines) {
    const mf = l.match(/^(.+?)\s+(\d+)\s*[-–]\s*(\d+)\s+(.+)$/);
    if (mf) {
      matches.push({ local: mf[1].trim(), visitante: mf[4].trim(), goles_local: parseInt(mf[2], 10), goles_visitante: parseInt(mf[3], 10) });
    }
  }

  if (matches.length === 0) {
    for (let i = 0; i < lines.length - 2; i++) {
      const sm = lines[i + 1]?.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (sm) {
        const local = lines[i]; const visitante = lines[i + 2];
        if (local && visitante && !/^\d+$/.test(local) && !/^\d+$/.test(visitante)) {
          matches.push({ local: local.trim(), visitante: visitante.trim(), goles_local: parseInt(sm[1], 10), goles_visitante: parseInt(sm[2], 10) });
          i += 2;
        }
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