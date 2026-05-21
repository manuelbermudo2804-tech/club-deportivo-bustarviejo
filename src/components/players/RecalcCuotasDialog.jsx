import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw, Lock } from "lucide-react";
import { toast } from "sonner";
import { applyPaymentRecalculation } from "./recalcPaymentsHelper";

export default function RecalcCuotasDialog({ open, onOpenChange, plan, playerName, adminEmail, onApplied, onSkipped }) {
  const [applying, setApplying] = useState(false);

  if (!plan) return null;

  const { recalculable = [], frozen = [], skipped = [], oldCategory, newCategory, totalPendienteAntes, totalPendienteDespues, totalPagado, oldCuotas, newCuotas } = plan;

  const diffTotal = totalPendienteDespues - totalPendienteAntes;

  const handleApply = async () => {
    setApplying(true);
    try {
      const updated = await applyPaymentRecalculation(plan, adminEmail);
      toast.success(`✅ ${updated} cuota${updated !== 1 ? 's' : ''} actualizada${updated !== 1 ? 's' : ''} correctamente`);
      onApplied?.(updated);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Error al actualizar las cuotas");
    } finally {
      setApplying(false);
    }
  };

  const handleSkip = () => {
    onSkipped?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !applying && onOpenChange(v)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <RefreshCw className="w-6 h-6 text-orange-600" />
            Cambio de categoría detectado
          </DialogTitle>
          <DialogDescription>
            Has cambiado la categoría de <strong>{playerName}</strong>. ¿Quieres recalcular las cuotas pendientes con los nuevos importes?
          </DialogDescription>
        </DialogHeader>

        {/* Cambio de categoría */}
        <div className="bg-slate-50 rounded-lg p-4 border">
          <div className="flex items-center justify-between text-sm">
            <div className="flex-1">
              <p className="text-slate-500 text-xs uppercase font-medium">Categoría anterior</p>
              <p className="font-bold text-slate-700">{oldCategory}</p>
              <p className="text-xs text-slate-500 mt-1">Total: {oldCuotas?.total || 0}€</p>
            </div>
            <div className="px-3 text-orange-600">→</div>
            <div className="flex-1 text-right">
              <p className="text-slate-500 text-xs uppercase font-medium">Categoría nueva</p>
              <p className="font-bold text-orange-700">{newCategory}</p>
              <p className="text-xs text-slate-500 mt-1">Total: {newCuotas?.total || 0}€</p>
            </div>
          </div>
        </div>

        {/* Cuotas que cambiarán */}
        {recalculable.length > 0 ? (
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Cuotas pendientes a actualizar ({recalculable.length})
            </h4>
            <div className="border rounded-lg divide-y">
              {recalculable.map((r) => (
                <div key={r.payment.id} className="p-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{r.payment.mes}</p>
                    <p className="text-xs text-slate-500">{r.payment.tipo_pago}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 line-through">{r.oldAmount}€</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-bold text-orange-700">{r.newAmount}€</span>
                    <Badge variant={r.diff > 0 ? "destructive" : "default"} className={r.diff > 0 ? "" : "bg-green-600"}>
                      {r.diff > 0 ? '+' : ''}{r.diff}€
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center justify-between text-sm">
              <span className="font-medium text-orange-900">Total pendiente</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 line-through">{totalPendienteAntes}€</span>
                <span>→</span>
                <span className="font-bold text-orange-700 text-base">{totalPendienteDespues}€</span>
                <Badge variant={diffTotal > 0 ? "destructive" : "default"} className={diffTotal > 0 ? "" : "bg-green-600"}>
                  {diffTotal > 0 ? '+' : ''}{diffTotal}€
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No hay cuotas pendientes que requieran recálculo (o los importes ya coinciden con la nueva categoría).
            </AlertDescription>
          </Alert>
        )}

        {/* Cuotas congeladas (ya pagadas o en revisión) */}
        {frozen.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-slate-500" />
              No se tocarán ({frozen.length})
            </h4>
            <div className="bg-slate-50 border rounded-lg divide-y">
              {frozen.map((f) => (
                <div key={f.payment.id} className="p-2 flex items-center justify-between text-xs">
                  <span className="text-slate-700">{f.payment.mes} — {f.payment.cantidad}€</span>
                  <Badge variant="outline" className="text-xs">
                    {f.payment.estado}
                  </Badge>
                </div>
              ))}
            </div>
            {totalPagado > 0 && oldCategory && newCategory && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 text-xs">
                  Ya hay <strong>{totalPagado}€</strong> cobrados con la categoría anterior. Si hay diferencia con la nueva, puedes regularizarla manualmente desde "Ajuste de cuota" en el perfil del jugador.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Planes especiales ignorados */}
        {skipped.length > 0 && (
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-xs">
              Hay {skipped.length} cuota{skipped.length !== 1 ? 's' : ''} de tipo <strong>plan personalizado</strong> que no se modifican automáticamente. Edítalas a mano si es necesario.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleSkip} disabled={applying}>
            No, dejar como está
          </Button>
          <Button
            onClick={handleApply}
            disabled={applying || recalculable.length === 0}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {applying ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Actualizando...</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" />Actualizar {recalculable.length} cuota{recalculable.length !== 1 ? 's' : ''}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}