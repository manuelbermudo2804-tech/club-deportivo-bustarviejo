import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";

// Calcula el reparto de minutos de la temporada y lo compara con la media del equipo.
export const calcularEquidad = (players, matchStructure) => {
  const filas = players.map(p => {
    let total = 0;
    matchStructure.forEach(m => {
      const e = m.minutos_jugadores?.find(x => x.jugador_id === p.id);
      total += (e?.minutos_1parte || 0) + (e?.minutos_2parte || 0);
    });
    return { id: p.id, nombre: p.nombre, total };
  });
  const conMinutos = filas.filter(f => f.total > 0);
  const media = conMinutos.length ? Math.round(filas.reduce((s, f) => s + f.total, 0) / filas.length) : 0;
  return {
    media,
    filas: filas
      .map(f => {
        const dif = f.total - media;
        const pct = media ? Math.round((dif / media) * 100) : 0;
        const nivel = pct <= -25 ? "rojo" : pct <= -10 ? "ambar" : "verde";
        return { ...f, dif, pct, nivel };
      })
      .sort((a, b) => a.dif - b.dif),
  };
};

const ESTILOS = {
  rojo: { punto: "bg-red-500", texto: "text-red-700", etiqueta: "Muy por debajo" },
  ambar: { punto: "bg-amber-500", texto: "text-amber-700", etiqueta: "Por debajo" },
  verde: { punto: "bg-green-500", texto: "text-green-700", etiqueta: "Equilibrado" },
};

export default function EquidadMinutosPanel({ players, matchStructure }) {
  const { media, filas } = useMemo(() => calcularEquidad(players, matchStructure), [players, matchStructure]);

  if (!media) return null;

  const enRiesgo = filas.filter(f => f.nivel !== "verde").length;

  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="w-5 h-5 text-amber-600" />
          Minuto de Oro · equidad del reparto
        </CardTitle>
        <p className="text-xs text-slate-500">
          Media del equipo: <strong>{media} min</strong> · {enRiesgo === 0
            ? "todos dentro del margen justo"
            : `${enRiesgo} jugador(es) por debajo de la media`}
        </p>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {filas.map(f => {
          const est = ESTILOS[f.nivel];
          return (
            <div key={f.id} className="flex items-center gap-3 py-1.5 border-b last:border-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${est.punto}`} />
              <span className="flex-1 text-sm font-medium text-slate-800 truncate">{f.nombre}</span>
              <span className="text-xs text-slate-500 w-16 text-right">{f.total} min</span>
              <span className={`text-xs font-bold w-20 text-right ${est.texto}`}>
                {f.dif > 0 ? "+" : ""}{f.dif} min
              </span>
              <Badge variant="outline" className={`hidden sm:inline-flex text-[10px] ${est.texto}`}>
                {est.etiqueta}
              </Badge>
            </div>
          );
        })}
        <p className="text-[11px] text-slate-400 pt-2">
          Solo visible para el cuerpo técnico y la dirección del club. Sirve para preparar la próxima
          convocatoria con criterio, no como estadística pública.
        </p>
      </CardContent>
    </Card>
  );
}