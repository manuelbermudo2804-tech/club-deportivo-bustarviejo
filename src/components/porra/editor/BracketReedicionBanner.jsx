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

/**
 * Banner que aparece SOBRE el editor del bracket explicando la re-edición
 * tras el rediseño FIFA 2026 (octavos→final con cruces oficiales).
 * - Si bracket_reeditado=false → muestra aviso + botón "Confirmar y cerrar bracket"
 * - Si bracket_reeditado=true  → muestra estado cerrado
 */
export default function BracketReedicionBanner({ participante, onConfirmar, saving }) {
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

  return (
    <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 mb-3">
      <CardContent className="p-4">
        <div className="flex items-start gap-2 mb-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-amber-900">⚠️ Re-edición única del bracket</p>
            <p className="text-amber-800 text-xs mt-1 leading-relaxed">
              Hemos actualizado los cruces de <strong>octavos hasta la final</strong> al formato oficial FIFA 2026.
              Revisa y ajusta tus predicciones del bracket. Cuando estés conforme, pulsa <strong>"Confirmar y cerrar bracket"</strong> — solo podrás hacerlo <strong>UNA vez</strong>.
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              disabled={saving || confirming}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold"
            >
              {(saving || confirming) ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando…</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar y cerrar bracket</>
              )}
            </Button>
          </AlertDialogTrigger>
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
      </CardContent>
    </Card>
  );
}