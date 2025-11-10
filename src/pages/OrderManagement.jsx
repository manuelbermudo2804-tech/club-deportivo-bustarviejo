import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Search,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  TrendingUp
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function OrderManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState(null);

  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
    initialData: [],
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, newStatus, currentOrder }) => {
      const updated = await base44.entities.Order.update(id, {
        ...currentOrder,
        estado: newStatus
      });

      // Enviar email de notificación
      try {
        let subject = "";
        let message = "";

        switch (newStatus) {
          case "Preparando":
            subject = "Pedido en Preparación - CF Bustarviejo";
            message = "Tu pedido está siendo preparado. Te notificaremos cuando esté listo para recoger.";
            break;
          case "Listo":
            subject = "✅ Pedido Listo para Recoger - CF Bustarviejo";
            message = "¡Tu pedido está listo! Ya puedes pasar a recogerlo por las instalaciones del club.";
            break;
          case "Entregado":
            subject = "Pedido Entregado - CF Bustarviejo";
            message = "Tu pedido ha sido entregado. ¡Gracias por tu compra!";
            break;
        }

        if (subject) {
          await base44.integrations.Core.SendEmail({
            to: currentOrder.cliente_email,
            subject: subject,
            body: `
              <h2>${subject}</h2>
              <p>Hola ${currentOrder.cliente_nombre},</p>
              <p>${message}</p>
              
              <h3>Detalles del Pedido:</h3>
              <ul>
                ${currentOrder.productos?.map(p => `
                  <li>${p.nombre} ${p.talla ? `(Talla: ${p.talla})` : ''} - ${p.cantidad}x - ${p.precio}€</li>
                `).join('') || ''}
              </ul>
              
              <p><strong>Total: ${currentOrder.total?.toFixed(2)}€</strong></p>
              
              ${newStatus === 'Listo' ? `
                <div style="background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>📍 Recogida en el Club:</strong></p>
                  <p style="margin: 8px 0 0 0;">Tu pedido te está esperando en las instalaciones del CF Bustarviejo.</p>
                </div>
              ` : ''}
              
              <p>Gracias.</p>
              <p style="color: #666; font-size: 12px;">CF Bustarviejo - Tienda del Club</p>
            `
          });
        }
      } catch (error) {
        console.error("Error sending email:", error);
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success("Estado actualizado y cliente notificado");
    },
  });

  const handleStatusChange = (order, newStatus) => {
    updateOrderMutation.mutate({ id: order.id, newStatus, currentOrder: order });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.cliente_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Estadísticas
  const pendingOrders = orders.filter(o => o.estado === "Pendiente").length;
  const preparingOrders = orders.filter(o => o.estado === "Preparando").length;
  const readyOrders = orders.filter(o => o.estado === "Listo").length;
  const deliveredOrders = orders.filter(o => o.estado === "Entregado").length;
  const totalRevenue = orders
    .filter(o => o.estado === "Entregado")
    .reduce((sum, o) => sum + (o.total || 0), 0);

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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Gestión de Pedidos</h1>
        <p className="text-slate-600 mt-1">Control de pedidos y entregas</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Pendientes</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingOrders}</p>
              </div>
              <span className="text-4xl">⏳</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Preparando</p>
                <p className="text-3xl font-bold text-blue-600">{preparingOrders}</p>
              </div>
              <span className="text-4xl">📦</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Listos</p>
                <p className="text-3xl font-bold text-green-600">{readyOrders}</p>
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
                <p className="text-3xl font-bold text-slate-600">{deliveredOrders}</p>
              </div>
              <span className="text-4xl">🎉</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-100 mb-1">Ingresos Total</p>
                <p className="text-3xl font-bold">{totalRevenue.toFixed(2)}€</p>
              </div>
              <TrendingUp className="w-12 h-12 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="Pendiente">Pendiente</SelectItem>
            <SelectItem value="Preparando">Preparando</SelectItem>
            <SelectItem value="Listo">Listo</SelectItem>
            <SelectItem value="Entregado">Entregado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla de Pedidos */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" />
            Lista de Pedidos ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No hay pedidos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-slate-900">{order.cliente_nombre}</h3>
                        <Badge className={statusColors[order.estado]}>
                          {statusIcons[order.estado]} {order.estado}
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-2 gap-2 text-sm text-slate-600 mb-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span>{order.cliente_email}</span>
                        </div>
                        {order.cliente_telefono && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{order.cliente_telefono}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(order.created_date).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                        <div className="font-semibold text-orange-600">
                          Total: {order.total?.toFixed(2)}€
                        </div>
                      </div>

                      {/* Productos */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                        className="mb-2"
                      >
                        {expandedOrder === order.id ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                        Ver productos ({order.productos?.length || 0})
                      </Button>

                      {expandedOrder === order.id && order.productos && (
                        <div className="bg-slate-50 rounded p-3 space-y-2">
                          {order.productos.map((prod, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>
                                {prod.nombre} {prod.talla ? `(Talla: ${prod.talla})` : ''} x{prod.cantidad}
                              </span>
                              <span className="font-medium">{(prod.precio * prod.cantidad).toFixed(2)}€</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {order.notas && (
                        <div className="bg-blue-50 border-l-2 border-blue-300 rounded p-2 text-sm text-slate-700 mt-2">
                          <strong>Notas:</strong> {order.notas}
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      <Select
                        value={order.estado}
                        onValueChange={(newStatus) => handleStatusChange(order, newStatus)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendiente">⏳ Pendiente</SelectItem>
                          <SelectItem value="Preparando">📦 Preparando</SelectItem>
                          <SelectItem value="Listo">✅ Listo</SelectItem>
                          <SelectItem value="Entregado">🎉 Entregado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}