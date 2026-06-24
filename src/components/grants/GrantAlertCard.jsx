import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Trash2, Calendar, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import GrantAnalysisModal from "./GrantAnalysisModal";

const ESTADO_COLORS = {
  nueva: "bg-blue-100 text-blue-700",
  revisando: "bg-amber-100 text-amber-700",
  interesa: "bg-green-100 text-green-700",
  solicitada: "bg-purple-100 text-purple-700",
  descartada: "bg-slate-100 text-slate-500",
};

const ESTADOS = ["nueva", "revisando", "interesa", "solicitada", "descartada"];

export default function GrantAlertCard({ alert, onChanged }) {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const updateEstado = async (estado) => {
    await base44.entities.GrantAlert.update(alert.id, { estado, leida: true });
    onChanged?.();
  };

  const remove = async () => {
    await base44.entities.GrantAlert.delete(alert.id);
    onChanged?.();
  };

  const markRead = async () => {
    if (!alert.leida) await base44.entities.GrantAlert.update(alert.id, { leida: true });
  };

  return (
    <Card className={`rounded-2xl border ${alert.leida ? "border-slate-200" : "border-orange-300 bg-orange-50/30"}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {!alert.leida && <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />}
            {alert.categoria && <Badge variant="outline" className="text-xs">{alert.categoria}</Badge>}
            <Badge className={`text-xs ${ESTADO_COLORS[alert.estado] || ""}`}>{alert.estado}</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={remove} className="text-slate-300 hover:text-red-500 flex-shrink-0 h-7 w-7">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <h3 className="font-semibold text-slate-800 leading-snug">{alert.titulo}</h3>
        {alert.resumen && <p className="text-sm text-slate-500 line-clamp-3">{alert.resumen}</p>}

        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
          <span>{alert.fuente_nombre}</span>
          {alert.fecha_publicacion && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(alert.fecha_publicacion), "d MMM yyyy", { locale: es })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <Button
            size="sm"
            className="rounded-lg bg-orange-600 hover:bg-orange-700"
            onClick={() => { markRead(); setShowAnalysis(true); }}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            {alert.analisis_ia ? "Ver cómo presentarla" : "¿Cómo la presento?"}
          </Button>
          {alert.enlace && (
            <a href={alert.enlace} target="_blank" rel="noopener noreferrer" onClick={markRead}>
              <Button variant="outline" size="sm" className="rounded-lg">
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Ver convocatoria
              </Button>
            </a>
          )}
          <Select value={alert.estado} onValueChange={updateEstado}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent>

      <GrantAnalysisModal
        alert={alert}
        open={showAnalysis}
        onOpenChange={setShowAnalysis}
        onAnalyzed={onChanged}
      />
    </Card>
  );
}