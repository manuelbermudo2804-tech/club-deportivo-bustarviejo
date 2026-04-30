import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { normalizeName } from "./validators";

// Detecta posibles duplicados en inscripciones y los muestra al admin
export default function DuplicatesAlert({ registrations = [], voluntarios = [] }) {
  const findings = useMemo(() => {
    const items = [];

    // 1) Duplicados de jugadores DENTRO de la misma modalidad (3x3 - error)
    //    y dentro de Fútbol Chapa (informativo: misma persona apuntada 2 veces)
    const byMod = {};
    registrations.forEach(r => {
      if (!byMod[r.modalidad]) byMod[r.modalidad] = [];
      byMod[r.modalidad].push(r);
    });
    Object.entries(byMod).forEach(([modalidad, list]) => {
      const seen = new Map(); // normName -> [{registro, nombreOriginal}]
      list.forEach(r => {
        const players = modalidad.startsWith("Fútbol Chapa")
          ? [r.jugador_nombre]
          : [r.jugador_1, r.jugador_2, r.jugador_3];
        players.forEach(p => {
          if (!p) return;
          const key = normalizeName(p);
          if (!seen.has(key)) seen.set(key, []);
          seen.get(key).push({ reg: r, name: p });
        });
      });
      seen.forEach((occurrences, key) => {
        if (occurrences.length > 1) {
          items.push({
            level: modalidad.startsWith("3 para 3") ? "error" : "warn",
            title: `Duplicado en ${modalidad}`,
            text: `"${occurrences[0].name}" aparece ${occurrences.length} veces`,
            details: occurrences.map(o => `· ${o.reg.modalidad.startsWith("Fútbol Chapa") ? o.reg.nombre_responsable : o.reg.nombre_equipo} (tel: ${o.reg.telefono_responsable})`).join("\n"),
          });
        }
      });
    });

    // 2) Mismo teléfono usado en muchas inscripciones (>3)
    const byPhone = {};
    registrations.forEach(r => {
      const ph = (r.telefono_responsable || "").replace(/\s/g, "");
      if (!ph) return;
      if (!byPhone[ph]) byPhone[ph] = [];
      byPhone[ph].push(r);
    });
    Object.entries(byPhone).forEach(([phone, list]) => {
      if (list.length > 3) {
        items.push({
          level: "warn",
          title: `Teléfono usado ${list.length} veces`,
          text: `${phone} — ${list[0].nombre_responsable}`,
          details: list.map(r => `· ${r.modalidad}`).join("\n"),
        });
      }
    });

    return items;
  }, [registrations, voluntarios]);

  if (findings.length === 0) return null;

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" />
          {findings.length} {findings.length === 1 ? "aviso" : "avisos"} sobre inscripciones
        </div>
        <ul className="space-y-1.5 text-xs">
          {findings.map((f, i) => (
            <li key={i} className={`p-2 rounded border ${f.level === "error" ? "border-red-300 bg-red-50" : "border-amber-200 bg-white"}`}>
              <p className={`font-bold ${f.level === "error" ? "text-red-700" : "text-amber-800"}`}>
                {f.level === "error" ? "🚫" : "⚠️"} {f.title}
              </p>
              <p className="text-slate-700">{f.text}</p>
              {f.details && <pre className="mt-1 text-[10px] text-slate-500 whitespace-pre-wrap font-sans">{f.details}</pre>}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}