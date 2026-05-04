import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clover, Check, FileDown, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
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

const NUMERO_LOTERIA = "28720";

export default function LotteryManagement() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, orderId: null, action: null });
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAdmin = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const hasAccess = currentUser.role === "admin" || currentUser.es_tesorero === true || currentUser.es_entrenador === true || currentUser.es_coordinador === true;
      setIsAdmin(hasAccess);
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

  const { data: allOrders = [] } = useQuery({
    queryKey: ['allLotteryOrders'],
    queryFn: () => base44.entities.LotteryOrder.list('-created_date'),
    enabled: isAdmin,
    initialData: [],
  });

  // Filtrar por temporada activa
  const activeSeasonName = seasonConfig?.temporada ? seasonConfig.temporada.replace(/-/g,'/') : null;
  const allOrdersSeason = React.useMemo(() => {
    if (!activeSeasonName) return allOrders;
    return allOrders.filter(o => (o.temporada || '').replace(/-/g,'/') === activeSeasonName);
  }, [allOrders, activeSeasonName]);

  // Solo cuentan como "vendidos" los pedidos pagados o ya entregados, y solo de la temporada activa
  // (mismo criterio que ParentLottery para que admin y familia vean el mismo número)
  const totalDecimosVendidos = allOrdersSeason.reduce((sum, o) => {
    const countable = o?.pagado === true || o?.estado === 'Entregado';
    return sum + (countable ? (o.numero_decimos || 0) : 0);
  }, 0);
  const maxDecimos = seasonConfig?.loteria_max_decimos;
  const decimosDisponibles = maxDecimos ? maxDecimos - totalDecimosVendidos : null;
  const agotado = maxDecimos && totalDecimosVendidos >= maxDecimos;

  // Filtrar pedidos según el rol del usuario
  const orders = React.useMemo(() => {
    if (!user) return [];
    const base = allOrdersSeason;
    // Admin y Tesorero ven todo
    if (user.role === "admin" || user.es_tesorero === true) return base;
    
    // Entrenadores/coordinadores solo ven sus categorías
    const myCategories = user.categorias_entrena || [];
    return base.filter(order => myCategories.includes(order.jugador_categoria));
  }, [allOrdersSeason, user]);

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LotteryOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allLotteryOrders'] });
      toast.success("✅ Marcado como entregado");
    },
  });

  const toggleLotteryMutation = useMutation({
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
      toast.success(seasonConfig?.loteria_navidad_abierta ? "🔒 Lotería cerrada" : "✅ Lotería abierta");
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (orderId) => {
      const order = orders.find(o => o.id === orderId);
      const updated = await base44.entities.LotteryOrder.update(orderId, {
        ...order,
        pagado: true
      });

      // Registrar margen en FinancialTransaction (evitar duplicados)
      try {
        const existentes = await base44.entities.FinancialTransaction.filter({ referencia_origen: orderId, concepto: 'Ganancia Lotería' });
        if (!existentes || existentes.length === 0) {
          const baseCoste = 20;
          const precio = Number(order?.precio_por_decimo || seasonConfig?.precio_decimo_loteria || 22);
          const margenPorDecimoLocal = Math.max(precio - baseCoste, 0);
          const decimos = Number(order?.numero_decimos || 0);
          const margenTotal = Number((margenPorDecimoLocal * decimos).toFixed(2));
          if (margenTotal > 0) {
            await base44.entities.FinancialTransaction.create({
              tipo: 'Ingreso',
              concepto: 'Ganancia Lotería',
              cantidad: margenTotal,
              fecha: new Date().toISOString().split('T')[0],
              categoria: 'Lotería',
              subtipo_documento: 'Lotería',
              metodo_pago: order?.metodo_pago || 'Transferencia',
              temporada: order?.temporada || '',
              proveedor_cliente: order?.jugador_nombre || '',
              automatico: true,
              referencia_origen: orderId,
              notas: `Margen ${margenPorDecimoLocal}€ x ${decimos} décimos`
            });
          }
        }
      } catch (e) {
        console.error('[LotteryManagement] Error creando FinancialTransaction margen lotería:', e);
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allLotteryOrders'] });
      setConfirmDialog({ open: false, orderId: null, action: null });
      toast.success("✅ Marcado como pagado");
    },
  });

  const markAsDeliveredMutation = useMutation({
    mutationFn: (orderId) => {
      const order = orders.find(o => o.id === orderId);
      return base44.entities.LotteryOrder.update(orderId, {
        ...order,
        estado: "Entregado",
        entregado_por: user.email,
        fecha_entrega: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allLotteryOrders'] });
      setConfirmDialog({ open: false, orderId: null, action: null });
      toast.success("✅ Marcado como entregado");
    },
  });

  const revertPaidMutation = useMutation({
    mutationFn: (orderId) => {
      const order = orders.find(o => o.id === orderId);
      return base44.entities.LotteryOrder.update(orderId, {
        ...order,
        pagado: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allLotteryOrders'] });
      setConfirmDialog({ open: false, orderId: null, action: null });
      toast.success("↩️ Pago revertido");
    },
  });

  const revertDeliveryMutation = useMutation({
    mutationFn: (orderId) => {
      const order = orders.find(o => o.id === orderId);
      return base44.entities.LotteryOrder.update(orderId, {
        ...order,
        estado: "Solicitado",
        entregado_por: null,
        fecha_entrega: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allLotteryOrders'] });
      setConfirmDialog({ open: false, orderId: null, action: null });
      toast.success("↩️ Entrega revertida");
    },
  });

  const handleConfirmAction = () => {
    if (confirmDialog.action === 'deliver') {
      markAsDeliveredMutation.mutate(confirmDialog.orderId);
    } else if (confirmDialog.action === 'revert_delivery') {
      revertDeliveryMutation.mutate(confirmDialog.orderId);
    } else if (confirmDialog.action === 'mark_paid') {
      markAsPaidMutation.mutate(confirmDialog.orderId);
    } else if (confirmDialog.action === 'revert_paid') {
      revertPaidMutation.mutate(confirmDialog.orderId);
    }
  };

  // Filtrar pedidos según el estado
  const filteredOrders = React.useMemo(() => {
    if (statusFilter === "all") return orders;
    if (statusFilter === "pending_payment") return orders.filter(o => !o.pagado);
    if (statusFilter === "paid") return orders.filter(o => o.pagado && o.estado !== "Entregado");
    if (statusFilter === "delivered") return orders.filter(o => o.estado === "Entregado");
    return orders;
  }, [orders, statusFilter]);

  // Calcular estadísticas por categoría
  const decimosPorCategoria = {};
  filteredOrders.forEach(order => {
    const cat = order.jugador_categoria || "Sin categoría";
    if (!decimosPorCategoria[cat]) {
      decimosPorCategoria[cat] = {
        decimos: 0,
        jugadores: new Set()
      };
    }
    decimosPorCategoria[cat].decimos += order.numero_decimos;
    decimosPorCategoria[cat].jugadores.add(order.jugador_nombre);
  });

  const totalDecimos = orders.reduce((sum, o) => sum + (o.numero_decimos || 0), 0);
  const margenPorDecimo = Math.max(((seasonConfig?.precio_decimo_loteria || 22) - 20), 0);
  const gananciasClub = totalDecimos * margenPorDecimo;
  const pendingPaymentCount = orders.filter(o => !o.pagado).length;
  const paidNotDeliveredCount = orders.filter(o => o.pagado && o.estado !== "Entregado").length;
  const deliveredCount = orders.filter(o => o.estado === "Entregado").length;

  const exportPDF = () => {
    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(18);
    doc.text('CLUB DEPORTIVO BUSTARVIEJO', 105, yPos, { align: 'center' });
    yPos += 8;
    doc.setFontSize(14);
    doc.text('LOTERIA DE NAVIDAD - TODAS LAS CATEGORIAS', 105, yPos, { align: 'center' });
    yPos += 6;
    doc.setFontSize(10);
    doc.text(`Numero: ${NUMERO_LOTERIA} | Fecha: ${new Date().toLocaleDateString('es-ES')}`, 105, yPos, { align: 'center' });
    yPos += 12;

    const sortedCategories = Object.keys(decimosPorCategoria).sort();
    
    sortedCategories.forEach((cat, catIndex) => {
      if (catIndex > 0 || yPos > 50) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.text(`CATEGORIA: ${cat}`, 20, yPos);
      yPos += 6;
      doc.setFontSize(10);
      doc.text(`Total Decimos: ${decimosPorCategoria[cat].decimos} | Jugadores: ${decimosPorCategoria[cat].jugadores.size}`, 20, yPos);
      yPos += 10;

      const categoryOrders = filteredOrders.filter(o => (o.jugador_categoria || "Sin categoría") === cat);

      categoryOrders.forEach(order => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(11);
        doc.text(`• ${order.jugador_nombre}`, 25, yPos);
        yPos += 6;
        doc.setFontSize(9);
        doc.text(`  Email: ${order.email_padre}`, 30, yPos);
        yPos += 5;
        doc.text(`  Decimos: ${order.numero_decimos} | Total: ${order.total} EUR | Estado: ${order.estado}`, 30, yPos);
        yPos += 7;
      });
      yPos += 5;
    });

    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.text('RESUMEN FINAL POR CATEGORIA', 20, yPos);
    yPos += 10;
    doc.setFontSize(10);

    sortedCategories.forEach(cat => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${cat}: ${decimosPorCategoria[cat].decimos} decimos (${decimosPorCategoria[cat].jugadores.size} jugadores)`, 25, yPos);
      yPos += 6;
    });

    yPos += 5;
    doc.setFontSize(12);
    doc.text(`TOTAL GENERAL: ${totalDecimos} decimos`, 25, yPos);

    doc.save(`loteria_completa_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("📄 PDF completo descargado");
  };

  const exportCategoryPDF = (categoria) => {
    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(18);
    doc.text('CLUB DEPORTIVO BUSTARVIEJO', 105, yPos, { align: 'center' });
    yPos += 8;
    doc.setFontSize(14);
    doc.text('LOTERIA DE NAVIDAD', 105, yPos, { align: 'center' });
    yPos += 6;
    doc.setFontSize(10);
    doc.text(`Numero: ${NUMERO_LOTERIA} | Fecha: ${new Date().toLocaleDateString('es-ES')}`, 105, yPos, { align: 'center' });
    yPos += 12;

    doc.setFontSize(14);
    doc.text(`CATEGORIA: ${categoria}`, 20, yPos);
    yPos += 8;

    const categoryOrders = orders.filter(o => (o.jugador_categoria || "Sin categoría") === categoria);
    const totalDecimosCat = categoryOrders.reduce((sum, o) => sum + o.numero_decimos, 0);

    doc.setFontSize(12);
    doc.text(`Total Decimos: ${totalDecimosCat}`, 20, yPos);
    yPos += 6;
    doc.text(`Total Jugadores: ${categoryOrders.length}`, 20, yPos);
    yPos += 12;

    doc.setFontSize(12);
    doc.text('LISTADO DE JUGADORES:', 20, yPos);
    yPos += 8;

    categoryOrders.forEach(order => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(11);
      doc.text(`• ${order.jugador_nombre}`, 25, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.text(`  Email: ${order.email_padre}`, 30, yPos);
      yPos += 5;
      doc.text(`  Decimos: ${order.numero_decimos} | Total: ${order.total} EUR | Estado: ${order.estado}`, 30, yPos);
      yPos += 8;
    });

    yPos += 10;
    doc.setFontSize(12);
    doc.text(`TOTAL CATEGORIA ${categoria.toUpperCase()}: ${totalDecimosCat} decimos`, 20, yPos);

    const fileName = categoria.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '');
    doc.save(`loteria_${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success(`📄 PDF de ${categoria} descargado`);
  };

  if (!isAdmin) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-900">No tienes permisos</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, orderId: null, action: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'deliver' && '✅ Confirmar Entrega'}
              {confirmDialog.action === 'revert_delivery' && '↩️ Revertir Entrega'}
              {confirmDialog.action === 'mark_paid' && '💰 Confirmar Pago'}
              {confirmDialog.action === 'revert_paid' && '↩️ Revertir Pago'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'deliver' && '¿Confirmas que has entregado los décimos de lotería a este jugador/entrenador?'}
              {confirmDialog.action === 'revert_delivery' && '¿Deseas revertir esta entrega y marcarla como pendiente?'}
              {confirmDialog.action === 'mark_paid' && '¿Confirmas que has verificado el pago de este pedido? (justificante subido)'}
              {confirmDialog.action === 'revert_paid' && '¿Deseas revertir la verificación de pago de este pedido?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={confirmDialog.action?.includes('revert') ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {confirmDialog.action?.includes('revert') ? <RotateCcw className="w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {confirmDialog.action === 'deliver' && 'Marcar Entregado'}
              {confirmDialog.action === 'revert_delivery' && 'Revertir Entrega'}
              {confirmDialog.action === 'mark_paid' && 'Marcar Pagado'}
              {confirmDialog.action === 'revert_paid' && 'Revertir Pago'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="p-3 lg:p-8 space-y-4 lg:space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
          <h1 className="text-xl lg:text-3xl font-bold text-slate-900">🍀 Gestión Lotería</h1>
          <p className="text-xs lg:text-sm text-slate-600 mt-1">Número: {NUMERO_LOTERIA}</p>
          {user?.role !== "admin" && !user?.es_tesorero && (
            <Badge className="mt-2 bg-blue-600">
              🎓 {user?.categorias_entrena?.length || 0} categoría{user?.categorias_entrena?.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {(user?.role === "admin" || user?.es_tesorero) && (
            <Button onClick={exportPDF} size="sm" variant="outline">
              <FileDown className="w-4 h-4 mr-2" />
              PDF Completo
            </Button>
          )}
          {(user?.role === "admin" || user?.es_tesorero) && (
            <Button
              onClick={() => toggleLotteryMutation.mutate()}
              disabled={toggleLotteryMutation.isPending}
              size="sm"
              className={seasonConfig?.loteria_navidad_abierta ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {seasonConfig?.loteria_navidad_abierta ? '🔒 Cerrar' : '🛍️ Abrir'}
            </Button>
          )}
        </div>
        </div>

        {maxDecimos && (
          <Card className="border-4 border-yellow-400 shadow-2xl bg-gradient-to-r from-green-50 to-green-100">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">📊 Disponibilidad</p>
                    <p className="text-5xl font-bold text-green-600">{decimosDisponibles}</p>
                    <p className="text-sm text-slate-600 mt-1">de {maxDecimos} décimos</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-orange-600">{totalDecimosVendidos}</p>
                    <p className="text-sm text-slate-600">vendidos</p>
                  </div>
                </div>
                <div className="bg-white rounded-full h-6 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${agotado ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${(totalDecimosVendidos / maxDecimos) * 100}%` }}
                  />
                </div>
                {agotado && (
                  <div className="bg-red-100 border-2 border-red-300 rounded-lg p-3 text-center">
                    <p className="text-red-800 font-bold">🚫 ¡AGOTADO! La lotería se cerró automáticamente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-slate-600 mb-1">
                    {user?.role === "admin" ? "Total Décimos (Club)" : "Total Décimos (Mis Categorías)"}
                  </p>
                  <p className="text-4xl font-bold text-orange-600">{totalDecimos}</p>
                  {user?.role !== "admin" && (
                    <p className="text-xs text-slate-600 mt-2">
                      {Object.keys(decimosPorCategoria).length} categoría{Object.keys(decimosPorCategoria).length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <Clover className="w-16 h-16 text-orange-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          {(user?.role === "admin" || user?.es_tesorero) && (
            <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">💰 Ganancias Club</p>
                    <p className="text-4xl font-bold text-green-600">{gananciasClub}€</p>
                    <p className="text-xs text-slate-600 mt-2">2€ por décimo vendido</p>
                  </div>
                  <div className="text-5xl">💸</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filtros de estado */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setStatusFilter("all")}
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            className={statusFilter === "all" ? "bg-slate-700" : ""}
          >
            📋 Todos ({orders.length})
          </Button>
          <Button
            onClick={() => setStatusFilter("pending_payment")}
            variant={statusFilter === "pending_payment" ? "default" : "outline"}
            size="sm"
            className={statusFilter === "pending_payment" ? "bg-red-600 hover:bg-red-700" : "border-red-300 text-red-700 hover:bg-red-50"}
          >
            💳 Pendientes Pago ({pendingPaymentCount})
          </Button>
          <Button
            onClick={() => setStatusFilter("paid")}
            variant={statusFilter === "paid" ? "default" : "outline"}
            size="sm"
            className={statusFilter === "paid" ? "bg-green-600 hover:bg-green-700" : "border-green-300 text-green-700 hover:bg-green-50"}
          >
            💰 Pagados ({paidNotDeliveredCount})
          </Button>
          <Button
            onClick={() => setStatusFilter("delivered")}
            variant={statusFilter === "delivered" ? "default" : "outline"}
            size="sm"
            className={statusFilter === "delivered" ? "bg-purple-600 hover:bg-purple-700" : "border-purple-300 text-purple-700 hover:bg-purple-50"}
          >
            📦 Entregados ({deliveredCount})
          </Button>
        </div>

        <div className="space-y-4">
        {Object.entries(decimosPorCategoria).sort(([a], [b]) => a.localeCompare(b)).map(([categoria, stats]) => {
          const categoryOrders = orders.filter(o => (o.jugador_categoria || "Sin categoría") === categoria);
          
          return (
            <Card key={categoria} className="border-2 border-orange-300 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-100 to-orange-50">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{categoria}</h2>
                    <p className="text-sm text-slate-600 mt-1">
                      {stats.jugadores.size} jugadores
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => exportCategoryPDF(categoria)}
                      size="sm"
                      variant="outline"
                      className="bg-white"
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-orange-600">{stats.decimos}</p>
                      <p className="text-xs text-slate-600">décimos</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {categoryOrders.map(order => (
                    <div key={order.id} className="flex justify-between items-center p-3 bg-white rounded-lg border hover:border-orange-300 transition-colors">
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{order.jugador_nombre}</p>
                        <p className="text-xs text-slate-600">{order.email_padre}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {order.metodo_pago && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              {order.metodo_pago === "Bizum" ? "📱 Bizum" : order.metodo_pago === "Tarjeta" ? "💳 Tarjeta" : "🏦 Transferencia"}
                            </Badge>
                          )}
                          {order.justificante_url && user?.role === "admin" && (
                            <a 
                              href={order.justificante_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Ver justificante
                            </a>
                          )}
                          {order.pagado && (
                            <Badge className="bg-green-100 text-green-700 text-xs font-bold">
                              💰 PAGADO
                            </Badge>
                          )}
                          {order.estado === "Entregado" && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs font-bold">
                              📦 ENTREGADO
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-bold text-lg text-orange-600">{order.numero_decimos}</p>
                          <p className="text-xs text-slate-600">{order.total}€</p>
                        </div>
                        
                        {(user?.role === "admin" || user?.es_tesorero) ? (
                          <div className="flex gap-2">
                            {order.pagado ? (
                              <Button
                                onClick={() => setConfirmDialog({ open: true, orderId: order.id, action: 'revert_paid' })}
                                size="sm"
                                variant="outline"
                                className="border-orange-300 hover:bg-orange-50"
                                title="Revertir pago"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                onClick={() => setConfirmDialog({ open: true, orderId: order.id, action: 'mark_paid' })}
                                size="sm"
                                variant="outline"
                                className="border-green-300 hover:bg-green-50"
                                title="Marcar como pagado"
                              >
                                💰
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            {order.estado === "Entregado" ? (
                              <Button
                                onClick={() => setConfirmDialog({ open: true, orderId: order.id, action: 'revert_delivery' })}
                                size="sm"
                                variant="outline"
                                className="border-orange-300 hover:bg-orange-50"
                                title="Revertir entrega"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                onClick={() => setConfirmDialog({ open: true, orderId: order.id, action: 'deliver' })}
                                size="sm"
                                variant="outline"
                                className="border-green-300 hover:bg-green-50"
                                disabled={!order.pagado}
                                title={order.pagado ? "Marcar como entregado" : "Debe estar pagado primero"}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      </div>
    </>
  );
}