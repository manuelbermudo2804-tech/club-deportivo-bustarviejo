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
                <h3 className="font-bold text-red-900">Cuota pendiente: fuera de convocatorias</h3>
                <p className="text-sm text-red-800 mt-1">
                  Estimada familia: la cuota de <strong>{nombres(bloqueados)}</strong> continúa pendiente de pago.
                  Según lo establecido por el club, {bloqueados.length > 1 ? "no podrán ser convocados" : "no podrá ser convocado/a"} para
                  los partidos hasta que la situación quede regularizada. Una vez abonada, {bloqueados.length > 1 ? "se incorporarán" : "se incorporará"} de
                  nuevo a las convocatorias con normalidad.
                </p>
              </div>
            )}

            {avisados.length > 0 && (
              <div>
                <h3 className="font-bold text-amber-900">Aviso de cuota pendiente</h3>
                <p className="text-sm text-amber-800 mt-1">
                  Estimada familia: les informamos de que la cuota de <strong>{nombres(avisados)}</strong> figura
                  como pendiente de pago. Les rogamos que regularicen la situación a la mayor brevedad. Si ya han
                  realizado el pago, pueden ignorar este aviso; se retirará en cuanto quede comprobado.
                </p>
              </div>
            )}

            <p className="text-xs text-slate-600">
              Si tienen dificultades para realizar el pago, pueden ponerse en contacto con el club en{" "}
              <a href="mailto:info@cdbustarviejo.com" className="underline font-medium">
                info@cdbustarviejo.com
              </a>{" "}
              para estudiar una solución.
            </p>
            <p className="text-xs font-semibold text-slate-700">Junta Directiva · CD Bustarviejo</p>

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