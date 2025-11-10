import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  ChevronDown,
  ChevronUp,
  Clock,
  ShoppingBag,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function ParentOrders() {
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['myOrders', user?.email],
    queryFn: async () => {
      const allOrders = await base44.entities.Order.list('-created_date');
      return allOrders.filter(o => o.cliente_email === user?.email);
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const pendingOrders = orders.filter(o => o.estado === "Pendiente" || o.estado === "Preparando");
  const readyOrders = orders.filter(o => o.estado === "Listo");
  const deliveredOrders = orders.filter(o => o.estado === "Entregado");

  const statusColors = {
    "Pendiente": "bg-yellow-100 text-yellow-700",
    "Preparando": "bg-blue-100 text-blue-700",
    "Listo": "bg-green-100 text-green-700",
    "Entregado": "bg-slate-100 text-slate-700"
  };

  const statusIcons = {
    "Pendiente": "⏳",
    "Preparando": "📦",
    "Listo": "✅",
    "Entregado": "🎉"
  };

  const statusDescriptions = {
    "Pendiente": "Tu pedido ha sido recibido y será procesado pronto",
    "Preparando": "Estamos preparando tu pedido",
    "Listo": "¡Tu pedido está listo para recoger en el club!",
    "Entregado": "Pedido entregado correctamente"
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Mis Pedidos</h1>
        <p className="text-slate-600 mt-1">Historial y estado de tus pedidos</p>
      </div>

      {/* Alerta de información */}
      <Alert className="bg-blue-50 border-blue-200">
        <MapPin className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 ml-6">
          <strong>📍 Recogida en el Club:</strong> Todos los pedidos se recogen en las instalaciones del CF Bustarviejo. 
          Te notificaremos por email cuando tu pedido esté listo.
        </AlertDescription>
      </Alert>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">En Proceso</p>
                <p className="text-3xl font-bold text-blue-600">{pendingOrders.length}</p>
              </div>
              <span className="text-4xl">📦</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Listos para Recoger</p>
                <p className="text-3xl font-bold text-green-600">{readyOrders.length}</p>
              </div>
              <span className="text-4xl">✅</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Entregados</p>
                <p className="text-3xl font-bold text-slate-600">{deliveredOrders.length}</p>
              </div>
              <span className="text-4xl">🎉</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Pedidos */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-600" />
            Historial de Pedidos ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg mb-2">No tienes pedidos aún</p>
              <p className="text-slate-400 text-sm">Visita la tienda para hacer tu primer pedido</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className={`border-2 rounded-xl p-5 transition-all ${
                    order.estado === "Listo"
                      ? "bg-green-50 border-green-300"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={`${statusColors[order.estado]} text-base px-3 py-1`}>
                          {statusIcons[order.estado]} {order.estado}
                        </Badge>
                        {order.estado === "Listo" && (
                          <Badge className="bg-green-600 text-white animate-pulse">
                            ¡Ya puedes recogerlo!
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        {statusDescriptions[order.estado]}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-600">
                        {order.total?.toFixed(2)}€
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                    <Clock className="w-4 h-4" />
                    <span>
                      {new Date(order.created_date).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* Productos */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="mb-2 w-full justify-center"
                  >
                    {expandedOrder === order.id ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" />
                        Ocultar productos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-1" />
                        Ver productos ({order.productos?.length || 0})
                      </>
                    )}
                  </Button>

                  {expandedOrder === order.id && order.productos && (
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                      {order.productos.map((prod, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{prod.nombre}</p>
                            {prod.talla && (
                              <p className="text-sm text-slate-500">Talla: {prod.talla}</p>
                            )}
                            <p className="text-sm text-slate-600">Cantidad: {prod.cantidad}</p>
                          </div>
                          <span className="font-bold text-orange-600">
                            {(prod.precio * prod.cantidad).toFixed(2)}€
                          </span>
                        </div>
                      ))}
                      <div className="border-t pt-3 flex justify-between items-center">
                        <span className="font-bold text-slate-900">Total:</span>
                        <span className="text-xl font-bold text-orange-600">
                          {order.total?.toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  )}

                  {order.notas && (
                    <div className="bg-blue-50 border-l-2 border-blue-300 rounded p-3 text-sm text-slate-700 mt-3">
                      <strong>Notas del pedido:</strong> {order.notas}
                    </div>
                  )}

                  {order.estado === "Listo" && (
                    <Alert className="mt-4 bg-green-50 border-green-300">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 ml-6">
                        <strong>Tu pedido está listo para recoger</strong>
                        <p className="text-sm mt-1">
                          Pasa por las instalaciones del club en horario de entrenamientos para recoger tu pedido.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}