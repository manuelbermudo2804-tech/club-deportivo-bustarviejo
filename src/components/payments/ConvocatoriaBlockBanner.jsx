import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CreditCard } from "lucide-react";
import { getOverduePlayerIds } from "../callups/usePaymentBlockCheck";

/**
 * Banner para familias: avisa de que un jugador puede quedarse fuera de las
 * convocatorias por tener una cuota vencida.
 *
 * - ROJO: la cuota ya superó los días de gracia → ya no entra en convocatorias.
 * - ÁMBAR: la cuota está vencida pero aún dentro de los días de gracia (aviso preventivo).
 *
 * Solo se muestra si el club tiene activado el bloqueo por impago.
 */
export default function ConvocatoriaBlockBanner({ players = [], payments = [], seasonConfig }) {
  if (seasonConfig?.bloqueo_convocatorias_impago !== true) return null;
  if (!players.length) return null;

  const diasGracia = seasonConfig?.dias_gracia_convocatoria ?? 14;
  const blockedIds = getOverduePlayerIds(players, payments, diasGracia);
  const vencidosIds = getOverduePlayerIds(players, payments, 0);
  const enRiesgoIds = new Set([...vencidosIds].filter((id) => !blockedIds.has(id)));

  if (blockedIds.size === 0 && enRiesgoIds.size === 0) return null;

  const nombres = (ids) =>
    players.filter((p) => ids.has(p.id)).map((p) => p.nombre).join(", ");

  const isBlocked = blockedIds.size > 0;

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
                <h3 className="font-bold text-red-900">Cuota vencida — no entra en las convocatorias</h3>
                <p className="text-sm text-red-800 mt-1">
                  <strong>{nombres(blockedIds)}</strong> tiene una cuota vencida, por lo que
                  de momento <strong>no se le está incluyendo en las convocatorias de partido</strong>.
                  En cuanto se regularice el pago (o subas el justificante), vuelve a entrar con normalidad.
                </p>
              </div>
            )}

            {enRiesgoIds.size > 0 && (
              <div>
                <h3 className={`font-bold ${isBlocked ? "text-amber-900" : "text-amber-900"}`}>
                  Cuota vencida — riesgo de quedarse fuera
                </h3>
                <p className="text-sm text-amber-800 mt-1">
                  <strong>{nombres(enRiesgoIds)}</strong> tiene una cuota vencida. Si no se
                  regulariza en los próximos días, dejará de entrar en las convocatorias de partido.
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