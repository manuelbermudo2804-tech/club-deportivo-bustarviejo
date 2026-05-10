import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, Smartphone } from "lucide-react";
import { toast } from "sonner";

export default function FantasySuccess({ entry, config }) {
  const concepto = `Fantasy ${entry?.nickname || ""}`;
  const bizum = config?.bizum_telefono || "";
  const precio = config?.precio_inscripcion ?? 10;

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
  };

  return (
    <Card className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50">
      <CardContent className="p-6 lg:p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-white" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">¡Inscripción registrada!</h2>
        <p className="text-slate-700 mb-6">Para completar tu participación, realiza el pago por Bizum:</p>

        <div className="bg-white rounded-2xl p-5 mb-4 border-2 border-emerald-200 space-y-3">
          <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-left">
              <div className="text-xs text-slate-500 font-bold uppercase">Importe</div>
              <div className="text-2xl font-black text-emerald-600">{precio}€</div>
            </div>
            <Smartphone className="w-8 h-8 text-emerald-500" />
          </div>

          {bizum && (
            <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <div className="text-left flex-1">
                <div className="text-xs text-slate-500 font-bold uppercase">Bizum a</div>
                <div className="font-mono font-bold text-slate-900">{bizum}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => copy(bizum)}><Copy className="w-3.5 h-3.5" /></Button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 bg-yellow-50 border-2 border-yellow-300 rounded-lg px-3 py-2">
            <div className="text-left flex-1 min-w-0">
              <div className="text-xs text-yellow-800 font-bold uppercase">Concepto (¡obligatorio!)</div>
              <div className="font-mono font-bold text-yellow-900 truncate">{concepto}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => copy(concepto)}><Copy className="w-3.5 h-3.5" /></Button>
          </div>
        </div>

        <p className="text-xs text-slate-600">
          Cuando recibamos tu Bizum verificaremos tu inscripción y aparecerás en la clasificación oficial.
          Te enviaremos un email de confirmación a <strong>{entry?.email}</strong>.
        </p>
      </CardContent>
    </Card>
  );
}