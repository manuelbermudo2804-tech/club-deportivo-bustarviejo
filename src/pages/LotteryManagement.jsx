import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clover, Search, Check, FileDown, Users, Grid3x3 } from "lucide-react";
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

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });

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

  const toggleLoteriaOpenMutation = useMutation({
    mutationFn: async () => {
      if (seasonConfig) {
        return base44.entities.SeasonConfig.update(seasonConfig.id, {
          ...seasonConfig,
          loteria_navidad_abierta: !seasonConfig.loteria_navidad_abierta
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonConfig'] });
      const newState = seasonConfig ? !seasonConfig.loteria_navidad_abierta : true;
      toast.success(newState ? "✅ Lotería abierta para familias" : "🔒 Lotería cerrada");
    },
  });

  const handleMarkAsDelivered = (order) => {
    updateOrderMutation.mutate({
      id: order.id,
      data: {
        ...order,
        estado: "Entregado",
        pagado: true,
        entregado_por: user.email,
        fecha_entrega: new Date().toISOString().split('T')[0]
      }
    });
  };

  const exportByFamily = () => {
    const ordersByFamily = {};
    orders.forEach(order => {
      const key = order.email_padre;
      if (!ordersByFamily[key]) {
        ordersByFamily[key] = [];
      }
      ordersByFamily[key].push(order);
    });

    const rows = [
      ['Email Familia', 'Jugadores', 'Total Décimos', 'Total €', 'Estados', 'Pagados']
    ];

    Object.entries(ordersByFamily).forEach(([email, familyOrders]) => {
      const jugadores = familyOrders.map(o => o.jugador_nombre).join(' | ');
      const totalDecimos = familyOrders.reduce((sum, o) => sum + o.numero_decimos, 0);
      const totalDinero = familyOrders.reduce((sum, o) => sum + o.total, 0);
      const estados = familyOrders.map(o => `${o.jugador_nombre}: ${o.estado}`).join(' | ');
      const pagados = familyOrders.filter(o => o.pagado).length;

      rows.push([
        email,
        jugadores,
        totalDecimos,
        `${totalDinero}€`,
        estados,
        `${pagados}/${familyOrders.length}`
      ]);
    });

    const csvContent = '\ufeff' + rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `loteria_por_familia_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("CSV por familia exportado");
  };

  const exportByPlayer = () => {
    const rows = [
      ['Email Familia', 'Jugador', 'Categoría', 'Teléfono', 'Décimos', 'Total €', 'Estado', 'Pagado', 'Fecha Entrega', 'Entregado Por']
    ];

    orders.forEach(order => {
      rows.push([
        order.email_padre,
        order.jugador_nombre,
        order.jugador_categoria,
        order.telefono || '',
        order.numero_decimos,
        `${order.total}€`,
        order.estado,
        order.pagado ? 'Sí' : 'No',
        order.fecha_entrega || '',
        order.entregado_por || ''
      ]);
    });

    const csvContent = '\ufeff' + rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `loteria_por_jugador_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("CSV por jugador exportado");
  };

  const exportByCategory = () => {
    // Agrupar por categoría
    const ordersByCategory = {};
    orders.forEach(order => {
      const cat = order.jugador_categoria || "Sin categoría";
      if (!ordersByCategory[cat]) {
        ordersByCategory[cat] = [];
      }
      ordersByCategory[cat].push(order);
    });

    // Ordenar categorías alfabéticamente
    const sortedCategories = Object.keys(ordersByCategory).sort();

    const rows = [
      ['Categoría', 'Email Familia', 'Jugadores', 'Total Décimos', 'Total €', 'Estados']
    ];

    sortedCategories.forEach(categoria => {
      const categoryOrders = ordersByCategory[categoria];
      
      // Agrupar por familia dentro de cada categoría
      const ordersByFamily = {};
      categoryOrders.forEach(order => {
        const email = order.email_padre;
        if (!ordersByFamily[email]) {
          ordersByFamily[email] = [];
        }
        ordersByFamily[email].push(order);
      });

      // Añadir fila de encabezado de categoría
      rows.push(['', '', '', '', '', '']);
      rows.push([`📚 ${categoria}`, '', '', '', '', '']);
      rows.push(['', '', '', '', '', '']);

      // Añadir cada familia
      Object.entries(ordersByFamily).forEach(([email, familyOrders]) => {
        const jugadores = familyOrders.map(o => o.jugador_nombre).join(' + ');
        const totalDecimos = familyOrders.reduce((sum, o) => sum + o.numero_decimos, 0);
        const totalDinero = familyOrders.reduce((sum, o) => sum + o.total, 0);
        const estados = familyOrders.map(o => `${o.jugador_nombre}: ${o.estado}`).join(' | ');

        rows.push([
          '',
          email,
          jugadores,
          totalDecimos,
          `${totalDinero}€`,
          estados
        ]);
      });
    });

    const csvContent = '\ufeff' + rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `loteria_por_categoria_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("CSV por categoría exportado");
  };

  const exportPDF = (type) => {
    let content = '';
    const date = new Date().toLocaleDateString('es-ES');
    
    if (type === 'resumen') {
      content = `
CLUB DEPORTIVO BUSTARVIEJO
RESUMEN LOTERÍA DE NAVIDAD
Fecha: ${date}
Número: ${NUMERO_LOTERIA}

═══════════════════════════════════════

RESUMEN GENERAL:
• Total Décimos: ${totalDecimos}
• Total Familias: ${totalFamilias}
• Total Pedidos: ${orders.length}
• Total Recaudado: ${totalRecaudado}€
• Pendiente Cobro: ${totalPendienteCobro}€

═══════════════════════════════════════

DESGLOSE POR CATEGORÍA:
${Object.entries(decimosPorCategoria).map(([cat, stats]) => `
${cat}
  • Décimos: ${stats.decimos}
  • Pedidos: ${stats.pedidos}
  • Familias: ${stats.familias.size}
  • Jugadores: ${stats.jugadores.size}
`).join('\n')}

═══════════════════════════════════════

DETALLE POR JUGADOR:
${orders.map(o => `
• ${o.jugador_nombre} (${o.jugador_categoria})
  Email: ${o.email_padre}
  Décimos: ${o.numero_decimos} - Total: ${o.total}€
  Estado: ${o.estado} - Pagado: ${o.pagado ? 'Sí' : 'No'}
`).join('\n')}
`;
    } else if (type === 'categoria') {
      const sortedCategories = Object.keys(decimosPorCategoria).sort();
      content = `
CLUB DEPORTIVO BUSTARVIEJO
LOTERÍA POR CATEGORÍA
Fecha: ${date}
Número: ${NUMERO_LOTERIA}

═══════════════════════════════════════
${sortedCategories.map(cat => {
  const categoryOrders = orders.filter(o => (o.jugador_categoria || "Sin categoría") === cat);
  const ordersByFam = {};
  categoryOrders.forEach(o => {
    if (!ordersByFam[o.email_padre]) ordersByFam[o.email_padre] = [];
    ordersByFam[o.email_padre].push(o);
  });
  
  return `
📚 ${cat}
Total Décimos: ${decimosPorCategoria[cat].decimos}
Familias: ${decimosPorCategoria[cat].familias.size}

${Object.entries(ordersByFam).map(([email, fOrders]) => `
  👨‍👩‍👧 ${email}
  ${fOrders.map(o => `    • ${o.jugador_nombre}: ${o.numero_decimos} décimos - ${o.total}€`).join('\n  ')}
`).join('\n')}
`;
}).join('\n═══════════════════════════════════════\n')}
`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `loteria_${type}_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Reporte descargado");
  };

  const filteredOrders = orders.filter(order =>
    order.jugador_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.email_padre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupar por familia para vista principal
  const ordersByFamily = {};
  filteredOrders.forEach(order => {
    const key = order.email_padre;
    if (!ordersByFamily[key]) {
      ordersByFamily[key] = {
        email: key,
        orders: []
      };
    }
    ordersByFamily[key].orders.push(order);
  });

  const pendingOrders = filteredOrders.filter(o => o.estado === "Solicitado");
  const deliveredOrders = filteredOrders.filter(o => o.estado === "Entregado");

  const totalDecimos = orders.reduce((sum, o) => sum + (o.numero_decimos || 0), 0);
  const totalRecaudado = orders.filter(o => o.pagado).reduce((sum, o) => sum + (o.total || 0), 0);
  const totalPendienteCobro = orders.filter(o => !o.pagado).reduce((sum, o) => sum + (o.total || 0), 0);
  const totalFamilias = Object.keys(ordersByFamily).length;

  // Estadísticas por categoría
  const decimosPorCategoria = {};
  orders.forEach(order => {
    const cat = order.jugador_categoria || "Sin categoría";
    if (!decimosPorCategoria[cat]) {
      decimosPorCategoria[cat] = {
        decimos: 0,
        pedidos: 0,
        familias: new Set(),
        jugadores: new Set()
      };
    }
    decimosPorCategoria[cat].decimos += order.numero_decimos;
    decimosPorCategoria[cat].pedidos += 1;
    decimosPorCategoria[cat].familias.add(order.email_padre);
    decimosPorCategoria[cat].jugadores.add(order.jugador_nombre);
  });

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
          <p className="text-slate-600 mt-1">Número: <strong className="text-orange-600">{NUMERO_LOTERIA}</strong></p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => toggleLoteriaOpenMutation.mutate()}
            disabled={toggleLoteriaOpenMutation.isPending}
            size="sm"
            className={`shadow-lg ${
              seasonConfig?.loteria_navidad_abierta 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {seasonConfig?.loteria_navidad_abierta ? '🔒 Cerrar' : '🛍️ Abrir'}
          </Button>
          <Button onClick={exportByFamily} variant="outline" size="sm">
            <Users className="w-4 h-4 mr-2" />
            Por Familia
          </Button>
          <Button onClick={exportByPlayer} variant="outline" size="sm">
            <FileDown className="w-4 h-4 mr-2" />
            Por Jugador
          </Button>
          <Button onClick={exportByCategory} variant="outline" size="sm" className="bg-orange-600 text-white hover:bg-orange-700">
            <Grid3x3 className="w-4 h-4 mr-2" />
            Por Categoría
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-6">
            <p className="text-xs text-slate-600 mb-1">Familias</p>
            <p className="text-2xl font-bold text-slate-900">{totalFamilias}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-6">
            <p className="text-xs text-slate-600 mb-1">Pedidos</p>
            <p className="text-2xl font-bold text-slate-900">{orders.length}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-6">
            <p className="text-xs text-slate-600 mb-1">Décimos</p>
            <p className="text-2xl font-bold text-orange-600">{totalDecimos}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <p className="text-xs text-green-900 mb-1">Recaudado</p>
            <p className="text-2xl font-bold text-green-700">{totalRecaudado}€</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="pt-6">
            <p className="text-xs text-red-900 mb-1">Pendiente</p>
            <p className="text-2xl font-bold text-red-700">{totalPendienteCobro}€</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle>📊 Estadísticas por Categoría</CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => exportPDF('resumen')} size="sm" variant="outline">
                <FileDown className="w-4 h-4 mr-2" />
                Resumen PDF
              </Button>
              <Button onClick={() => exportPDF('categoria')} size="sm" variant="outline">
                <FileDown className="w-4 h-4 mr-2" />
                Por Categoría PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(decimosPorCategoria).sort(([a], [b]) => a.localeCompare(b)).map(([categoria, stats]) => (
              <Card key={categoria} className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                <CardContent className="pt-4">
                  <h3 className="font-bold text-lg text-slate-900 mb-3">{categoria}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">🎟️ Décimos:</span>
                      <span className="font-bold text-orange-600">{stats.decimos}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">📦 Pedidos:</span>
                      <span className="font-bold">{stats.pedidos}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">👨‍👩‍👧 Familias:</span>
                      <span className="font-bold">{stats.familias.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">👤 Jugadores:</span>
                      <span className="font-bold">{stats.jugadores.size}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="familias" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="familias">
            👨‍👩‍👧 Familias ({totalFamilias})
          </TabsTrigger>
          <TabsTrigger value="categorias">
            📚 Categorías ({Object.keys(decimosPorCategoria).length})
          </TabsTrigger>
          <TabsTrigger value="pendientes">
            ⏳ Pendientes ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="entregados">
            ✅ Entregados ({deliveredOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="familias" className="space-y-4 mt-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle>Pedidos Agrupados por Familia</CardTitle>
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
              {Object.values(ordersByFamily).length === 0 ? (
                <div className="text-center py-12">
                  <Clover className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No hay pedidos registrados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.values(ordersByFamily).map(family => {
                    const totalDecimosFamilia = family.orders.reduce((sum, o) => sum + o.numero_decimos, 0);
                    const totalDineroFamilia = family.orders.reduce((sum, o) => sum + o.total, 0);
                    const todosPagados = family.orders.every(o => o.pagado);
                    const todosEntregados = family.orders.every(o => o.estado === "Entregado");

                  return (
                    <Card key={family.email} className="border-2 hover:shadow-lg transition-shadow">
                      <CardHeader className="bg-gradient-to-r from-orange-50 to-green-50 border-b pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm text-slate-600 mb-1">📧 {family.email}</p>
                            <p className="text-lg font-bold text-slate-900">
                              {family.orders.length} jugador{family.orders.length > 1 ? 'es' : ''} • {totalDecimosFamilia} décimo{totalDecimosFamilia > 1 ? 's' : ''}
                            </p>
                            <p className="text-xl font-bold text-orange-600 mt-1">{totalDineroFamilia}€</p>
                          </div>
                          <div className="flex flex-col gap-2">
                            {todosEntregados && (
                              <Badge className="bg-green-100 text-green-700">✅ Todo Entregado</Badge>
                            )}
                            {todosPagados && (
                              <Badge className="bg-blue-100 text-blue-700">💰 Todo Pagado</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          {family.orders.map(order => (
                            <div key={order.id} className="bg-slate-50 p-3 rounded-lg border">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-bold text-slate-900">{order.jugador_nombre}</p>
                                  <p className="text-sm text-slate-600">{order.jugador_categoria}</p>
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
                              {order.estado === "Solicitado" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkAsDelivered(order)}
                                  className="w-full mt-3 bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Marcar como Entregado y Pagado
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias" className="space-y-4 mt-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <CardTitle>Pedidos por Categoría y Familia</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {Object.entries(decimosPorCategoria).sort(([a], [b]) => a.localeCompare(b)).map(([categoria, stats]) => {
                  const categoryOrders = filteredOrders.filter(o => (o.jugador_categoria || "Sin categoría") === categoria);
                  const categoryOrdersByFamily = {};
                  categoryOrders.forEach(order => {
                    if (!categoryOrdersByFamily[order.email_padre]) {
                      categoryOrdersByFamily[order.email_padre] = [];
                    }
                    categoryOrdersByFamily[order.email_padre].push(order);
                  });

                  return (
                    <Card key={categoria} className="border-2 border-orange-300">
                      <CardHeader className="bg-gradient-to-r from-orange-100 to-orange-50 border-b">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">{categoria}</h3>
                            <p className="text-sm text-slate-600 mt-1">
                              {stats.decimos} décimos • {stats.familias.size} familias • {stats.jugadores.size} jugadores
                            </p>
                          </div>
                          <Badge className="bg-orange-600 text-white text-lg px-4 py-2">
                            {stats.decimos} 🎟️
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          {Object.entries(categoryOrdersByFamily).map(([email, familyOrders]) => {
                            const totalDecimosFam = familyOrders.reduce((sum, o) => sum + o.numero_decimos, 0);
                            const totalDineroFam = familyOrders.reduce((sum, o) => sum + o.total, 0);
                            
                            return (
                              <div key={email} className="bg-slate-50 p-3 rounded-lg border">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-bold text-slate-900">📧 {email}</p>
                                    <p className="text-sm text-slate-600">
                                      {familyOrders.length} jugador{familyOrders.length > 1 ? 'es' : ''} • {totalDecimosFam} décimos • {totalDineroFam}€
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-2 mt-2">
                                  {familyOrders.map(order => (
                                    <div key={order.id} className="flex justify-between items-center text-sm bg-white p-2 rounded">
                                      <span className="font-medium">{order.jugador_nombre}</span>
                                      <div className="flex gap-2 items-center">
                                        <span>{order.numero_decimos} décimos</span>
                                        <Badge className={statusColors[order.estado]} size="sm">
                                          {order.estado}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pendientes" className="space-y-4 mt-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <CardTitle>Pedidos Pendientes de Entrega</CardTitle>
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
                            <p className="text-xs text-slate-500">📧 {order.email_padre}</p>
                          </div>
                          <Badge className={statusColors[order.estado]}>
                            {order.estado}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm mb-3">
                          <p>🎟️ <strong>Décimos:</strong> {order.numero_decimos}</p>
                          <p>💰 <strong>Total:</strong> {order.total}€</p>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleMarkAsDelivered(order)}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Marcar Entregado y Pagado
                        </Button>
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
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-slate-900">{order.jugador_nombre}</h3>
                            <p className="text-sm text-slate-600">{order.email_padre}</p>
                          </div>
                          <Badge className="bg-green-100 text-green-700">✓ Entregado</Badge>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}