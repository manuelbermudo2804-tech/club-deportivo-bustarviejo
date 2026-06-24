import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileText, ListChecks, FolderOpen, Lightbulb, Calendar, Euro, Users, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const FIABILIDAD_INFO = {
  alta: { label: "Información oficial verificada", color: "bg-green-100 text-green-700" },
  media: { label: "Información parcial", color: "bg-amber-100 text-amber-700" },
  baja: { label: "Estimación general — confirma en la web oficial", color: "bg-orange-100 text-orange-700" },
};

function Section({ icon: Icon, title, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-slate-800 font-semibold">
        <Icon className="w-4 h-4 text-orange-600" />
        {title}
      </div>
      <div className="text-sm text-slate-600 pl-6">{children}</div>
    </div>
  );
}

export default function GrantAnalysisModal({ alert, open, onOpenChange, onAnalyzed }) {
  const [loading, setLoading] = useState(false);
  const stored = alert?.analisis_ia ? safeParse(alert.analisis_ia) : null;
  const [analisis, setAnalisis] = useState(stored);

  function safeParse(s) {
    try { return JSON.parse(s); } catch { return null; }
  }

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("analyzeGrantBases", { alertId: alert.id });
      if (res.data?.success) {
        setAnalisis(res.data.analisis);
        onAnalyzed?.();
      } else {
        toast.error(res.data?.error || "No se pudo analizar la subvención");
      }
    } catch (e) {
      toast.error("Error al analizar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fiab = analisis?.fiabilidad ? FIABILIDAD_INFO[analisis.fiabilidad] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base leading-snug pr-6">
            <Sparkles className="w-5 h-5 text-orange-600 flex-shrink-0" />
            Cómo presentar esta subvención
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-slate-400 -mt-1">{alert?.titulo}</p>

        {!analisis && !loading && (
          <div className="text-center py-8 space-y-4">
            <p className="text-sm text-slate-500">
              La IA leerá las bases oficiales y te dirá qué documentos necesitas y qué proyecto preparar.
            </p>
            <Button onClick={runAnalysis} className="bg-orange-600 hover:bg-orange-700 rounded-xl">
              <Sparkles className="w-4 h-4 mr-2" /> Analizar bases con IA
            </Button>
          </div>
        )}

        {loading && (
          <div className="text-center py-10 space-y-3">
            <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto" />
            <p className="text-sm text-slate-500">Leyendo las bases y preparando el análisis...</p>
            <p className="text-xs text-slate-400">Puede tardar hasta 30 segundos</p>
          </div>
        )}

        {analisis && !loading && (
          <div className="space-y-5 pt-1">
            {fiab && (
              <Badge className={`text-xs ${fiab.color}`}>
                {analisis.fiabilidad === "baja" && <AlertTriangle className="w-3 h-3 mr-1" />}
                {fiab.label}
              </Badge>
            )}

            {analisis.resumen && (
              <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{analisis.resumen}</p>
            )}

            {analisis.quien_puede && <Section icon={Users} title="¿Puede pedirla el club?">{analisis.quien_puede}</Section>}
            {analisis.que_cubre && <Section icon={FolderOpen} title="Qué gastos cubre">{analisis.que_cubre}</Section>}

            <div className="grid grid-cols-2 gap-3">
              {analisis.importe && <Section icon={Euro} title="Importe">{analisis.importe}</Section>}
              {analisis.fecha_limite && <Section icon={Calendar} title="Plazo">{analisis.fecha_limite}</Section>}
            </div>

            {analisis.documentos?.length > 0 && (
              <Section icon={FileText} title="Documentos que necesitas">
                <ul className="list-disc pl-4 space-y-1">
                  {analisis.documentos.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </Section>
            )}

            {analisis.proyecto_necesario && (
              <Section icon={FileText} title="Proyecto / memoria a preparar">{analisis.proyecto_necesario}</Section>
            )}

            {analisis.pasos?.length > 0 && (
              <Section icon={ListChecks} title="Pasos para presentarla">
                <ol className="list-decimal pl-4 space-y-1">
                  {analisis.pasos.map((p, i) => <li key={i}>{p}</li>)}
                </ol>
              </Section>
            )}

            {analisis.consejos && <Section icon={Lightbulb} title="Consejos">{analisis.consejos}</Section>}

            <Button variant="outline" size="sm" onClick={runAnalysis} className="rounded-lg w-full">
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> Volver a analizar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}