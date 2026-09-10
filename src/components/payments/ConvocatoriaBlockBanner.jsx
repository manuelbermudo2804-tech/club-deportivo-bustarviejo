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
                <h3 className="font-bold text-red-900">Cuota pendiente: participación en pausa</h3>
                <p className="text-sm text-red-800 mt-1">
                  Hola, os escribimos por <strong>{nombres(bloqueados)}</strong>. Mientras la cuota siga
                  pendiente, de momento no entrará en las convocatorias de partido. En cuanto quede
                  regularizada, vuelve a entrar con total normalidad. Gracias por vuestra comprensión.
                </p>
              </div>
            )}

            {avisados.length > 0 && (
              <div>
                <h3 className="font-bold text-amber-900">Recordatorio amable de cuota pendiente</h3>
                <p className="text-sm text-amber-800 mt-1">
                  Hola, nos consta una cuota pendiente de <strong>{nombres(avisados)}</strong>. Si ya la
                  habéis abonado, avisadnos y lo revisamos encantados. Muchas gracias.
                </p>
              </div>
            )}

            <p className="text-xs text-slate-600">
              Si en este momento os resulta difícil afrontar el pago, escribidnos con confianza y
              buscamos juntos la mejor solución. Estamos aquí para ayudaros:{" "}
              <a href="mailto:info@clubdeportivobustarviejo.com" className="underline font-medium">
                info@clubdeportivobustarviejo.com
              </a>{" "}
              o{" "}
              <a href="mailto:info@cdbustarviejo.com" className="underline font-medium">
                info@cdbustarviejo.com
              </a>
              .
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