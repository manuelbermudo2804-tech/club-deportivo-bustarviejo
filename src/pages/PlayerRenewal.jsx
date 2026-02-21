import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, AlertTriangle, Users, UserPlus, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import RenewalPaymentFlow from "../components/renewals/RenewalPaymentFlow";
import RenewalSuccessScreen from "../components/renewals/RenewalSuccessScreen";

const CATEGORIAS = [
  "Fútbol Pre-Benjamín (Mixto)",
  "Fútbol Benjamín (Mixto)",
  "Fútbol Alevín (Mixto)",
  "Fútbol Infantil (Mixto)",
  "Fútbol Cadete",
  "Fútbol Juvenil",
  "Fútbol Aficionado",
  "Fútbol Femenino",
  "Baloncesto (Mixto)"
];

const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const willBe18NextSeason = (birthDate) => {
  if (!birthDate) return false;
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  const nextSeasonStart = new Date(year, 6, 1);
  const birth = new Date(birthDate);
  let age = nextSeasonStart.getFullYear() - birth.getFullYear();
  const m = nextSeasonStart.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && nextSeasonStart.getDate() < birth.getDate())) age--;
  return age >= 18;
};

const suggestCategory = (birthDate) => {
  const age = calculateAge(birthDate);
  
  // Pre-Benjamín (6-7 años) - También incluye 4-5 años al no existir Chupetín
  if (age <= 7) return "Fútbol Pre-Benjamín (Mixto)";
  // Benjamín (8-9 años)
  if (age <= 9) return "Fútbol Benjamín (Mixto)";
  // Alevín (10-11 años)
  if (age <= 11) return "Fútbol Alevín (Mixto)";
  // Infantil (12-13 años)
  if (age <= 13) return "Fútbol Infantil (Mixto)";
  // Cadete (14-15 años)
  if (age <= 15) return "Fútbol Cadete";
  // Juvenil (16-18 años)
  if (age <= 18) return "Fútbol Juvenil";
  // Aficionado (19+ años)
  return "Fútbol Aficionado";
};

