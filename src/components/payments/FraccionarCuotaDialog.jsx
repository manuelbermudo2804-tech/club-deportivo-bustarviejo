import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarClock, Info } from "lucide-react";
import { toast } from "sonner";
import { getCuotasPorCategoria, FECHAS_VENCIMIENTO } from "./paymentAmounts";

// Reparte el importe del pago único entre las 3 cuotas oficiales de su categoría,
// manteniendo la proporción y cuadrando el total exacto al céntimo.
export const calcularTresCuotas = (cuotas, importeTotal) => {
  const totalOficial = (cuotas.inscripcion || 0) + (cuotas.segunda || 0) + (cuotas.tercera || 0);
  if (!totalOficial) return null;
  const factor = importeTotal / totalOficial;
  const junio = Math.round((cuotas.inscripcion || 0) * factor);
  const septiembre = Math.round((cuotas.segunda || 0) * factor);
  const diciembre = Math.round((importeTotal - junio - septiembre) * 100) / 100;
  return [
    { mes: "Junio", cantidad: junio },
    { mes: "Septiembre", cantidad: septiembre },
    { mes: "Diciembre", cantidad: diciembre },
  ];
};

export default function FraccionarCuotaDialog({ open, onOpenChange, player, pagoUnico, onDone }) {
  const [cuotas, setCuotas] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const categoria = player?.categoria_principal || player?.deporte;
    getCuotasPorCategoria(categoria).then(setCuotas).catch(() => setCuotas(null));
  }, [open, player?.id]);

  const importeTotal = pagoUnico?.cantidad || 0;
  const plan = cuotas ? calcularTresCuotas(cuotas, importeTotal) : null;

  const handleConfirm = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const nota = `Fraccionado desde pago único (${importeTotal}€) por ${user?.email} el ${new Date().toLocaleDateString('es-ES')}`;
      await base44.entities.Payment.bulkCreate(plan.map(c => ({
        jugador_id: player.id,
        jugador_nombre: player.nombre,
        email_padre: player.email_padre || undefined,
        email_tutor_2: player.email_tutor_2 || undefined,
        tipo_pago: "Tres meses",
        mes: c.mes,
        temporada: pagoUnico.temporada,
        cantidad: c.cantidad,
        estado: "Pendiente",
        metodo_pago: "Transferencia",
        notas: nota,
      })));
      await base44.entities.Payment.delete(pagoUnico.id);
      toast.success("Cuota fraccionada en 3 pagos");
      onOpenChange(false);
      if (onDone) onDone();
    } catch (e) {
      toast.error("No se pudo fraccionar la cuota");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-blue-600" />
            Fraccionar en 3 cuotas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            <strong>{player?.nombre}</strong> pasará de un pago único de{" "}
            <strong>{importeTotal}€</strong> a tres cuotas:
          </p>

          {!plan ? (
            <p className="text-sm text-slate-500">Calculando importes…</p>
          ) : (
            <div className="border rounded-xl divide-y">
              {plan.map(c => (
                <div key={c.mes} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{c.mes}</p>
                    <p className="text-xs text-slate-500">Límite: {FECHAS_VENCIMIENTO[c.mes]}</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900">{c.cantidad}€</p>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50">
                <span className="text-xs font-semibold text-slate-600">Total</span>
                <span className="text-sm font-bold text-slate-900">{importeTotal}€</span>
              </div>
            </div>
          )}

          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription className="text-xs">
              La familia verá las tres cuotas pendientes en su panel y recibirá los recordatorios
              automáticos de cada mes. El total no cambia.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleConfirm} disabled={saving || !plan}>
              {saving ? "Aplicando…" : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}