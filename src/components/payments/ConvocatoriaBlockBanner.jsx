import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CreditCard } from "lucide-react";

/**
 * Banner para familias, activado MANUALMENTE por el club jugador a jugador:
 *
 * - aviso_impago_activo        → ÁMBAR: recordatorio de que hay cuota pendiente.
 * - bloqueo_convocatoria_activo → ROJO: no entra en convocatorias hasta estar al corriente.
 *
 * Si el jugador está al corriente (ningún interruptor activado) no se muestra nada.
 */
export default function ConvocatoriaBlockBanner({ players = [] }) {
  const bloqueados = players.filter((p) => p.bloqueo_convocatoria_activo === true);
  const avisados = players.filter(
    (p) => p.aviso_impago_activo === true && p.bloqueo_convocatoria_activo !== true
  );

  if (bloqueados.length === 0 && avisados.length === 0) return null;

  const nombres = (list) => list.map((p) => p.nombre).join(", ");
  const isBlocked = bloqueados.length > 0;

  return (
    <Card className={`border-2 shadow-lg ${isBlocked ? "border-red-400 bg-red-50" : "border-amber-400 bg-amber-50"}`}>
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          {isBlocked ? (
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          ) : (
            <Clock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 space-y-3">
            {isBlocked && (
              <div>
                <h3 className="font-bold text-red-900">No entra en las convocatorias</h3>
                <p className="text-sm text-red-800 mt-1">
                  <strong>{nombres(bloqueados)}</strong>: hasta que no esté al corriente de pago
                  <strong> no entrará en las convocatorias de partido</strong>. En cuanto se
                  regularice la cuota, vuelve a entrar con normalidad.
                </p>
              </div>
            )}

            {avisados.length > 0 && (
              <div>
                <h3 className="font-bold text-amber-900">Recordatorio de cuota pendiente</h3>
                <p className="text-sm text-amber-800 mt-1">
                  <strong>{nombres(avisados)}</strong> tiene una cuota pendiente. Por favor,
                  regularízala para evitar quedarse fuera de las convocatorias.
                </p>
              </div>
            )}

            <p className="text-xs text-slate-600">
              Si tenéis alguna dificultad para pagar, escribidnos: buscamos una solución
              (plan de pago o beca). No habléis de esto con el entrenador, él no gestiona los pagos.
            </p>

            <Link to={createPageUrl("ParentPayments")}>
              <Button className={isBlocked ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}>
                <CreditCard className="w-4 h-4 mr-2" />
                Ver y pagar mis cuotas
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}