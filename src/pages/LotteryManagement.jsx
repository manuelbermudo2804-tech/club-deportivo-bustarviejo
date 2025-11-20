import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clover, Check, FileDown } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

const NUMERO_LOTERIA = "28720";

export default function LotteryManagement() {
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

  const markAsDeliveredMutation = useMutation({
    mutationFn: (orderId) => {
      const order = orders.find(o => o.id === orderId);
      return base44.entities.LotteryOrder.update(orderId, {
        ...order,
        estado: "Entregado",
        pagado: true,
        entregado_por: user.email,
        fecha_entrega: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allLotteryOrders'] });
      toast.success("✅ Entregado");
    },
  });

  // Calcular estadísticas por categoría
  const decimosPorCategoria = {};
  orders.forEach(order => {
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

  const exportPDF = () => {
    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(18);
    doc.text('CLUB DEPORTIVO BUSTARVIEJO', 105, yPos, { align: 'center' });
    yPos += 8;
    doc.setFontSize(14);
    doc.text('LOTERIA DE NAVIDAD - POR CATEGORIA Y JUGADOR', 105, yPos, { align: 'center' });
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

      const categoryOrders = orders.filter(o => (o.jugador_categoria || "Sin categoría") === cat);

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

    doc.save(`loteria_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("📄 PDF descargado");
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
    <div className="p-3 lg:p-8 space-y-4 lg:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-xl lg:text-3xl font-bold text-slate-900">🍀 Gestión Lotería</h1>
          <p className="text-xs lg:text-sm text-slate-600 mt-1">Número: {NUMERO_LOTERIA}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportPDF} size="sm" variant="outline">
            <FileDown className="w-4 h-4 mr-2" />
            Descargar PDF
          </Button>
          <Button
            onClick={() => toggleLotteryMutation.mutate()}
            disabled={toggleLotteryMutation.isPending}
            size="sm"
            className={seasonConfig?.loteria_navidad_abierta ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {seasonConfig?.loteria_navidad_abierta ? '🔒 Cerrar' : '🛍️ Abrir'}
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Décimos</p>
              <p className="text-4xl font-bold text-orange-600">{totalDecimos}</p>
            </div>
            <Clover className="w-16 h-16 text-orange-400 opacity-50" />
          </div>
        </CardContent>
      </Card>

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
                  <div className="text-right">
                    <p className="text-3xl font-bold text-orange-600">{stats.decimos}</p>
                    <p className="text-xs text-slate-600">décimos</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {categoryOrders.map(order => (
                    <div key={order.id} className="flex justify-between items-center p-3 bg-white rounded-lg border hover:border-orange-300 transition-colors">
                      <div>
                        <p className="font-bold text-slate-900">{order.jugador_nombre}</p>
                        <p className="text-xs text-slate-600">{order.email_padre}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-lg text-orange-600">{order.numero_decimos}</p>
                          <p className="text-xs text-slate-600">{order.total}€</p>
                        </div>
                        {order.estado === "Entregado" ? (
                          <Badge className="bg-green-100 text-green-700">✅</Badge>
                        ) : (
                          <Button
                            onClick={() => markAsDeliveredMutation.mutate(order.id)}
                            size="sm"
                            variant="outline"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
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
  );
}