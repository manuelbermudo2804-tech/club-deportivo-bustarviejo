import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ArrowRight, Gift, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import confetti from "canvas-confetti";

export default function RenewalSuccessScreen({ 
  player, 
  newCategory, 
  tipoPago, 
  cuotasGeneradas,
  descuentoHermano,
  onClose 
}) {
  React.useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="max-w-2xl w-full border-4 border-green-500 shadow-2xl my-8">
        <CardContent className="pt-8 space-y-6">
          
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-green-900 mb-2">
              ✅ ¡Renovación Completada!
            </h2>
            <p className="text-lg text-slate-700">
              <strong>{player.nombre}</strong> ha sido renovado para la nueva temporada
            </p>
          </div>

          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
            <p className="font-bold text-blue-900 mb-2">📋 Resumen de la renovación:</p>
            <div className="space-y-1 text-sm text-blue-800">
              <p>✅ Categoría: <strong>{newCategory}</strong></p>
              <p>💳 Modalidad: <strong>{tipoPago}</strong></p>
              <p>📊 Cuotas generadas: <strong>{cuotasGeneradas.length}</strong></p>
              {descuentoHermano > 0 && (
                <p className="text-purple-700">🎉 Descuento hermano: <strong>-{descuentoHermano}€</strong></p>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-400 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-bold">1</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-orange-900 text-lg mb-1">✅ Jugador renovado</p>
                <p className="text-sm text-orange-800">El estado del jugador ha sido actualizado y está activo para la nueva temporada</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                <span className="text-white text-xl font-bold">2</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-orange-900 text-lg mb-1">💳 Ahora debes pagar las cuotas</p>
                <p className="text-sm text-orange-800 mb-3">
                  Hemos creado {cuotasGeneradas.length} cuota(s) con estado <strong>"Pendiente"</strong>. 
                  Debes realizar las transferencias y registrar los pagos en la app.
                </p>
                
                <div className="bg-white rounded-lg p-3 border-2 border-orange-300 space-y-2">
                  <p className="text-xs font-bold text-slate-900">Cuotas pendientes de pago:</p>
                  {cuotasGeneradas.map((cuota, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm border-b last:border-0 pb-1.5 last:pb-0">
                      <span className="text-slate-700">{cuota.mes}</span>
                      <span className="font-bold text-orange-700">{cuota.cantidad}€</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
            <p className="text-sm text-green-800 text-center">
              💡 <strong>Próximo paso:</strong> Ve a la sección de <strong>"Pagos"</strong> para registrar cada transferencia cuando la realices
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cerrar
            </Button>
            <Link to={createPageUrl("ParentPayments")} className="flex-1">
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold">
                <CreditCard className="w-4 h-4 mr-2" />
                Ir a Pagar Ahora
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}