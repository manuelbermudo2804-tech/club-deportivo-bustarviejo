import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clover, Search, Check, X as XIcon, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const NUMERO_LOTERIA = "28720";

export default function LotteryManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAdmin = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAdmin(currentUser.role === "admin" || currentUser.es_entrenador === true);
    };
    checkAdmin();
  }, []);

  const { data: orders = [] } = useQuery({
    queryKey: ['allLotteryOrders'],
    queryFn: () => base44.entities.LotteryOrder.list('-created_date'),
    enabled: isAdmin,
    initialData: [],
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LotteryOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allLotteryOrders'] });
      toast.success("Pedido actualizado");
    },
  });

  const handleMarkAsDelivered = (order) => {
    updateOrderMutation.mutate({
      id: order.id,
      data: {
        ...order,
        estado: "Entregado",
        entregado_por: user.email,
        fecha_entrega: new Date().toISOString().split('T')[0]
      }
    });
  };

  const handleMarkAsPaid = (order) => {
    updateOrderMutation.mutate({
      id: order.id,
      data: {
        ...order,
        pagado: true
      }
    });
  };

  const exportCSV = () => {
    const rows = [
      ['Jugador', 'Categoría', 'Email', 'Teléfono', 'Décimos', 'Total', 'Estado', 'Pagado', 'Entregado Por', 'Fecha Entrega']
    ];

    orders.forEach(order => {
      rows.push([
        order.jugador_nombre,
        order.jugador_categoria,
        order.email_padre,
        order.telefono || '',
        order.numero_decimos,
        `${order.total}€`,
        order.estado,
        order.pagado ? 'Sí' : 'No',
        order.entregado_por || '',
        order.fecha_entrega || ''
      ]);
    });

    const csvContent = '\ufeff' + rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `loteria_navidad_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("CSV exportado");
  };

  const filteredOrders = orders.filter(order =>
    order.jugador_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.jugador_categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingOrders = filteredOrders.filter(o => o.estado === "Solicitado");
  const deliveredOrders = filteredOrders.filter(o => o.estado === "Entregado");

  const totalDecimos = orders.reduce((sum, o) => sum + (o.numero_decimos || 0), 0);
  const totalRecaudado = orders.filter(o => o.pagado).reduce((sum, o) => sum + (o.total || 0), 0);
  const totalPendienteCobro = orders.filter(o => !o.pagado).reduce((sum, o) => sum + (o.total || 0), 0);

  const statusColors = {
    "Solicitado": "bg-blue-100 text-blue-700",
    "Entregado": "bg-green-100 text-green-700",
    "Cancelado": "bg-red-100 text-red-700"
  };

  if (!isAdmin) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-900">No tienes permisos para acceder a esta página</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🍀 Gestión de Lotería</h1>
          <p className="text-slate-600 mt-1">Número del club: <strong className="text-orange-600">{NUMERO_LOTERIA}</strong></p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="shadow-lg">
          <FileDown className="w-5 h-5 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">Total Pedidos</p>
                <p className="text-3xl font-bold text-slate-900">{orders.length}</p>
              </div>
              <span className="text-4xl">🎟️</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">Décimos Totales</p>
                <p className="text-3xl font-bold text-orange-600">{totalDecimos}</p>
              </div>
              <span className="text-4xl">🍀</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-green-900 mb-1">Recaudado</p>
                <p className="text-3xl font-bold text-green-700">{totalRecaudado}€</p>
              </div>
              <span className="text-4xl">💰</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-red-900 mb-1">Pdte. Cobro</p>
                <p className="text-3xl font-bold text-red-700">{totalPendienteCobro}€</p>
              </div>
              <span className="text-4xl">⏳</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pendientes">
        <TabsList className="w-full">
          <TabsTrigger value="pendientes" className="flex-1">
            Pendientes ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="entregados" className="flex-1">
            Entregados ({deliveredOrders.length})
          </TabsTrigger>
          <TabsTrigger value="todos" className="flex-1">
            Todos ({orders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendientes" className="space-y-4 mt-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle>Pedidos Pendientes de Entrega</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {pendingOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Clover className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No hay pedidos pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingOrders.map(order => (
                    <Card key={order.id} className="border hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-slate-900">{order.jugador_nombre}</h3>
                            <p className="text-sm text-slate-600">{order.jugador_categoria}</p>
                            <p className="text-xs text-slate-500">{order.email_padre}</p>
                            {order.telefono && (
                              <p className="text-xs text-slate-500">📱 {order.telefono}</p>
                            )}
                          </div>
                          <Badge className={statusColors[order.estado]}>
                            {order.estado}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm mb-3">
                          <p>🎟️ <strong>Décimos:</strong> {order.numero_decimos}</p>
                          <p>💰 <strong>Total:</strong> {order.total}€</p>
                          <p>💳 <strong>Pagado:</strong> {order.pagado ? "✅ Sí" : "❌ No"}</p>
                          {order.notas && (
                            <p className="text-slate-600">📝 {order.notas}</p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {!order.pagado && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsPaid(order)}
                              className="flex-1"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Marcar Pagado
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleMarkAsDelivered(order)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Marcar Entregado
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entregados" className="space-y-4 mt-6">
          <Card className="border-none shadow-lg bg-green-50">
            <CardHeader className="border-b border-green-200">
              <CardTitle className="text-green-900">Pedidos Entregados</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {deliveredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-green-700">No hay pedidos entregados todavía</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveredOrders.map(order => (
                    <Card key={order.id} className="border border-green-200 bg-white">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-slate-900">{order.jugador_nombre}</h3>
                            <p className="text-sm text-slate-600">{order.jugador_categoria}</p>
                          </div>
                          <Badge className="bg-green-100 text-green-700">✓ Entregado</Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <p>🎟️ <strong>Décimos:</strong> {order.numero_decimos}</p>
                          <p>💰 <strong>Total:</strong> {order.total}€</p>
                          <p>💳 <strong>Pagado:</strong> {order.pagado ? "✅ Sí" : "❌ No"}</p>
                          {order.fecha_entrega && (
                            <p>📅 <strong>Entregado:</strong> {new Date(order.fecha_entrega).toLocaleDateString('es-ES')}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="todos" className="space-y-4 mt-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle>Todos los Pedidos</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {filteredOrders.map(order => (
                  <Card key={order.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-slate-900">{order.jugador_nombre}</h3>
                          <p className="text-sm text-slate-600">{order.jugador_categoria}</p>
                          <p className="text-xs text-slate-500">{order.email_padre}</p>
                        </div>
                        <Badge className={statusColors[order.estado]}>
                          {order.estado}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p>🎟️ Décimos: {order.numero_decimos}</p>
                        <p>💰 Total: {order.total}€</p>
                        <p>💳 Pagado: {order.pagado ? "✅" : "❌"}</p>
                        {order.fecha_entrega && (
                          <p>📅 {new Date(order.fecha_entrega).toLocaleDateString('es-ES')}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}