export default function PlayerRenewal() {
  const [user, setUser] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ open: false, playerId: null, action: null });
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [selectedPlayerForPayment, setSelectedPlayerForPayment] = useState(null);
  const [categoryConfigs, setCategoryConfigs] = useState([]);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });

  // Cargar configuración de categorías para precios
  useEffect(() => {
    const fetchCategoryConfigs = async () => {
      const configs = await base44.entities.CategoryConfig.list();
      setCategoryConfigs(configs);
    };
    fetchCategoryConfigs();
  }, []);

  const { data: players = [] } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => 
        (p.email_padre === user?.email || p.email_tutor_2 === user?.email) &&
        p.estado_renovacion === "pendiente" &&
        p.temporada_renovacion === seasonConfig?.temporada
      );
    },
    enabled: !!user?.email && !!seasonConfig?.temporada,
  });

  const renewPlayerMutation = useMutation({
    mutationFn: async ({ playerId, newCategory, paymentsData }) => {
      const player = players.find(p => p.id === playerId);
      
      // 1. Calcular descuento por hermano
      const hermanos = players.filter(p => 
        p.id !== playerId &&
        p.email_padre === player.email_padre &&
        (p.activo === true || p.estado_renovacion === "renovado")
      );

      const todosHermanos = [player, ...hermanos].map(p => ({
        id: p.id,
        fecha_nacimiento: p.fecha_nacimiento
      })).filter(p => p.fecha_nacimiento);

      todosHermanos.sort((a, b) => new Date(a.fecha_nacimiento) - new Date(b.fecha_nacimiento));
      const esMayor = todosHermanos[0]?.id === playerId;
      const descuentoAplicado = esMayor ? 0 : 25;

      // 2. Actualizar jugador
      await base44.entities.Player.update(playerId, {
        deporte: newCategory,
        estado_renovacion: "renovado",
        fecha_renovacion: new Date().toISOString(),
        activo: true,
        tiene_descuento_hermano: !esMayor,
        descuento_aplicado: descuentoAplicado,
        temporada_renovacion: seasonConfig?.temporada
      });

      // 3. Crear pagos automáticamente
      for (const payment of paymentsData.payments) {
        await base44.entities.Payment.create(payment);
      }

      // 4. Enviar email de confirmación
      await base44.integrations.Core.SendEmail({
        from_name: "CD Bustarviejo",
        to: player.email_padre,
        subject: `✅ Renovación Confirmada - ${player.nombre} - Temporada ${seasonConfig?.temporada}`,
        body: `¡Hola!

Tu renovación de ${player.nombre} ha sido procesada correctamente.

📋 DETALLES:
• Categoría: ${newCategory}
• Temporada: ${seasonConfig?.temporada}
• Modalidad de pago: ${paymentsData.tipoPago}
${descuentoAplicado > 0 ? `• Descuento hermano: -${descuentoAplicado}€\n` : ''}

💳 CUOTAS GENERADAS:
${paymentsData.payments.map(p => 
  `• ${p.mes}: ${p.cantidad}€ (vence ${p.mes === 'Junio' ? '30 junio' : p.mes === 'Septiembre' ? '15 sept' : '15 dic'})`
).join('\n')}

📲 Próximos pasos:
1. Accede a "Pagos" en la app
2. Registra cada pago cuando lo realices
3. Sube el justificante de transferencia

¡Gracias por confiar en el CD Bustarviejo!

Un saludo,
CD Bustarviejo`
      });

      return player;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      
      // Mostrar pantalla de éxito
      setSuccessData({
        player: players.find(p => p.id === variables.playerId),
        newCategory: variables.newCategory,
        tipoPago: variables.paymentsData.tipoPago,
        cuotasGeneradas: variables.paymentsData.payments,
        descuentoHermano: variables.paymentsData.descuentoHermano
      });
      setShowSuccessScreen(true);
      
      setConfirmDialog({ open: false, playerId: null, action: null });
      setShowPaymentFlow(false);
      setSelectedPlayerForPayment(null);
    },
  });

  const notRenewMutation = useMutation({
    mutationFn: (playerId) => {
      const player = players.find(p => p.id === playerId);
      return base44.entities.Player.update(playerId, {
        ...player,
        estado_renovacion: "no_renueva",
        fecha_renovacion: new Date().toISOString(),
        activo: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
      toast.success("Jugador marcado como no renueva");
      setConfirmDialog({ open: false, playerId: null, action: null });
    },
  });

  useEffect(() => {
    const initialCategories = {};
    players.forEach(player => {
      const suggested = suggestCategory(player.fecha_nacimiento);
      initialCategories[player.id] = suggested;
    });
    setSelectedCategories(initialCategories);
  }, [players]);

  const handleConfirmAction = () => {
    if (confirmDialog.action === 'renew') {
      const player = players.find(p => p.id === confirmDialog.playerId);
      const newCategory = selectedCategories[confirmDialog.playerId];
      
      // Abrir flujo de pago
      setSelectedPlayerForPayment({ ...player, newCategory });
      setShowPaymentFlow(true);
      setConfirmDialog({ open: false, playerId: null, action: null });
    } else if (confirmDialog.action === 'not_renew') {
      notRenewMutation.mutate(confirmDialog.playerId);
    }
  };

  const handlePaymentFlowComplete = (data) => {
    renewPlayerMutation.mutate({
      playerId: selectedPlayerForPayment.id,
      newCategory: data.newCategory,
      paymentsData: data
    });
  };

  if (!seasonConfig) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-slate-600">Cargando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-green-900 mb-2">
                ✅ Todo listo para la temporada {seasonConfig.temporada}
              </h2>
              <p className="text-green-700">
                No tienes jugadores pendientes de renovación
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Pantalla de éxito */}
      {showSuccessScreen && successData && (
        <RenewalSuccessScreen
          player={successData.player}
          newCategory={successData.newCategory}
          tipoPago={successData.tipoPago}
          cuotasGeneradas={successData.cuotasGeneradas}
          descuentoHermano={successData.descuentoHermano}
          seasonConfig={seasonConfig}
          onClose={() => setShowSuccessScreen(false)}
        />
      )}

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, playerId: null, action: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'renew' ? '✅ Confirmar Renovación' : '❌ No Renovar'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'renew' 
                ? '¿Confirmas que este jugador continúa en el club para la temporada ' + seasonConfig.temporada + '? A continuación seleccionarás la modalidad de pago.'
                : '¿Confirmas que este jugador NO continuará en el club? Esta acción se puede revertir desde el panel de administración.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={confirmDialog.action === 'renew' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {confirmDialog.action === 'renew' ? '✅ Continuar' : '❌ No Renueva'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Flujo de pago integrado */}
      {showPaymentFlow && selectedPlayerForPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full my-8">
            <RenewalPaymentFlow
              player={selectedPlayerForPayment}
              newCategory={selectedPlayerForPayment.newCategory}
              seasonConfig={seasonConfig}
              categoryConfigs={categoryConfigs}
              allPlayers={players}
              onComplete={handlePaymentFlowComplete}
              onCancel={() => {
                setShowPaymentFlow(false);
                setSelectedPlayerForPayment(null);
              }}
            />
          </div>
        </div>
      )}

      <div className="p-4 lg:p-8 space-y-6">
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl p-6 shadow-xl text-white">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 flex-shrink-0 animate-pulse" />
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">
                🔄 Renovación de Jugadores - Temporada {seasonConfig.temporada}
              </h1>
              <p className="text-orange-100 text-lg">
                Por favor, confirma qué jugadores continúan en el club y actualiza sus categorías si es necesario
              </p>
            </div>
          </div>
        </div>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Users className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <p className="text-blue-900 font-semibold">
                  📋 Instrucciones:
                </p>
                <ul className="text-blue-800 space-y-1 text-sm">
                  <li>✅ <strong>Renovar:</strong> Confirma la categoría sugerida o cámbiala si es necesario</li>
                  <li>❌ <strong>No Renueva:</strong> Si el jugador no continuará en el club</li>
                  <li>🎯 Las categorías se sugieren automáticamente según la edad del jugador</li>
                  <li>⚠️ Debes procesar todos los jugadores para acceder al resto de la aplicación</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          {players.map((player) => {
            const age = calculateAge(player.fecha_nacimiento);
            const suggestedCat = suggestCategory(player.fecha_nacimiento);
            const selectedCat = selectedCategories[player.id] || player.deporte;
            const categoryChanged = selectedCat !== player.deporte;
            const turning18 = willBe18NextSeason(player.fecha_nacimiento);

            return (
              <Card key={player.id} className={`border-2 shadow-lg hover:shadow-xl transition-shadow ${
                turning18 ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'
              }`}>
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">{player.nombre}</CardTitle>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-sm">
                          {age} años
                        </Badge>
                        <Badge className="bg-slate-600 text-sm">
                          Actual: {player.deporte}
                        </Badge>
                        {turning18 && (
                          <Badge className="bg-amber-600 text-white text-sm animate-pulse">
                            🎂 Cumplirá 18
                          </Badge>
                        )}
                      </div>
                    </div>
                    {player.foto_url && (
                      <img 
                        src={player.foto_url} 
                        alt={player.nombre}
                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {turning18 ? (
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <p className="font-bold text-amber-900">🎂 {player.nombre?.split(" ")[0]} cumplirá 18 años</p>
                      </div>
                      <p className="text-sm text-amber-800">
                        Como será mayor de edad, <strong>deberá inscribirse por su cuenta</strong> como jugador +18 la próxima temporada. 
                        Tú no puedes renovar su plaza.
                      </p>
                      <div className="bg-amber-100 rounded-lg p-2.5 border border-amber-200">
                        <p className="text-xs text-amber-700">
                          <strong>¿Qué pasará?</strong> El club le enviará una invitación a su email para que se inscriba 
                          él mismo. Los pagos de esta temporada no cambian.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-semibold text-slate-700">
                            📚 Categoría para {seasonConfig.temporada}:
                          </label>
                          {categoryChanged && (
                            <Badge className="bg-orange-500 text-white animate-pulse">
                              Cambio de categoría
                            </Badge>
                          )}
                        </div>
                        
                        {suggestedCat !== player.deporte && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                            <p className="text-blue-900">
                              💡 <strong>Sugerencia:</strong> Según la edad ({age} años), la categoría recomendada es <strong>{suggestedCat}</strong>
                            </p>
                          </div>
                        )}

                        <Select 
                          value={selectedCat}
                          onValueChange={(value) => setSelectedCategories({
                            ...selectedCategories,
                            [player.id]: value
                          })}
                        >
                          <SelectTrigger className="h-12 text-base border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIAS.map(cat => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                                {cat === suggestedCat && " 💡"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button
                          onClick={() => setConfirmDialog({ open: true, playerId: player.id, action: 'renew' })}
                          className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold"
                        >
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          ✅ Renovar
                        </Button>
                        <Button
                          onClick={() => setConfirmDialog({ open: true, playerId: player.id, action: 'not_renew' })}
                          variant="outline"
                          className="flex-1 h-12 border-2 border-red-300 text-red-700 hover:bg-red-50 font-bold"
                        >
                          <XCircle className="w-5 h-5 mr-2" />
                          ❌ No Renueva
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <UserPlus className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="text-green-900 font-semibold mb-2">
                  ✅ ¿Ya renovaste todos tus jugadores?
                </p>
                <p className="text-green-700 text-sm mb-4">
                  Si necesitas inscribir un <strong>nuevo jugador</strong> (hermano, familiar, etc.), ve a la sección de jugadores
                </p>
                <Link to={createPageUrl("ParentPlayers")}>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Ir a Mis Jugadores
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}