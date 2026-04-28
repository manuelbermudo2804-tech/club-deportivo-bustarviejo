import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import RenewalPaymentFlow from "./RenewalPaymentFlow";

const CATEGORIAS = [
  "Fútbol Pre-Benjamín (Mixto)", "Fútbol Benjamín (Mixto)", "Fútbol Alevín (Mixto)",
  "Fútbol Infantil (Mixto)", "Fútbol Cadete", "Fútbol Juvenil",
  "Fútbol Aficionado", "Fútbol Femenino", "Baloncesto (Mixto)"
];

const suggestAge = (birthDate) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const suggestCategory = (birthDate) => {
  const age = suggestAge(birthDate);
  if (age === null) return "Fútbol Aficionado";
  if (age <= 7) return "Fútbol Pre-Benjamín (Mixto)";
  if (age <= 9) return "Fútbol Benjamín (Mixto)";
  if (age <= 11) return "Fútbol Alevín (Mixto)";
  if (age <= 13) return "Fútbol Infantil (Mixto)";
  if (age <= 15) return "Fútbol Cadete";
  if (age <= 18) return "Fútbol Juvenil";
  return "Fútbol Aficionado";
};

export default function PlayerRenewalBanner({ player, seasonConfig }) {
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const queryClient = useQueryClient();

  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ['categoryConfigsRenewal'],
    queryFn: () => base44.entities.CategoryConfig.list(),
    staleTime: 600000,
    enabled: showPaymentFlow,
  });

  const renewMutation = useMutation({
    mutationFn: async ({ paymentsData }) => {
      // ✅ Renovación vía backend (RLS estricto: jugadores no pueden tocar estado_renovacion/activo)
      const paymentsWithCategory = (paymentsData.payments || []).map(p => ({
        ...p,
        jugador_id: player.id,
        jugador_nombre: player.nombre,
      }));
      const { data: result } = await base44.functions.invoke('playerRenewalAction', {
        action: 'renew',
        playerId: player.id,
        playerData: {
          deporte: paymentsData.newCategory,
          categoria_principal: paymentsData.newCategory,
        },
        payments: paymentsWithCategory,
        temporada: seasonConfig.temporada
      });
      if (!result?.success) {
        throw new Error(result?.error || 'Error al renovar');
      }
      const emailTo = player.email_jugador || player.email_padre;
      if (emailTo) {
        try {
          await base44.functions.invoke('sendEmail', {
            to: emailTo,
            subject: `✅ Renovación Confirmada - ${player.nombre} - Temporada ${seasonConfig.temporada}`,
            html: `¡Hola ${player.nombre}!<br/><br/>Tu renovación ha sido procesada correctamente.<br/><br/>📋 Categoría: ${paymentsData.newCategory}<br/>💳 Modalidad: ${paymentsData.tipoPago}<br/><br/>Accede a "Pagos" en la app para registrar tus transferencias.<br/><br/>¡Gracias por seguir con nosotros!<br/>CD Bustarviejo`
          });
        } catch (e) { console.error('Error enviando email confirmación:', e); }
      }
      return paymentsData;
    },
    onSuccess: (paymentsData) => {
      queryClient.invalidateQueries({ queryKey: ['myPlayerProfile'] });
      queryClient.invalidateQueries({ queryKey: ['playerPayments'] });
      setSuccessData({
        player,
        newCategory: paymentsData.newCategory,
        tipoPago: paymentsData.tipoPago,
        cuotasGeneradas: paymentsData.payments,
        descuentoHermano: 0
      });
      setShowPaymentFlow(false);
      setShowSuccess(true);
    },
  });

  // No mostrar si no hay renovaciones activas o el jugador no está pendiente
  if (!seasonConfig?.permitir_renovaciones) return null;
  if (!player) return null;
  if (player.estado_renovacion !== "pendiente") return null;
  if (player.temporada_renovacion !== seasonConfig?.temporada) return null;

  const suggestedCat = suggestCategory(player.fecha_nacimiento);

  // Block parent from renewing if player turns 18 for next season
  const playerAge = suggestAge(player.fecha_nacimiento);
  const isPlayerTurning18 = playerAge !== null && playerAge >= 17 && suggestedCat === "Fútbol Aficionado";

  // Check if this is a parent trying to renew (not the player themselves)
  // If the player has no email_jugador with authorized access, and they're turning 18, block it
  const isParentView = !player.acceso_jugador_autorizado;
  const shouldBlockRenewal = isPlayerTurning18 && isParentView && !player.es_mayor_edad;

  if (shouldBlockRenewal) {
    return (
      <Card className="border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 shadow-xl animate-fade-in">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-amber-900 text-lg">🎂 {player.nombre?.split(" ")[0]} cumple 18 años</p>
                <Badge className="bg-amber-600 text-white text-xs">MAYOR DE EDAD</Badge>
              </div>
              <p className="text-sm text-amber-800">
                Como <strong>{player.nombre?.split(" ")[0]}</strong> es mayor de edad para la próxima temporada, 
                debe inscribirse <strong>por su cuenta</strong>. Tú ya no puedes renovar su plaza.
              </p>
              <div className="mt-3 bg-amber-100 rounded-lg p-3 border border-amber-300">
                <p className="text-xs text-amber-800">
                  <strong>¿Qué ocurrirá?</strong> El admin del club procesará las transiciones de mayores de edad 
                  y {player.nombre?.split(" ")[0]} recibirá una invitación a su email para gestionar su propia cuenta 
                  (pagos, convocatorias, firmas…).
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showSuccess && successData) {
    return (
      <Card className="border-4 border-green-500 shadow-2xl animate-fade-in">
        <CardContent className="pt-8 space-y-6 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-900">✅ ¡Renovación Completada!</h2>
          <p className="text-slate-700">
            Tu plaza ha sido renovada para la temporada <strong>{seasonConfig.temporada}</strong>.
          </p>
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 text-left">
            <p className="font-bold text-blue-900 mb-2">📋 Resumen:</p>
            <div className="space-y-1 text-sm text-blue-800">
              <p>✅ Categoría: <strong>{successData.newCategory}</strong></p>
              <p>💳 Modalidad: <strong>{successData.tipoPago}</strong></p>
              <p>📊 Cuotas generadas: <strong>{successData.cuotasGeneradas.length}</strong></p>
            </div>
          </div>
          <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
            <p className="text-sm text-orange-800">
              💡 <strong>Próximo paso:</strong> Ve a "Pagos" para registrar tus transferencias.
            </p>
          </div>
          <Button
            onClick={() => {
              setShowSuccess(false);
              window.location.reload();
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
          >
            ✅ Entendido
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showPaymentFlow) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
        <div className="max-w-2xl w-full my-8">
          <RenewalPaymentFlow
            player={player}
            newCategory={suggestedCat}
            seasonConfig={seasonConfig}
            categoryConfigs={categoryConfigs}
            allPlayers={[player]}
            onComplete={(data) => renewMutation.mutate({ paymentsData: data })}
            onCancel={() => setShowPaymentFlow(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <Card className="border-2 border-red-400 bg-gradient-to-r from-red-50 to-orange-50 shadow-xl animate-fade-in">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-700 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold text-red-900 text-lg">🔄 Renovación Pendiente</p>
              <Badge className="bg-red-600 text-white text-xs">ACCIÓN REQUERIDA</Badge>
            </div>
            <p className="text-sm text-red-800">
              Tu plaza para la temporada <strong>{seasonConfig.temporada}</strong> está pendiente de renovar. 
              Si no renuevas, perderás el acceso al club.
            </p>
            <p className="text-xs text-red-700 mt-1">
              Categoría sugerida: <strong>{suggestedCat}</strong>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowPaymentFlow(true)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-12"
            disabled={renewMutation.isPending}
          >
            {renewMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</>
            ) : (
              <><CheckCircle2 className="w-5 h-5 mr-2" />✅ Renovar Mi Plaza</>
            )}
          </Button>
        </div>

        {seasonConfig.fecha_limite_renovaciones && (
          <p className="text-xs text-red-600 text-center">
            ⏰ Fecha límite: <strong>{new Date(seasonConfig.fecha_limite_renovaciones).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</strong>
          </p>
        )}
      </CardContent>
    </Card>
  );
}