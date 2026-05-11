import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// Panel admin para forzar el recálculo manual de puntos de todos los participantes
export default function PorraAdminRecalcular({ totalParticipantes }) {
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const handleRecalcular = async () => {
    if (!confirm(`¿Recalcular puntos de los ${totalParticipantes} participantes? Puede tardar unos segundos.`)) return;
    setRunning(true);
    try {
      const res = await base44.functions.invoke('porraCalcularPuntos', {});
      if (res.data?.success) {
        setLastResult(res.data);
        toast.success(`✅ ${res.data.actualizados} participantes recalculados`);
      } else {
        toast.error(res.data?.error || 'Error al recalcular');
      }
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-black text-slate-900">Cálculo de puntos</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Los puntos se recalculan automáticamente cuando marcas un partido como finalizado.
              Si necesitas forzarlo manualmente (ej: cambias el campeón en config), pulsa el botón.
            </p>
            <Button
              onClick={handleRecalcular}
              disabled={running}
              size="sm"
              className="mt-3 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {running ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              {running ? 'Calculando...' : 'Recalcular puntos ahora'}
            </Button>
            {lastResult && (
              <div className="mt-3 flex items-center gap-2 text-xs text-green-700 bg-green-100 rounded-lg p-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{lastResult.actualizados} participantes actualizados {lastResult.errores > 0 && `· ${lastResult.errores} errores`}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}