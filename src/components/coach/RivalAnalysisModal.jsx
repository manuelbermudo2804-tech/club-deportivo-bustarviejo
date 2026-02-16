import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Shield, AlertTriangle, Lightbulb, Copy, CheckCircle2 } from "lucide-react";

export default function RivalAnalysisModal({ open, onClose, analysis, rival, categoria, fecha }) {
  const [copied, setCopied] = React.useState(false);

  if (!analysis) return null;

  const copyToClipboard = () => {
    const text = `📊 ANÁLISIS PRE-PARTIDO
Rival: ${rival}
Categoría: ${categoria}
Fecha: ${fecha}

📈 Racha: ${analysis.racha || '-'}

💪 Puntos fuertes:
${(analysis.puntos_fuertes || []).map(p => `• ${p}`).join('\n')}

⚠️ Debilidades:
${(analysis.debilidades || []).map(d => `• ${d}`).join('\n')}

🎯 Plan táctico:
${(analysis.plan_tactico || []).map(t => `• ${t}`).join('\n')}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Target className="w-5 h-5 text-red-500" />
            Análisis: {rival}
          </DialogTitle>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline">{categoria}</Badge>
            <Badge variant="outline">{fecha}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Racha */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">📈</span>
              <span className="font-bold text-blue-900">Racha</span>
            </div>
            <p className="text-sm text-blue-800">{analysis.racha || 'Sin datos'}</p>
          </div>

          {/* Puntos fuertes */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-red-600" />
              <span className="font-bold text-red-900">Puntos fuertes</span>
            </div>
            <ul className="space-y-1.5">
              {(analysis.puntos_fuertes || []).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                  <span className="text-red-400 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Debilidades */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-green-600" />
              <span className="font-bold text-green-900">Debilidades a explotar</span>
            </div>
            <ul className="space-y-1.5">
              {(analysis.debilidades || []).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-green-800">
                  <span className="text-green-400 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Plan táctico */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-orange-600" />
              <span className="font-bold text-orange-900">Plan táctico sugerido</span>
            </div>
            <ul className="space-y-1.5">
              {(analysis.plan_tactico || []).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-orange-800">
                  <span className="text-orange-400 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={copyToClipboard} className="gap-2">
            {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
          <Button onClick={() => onClose(false)} className="bg-orange-600 hover:bg-orange-700">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}