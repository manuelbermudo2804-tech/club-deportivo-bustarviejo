import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingBag, AlertCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

import ClothingOrderForm from "../components/clothing/ClothingOrderForm";
import ContactCard from "../components/ContactCard";

// Verificar si estamos en periodo de pedidos (Junio-Julio)
// TEMPORAL: Siempre activo para pruebas
const isOrderPeriodActive = () => {
  return true; // 🔧 TEMPORAL - Cambiar después de probar
  // const currentMonth = new Date().getMonth() + 1;
  // return currentMonth === 6 || currentMonth === 7;
};

export default function ClothingOrders() {
  const [showForm, setShowForm] = useState(false);
  const orderPeriodActive = isOrderPeriodActive();
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allPlayers, isLoading: loadingAllPlayers } = useQuery({
    queryKey: ['allPlayersForClothing'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  // Filtrar jugadores del usuario
  const players = allPlayers.filter(p => {
    const userEmail = user?.email?.toLowerCase().trim();
    const emailPadre = p.email_padre?.toLowerCase().trim();
    const emailTutor2 = p.email_tutor_2?.toLowerCase().trim();
    
    const isMyPlayer = emailPadre === userEmail || emailTutor2 === userEmail;
    const isActive = p.activo === true || p.activo === undefined;
    
    return isMyPlayer && isActive;
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ['myClothingOrders', user?.email],
    queryFn: async () => {
      const allOrders = await base44.entities.ClothingOrder.list('-created_date');
      return allOrders.filter(order => order.email_padre === user?.email);
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const createOrderMutation = useMutation({
    mutationFn: (orderData) => base44.entities.ClothingOrder.create(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myClothingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['allPlayersForClothing'] });
      setShowForm(false);
      toast.success("Pedido registrado correctamente");
    },
  });

  const handleSubmit = async (orderData) => {
    // Cambiar estado a "En revisión" cuando tiene justificante
    const dataToSubmit = {
      ...orderData,
      estado: orderData.justificante_url ? "En revisión" : "Pendiente"
    };
    createOrderMutation.mutate(dataToSubmit);
  };

  const statusColors = {
    "Pendiente": "bg-red-100 text-red-700",
    "En revisión": "bg-orange-100 text-orange-700",
    "Confirmado": "bg-blue-100 text-blue-700",
    "Preparado": "bg-purple-100 text-purple-700",
    "Entregado": "bg-green-100 text-green-700"
  };

  const statusEmojis = {
    "Pendiente": "🔴",
    "En revisión": "🟠",
    "Confirmado": "🔵",
    "Preparado": "🟣",
    "Entregado": "🟢"
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pedidos de Equipación</h1>
          <p className="text-slate-600 mt-1">Solicita la equipación para tus jugadores</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-600 hover:bg-orange-700 shadow-lg"
          disabled={players.length === 0}
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Pedido
        </Button>
      </div>

      {/* DEBUG INFO - TEMPORAL */}
      {user && (
        <Card className="border-2 border-blue-500 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-sm text-blue-900">🔧 Info de Debug (temporal)</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-3">
            <div className="bg-white p-3 rounded border-2 border-blue-300">
              <p className="font-bold text-blue-900 mb-2">📧 TU INFORMACIÓN:</p>
              <p><strong>Email usuario logueado:</strong> "{user.email}"</p>
              <p className="text-green-700"><strong>Email normalizado:</strong> "{user.email?.toLowerCase().trim()}"</p>
            </div>
            
            <div className="bg-white p-3 rounded border-2 border-green-300">
              <p className="font-bold text-green-900 mb-2">📊 ESTADÍSTICAS:</p>
              <p><strong>Total jugadores en BD:</strong> {allPlayers.length}</p>
              <p><strong>Jugadores filtrados para ti:</strong> {players.length}</p>
              <p><strong>Periodo activo:</strong> {orderPeriodActive ? '✅ SÍ' : '❌ NO'}</p>
              <p><strong>Botón habilitado:</strong> {players.length > 0 ? '✅ SÍ' : '❌ NO'}</p>
            </div>

            {allPlayers.length > 0 && (
              <div className="bg-white p-3 rounded border-2 border-orange-300">
                <p className="font-bold text-orange-900 mb-2">👥 TODOS LOS JUGADORES (primeros 5):</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allPlayers.slice(0, 5).map(p => (
                    <div key={p.id} className="text-xs p-2 bg-slate-50 rounded border">
                      <p><strong>Nombre:</strong> {p.nombre}</p>
                      <p><strong>Email padre:</strong> "{p.email_padre}"</p>
                      <p><strong>Email tutor 2:</strong> "{p.email_tutor_2 || 'N/A'}"</p>
                      <p><strong>Activo:</strong> {p.activo === true ? '✅ true' : p.activo === false ? '❌ false' : '⚠️ undefined'}</p>
                      <p className="text-purple-700">
                        <strong>¿Es tuyo?</strong> {
                          (p.email_padre?.toLowerCase().trim() === user.email?.toLowerCase().trim() || 
                           p.email_tutor_2?.toLowerCase().trim() === user.email?.toLowerCase().trim()) 
                          ? '✅ SÍ' : '❌ NO'
                        }
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {players.length > 0 && (
              <div className="bg-white p-3 rounded border-2 border-green-300">
                <p className="font-bold text-green-900 mb-2">✅ TUS JUGADORES FILTRADOS:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  {players.map(p => (
                    <li key={p.id} className="text-green-800">
                      {p.nombre} - {p.deporte} - Activo: {p.activo ? '✅' : '❌'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alerta si no es periodo de pedidos */}
      {!orderPeriodActive && (
        <Alert className="bg-orange-50 border-orange-300 border-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <strong>⚠️ Periodo de pedidos cerrado</strong>
            <p className="mt-2">
              Los pedidos de equipación solo están disponibles durante <strong>Junio y Julio</strong>.
              Los pedidos ya realizados se pueden consultar aquí, pero no se pueden crear nuevos pedidos fuera de este periodo.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {players.length === 0 && (
        <Card className="border-none shadow-lg bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <p className="text-orange-800">
              ⚠️ <strong>No tienes jugadores activos registrados.</strong> Debes registrar al menos un jugador antes de hacer un pedido de equipación.
            </p>
            <p className="text-sm text-orange-700 mt-2">
              Verifica en "Mis Jugadores" que tus jugadores estén marcados como activos y que el email coincida.
            </p>
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {showForm && (
          <ClothingOrderForm
            players={players}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isSubmitting={createOrderMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Información importante */}
      <Card className="border-none shadow-lg bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900">ℹ️ Información Importante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-800">
          <p>📅 <strong>Periodo de pedidos:</strong> Junio y Julio (disponible durante inscripciones)</p>
          <p>💳 <strong>Método de pago:</strong> Transferencia bancaria con justificante obligatorio</p>
          <p>📦 <strong>Entrega:</strong> Los pedidos se entregarán en las instalaciones del club durante la primera semana de Septiembre</p>
          <p>🏷️ <strong>Productos disponibles:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><strong>Chaqueta de Partidos (35€)</strong> - Excepto Aficionado y Baloncesto</li>
            <li><strong>Pack de Entrenamiento (41€)</strong> - Incluye: Camiseta + Pantalón + Sudadera</li>
          </ul>
          <p className="pt-2 border-t border-blue-200">
            <strong>📧 Email del club:</strong> CDBUSTARVIEJO@GMAIL.COM
          </p>
        </CardContent>
      </Card>

      {/* Lista de pedidos */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-600" />
            Mis Pedidos ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No tienes pedidos registrados</p>
              {orderPeriodActive ? (
                <p className="text-sm text-slate-400 mt-2">Haz clic en "Nuevo Pedido" para solicitar equipación</p>
              ) : (
                <p className="text-sm text-orange-600 mt-2">Los pedidos solo se pueden realizar en Junio y Julio</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 rounded-lg border-2 border-slate-200 hover:border-orange-300 transition-colors bg-white"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{order.jugador_nombre}</h3>
                      <p className="text-sm text-slate-600">{order.jugador_categoria}</p>
                    </div>
                    <Badge className={statusColors[order.estado]}>
                      <span className="mr-1">{statusEmojis[order.estado]}</span>
                      {order.estado}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    {order.chaqueta_partidos && (
                      <p className="text-slate-700">
                        ✅ <strong>Chaqueta de Partidos:</strong> {order.chaqueta_talla}
                      </p>
                    )}
                    {order.pack_entrenamiento && (
                      <p className="text-slate-700">
                        ✅ <strong>Pack de Entrenamiento:</strong> {order.pack_talla}
                      </p>
                    )}
                    <p className="text-slate-700">
                      <strong>Total:</strong> {order.precio_total}€
                    </p>
                    <p className="text-slate-600 text-xs">
                      <strong>Fecha:</strong> {new Date(order.created_date).toLocaleDateString('es-ES')}
                    </p>
                    {order.justificante_url && (
                      <a
                        href={order.justificante_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-600 hover:text-orange-700 text-xs flex items-center gap-1"
                      >
                        📄 Ver justificante
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ContactCard />
    </div>
  );
}