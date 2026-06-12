import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import CountdownTimer from "@/components/porra/CountdownTimer";

/**
 * Banner que aparece SOBRE el editor del bracket explicando la re-edición
 * tras el rediseño FIFA 2026 (octavos→final con cruces oficiales).
 * - Si bracket_reeditado=false → muestra aviso + botón "Confirmar y cerrar bracket"
 * - Si bracket_reeditado=true  → muestra estado cerrado
 */
export default function BracketReedicionBanner({ participante, onConfirmar, saving, fechaLimite }) {
  const [confirming, setConfirming] = useState(false);
  const yaCerrado = !!participante?.bracket_reeditado;

  if (yaCerrado) {
    return (
      <Card className="border-2 border-green-300 bg-green-50 mb-3">
        <CardContent className="p-3 flex items-start gap-2">
          <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-green-900">🔒 Bracket confirmado y cerrado</p>
            <p className="text-green-800 text-xs mt-0.5">
              Tu bracket queda guardado con los cruces oficiales del Mundial 2026. Empezará a sumar puntos cuando se jueguen los partidos.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleConfirm = async () => {
    setConfirming(true);
    const res = await onConfirmar();
    setConfirming(false);
    if (res?.ok) {
      toast.success('✅ Bracket confirmado y cerrado');
    } else {
      toast.error(res?.error || 'No se pudo confirmar');
    }
  };

  const fechaTxt = fechaLimite ? new Date(fechaLimite).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long'
  }) : null;
  const horaTxt = fechaLimite ? new Date(fechaLimite).toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid'
  }) : null;

  const ConfirmDialog = ({ children }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cerrar el bracket definitivamente?</AlertDialogTitle>
          <AlertDialogDescription>
            Tu bracket quedará bloqueado y <strong>no podrás volver a tocarlo</strong>. Asegúrate de haber rellenado todos los cruces (octavos, cuartos, semis, final y 3er puesto).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
            Sí, cerrar bracket
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <>
      {/* Banner principal arriba del bracket */}
      <Card className="border-4 border-red-500 bg-gradient-to-br from-amber-50 to-orange-100 mb-3 shadow-xl ring-4 ring-red-200 animate-pulse-strong">
        <CardContent className="p-4">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm flex-1">
              <p className="font-black text-red-900 text-base uppercase tracking-wide">
                🚨 ACCIÓN OBLIGATORIA — Confirma tu bracket
              </p>
              <p className="text-amber-900 text-sm mt-2 leading-relaxed">
                Hemos actualizado los cruces de <strong>octavos hasta la final</strong> al formato oficial FIFA 2026.
                Revisa tus predicciones y, cuando estés conforme, <strong>PULSA EL BOTÓN VERDE de abajo</strong>.
              </p>
              <p className="text-red-800 text-sm mt-2 leading-relaxed font-bold">
                ⚠️ Si no lo pulsas, tu bracket NO se cierra y NO sumará puntos.
              </p>
              {fechaLimite && (
                <p className="text-amber-900 text-xs mt-2 leading-relaxed">
                  Plazo: hasta el <strong>{fechaTxt} a las {horaTxt}h</strong>.
                </p>
              )}
              {fechaLimite && (
                <div className="mt-2">
                  <CountdownTimer targetDate={fechaLimite} variant="light" label="Tiempo restante" />
                </div>
              )}
            </div>
          </div>

          <ConfirmDialog>
            <Button
              disabled={saving || confirming}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-black text-base md:text-lg py-6 shadow-lg ring-2 ring-green-300 animate-pulse-strong"
            >
              {(saving || confirming) ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Guardando…</>
              ) : (
                <><CheckCircle2 className="w-6 h-6 mr-2" /> CONFIRMAR Y CERRAR MI BRACKET</>
              )}
            </Button>
          </ConfirmDialog>
          <p className="text-center text-xs text-slate-600 mt-2">
            👆 Sin pulsar este botón, tu bracket no queda guardado oficialmente
          </p>
        </CardContent>
      </Card>
    </>
  );
}