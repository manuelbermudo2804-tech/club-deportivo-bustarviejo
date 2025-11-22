import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

import ParentPaymentForm from "../payments/ParentPaymentForm";

/**
 * Componente que integra el flujo de renovación con el pago
 * Pre-rellena datos del jugador y guía al padre a través del proceso
 */
export default function RenewalWithPayment({ 
  player, 
  selectedCategory, 
  onRenewalComplete,
  seasonConfig 
}) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const getCuotasPorCategoria = (categoria) => {
    const CUOTAS = {
      "Fútbol Aficionado": { inscripcion: 165, segunda: 100, tercera: 95, total: 360 },
      "Fútbol Juvenil": { inscripcion: 135, segunda: 100, tercera: 95, total: 330 },
      "Fútbol Cadete": { inscripcion: 135, segunda: 100, tercera: 95, total: 330 },
      "Fútbol Infantil (Mixto)": { inscripcion: 115, segunda: 83, tercera: 83, total: 281 },
      "Fútbol Alevín (Mixto)": { inscripcion: 115, segunda: 83, tercera: 83, total: 281 },
      "Fútbol Benjamín (Mixto)": { inscripcion: 100, segunda: 75, tercera: 75, total: 250 },
      "Fútbol Pre-Benjamín (Mixto)": { inscripcion: 100, segunda: 75, tercera: 75, total: 250 },
      "Fútbol Femenino": { inscripcion: 135, segunda: 100, tercera: 95, total: 330 },
      "Baloncesto (Mixto)": { inscripcion: 50, segunda: 50, tercera: 50, total: 150 }
    };
    return CUOTAS[categoria] || { inscripcion: 0, segunda: 0, tercera: 0, total: 0 };
  };

  const cuotas = getCuotasPorCategoria(selectedCategory);

  const handleRenewWithoutPayment = async () => {
    setIsProcessing(true);
    try {
      await base44.entities.Player.update(player.id, {
        ...player,
        deporte: selectedCategory,
        estado_renovacion: "renovado",
        fecha_renovacion: new Date().toISOString(),
        activo: true
      });

      // Notificar al admin
      try {
        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo - Sistema de Renovaciones",
          to: "cdbustarviejo@gmail.com",
          subject: `✅ Renovación Completada - ${player.nombre}`,
          body: `
            <h2>Renovación Completada (Sin Pago Inmediato)</h2>
            <p><strong>Jugador:</strong> ${player.nombre}</p>
            <p><strong>Categoría Anterior:</strong> ${player.deporte}</p>
            <p><strong>Categoría Nueva:</strong> ${selectedCategory}</p>
            <p><strong>Email Padre:</strong> ${player.email_padre}</p>
            <p><strong>Temporada:</strong> ${seasonConfig?.temporada}</p>
            <hr>
            <p><strong>Estado:</strong> Renovado ✅</p>
            <p><em>El padre ha confirmado la renovación pero aún no ha registrado el pago. Recordar seguimiento.</em></p>
          `
        });
      } catch (emailError) {
        console.error("Error enviando email al admin:", emailError);
      }

      toast.success("✅ Jugador renovado correctamente");
      onRenewalComplete();
    } catch (error) {
      console.error("Error renovando jugador:", error);
      toast.error("Error al renovar el jugador");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSubmit = async (paymentData) => {
    setIsProcessing(true);
    try {
      // 1. Crear el pago
      await base44.entities.Payment.create(paymentData);

      // 2. Renovar el jugador
      await base44.entities.Player.update(player.id, {
        ...player,
        deporte: selectedCategory,
        estado_renovacion: "renovado",
        fecha_renovacion: new Date().toISOString(),
        activo: true
      });

      // 3. Notificar al admin sobre renovación + pago
      try {
        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo - Sistema de Renovaciones",
          to: "cdbustarviejo@gmail.com",
          subject: `✅ Renovación + Pago Registrado - ${player.nombre}`,
          body: `
            <h2>Renovación Completada con Pago</h2>
            <p><strong>Jugador:</strong> ${player.nombre}</p>
            <p><strong>Categoría Anterior:</strong> ${player.deporte}</p>
            <p><strong>Categoría Nueva:</strong> ${selectedCategory}</p>
            <p><strong>Email Padre:</strong> ${player.email_padre}</p>
            <p><strong>Temporada:</strong> ${seasonConfig?.temporada}</p>
            <hr>
            <h3>Detalles del Pago</h3>
            <p><strong>Tipo:</strong> ${paymentData.tipo_pago}</p>
            <p><strong>Mes:</strong> ${paymentData.mes}</p>
            <p><strong>Cantidad:</strong> ${paymentData.cantidad}€</p>
            <p><strong>Método:</strong> ${paymentData.metodo_pago}</p>
            <p><strong>Fecha:</strong> ${paymentData.fecha_pago}</p>
            <p><strong>Justificante:</strong> <a href="${paymentData.justificante_url}">Ver justificante</a></p>
            <hr>
            <p><strong>Estado:</strong> Renovado ✅ | Pago: En revisión 🟠</p>
          `
        });
      } catch (emailError) {
        console.error("Error enviando email al admin:", emailError);
      }

      toast.success("✅ Renovación y pago registrados correctamente");
      onRenewalComplete();
    } catch (error) {
      console.error("Error en renovación con pago:", error);
      toast.error("Error al procesar la renovación");
    } finally {
      setIsProcessing(false);
    }
  };

  if (showPaymentForm) {
    return (
      <Card className="border-2 border-orange-300 shadow-xl">
        <CardHeader className="bg-orange-50 border-b">
          <CardTitle className="text-xl flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pago de Inscripción - {player.nombre}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert className="bg-blue-50 border-blue-300 mb-6">
            <AlertDescription className="text-blue-900">
              <p className="font-semibold mb-2">💡 Información de Pago</p>
              <p className="text-sm">
                Completa el pago de la inscripción para la temporada {seasonConfig?.temporada}.
                Una vez procesado, el jugador quedará activo automáticamente.
              </p>
            </AlertDescription>
          </Alert>

          <ParentPaymentForm
            players={[player]}
            payments={[]}
            onSubmit={handlePaymentSubmit}
            onCancel={() => setShowPaymentForm(false)}
            isSubmitting={isProcessing}
            preselectedPlayerId={player.id}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-green-300 bg-green-50">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-green-900 font-bold text-lg mb-2">
                ✅ Renovación Confirmada
              </p>
              <p className="text-green-800 text-sm">
                Has confirmado que <strong>{player.nombre}</strong> continuará en <strong>{selectedCategory}</strong> para la temporada {seasonConfig?.temporada}.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border-2 border-green-200">
              <p className="text-sm text-slate-700 font-semibold mb-2">
                📊 Cuotas para {selectedCategory}:
              </p>
              <div className="space-y-1 text-sm text-slate-600">
                <p>• <strong>Pago Único:</strong> {cuotas.total}€ (todo el año)</p>
                <p>• <strong>3 Pagos:</strong> {cuotas.inscripcion}€ (Jun) + {cuotas.segunda}€ (Sep) + {cuotas.tercera}€ (Dic)</p>
              </div>
            </div>

            <Alert className="bg-orange-50 border-orange-300">
              <AlertDescription className="text-orange-900">
                <p className="font-semibold mb-1">💳 Opciones de Pago</p>
                <p className="text-sm">
                  Puedes pagar ahora mismo o hacerlo más tarde desde la sección de pagos.
                  <strong className="block mt-1">Recomendamos completar el pago cuanto antes para asegurar la plaza.</strong>
                </p>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <Button
                onClick={() => setShowPaymentForm(true)}
                className="bg-orange-600 hover:bg-orange-700 h-12"
                disabled={isProcessing}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                💳 Pagar Ahora
              </Button>
              
              <Button
                onClick={handleRenewWithoutPayment}
                variant="outline"
                className="h-12 border-2 border-green-400"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Pagaré Después
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-slate-500 text-center pt-2">
              Si eliges "Pagaré Después", podrás hacer el pago desde la sección de Pagos
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}