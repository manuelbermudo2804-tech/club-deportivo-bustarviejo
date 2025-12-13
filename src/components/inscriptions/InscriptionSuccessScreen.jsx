import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CreditCard, ArrowRight, FileText, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import confetti from "canvas-confetti";

export default function InscriptionSuccessScreen({ 
  player, 
  tipoPago, 
  cuotasGeneradas,
  descuentoHermano,
  onClose 
}) {
  React.useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 }
    });
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-4 border-green-500 shadow-2xl animate-fade-in-scale">
        <CardContent className="pt-8 space-y-6 relative">
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </Button>

          <div className="text-center">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-14 h-14 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-green-900 mb-2">
              🎉 ¡Inscripción Completada!
            </h2>
            <p className="text-lg text-slate-700">
              <strong>{player.nombre}</strong> ha sido registrado correctamente
            </p>
          </div>

          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-5">
            <p className="font-bold text-blue-900 mb-3 text-center">📋 Resumen de la inscripción:</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-800">Categoría:</span>
                <strong className="text-blue-900">{player.deporte}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-800">Modalidad de pago:</span>
                <strong className="text-blue-900">{tipoPago}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-800">Cuotas generadas:</span>
                <strong className="text-blue-900">{cuotasGeneradas.length}</strong>
              </div>
              {descuentoHermano > 0 && (
                <div className="flex justify-between pt-2 border-t border-purple-200">
                  <span className="text-purple-700">🎉 Descuento hermano:</span>
                  <strong className="text-purple-700">-{descuentoHermano}€</strong>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 via-yellow-50 to-orange-50 border-2 border-orange-400 rounded-xl p-6 space-y-4">
            <p className="font-bold text-orange-900 text-center text-xl mb-4">
              🎯 ¿Qué hacer ahora?
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-white rounded-lg p-4 border-2 border-green-300">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">1</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-green-900 mb-1">✅ Inscripción registrada</p>
                  <p className="text-sm text-slate-700">El jugador está registrado en el sistema del club</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white rounded-lg p-4 border-2 border-orange-500 animate-pulse">
                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">2</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-orange-900 mb-1">💳 PAGAR LAS CUOTAS</p>
                  <p className="text-sm text-orange-800 mb-2">
                    Hemos generado {cuotasGeneradas.length} cuota(s) pendientes de pago
                  </p>
                  <div className="bg-orange-50 rounded p-2 space-y-1">
                    {cuotasGeneradas.map((cuota, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span>{cuota.mes}</span>
                        <strong className="text-orange-700">{cuota.cantidad}€</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white rounded-lg p-4 border-2 border-slate-300">
                <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">3</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 mb-1">📄 Completar documentación</p>
                  <p className="text-sm text-slate-700">DNI, firmas de federación, etc. (puedes hacerlo después)</p>
                </div>
              </div>
            </div>
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
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-base py-6">
                <CreditCard className="w-5 h-5 mr-2" />
                Ir a Pagar Ahora
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800 text-center">
              💡 <strong>Recuerda:</strong> Realiza la transferencia bancaria y luego registra el pago en la app subiendo el justificante
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}