import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingBag, AlertCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import ClothingOrderForm from "../components/clothing/ClothingOrderForm";
import OrdersSummary from "../components/clothing/OrdersSummary";
import ContactCard from "../components/ContactCard";

export default function ClothingOrders() {
  const [showForm, setShowForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const currentUser = await base44.auth.me();
        setIsAdmin(currentUser.role === "admin");
      } catch (error) {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
    initialData: null,
  });

  const orderPeriodActive = (() => {
    if (seasonConfig?.tienda_ropa_abierta === true) return true;
    const currentMonth = new Date().getMonth() + 1;
    return currentMonth === 6 || currentMonth === 7;
  })();

  const { data: allPlayers, isLoading: loadingAllPlayers } = useQuery({
    queryKey: ['allPlayersForClothing'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const players = allPlayers.filter(p => {
    const userEmail = user?.email?.toLowerCase().trim();
    const emailPadre = p.email_padre?.toLowerCase().trim();
    const emailTutor2 = p.email_tutor_2?.toLowerCase().trim();
    
    const isMyPlayer = emailPadre === userEmail || emailTutor2 === userEmail;
    const isActive = p.activo === true || p.activo === undefined;
    
    return isMyPlayer && isActive;
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ['myClothingOrders', user?.email, isAdmin],
    queryFn: async () => {
      const allOrders = await base44.entities.ClothingOrder.list('-created_date');
      if (isAdmin) return allOrders;
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

  const renderOrderDetails = (order) => (
    <div className="space-y-2 text-sm">
      {order.chaqueta_partidos && (
        <p className="text-slate-700">✅ <strong>Chaqueta de Partidos:</strong> {order.chaqueta_talla} - 35€</p>
      )}
      {order.pack_entrenamiento && (
        <div className="text-slate-700 bg-blue-50 p-2 rounded border border-blue-200">
          <p className="font-semibold mb-1">✅ Pack de Entrenamiento - 41€</p>
          <ul className="list-disc list-inside ml-4 space-y-1 text-xs">
            {order.pack_camiseta_talla && <li>👕 Camiseta: {order.pack_camiseta_talla}</li>}
            {order.pack_pantalon_talla && <li>👖 Pantalón: {order.pack_pantalon_talla}</li>}
            {order.pack_sudadera_talla && <li>🧥 Sudadera: {order.pack_sudadera_talla}</li>}
          </ul>
        </div>
      )}
      {order.camiseta_individual && (
        <p className="text-slate-700">✅ <strong>Camiseta Individual:</strong> {order.camiseta_individual_talla} - 10€</p>
      )}
      {order.pantalon_individual && (
        <p className="text-slate-700">✅ <strong>Pantalón Individual:</strong> {order.pantalon_individual_talla} - 17€</p>
      )}
      {order.sudadera_individual && (
        <p className="text-slate-700">✅ <strong>Sudadera Individual:</strong> {order.sudadera_individual_talla} - 18€</p>
      )}
      {order.chubasquero && (
        <p className="text-slate-700">✅ <strong>Chubasquero:</strong> {order.chubasquero_talla} - 20€</p>
      )}
      {order.anorak && (
        <p className="text-slate-700">✅ <strong>Anorak:</strong> {order.anorak_talla} - 40€</p>
      )}
      {order.mochila && (
        <p className="text-slate-700">✅ <strong>Mochila con botero:</strong> 22€</p>
      )}
      <p className="text-slate-700 font-bold pt-2 border-t border-slate-200">
        <strong>Total:</strong> {order.precio_total}€
      </p>
      <p className="text-slate-600 text-xs">
        <strong>Fecha:</strong> {new Date(order.created_date).toLocaleDateString('es-ES')}
      </p>
      {order.justificante_url && (
        <div className="pt-2">
          <a
            href={order.justificante_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-medium transition-colors"
          >
            📄 Ver justificante {order.justificante_url.toLowerCase().endsWith('.pdf') ? '(PDF)' : '(Imagen)'}
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pedidos de Equipación</h1>
          <p className="text-slate-600 mt-1">
            {isAdmin ? "Gestión de pedidos del club" : "Solicita la equipación para tus jugadores"}
          </p>
          {isAdmin && seasonConfig?.tienda_ropa_abierta && (
            <Badge className="bg-green-600 text-white mt-2">
              🛍️ Tienda abierta manualmente por admin
            </Badge>
          )}
        </div>
        {!isAdmin && (
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-orange-600 hover:bg-orange-700 shadow-lg"
            disabled={!orderPeriodActive || players.length === 0}
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Pedido
          </Button>
        )}
      </div>

      {!orderPeriodActive && (
        <Alert className="bg-orange-50 border-orange-300 border-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <strong>⚠️ Periodo de pedidos cerrado</strong>
            <p className="mt-2">
              Los pedidos de equipación solo están disponibles durante <strong>Junio y Julio</strong>.
              Los pedidos ya realizados se pueden consultar aquí, pero no se pueden crear nuevos pedidos fuera de este periodo.
            </p>
            {isAdmin && (
              <p className="mt-3 text-xs bg-white rounded p-2 border border-orange-200">
                💡 <strong>Admin:</strong> Puedes abrir la tienda manualmente desde <strong>Panel Admin → Temporadas → Editar temporada activa → Tienda de Ropa Abierta</strong>
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {players.length === 0 && orderPeriodActive && !isAdmin && (
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
        {showForm && !isAdmin && (
          <ClothingOrderForm
            players={players}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isSubmitting={createOrderMutation.isPending}
          />
        )}
      </AnimatePresence>

      {isAdmin ? (
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="summary">📊 Resumen Agrupado</TabsTrigger>
            <TabsTrigger value="orders">📋 Todos los Pedidos</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-6">
            <OrdersSummary orders={orders} />
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-orange-600" />
                  Todos los Pedidos ({orders.length})
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
                    <p className="text-slate-500">No hay pedidos registrados</p>
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
                            <p className="text-xs text-slate-500 mt-1">{order.email_padre}</p>
                          </div>
                          <Badge className={statusColors[order.estado]}>
                            <span className="mr-1">{statusEmojis[order.estado]}</span>
                            {order.estado}
                          </Badge>
                        </div>
                        {renderOrderDetails(order)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <Card className="border-none shadow-lg bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg text-blue-900">ℹ️ Catálogo de Productos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-blue-800">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
                  <h4 className="font-bold text-blue-900 mb-2">🧥 Prendas Oficiales:</h4>
                  <ul className="space-y-1">
                    <li>• <strong>Chaqueta de Partidos:</strong> 35€</li>
                    <li>• <strong>Chubasquero</strong> (escudo bordado): 20€</li>
                    <li>• <strong>Anorak:</strong> 40€</li>
                  </ul>
                </div>
                <div className="bg-white rounded-lg p-4 border-2 border-green-300">
                  <h4 className="font-bold text-green-900 mb-2">👕 Pack de Entrenamiento (41€):</h4>
                  <ul className="space-y-1">
                    <li>✅ Camiseta + Pantalón + Sudadera</li>
                    <li className="text-xs text-green-700">Tallas independientes para cada prenda</li>
                  </ul>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border-2 border-orange-300">
                <h4 className="font-bold text-orange-900 mb-2">🛍️ Prendas Individuales (FUERA DEL PACK):</h4>
                <ul className="space-y-1">
                  <li>• <strong>Camiseta:</strong> 10€</li>
                  <li>• <strong>Pantalón:</strong> 17€</li>
                  <li>• <strong>Sudadera:</strong> 18€</li>
                </ul>
              </div>
              <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                <h4 className="font-bold text-purple-900 mb-2">🎒 Complementos:</h4>
                <ul className="space-y-1">
                  <li>• <strong>Mochila con botero</strong> (escudo vinilo): 22€</li>
                </ul>
              </div>
              <p className="pt-2 border-t border-blue-200">
                <strong>📧 Email del club:</strong> CDBUSTARVIEJO@GMAIL.COM
              </p>
            </CardContent>
          </Card>

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
                      {renderOrderDetails(order)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ContactCard />
    </div>
  );
}