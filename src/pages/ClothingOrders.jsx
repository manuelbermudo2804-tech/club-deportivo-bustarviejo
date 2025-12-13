import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingBag, AlertCircle, MoreVertical, Check, Package, Truck, Users, Download, FileDown, History, ChevronDown, ChevronUp, Filter, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import ClothingOrderForm from "../components/clothing/ClothingOrderForm";
import OrdersSummary from "../components/clothing/OrdersSummary";
import ClothingPriceConfig from "../components/clothing/ClothingPriceConfig";
import ContactCard from "../components/ContactCard";
import ClothingOrderSuccess from "../components/clothing/ClothingOrderSuccess";
import { usePageTutorial } from "../components/tutorials/useTutorial";

export default function ClothingOrders() {
  // Tutorial interactivo para primera visita (solo para padres, no admin)
  usePageTutorial("parent_clothing");
  
  const [showForm, setShowForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState(null);
  const [historyFilters, setHistoryFilters] = useState({
    search: '',
    estado: 'todos',
    metodo_pago: 'todos',
    fecha_desde: '',
    fecha_hasta: ''
  });
  
  const queryClient = useQueryClient();

  const { data: user, refetch: refetchUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 30000, // 30 segundos
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

  const { data: seasonConfig, refetch: refetchSeasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
    initialData: null,
    staleTime: 10000,
  });

  const orderPeriodActive = seasonConfig?.tienda_ropa_abierta === true;

  const { data: allPlayers, isLoading: loadingAllPlayers } = useQuery({
    queryKey: ['allPlayersForClothing'],
    queryFn: async () => {
      const list = await base44.entities.Player.list();
      console.log('🔄 [ClothingOrders] Jugadores cargados desde API:', list.length);
      return list;
    },
    initialData: [],
    staleTime: 0, // Sin caché
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const players = useMemo(() => {
    if (!user?.email || !allPlayers) {
      console.log('🔍 [ClothingOrders] Sin user o allPlayers:', { hasUser: !!user, hasAllPlayers: !!allPlayers });
      return [];
    }
    
    const userEmail = user.email.toLowerCase().trim();
    console.log('🔍 [ClothingOrders] Filtrando jugadores para:', userEmail);
    console.log('🔍 [ClothingOrders] Total jugadores en BD:', allPlayers.length);
    
    const filtered = allPlayers.filter(p => {
      const emailPadre = p.email_padre?.toLowerCase().trim();
      const emailTutor2 = p.email_tutor_2?.toLowerCase().trim();
      
      const isMyPlayer = emailPadre === userEmail || emailTutor2 === userEmail;
      const isActive = p.activo === true;
      
      console.log(`👤 ${p.nombre}:`, { 
        emailPadre, 
        emailTutor2, 
        activo: p.activo, 
        isMyPlayer, 
        isActive,
        matches: isMyPlayer && isActive 
      });
      
      return isMyPlayer && isActive;
    });
    
    console.log('✅ [ClothingOrders] Jugadores filtrados:', filtered.length);
    return filtered;
  }, [user?.email, allPlayers]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['myClothingOrders', user?.email, isAdmin],
    queryFn: async () => {
      const allOrders = await base44.entities.ClothingOrder.list('-created_date');
      if (isAdmin) return allOrders;
      return allOrders.filter(order => order.email_padre === user?.email);
    },
    enabled: !!user?.email,
    initialData: [],
    staleTime: 30000, // 30 segundos
  });

  // Verificar si el usuario tiene pedidos pendientes realizados anteriormente
  const hasPendingOrders = useMemo(() => {
    if (!user || !orders) return false;
    const myOrders = orders.filter(o => o.email_padre === user.email);
    return myOrders.some(o => o.estado !== "Entregado" && o.estado !== "Cancelado");
  }, [user, orders]);

  const createOrderMutation = useMutation({
    mutationFn: (orderData) => base44.entities.ClothingOrder.create(orderData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['myClothingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['allPlayersForClothing'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setShowForm(false);
      setLastOrderDetails(variables);
      setShowSuccessDialog(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  // Función para actualizar el crédito del usuario cuando se usa Y registrar en histórico
  const handleCreditUsed = async (creditUsed, orderData) => {
    if (creditUsed > 0 && user) {
      const saldoAntes = user.clothing_credit_balance || 0;
      const newBalance = Math.max(0, saldoAntes - creditUsed);
      
      // Actualizar saldo del usuario
      await base44.auth.updateMe({ clothing_credit_balance: newBalance });
      
      // Registrar el gasto en histórico
      try {
        await base44.entities.CreditoRopaHistorico.create({
          user_email: user.email,
          user_nombre: user.full_name,
          tipo: "gastado",
          cantidad: creditUsed,
          concepto: `Pedido equipación - ${orderData.jugador_nombre}`,
          temporada: seasonConfig?.temporada || "",
          jugador_nombre: orderData.jugador_nombre,
          saldo_antes: saldoAntes,
          saldo_despues: newBalance,
          fecha_movimiento: new Date().toISOString()
        });
      } catch (error) {
        console.error("Error registrando gasto de crédito:", error);
      }
      
      // Invalidar y refetch para que se actualice el crédito en toda la UI
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      await refetchUser();
      toast.success(`🎁 Se han aplicado ${creditUsed}€ de tu crédito`);
    }
  };

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus, notifyParent }) => {
      const order = orders.find(o => o.id === orderId);
      const updatedOrder = await base44.entities.ClothingOrder.update(orderId, {
        ...order,
        estado: newStatus,
        pagado: newStatus === "Confirmado" ? true : order.pagado
      });
      
      if (notifyParent && order.email_padre) {
        const statusMessages = {
          "Confirmado": `✅ Pedido confirmado para ${order.jugador_nombre}. Su equipación está en proceso.`,
          "Preparado": `📦 Pedido listo para ${order.jugador_nombre}. Puede recogerlo en las instalaciones del club.`,
          "Entregado": `🎉 Pedido entregado para ${order.jugador_nombre}. ¡Gracias por su confianza!`
        };
        
        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo",
          to: order.email_padre,
          subject: `Estado de Pedido - ${order.jugador_nombre}`,
          body: statusMessages[newStatus] || `Estado actualizado a: ${newStatus}`
        });
      }
      
      return updatedOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myClothingOrders'] });
      toast.success("Estado actualizado y notificación enviada");
    },
  });

  const handleSubmit = async (orderData) => {
    const dataToSubmit = {
      ...orderData,
      estado: orderData.justificante_url ? "En revisión" : "Pendiente"
    };
    
    // Notificar al admin si las notificaciones están activas
    if (seasonConfig?.notificaciones_admin_email) {
      try {
        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo - Pedidos Ropa",
          to: "cdbustarviejo@gmail.com",
          subject: `👕 Nuevo Pedido de Ropa - ${orderData.jugador_nombre}`,
          body: `
            <h2>Nuevo Pedido de Equipación</h2>
            <p><strong>Jugador:</strong> ${orderData.jugador_nombre}</p>
            <p><strong>Categoría:</strong> ${orderData.jugador_categoria}</p>
            <p><strong>Email:</strong> ${orderData.email_padre}</p>
            <p><strong>Total:</strong> ${orderData.precio_total}€</p>
            <p><strong>Método de pago:</strong> ${orderData.metodo_pago || 'No especificado'}</p>
            ${orderData.justificante_url ? `<p><strong>Justificante:</strong> <a href="${orderData.justificante_url}">Ver</a></p>` : ''}
            <hr>
            <p style="font-size: 12px; color: #666;">Registrado el ${new Date().toLocaleString('es-ES')}</p>
          `
        });
      } catch (error) {
        console.error("Error sending clothing order notification:", error);
      }
    }
    
    createOrderMutation.mutate(dataToSubmit);
  };

  // Memorizar agrupación de pedidos por familia
  const ordersByFamily = useMemo(() => {
    const grouped = {};
    orders.forEach(order => {
      if (!grouped[order.email_padre]) {
        grouped[order.email_padre] = [];
      }
      grouped[order.email_padre].push(order);
    });
    return grouped;
  }, [orders]);

  // Memorizar pedidos activos por familia
  const activeOrdersByFamily = useMemo(() => {
    const active = {};
    Object.entries(ordersByFamily).forEach(([email, familyOrders]) => {
      const activeOrders = familyOrders.filter(o => o.estado !== "Entregado");
      if (activeOrders.length > 0) {
        active[email] = activeOrders;
      }
    });
    return active;
  }, [ordersByFamily]);

  const exportFamiliesCSV = () => {

    const rows = [
      ['Email Familia', 'Jugador', 'Categoría', 'Items', 'Total', 'Estado']
    ];

    Object.entries(ordersByFamily).forEach(([email, familyOrders]) => {
      familyOrders.forEach(order => {
        const items = [
          order.chaqueta_partidos && `Chaqueta ${order.chaqueta_talla}`,
          order.pack_entrenamiento && `Pack (${order.pack_camiseta_talla}/${order.pack_pantalon_talla}/${order.pack_sudadera_talla})`,
          order.camiseta_individual && `Camiseta ${order.camiseta_individual_talla}`,
          order.pantalon_individual && `Pantalón ${order.pantalon_individual_talla}`,
          order.sudadera_individual && `Sudadera ${order.sudadera_individual_talla}`,
          order.chubasquero && `Chubasquero ${order.chubasquero_talla}`,
          order.anorak && `Anorak ${order.anorak_talla}`,
          order.mochila && 'Mochila'
        ].filter(Boolean).join(' | ');

        rows.push([
          email,
          order.jugador_nombre,
          order.jugador_categoria,
          items,
          `${order.precio_total}`,
          order.estado
        ]);
      });
    });

    const csvContent = '\ufeff' + rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pedidos_por_familia_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("📄 CSV exportado correctamente");
  };

  const exportPlayersCSV = () => {
    const rows = [
      ['Jugador', 'Categoría', 'Email', 'Chaqueta', 'Pack', 'Camiseta', 'Pantalón', 'Sudadera', 'Chubasquero', 'Anorak', 'Mochila', 'Total', 'Estado']
    ];

    orders.forEach(order => {
      rows.push([
        order.jugador_nombre,
        order.jugador_categoria,
        order.email_padre,
        order.chaqueta_partidos ? order.chaqueta_talla : '',
        order.pack_entrenamiento ? `${order.pack_camiseta_talla}/${order.pack_pantalon_talla}/${order.pack_sudadera_talla}` : '',
        order.camiseta_individual ? order.camiseta_individual_talla : '',
        order.pantalon_individual ? order.pantalon_individual_talla : '',
        order.sudadera_individual ? order.sudadera_individual_talla : '',
        order.chubasquero ? order.chubasquero_talla : '',
        order.anorak ? order.anorak_talla : '',
        order.mochila ? 'Sí' : '',
        order.precio_total,
        order.estado
      ]);
    });

    const csvContent = '\ufeff' + rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pedidos_por_jugador_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("📄 CSV exportado correctamente");
  };

  const toggleStoreMutation = useMutation({
    mutationFn: async () => {
      const wasOpen = seasonConfig?.tienda_ropa_abierta === true;
      
      if (seasonConfig) {
        // Si existe, actualizar
        return { 
          config: await base44.entities.SeasonConfig.update(seasonConfig.id, {
            ...seasonConfig,
            tienda_ropa_abierta: !seasonConfig.tienda_ropa_abierta
          }),
          wasOpen
        };
      } else {
        // Si no existe, crear una temporada activa con tienda abierta
        const currentYear = new Date().getFullYear();
        return { 
          config: await base44.entities.SeasonConfig.create({
            temporada: `${currentYear}/${currentYear + 1}`,
            activa: true,
            cuota_unica: 0,
            cuota_tres_meses: 0,
            tienda_ropa_abierta: true
          }),
          wasOpen
        };
      }
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['seasonConfig'] });
      await refetchSeasonConfig();
      const newState = !result.wasOpen;
      
      // Si se está ABRIENDO la tienda (de cerrado → abierto)
      if (newState) {
        try {
          // 1. Obtener todas las familias con jugadores activos
          const activePlayers = await base44.entities.Player.filter({ activo: true });
          const uniqueEmails = new Set();
          activePlayers.forEach(p => {
            if (p.email_padre) uniqueEmails.add(p.email_padre);
            if (p.email_tutor_2) uniqueEmails.add(p.email_tutor_2);
          });
          
          // 2. Enviar email a cada familia
          const emailPromises = Array.from(uniqueEmails).map(email => 
            base44.integrations.Core.SendEmail({
              from_name: "CD Bustarviejo",
              to: email,
              subject: "🛍️ ¡Tienda de Equipación ABIERTA! - CD Bustarviejo",
              body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #ea580c; text-align: center;">🛍️ ¡La Tienda de Equipación ya está ABIERTA!</h1>
                  <p>Estimadas familias,</p>
                  <p>Ya pueden realizar pedidos de equipación para sus jugadores a través de la aplicación.</p>
                  
                  <div style="background: #f0fdfa; border-left: 4px solid #14b8a6; padding: 15px; margin: 20px 0;">
                    <h3 style="color: #0f766e; margin-top: 0;">📦 Productos Disponibles:</h3>
                    <ul style="color: #115e59;">
                      <li><strong>Chaqueta de Partidos:</strong> 35€</li>
                      <li><strong>Pack de Entrenamiento:</strong> 41€ (Camiseta + Pantalón + Sudadera)</li>
                      <li><strong>Chubasquero:</strong> 20€</li>
                      <li><strong>Anorak:</strong> 40€</li>
                      <li><strong>Mochila con botero:</strong> 22€</li>
                    </ul>
                  </div>
                  
                  <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0;">
                    <h3 style="color: #c2410c; margin-top: 0;">📅 Fechas Importantes:</h3>
                    <p style="color: #9a3412; margin: 5px 0;"><strong>Periodo de pedidos:</strong> Junio y Julio</p>
                    <p style="color: #9a3412; margin: 5px 0;"><strong>Recogida:</strong> Primera semana de Septiembre</p>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <p style="font-size: 18px; color: #334155;">👉 Accede a la app para hacer tu pedido</p>
                  </div>
                  
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                  <p style="text-align: center; color: #64748b; font-size: 12px;">
                    CD Bustarviejo<br>
                    📧 CDBUSTARVIEJO@GMAIL.COM
                  </p>
                </div>
              `
            })
          );
          
          await Promise.all(emailPromises);
          console.log(`✅ Emails enviados a ${uniqueEmails.size} familias`);
          
          // 3. Crear anuncio destacado
          const expiracion = new Date();
          expiracion.setDate(expiracion.getDate() + 30); // Expira en 30 días
          
          await base44.entities.Announcement.create({
            titulo: "🛍️ ¡Tienda de Equipación ABIERTA!",
            contenido: `Ya puedes hacer pedidos de equipación para tus jugadores.

**📦 Productos Disponibles:**
• Chaqueta de Partidos: 35€
• Pack de Entrenamiento: 41€ (Camiseta + Pantalón + Sudadera)
• Chubasquero: 20€
• Anorak: 40€
• Mochila con botero: 22€

**📅 Fechas Importantes:**
• Periodo de pedidos: Junio y Julio
• Recogida: Primera semana de Septiembre en las instalaciones del club

👉 Accede a la sección "Pedidos de Equipación" para realizar tu pedido.`,
            prioridad: "Urgente",
            destinatarios_tipo: "Todos",
            publicado: true,
            destacado: true,
            tipo_caducidad: "fecha",
            fecha_expiracion: expiracion.toISOString().split('T')[0],
            fecha_publicacion: new Date().toISOString(),
            enviar_email: false // Ya enviamos manualmente
          });
          
          console.log('✅ Anuncio destacado creado');
          toast.success(`✅ Tienda abierta • Enviados ${uniqueEmails.size} emails + anuncio creado`);
        } catch (error) {
          console.error('Error al notificar apertura:', error);
          toast.success("✅ Tienda abierta (error al enviar notificaciones)");
        }
      } else {
        toast.success("🔒 Tienda cerrada");
      }
    },
  });

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
    <div className="space-y-1.5 lg:space-y-2 text-xs lg:text-sm">
      {isAdmin && order.metodo_pago && (
        <div className="mb-3 pb-3 border-b border-slate-200">
          <p className="text-slate-900 font-semibold">
            💳 <strong>Método de pago:</strong> {order.metodo_pago}
          </p>
          {order.pagado && (
            <Badge className="bg-green-600 text-white mt-1">✅ PAGADO</Badge>
          )}
        </div>
      )}
      {order.chaqueta_partidos && (
        <p className="text-slate-700">✅ <strong>Chaqueta:</strong> {order.chaqueta_talla} - 35€</p>
      )}
      {order.pack_entrenamiento && (
        <div className="text-slate-700 bg-blue-50 p-2 rounded border border-blue-200">
          <p className="font-semibold mb-1 text-xs lg:text-sm">✅ Pack Entrenamiento - 41€</p>
          <ul className="list-disc list-inside ml-2 lg:ml-4 space-y-0.5 text-xs">
            {order.pack_camiseta_talla && <li>👕 {order.pack_camiseta_talla}</li>}
            {order.pack_pantalon_talla && <li>👖 {order.pack_pantalon_talla}</li>}
            {order.pack_sudadera_talla && <li>🧥 {order.pack_sudadera_talla}</li>}
          </ul>
        </div>
      )}
      {order.camiseta_individual && (
        <p className="text-slate-700">✅ <strong>Camiseta:</strong> {order.camiseta_individual_talla} - 10€</p>
      )}
      {order.pantalon_individual && (
        <p className="text-slate-700">✅ <strong>Pantalón:</strong> {order.pantalon_individual_talla} - 17€</p>
      )}
      {order.sudadera_individual && (
        <p className="text-slate-700">✅ <strong>Sudadera:</strong> {order.sudadera_individual_talla} - 18€</p>
      )}
      {order.chubasquero && (
        <p className="text-slate-700">✅ <strong>Chubasquero:</strong> {order.chubasquero_talla} - 20€</p>
      )}
      {order.anorak && (
        <p className="text-slate-700">✅ <strong>Anorak:</strong> {order.anorak_talla} - 40€</p>
      )}
      {order.mochila && (
        <p className="text-slate-700">✅ <strong>Mochila:</strong> 22€</p>
      )}
      <p className="text-slate-700 font-bold pt-2 border-t border-slate-200 text-xs lg:text-sm">
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
            className="inline-block px-2 lg:px-3 py-1 lg:py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-medium transition-colors"
          >
            📄 Ver {order.justificante_url.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Imagen'}
          </a>
        </div>
      )}
    </div>
  );

  const renderGroupedFamilyItems = (familyOrders) => {
    const itemsMap = {};
    
    familyOrders.forEach(order => {
      if (order.chaqueta_partidos) {
        const key = `chaqueta_${order.chaqueta_talla}`;
        itemsMap[key] = itemsMap[key] || { tipo: 'Chaqueta de Partidos', talla: order.chaqueta_talla, precio: 35, cantidad: 0 };
        itemsMap[key].cantidad++;
      }
      if (order.pack_entrenamiento) {
        const key = 'pack_entrenamiento';
        itemsMap[key] = itemsMap[key] || { tipo: 'Pack de Entrenamiento', precio: 41, cantidad: 0, detalles: [] };
        itemsMap[key].cantidad++;
        itemsMap[key].detalles.push({
          camiseta: order.pack_camiseta_talla,
          pantalon: order.pack_pantalon_talla,
          sudadera: order.pack_sudadera_talla
        });
      }
      if (order.camiseta_individual) {
        const key = `camiseta_${order.camiseta_individual_talla}`;
        itemsMap[key] = itemsMap[key] || { tipo: 'Camiseta Individual', talla: order.camiseta_individual_talla, precio: 10, cantidad: 0 };
        itemsMap[key].cantidad++;
      }
      if (order.pantalon_individual) {
        const key = `pantalon_${order.pantalon_individual_talla}`;
        itemsMap[key] = itemsMap[key] || { tipo: 'Pantalón Individual', talla: order.pantalon_individual_talla, precio: 17, cantidad: 0 };
        itemsMap[key].cantidad++;
      }
      if (order.sudadera_individual) {
        const key = `sudadera_${order.sudadera_individual_talla}`;
        itemsMap[key] = itemsMap[key] || { tipo: 'Sudadera Individual', talla: order.sudadera_individual_talla, precio: 18, cantidad: 0 };
        itemsMap[key].cantidad++;
      }
      if (order.chubasquero) {
        const key = `chubasquero_${order.chubasquero_talla}`;
        itemsMap[key] = itemsMap[key] || { tipo: 'Chubasquero', talla: order.chubasquero_talla, precio: 20, cantidad: 0 };
        itemsMap[key].cantidad++;
      }
      if (order.anorak) {
        const key = `anorak_${order.anorak_talla}`;
        itemsMap[key] = itemsMap[key] || { tipo: 'Anorak', talla: order.anorak_talla, precio: 40, cantidad: 0 };
        itemsMap[key].cantidad++;
      }
      if (order.mochila) {
        const key = 'mochila';
        itemsMap[key] = itemsMap[key] || { tipo: 'Mochila con botero', precio: 22, cantidad: 0 };
        itemsMap[key].cantidad++;
      }
    });

    const totalAmount = familyOrders.reduce((sum, o) => sum + (o.precio_total || 0), 0);

    return (
      <div className="space-y-2 text-sm">
        {Object.values(itemsMap).map((item, idx) => {
          if (item.tipo === 'Pack de Entrenamiento') {
            return (
              <div key={idx} className="text-slate-700 bg-blue-50 p-2 rounded border border-blue-200">
                <p className="font-semibold mb-1">✅ {item.tipo} x{item.cantidad} - {item.precio * item.cantidad}€</p>
                <div className="text-xs space-y-1 ml-4">
                  {item.detalles.map((detalle, i) => (
                    <div key={i}>
                      <span className="font-medium">Pack {i + 1}:</span> 👕 {detalle.camiseta}, 👖 {detalle.pantalon}, 🧥 {detalle.sudadera}
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          return (
            <p key={idx} className="text-slate-700">
              ✅ <strong>{item.tipo}:</strong> {item.talla || ''} {item.cantidad > 1 && `x${item.cantidad}`} - {item.precio * item.cantidad}€
            </p>
          );
        })}
        <p className="text-slate-700 font-bold pt-2 border-t border-slate-200">
          <strong>Total Familia:</strong> {totalAmount}€
        </p>
      </div>
    );
  };

  return (
    <div className="p-3 lg:p-8 space-y-4 lg:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-xl lg:text-3xl font-bold text-slate-900">Pedidos de Equipación</h1>
          <p className="text-xs lg:text-base text-slate-600 mt-1">
            {isAdmin ? "Gestión de pedidos y configuración de precios" : "Solicita la equipación para tus jugadores"}
          </p>
          {isAdmin && seasonConfig?.tienda_ropa_abierta && (
            <Badge className="bg-green-600 text-white mt-2 text-xs">
              🛍️ Tienda abierta manualmente
            </Badge>
          )}
        </div>
        {isAdmin ? (
          <div className="flex gap-2">
            <Button
              onClick={() => toggleStoreMutation.mutate()}
              disabled={toggleStoreMutation.isPending}
              size="sm"
              className={`shadow-lg text-xs lg:text-sm ${
                seasonConfig?.tienda_ropa_abierta 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {toggleStoreMutation.isPending ? '⏳' : (
                seasonConfig?.tienda_ropa_abierta ? '🔒 Cerrar' : '🛍️ Abrir'
              )}
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setShowForm(!showForm)}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 shadow-lg text-xs lg:text-sm"
            disabled={!orderPeriodActive || players.length === 0}
          >
            <Plus className="w-4 h-4 lg:w-5 lg:h-5 lg:mr-2" />
            <span className="hidden lg:inline">Nuevo Pedido</span>
          </Button>
        )}
      </div>

      {!isAdmin && (
        <>
          {/* Banner de crédito disponible */}
          {user?.clothing_credit_balance > 0 && (
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-2xl p-1">
              <div className="bg-white rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎁</span>
                  <div>
                    <p className="font-bold text-slate-900">¡Tienes crédito disponible!</p>
                    <p className="text-sm text-slate-600">Del programa "Trae un Socio Amigo" - válido para equipación</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-purple-600">{user.clothing_credit_balance}€</p>
                  <p className="text-xs text-slate-500">para usar en pedidos</p>
                </div>
              </div>
            </div>
          )}

          <Alert className="bg-blue-50 border-blue-300 border-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>ℹ️ Información sobre pedidos</strong>
              <p className="mt-2">
                Los pedidos de equipación normalmente están disponibles durante los meses de <strong>Junio y Julio</strong>.
              </p>
              {!orderPeriodActive && hasPendingOrders && (
                <p className="mt-2 text-green-700 font-semibold">
                  ✅ <strong>Tienes pedidos pendientes realizados anteriormente.</strong> Puedes consultarlos aquí abajo.
                </p>
              )}
              {!orderPeriodActive && !hasPendingOrders && (
                <p className="mt-2 text-orange-700">
                  <strong>Actualmente la tienda está cerrada.</strong> Los pedidos ya realizados se pueden consultar aquí.
                </p>
              )}
            </AlertDescription>
          </Alert>
        </>
      )}

      {!isAdmin && !loadingAllPlayers && players.length === 0 && (
        <Card className="border-none shadow-lg bg-orange-50 border-2 border-orange-300">
          <CardContent className="pt-6 pb-6">
            <div className="text-center space-y-3">
              <div className="text-5xl">⚠️</div>
              <p className="text-orange-900 font-bold text-lg">
                No tienes jugadores activos registrados
              </p>
              <p className="text-sm text-orange-700">
                Para hacer pedidos de equipación necesitas tener al menos un jugador activo registrado en tu cuenta.
              </p>
              <div className="bg-white rounded-lg p-4 border border-orange-200 text-left">
                <p className="text-sm text-slate-700 font-semibold mb-2">🔍 Verifica que:</p>
                <ul className="text-xs text-slate-600 space-y-1 ml-4">
                  <li>• Tu email <strong>({user?.email})</strong> coincide con el email registrado del jugador</li>
                  <li>• El jugador está marcado como <strong>"Activo"</strong></li>
                  <li>• Has completado correctamente el registro del jugador</li>
                </ul>
              </div>
              <Button
                onClick={() => window.location.href = createPageUrl("ParentPlayers")}
                className="bg-orange-600 hover:bg-orange-700 w-full mt-4"
              >
                👥 Ir a Mis Jugadores
              </Button>
            </div>
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
            userCredit={user?.clothing_credit_balance || 0}
            onCreditUsed={(creditUsed) => {
              // Guardar datos del pedido para el histórico
              const orderData = { jugador_nombre: "Pendiente" }; // Se actualizará al crear el pedido
              handleCreditUsed(creditUsed, orderData);
            }}
          />
        )}
      </AnimatePresence>

      {isAdmin ? (
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="bg-white shadow-sm grid grid-cols-3 lg:grid-cols-7 h-auto gap-1 p-1">
            <TabsTrigger value="summary" className="text-xs lg:text-sm py-2">📊 Resumen</TabsTrigger>
            <TabsTrigger value="config" className="text-xs lg:text-sm py-2">⚙️ Precios</TabsTrigger>
            <TabsTrigger value="families" className="text-xs lg:text-sm py-2">👨‍👩‍👧 Familia</TabsTrigger>
            <TabsTrigger value="players" className="text-xs lg:text-sm py-2">👤 Jugador</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs lg:text-sm py-2">📋 Activos</TabsTrigger>
            <TabsTrigger value="delivered" className="text-xs lg:text-sm py-2">✅ Entregados</TabsTrigger>
            <TabsTrigger value="history" className="text-xs lg:text-sm py-2">📜 Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-6">
            <OrdersSummary orders={orders} />
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            {/* Integrar la gestión de precios aquí */}
            <ClothingPriceConfig seasonConfig={seasonConfig} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['seasonConfig'] })} />
          </TabsContent>

          <TabsContent value="families" className="mt-3 lg:mt-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="p-3 lg:p-6">
                <div className="flex justify-between items-center gap-2">
                  <CardTitle className="flex items-center gap-2 text-base lg:text-xl">
                    <Users className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" />
                    <span className="hidden lg:inline">Pedidos por Familia</span>
                    <span className="lg:hidden">Familias</span>
                  </CardTitle>
                  <Button onClick={exportFamiliesCSV} variant="outline" size="sm" className="text-xs">
                    <FileDown className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-2" />
                    <span className="hidden lg:inline">CSV</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {Object.keys(activeOrdersByFamily).length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No hay pedidos activos por familia</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(activeOrdersByFamily).map(([email, familyOrders]) => {
                        const totalAmount = familyOrders.reduce((sum, o) => sum + (o.precio_total || 0), 0);
                        return (
                          <Card key={email} className="border-2 border-slate-200">
                            <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm text-slate-600 mb-1">📧 {email}</p>
                                  <p className="text-lg font-bold text-slate-900">
                                    {familyOrders.length} pedido{familyOrders.length > 1 ? 's' : ''} - Total: {totalAmount}€
                                  </p>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                              <div className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
                                <h4 className="font-bold text-slate-900 mb-3">📦 Resumen de Items</h4>
                                {renderGroupedFamilyItems(familyOrders)}
                              </div>
                              <div className="space-y-3">
                                <h4 className="font-bold text-slate-700 text-sm">Desglose por Jugador:</h4>
                                {familyOrders.map(order => (
                                  <div key={order.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <h5 className="font-bold text-slate-900 text-sm">{order.jugador_nombre}</h5>
                                        <p className="text-xs text-slate-600">{order.jugador_categoria}</p>
                                      </div>
                                      <div className="flex gap-2 flex-wrap">
                                        {order.pagado && (
                                          <Badge className="bg-green-600 text-white">
                                            💰 Pagado
                                          </Badge>
                                        )}
                                        <Badge className={statusColors[order.estado]}>
                                          {statusEmojis[order.estado]} {order.estado}
                                        </Badge>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                              <MoreVertical className="w-4 h-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, newStatus: "Confirmado", notifyParent: true })}>
                                              <Check className="w-4 h-4 mr-2" /> Confirmar y notificar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, newStatus: "Preparado", notifyParent: true })}>
                                              <Package className="w-4 h-4 mr-2" /> Marcar preparado
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, newStatus: "Entregado", notifyParent: true })}>
                                              <Truck className="w-4 h-4 mr-2" /> Marcar entregado
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                    {renderOrderDetails(order)}
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

          <TabsContent value="players" className="mt-3 lg:mt-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="p-3 lg:p-6">
                <div className="flex justify-between items-center gap-2">
                  <CardTitle className="flex items-center gap-2 text-base lg:text-xl">
                    <ShoppingBag className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" />
                    <span className="hidden lg:inline">Pedidos por Jugador</span>
                    <span className="lg:hidden">Jugadores</span>
                  </CardTitle>
                  <Button onClick={exportPlayersCSV} variant="outline" size="sm" className="text-xs">
                    <FileDown className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-2" />
                    <span className="hidden lg:inline">CSV</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-3 lg:p-4 rounded-lg border border-slate-200 hover:border-orange-300 transition-colors bg-white"
                    >
                      <div className="flex justify-between items-start mb-2 lg:mb-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm lg:text-lg text-slate-900 truncate">{order.jugador_nombre}</h3>
                          <p className="text-xs lg:text-sm text-slate-600">{order.jugador_categoria}</p>
                          <p className="text-xs text-slate-500 mt-1 truncate">📧 {order.email_padre}</p>
                        </div>
                        <div className="flex gap-1 lg:gap-2 flex-shrink-0 ml-2">
                          <Badge className={`${statusColors[order.estado]} text-xs whitespace-nowrap`}>
                            <span className="mr-1">{statusEmojis[order.estado]}</span>
                            <span className="hidden lg:inline">{order.estado}</span>
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 lg:h-8 lg:w-8 p-0">
                                <MoreVertical className="w-3 h-3 lg:w-4 lg:h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, newStatus: "Confirmado", notifyParent: true })}>
                                <Check className="w-4 h-4 mr-2" /> Confirmar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, newStatus: "Preparado", notifyParent: true })}>
                                <Package className="w-4 h-4 mr-2" /> Preparado
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, newStatus: "Entregado", notifyParent: true })}>
                                <Truck className="w-4 h-4 mr-2" /> Entregado
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      {renderOrderDetails(order)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-3 lg:mt-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="p-3 lg:p-6">
                <div className="flex justify-between items-center gap-2">
                  <CardTitle className="flex items-center gap-2 text-base lg:text-xl">
                    <ShoppingBag className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" />
                    <span className="hidden lg:inline">Pedidos Activos ({orders.filter(o => o.estado !== "Entregado").length})</span>
                    <span className="lg:hidden">Activos ({orders.filter(o => o.estado !== "Entregado").length})</span>
                  </CardTitle>
                  <Button onClick={exportPlayersCSV} variant="outline" size="sm" className="text-xs">
                    <FileDown className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-2" />
                    <span className="hidden lg:inline">CSV</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 lg:p-6">
                {isLoading ? (
                  <div className="text-center py-8 lg:py-12">
                    <div className="inline-block h-6 w-6 lg:h-8 lg:w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
                  </div>
                ) : orders.filter(o => o.estado !== "Entregado").length === 0 ? (
                  <div className="text-center py-8 lg:py-12">
                    <ShoppingBag className="w-12 h-12 lg:w-16 lg:h-16 text-slate-300 mx-auto mb-3 lg:mb-4" />
                    <p className="text-sm lg:text-base text-slate-500">No hay pedidos activos</p>
                  </div>
                ) : (
                  <div className="space-y-3 lg:space-y-4">
                    {orders.filter(o => o.estado !== "Entregado").map((order) => (
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
                          <div className="flex gap-2 flex-wrap">
                            {order.pagado && (
                              <Badge className="bg-green-600 text-white">
                                💰 Pagado
                              </Badge>
                            )}
                            <Badge className={statusColors[order.estado]}>
                              <span className="mr-1">{statusEmojis[order.estado]}</span>
                              {order.estado}
                            </Badge>
                          </div>
                        </div>
                        {renderOrderDetails(order)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivered" className="mt-3 lg:mt-6">
            <Card className="border-none shadow-lg bg-green-50">
              <CardHeader className="p-3 lg:p-6">
                <div className="flex justify-between items-center gap-2">
                  <CardTitle className="flex items-center gap-2 text-base lg:text-xl text-green-900">
                    <Package className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
                    <span className="hidden lg:inline">Pedidos Entregados ({orders.filter(o => o.estado === "Entregado").length})</span>
                    <span className="lg:hidden">Entregados ({orders.filter(o => o.estado === "Entregado").length})</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-3 lg:p-6">
                {orders.filter(o => o.estado === "Entregado").length === 0 ? (
                  <div className="text-center py-8 lg:py-12">
                    <Package className="w-12 h-12 lg:w-16 lg:h-16 text-green-300 mx-auto mb-3 lg:mb-4" />
                    <p className="text-sm lg:text-base text-green-700">No hay pedidos entregados aún</p>
                  </div>
                ) : (
                  <div className="space-y-3 lg:space-y-4">
                    {orders.filter(o => o.estado === "Entregado").map((order) => (
                      <div
                        key={order.id}
                        className="p-3 lg:p-4 rounded-lg border border-green-200 bg-white"
                      >
                        <div className="flex justify-between items-start mb-2 lg:mb-3 gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-sm lg:text-lg text-slate-900 truncate">{order.jugador_nombre}</h3>
                            <p className="text-xs lg:text-sm text-slate-600">{order.jugador_categoria}</p>
                            <p className="text-xs text-slate-500 mt-1 truncate">📧 {order.email_padre}</p>
                          </div>
                          <Badge className="bg-green-100 text-green-700 text-xs whitespace-nowrap flex-shrink-0">
                            ✅ Entregado
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

          <TabsContent value="history" className="mt-3 lg:mt-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="p-3 lg:p-6 border-b">
                <div className="flex justify-between items-center gap-2 mb-4">
                  <CardTitle className="flex items-center gap-2 text-base lg:text-xl">
                    <History className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" />
                    Historial Completo de Pedidos
                  </CardTitle>
                  <Button onClick={exportPlayersCSV} variant="outline" size="sm" className="text-xs">
                    <FileDown className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-2" />
                    <span className="hidden lg:inline">Exportar</span>
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="lg:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Buscar jugador o email..."
                        value={historyFilters.search}
                        onChange={(e) => setHistoryFilters({...historyFilters, search: e.target.value})}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Select 
                    value={historyFilters.estado} 
                    onValueChange={(value) => setHistoryFilters({...historyFilters, estado: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los estados</SelectItem>
                      <SelectItem value="Pendiente">Pendiente</SelectItem>
                      <SelectItem value="En revisión">En revisión</SelectItem>
                      <SelectItem value="Confirmado">Confirmado</SelectItem>
                      <SelectItem value="Preparado">Preparado</SelectItem>
                      <SelectItem value="Entregado">Entregado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select 
                    value={historyFilters.metodo_pago} 
                    onValueChange={(value) => setHistoryFilters({...historyFilters, metodo_pago: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Método de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los métodos</SelectItem>
                      <SelectItem value="Transferencia">Transferencia</SelectItem>
                      <SelectItem value="Bizum">Bizum</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline" 
                    onClick={() => setHistoryFilters({search: '', estado: 'todos', metodo_pago: 'todos', fecha_desde: '', fecha_hasta: ''})}
                    className="text-xs"
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-3 lg:p-6">
                {(() => {
                  let filteredOrders = orders;
                  
                  if (historyFilters.search) {
                    const searchLower = historyFilters.search.toLowerCase();
                    filteredOrders = filteredOrders.filter(o => 
                      o.jugador_nombre?.toLowerCase().includes(searchLower) ||
                      o.email_padre?.toLowerCase().includes(searchLower) ||
                      o.jugador_categoria?.toLowerCase().includes(searchLower)
                    );
                  }
                  
                  if (historyFilters.estado !== 'todos') {
                    filteredOrders = filteredOrders.filter(o => o.estado === historyFilters.estado);
                  }
                  
                  if (historyFilters.metodo_pago !== 'todos') {
                    filteredOrders = filteredOrders.filter(o => o.metodo_pago === historyFilters.metodo_pago);
                  }

                  if (filteredOrders.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No se encontraron pedidos con estos filtros</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {filteredOrders.map((order) => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border border-slate-200 rounded-lg bg-white hover:border-orange-300 transition-colors"
                        >
                          <div 
                            className="p-4 cursor-pointer"
                            onClick={() => setExpandedOrders({...expandedOrders, [order.id]: !expandedOrders[order.id]})}
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 mb-2">
                                  <h3 className="font-bold text-slate-900 truncate">{order.jugador_nombre}</h3>
                                  <Badge className={`${statusColors[order.estado]} text-xs whitespace-nowrap flex-shrink-0`}>
                                    {statusEmojis[order.estado]} {order.estado}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600">
                                  <div>📧 {order.email_padre}</div>
                                  <div>🏆 {order.jugador_categoria}</div>
                                  <div>💰 {order.precio_total}€ • {order.metodo_pago}</div>
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  📅 {new Date(order.created_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              <div className="flex gap-2 items-start flex-shrink-0">
                                {order.pagado && (
                                  <Badge className="bg-green-600 text-white text-xs">
                                    ✅ Pagado
                                  </Badge>
                                )}
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  {expandedOrders[order.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              </div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {expandedOrders[order.id] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 border-t border-slate-100 pt-4">
                                  {renderOrderDetails(order)}
                                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="outline">
                                          <MoreVertical className="w-4 h-4 mr-2" />
                                          Acciones
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, newStatus: "Confirmado", notifyParent: true })}>
                                          <Check className="w-4 h-4 mr-2" /> Confirmar y notificar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, newStatus: "Preparado", notifyParent: true })}>
                                          <Package className="w-4 h-4 mr-2" /> Marcar preparado
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, newStatus: "Entregado", notifyParent: true })}>
                                          <Truck className="w-4 h-4 mr-2" /> Marcar entregado
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <>
          {/* Catálogo dinámico desde SeasonConfig */}
          {(() => {
            // Obtener precios dinámicos
            const getPrice = (productId, defaultPrice) => {
              const producto = seasonConfig?.productos_ropa?.find(p => p.id === productId);
              if (producto && producto.activo !== false) return producto.precio;
              return defaultPrice;
            };
            const isActive = (productId) => {
              const producto = seasonConfig?.productos_ropa?.find(p => p.id === productId);
              return !producto || producto.activo !== false;
            };

            return (
              <Card className="border-none shadow-lg bg-blue-50 border-blue-200">
                <CardHeader className="p-3 lg:p-6">
                  <CardTitle className="text-base lg:text-lg text-blue-900">ℹ️ Catálogo de Productos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs lg:text-sm text-blue-800 p-3 lg:p-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
                      <h4 className="font-bold text-blue-900 mb-2">🧥 Prendas Oficiales:</h4>
                      <ul className="space-y-1">
                        {isActive('chaqueta_partidos') && (
                          <li>• <strong>Chaqueta de Partidos:</strong> {getPrice('chaqueta_partidos', 35)}€</li>
                        )}
                        {isActive('chubasquero') && (
                          <li>• <strong>Chubasquero</strong> (escudo bordado): {getPrice('chubasquero', 20)}€</li>
                        )}
                        {isActive('anorak') && (
                          <li>• <strong>Anorak:</strong> {getPrice('anorak', 40)}€</li>
                        )}
                      </ul>
                    </div>
                    {isActive('pack_entrenamiento') && (
                      <div className="bg-white rounded-lg p-4 border-2 border-green-300">
                        <h4 className="font-bold text-green-900 mb-2">👕 Pack de Entrenamiento ({getPrice('pack_entrenamiento', 41)}€):</h4>
                        <ul className="space-y-1">
                          <li>✅ Camiseta + Pantalón + Sudadera</li>
                          <li className="text-xs text-green-700">Tallas independientes para cada prenda</li>
                        </ul>
                      </div>
                    )}
                  </div>
                  {(isActive('camiseta_individual') || isActive('pantalon_individual') || isActive('sudadera_individual')) && (
                    <div className="bg-white rounded-lg p-4 border-2 border-orange-300">
                      <h4 className="font-bold text-orange-900 mb-2">🛍️ Prendas Individuales (FUERA DEL PACK):</h4>
                      <ul className="space-y-1">
                        {isActive('camiseta_individual') && (
                          <li>• <strong>Camiseta:</strong> {getPrice('camiseta_individual', 10)}€</li>
                        )}
                        {isActive('pantalon_individual') && (
                          <li>• <strong>Pantalón:</strong> {getPrice('pantalon_individual', 17)}€</li>
                        )}
                        {isActive('sudadera_individual') && (
                          <li>• <strong>Sudadera:</strong> {getPrice('sudadera_individual', 18)}€</li>
                        )}
                      </ul>
                    </div>
                  )}
                  {isActive('mochila') && (
                    <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                      <h4 className="font-bold text-purple-900 mb-2">🎒 Complementos:</h4>
                      <ul className="space-y-1">
                        <li>• <strong>Mochila con botero</strong> (escudo vinilo): {getPrice('mochila', 22)}€</li>
                      </ul>
                    </div>
                  )}
                  <p className="pt-2 border-t border-blue-200">
                    <strong>📧 Email del club:</strong> CDBUSTARVIEJO@GMAIL.COM
                  </p>
                </CardContent>
              </Card>
            );
          })()}

          <Tabs defaultValue="active" className="w-full">
            <TabsList className="bg-white shadow-sm grid grid-cols-2 h-auto gap-1 p-1 mb-4">
              <TabsTrigger value="active" className="text-xs lg:text-sm py-2">
                📋 Pedidos Activos ({orders.filter(o => o.estado !== "Entregado").length})
              </TabsTrigger>
              <TabsTrigger value="delivered" className="text-xs lg:text-sm py-2">
                ✅ Pedidos Anteriores ({orders.filter(o => o.estado === "Entregado").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <Card className="border-none shadow-lg">
                <CardHeader className="p-3 lg:p-6">
                  <CardTitle className="flex items-center gap-2 text-base lg:text-xl">
                    <ShoppingBag className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" />
                    Pedidos Activos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 lg:p-6">
                  {isLoading ? (
                    <div className="text-center py-8 lg:py-12">
                      <div className="inline-block h-6 w-6 lg:h-8 lg:w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
                    </div>
                  ) : orders.filter(o => o.estado !== "Entregado").length === 0 ? (
                    <div className="text-center py-8 lg:py-12">
                      <ShoppingBag className="w-12 h-12 lg:w-16 lg:h-16 text-slate-300 mx-auto mb-3 lg:mb-4" />
                      <p className="text-sm lg:text-base text-slate-500">No tienes pedidos activos</p>
                      {orderPeriodActive ? (
                        <p className="text-xs lg:text-sm text-slate-400 mt-2">Haz clic en "Nuevo Pedido" para solicitar equipación</p>
                      ) : (
                        <p className="text-xs lg:text-sm text-orange-600 mt-2">Los pedidos solo se pueden realizar en Junio y Julio</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 lg:space-y-4">
                      {orders.filter(o => o.estado !== "Entregado").map((order) => (
                        <div
                          key={order.id}
                          className="p-3 lg:p-4 rounded-lg border border-slate-200 hover:border-orange-300 transition-colors bg-white"
                        >
                          <div className="flex justify-between items-start mb-2 lg:mb-3 gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-sm lg:text-lg text-slate-900 truncate">{order.jugador_nombre}</h3>
                              <p className="text-xs lg:text-sm text-slate-600">{order.jugador_categoria}</p>
                            </div>
                            <div className="flex gap-1 flex-wrap flex-shrink-0">
                              {order.pagado && (
                                <Badge className="bg-green-600 text-white text-xs">
                                  💰 Pagado
                                </Badge>
                              )}
                              <Badge className={`${statusColors[order.estado]} text-xs whitespace-nowrap`}>
                                <span className="mr-1">{statusEmojis[order.estado]}</span>
                                <span className="hidden sm:inline">{order.estado}</span>
                              </Badge>
                            </div>
                          </div>
                          {/* Fecha estimada de entrega */}
                          {order.estado !== "Entregado" && (
                            <div className="mb-3 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                              <p className="text-xs text-blue-800 flex items-center gap-1.5">
                                <span>📦</span>
                                <strong>Recogida prevista:</strong> 
                                <span>Primera semana de Septiembre en las instalaciones del club</span>
                              </p>
                            </div>
                          )}
                          {renderOrderDetails(order)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="delivered">
              <Card className="border-none shadow-lg bg-green-50">
                <CardHeader className="p-3 lg:p-6">
                  <CardTitle className="flex items-center gap-2 text-base lg:text-xl text-green-900">
                    <Package className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
                    Pedidos Anteriores
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 lg:p-6">
                  {orders.filter(o => o.estado === "Entregado").length === 0 ? (
                    <div className="text-center py-8 lg:py-12">
                      <Package className="w-12 h-12 lg:w-16 lg:h-16 text-green-300 mx-auto mb-3 lg:mb-4" />
                      <p className="text-sm lg:text-base text-green-700">No tienes pedidos anteriores</p>
                    </div>
                  ) : (
                    <div className="space-y-3 lg:space-y-4">
                      {orders.filter(o => o.estado === "Entregado").map((order) => (
                        <div
                          key={order.id}
                          className="p-3 lg:p-4 rounded-lg border border-green-200 bg-white"
                        >
                          <div className="flex justify-between items-start mb-2 lg:mb-3 gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-sm lg:text-lg text-slate-900 truncate">{order.jugador_nombre}</h3>
                              <p className="text-xs lg:text-sm text-slate-600">{order.jugador_categoria}</p>
                            </div>
                            <div className="flex gap-1 flex-wrap flex-shrink-0">
                              {order.pagado && (
                                <Badge className="bg-green-600 text-white text-xs">
                                  💰 Pagado
                                </Badge>
                              )}
                              <Badge className="bg-green-100 text-green-700 text-xs whitespace-nowrap">
                                ✅ Entregado
                              </Badge>
                            </div>
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
        </>
      )}

      <ContactCard />

      <ClothingOrderSuccess 
        isOpen={showSuccessDialog} 
        onClose={() => setShowSuccessDialog(false)}
        orderDetails={lastOrderDetails}
      />
    </div>
  );
}