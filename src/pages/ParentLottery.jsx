import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gift, Sparkles, Star, PartyPopper, AlertCircle, Upload, X, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import PaymentInstructions from "@/components/payments/PaymentInstructions";

const NUMERO_LOTERIA = "28720";

// Helper para calcular la temporada actual (YYYY/YYYY+1)
const getCurrentSeasonName = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

export default function ParentLottery() {
  const [showForm, setShowForm] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [numDecimos, setNumDecimos] = useState(1);
  const [notas, setNotas] = useState("");
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [justificanteUrl, setJustificanteUrl] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [user, setUser] = useState(null);
  const [isCoach, setIsCoach] = useState(false);
  const [hasPlayers, setHasPlayers] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [pedidoPersonal, setPedidoPersonal] = useState(false);
  const [openingStripe, setOpeningStripe] = useState(false);

  const queryClient = useQueryClient();
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    try { setIsIframe(window.self !== window.top); } catch { setIsIframe(false); }
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const coachCheck = currentUser.es_entrenador === true || currentUser.es_coordinador === true;
      const staffCheck = currentUser.es_tesorero === true || coachCheck;
      setIsCoach(coachCheck);
      setIsStaff(staffCheck);
      
      // Verificar si tiene hijos jugadores reales
      const allPlayers = await base44.entities.Player.list();
      const myPlayers = allPlayers.filter(p => 
        p.email_padre === currentUser.email || p.email_tutor_2 === currentUser.email
      );
      setHasPlayers(myPlayers.length > 0);
    };
    fetchUser();
  }, []);

  // Detectar retorno de Stripe (éxito o cancelación)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const paid = url.searchParams.get('paid');
      const canceled = url.searchParams.get('canceled');
      const orderId = url.searchParams.get('order_id');

      if (paid === 'lottery') {
        toast.success('✅ Pago con tarjeta confirmado');
        // Refrescar pedidos
        queryClient.invalidateQueries({ queryKey: ['allLotteryOrders'] });
        queryClient.invalidateQueries({ queryKey: ['myLotteryOrders'] });
        url.searchParams.delete('paid');
        url.searchParams.delete('order_id');
        window.history.replaceState({}, '', url.toString());
      }

      if (canceled === 'lottery' && orderId) {
        // El usuario canceló Stripe: eliminar el pedido provisional
        (async () => {
          try {
            const orders = await base44.entities.LotteryOrder.filter({ id: orderId });
            const order = orders?.[0];
            if (order && order.pagado !== true) {
              await base44.entities.LotteryOrder.delete(orderId);
              queryClient.invalidateQueries({ queryKey: ['allLotteryOrders'] });
              queryClient.invalidateQueries({ queryKey: ['myLotteryOrders'] });
              toast.info('Pago cancelado, pedido descartado');
            }
          } catch (e) {
            console.error('Error al descartar pedido cancelado:', e);
          } finally {
            url.searchParams.delete('canceled');
            url.searchParams.delete('order_id');
            window.history.replaceState({}, '', url.toString());
          }
        })();
      }
    } catch {}
  }, [queryClient]);

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });

  const { data: allLotteryOrders = [] } = useQuery({
    queryKey: ['allLotteryOrders'],
    queryFn: () => base44.entities.LotteryOrder.list(),
    enabled: !!seasonConfig,
  });

  // Filtrar pedidos a temporada activa
  const activeSeasonName = seasonConfig?.temporada ? seasonConfig.temporada.replace(/-/g,'/') : null;
  const allLotteryOrdersSeason = React.useMemo(() => {
    if (!activeSeasonName) return allLotteryOrders;
    return allLotteryOrders.filter(o => (o.temporada || '').replace(/-/g,'/') === activeSeasonName);
  }, [allLotteryOrders, activeSeasonName]);

  const totalDecimosVendidos = allLotteryOrdersSeason.reduce((sum, o) => {
    const countable = o?.pagado === true || o?.estado === 'Entregado';
    return sum + (countable ? (o.numero_decimos || 0) : 0);
  }, 0);
  const maxDecimos = seasonConfig?.loteria_max_decimos;
  const decimosDisponibles = maxDecimos ? maxDecimos - totalDecimosVendidos : null;
  const agotado = maxDecimos && totalDecimosVendidos >= maxDecimos;

  const loteriaAbierta = seasonConfig?.loteria_navidad_abierta === true && !agotado;
  const requierePagoAdelantado = seasonConfig?.loteria_requiere_pago_adelantado === true;
  const precioDecimo = seasonConfig?.precio_decimo_loteria || 22;

  const { data: players = [] } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => 
        (p.email_padre === user?.email || p.email_tutor_2 === user?.email) &&
        p.activo !== false
      );
    },
    enabled: !!user?.email,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['myLotteryOrders', user?.email],
    queryFn: async () => {
      const allOrders = await base44.entities.LotteryOrder.list('-created_date');
      return allOrders.filter(o => o.email_padre === user?.email);
    },
    enabled: !!user?.email,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const order = await base44.entities.LotteryOrder.create(orderData);
      
      console.log('✅ Pedido de lotería creado, enviando emails...', { orderData });
      
      try {
        // Email al admin - SIEMPRE enviar
        await base44.functions.invoke('sendEmail', {
          to: "cdbustarviejo@gmail.com",
          subject: `🍀 Nuevo Pedido de Lotería - ${orderData.jugador_nombre}`,
          html: `
            <h2>Nuevo Pedido de Lotería de Navidad</h2>
            <p><strong>Solicitante:</strong> ${orderData.jugador_nombre}</p>
            <p><strong>Categoría:</strong> ${orderData.jugador_categoria}</p>
            <p><strong>Email:</strong> ${orderData.email_padre}</p>
            <p><strong>Décimos:</strong> ${orderData.numero_decimos}</p>
            <p><strong>Total:</strong> ${orderData.total}€</p>
            ${orderData.justificante_url ? `<p><strong>Justificante:</strong> <a href="${orderData.justificante_url}">Ver</a></p>` : '<p><strong>Pago:</strong> Pendiente (al entrenador)</p>'}
            <hr>
            <p style="font-size: 12px; color: #666;">Registrado el ${new Date().toLocaleString('es-ES')}</p>
          `
        });
        console.log('✅ Email al admin enviado');

        // Email de confirmación a las familias
        const player = orderData.jugador_id !== user.id ? players.find(p => p.id === orderData.jugador_id) : null;
        
        const confirmBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">🍀 Pedido de Lotería Recibido 🎄</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb;">
              <p style="font-size: 16px;">Estimados padres/tutores,</p>
              <p>Confirmamos que hemos recibido correctamente tu pedido de lotería para <strong>${orderData.jugador_nombre}</strong>.</p>
              
              <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #92400e; margin: 10px 0;">
                  Número: ${NUMERO_LOTERIA}
                </p>
                <p style="font-size: 14px; color: #78350f;">Sorteo: 22 de Diciembre</p>
              </div>

              <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #166534; margin-top: 0;">📦 Detalles del Pedido:</h3>
                <p style="font-size: 18px; color: #15803d;"><strong>🎟️ Décimos solicitados:</strong> ${orderData.numero_decimos}</p>
                <p style="font-size: 18px; font-weight: bold; color: #166534;">💰 Total: ${orderData.total}€</p>
              </div>
              
              ${orderData.justificante_url ? `
                <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #1e40af;"><strong>✅ Pago registrado:</strong></p>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #1e3a8a;">Hemos recibido tu justificante de pago. El club lo revisará y te avisará cuando tu pedido esté listo para recoger.</p>
                </div>
              ` : `
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>👨‍🏫 Entrega y Pago:</strong></p>
                  <p style="margin: 5px 0 0 0; font-size: 14px; color: #78350f;">Tu entrenador te entregará los décimos y le pagarás directamente (${orderData.total}€).</p>
                </div>
              `}

              <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #166534;"><strong>📍 Información de recogida:</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #15803d;">El club te avisará cuando los décimos estén listos para recoger.</p>
              </div>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 12px; margin: 20px 0;">
                <p style="font-size: 12px; color: #6b7280; margin: 0;"><strong>Estado:</strong> Solicitado</p>
              </div>

              <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
                <p style="font-size: 16px; font-weight: bold; color: #92400e; margin: 0;">🍀 ¡Mucha suerte en el sorteo! 🎄</p>
              </div>
            </div>
            <div style="background: #1e293b; color: white; padding: 15px; text-align: center; border-radius: 0 0 10px 10px;">
              <p style="margin: 0; font-size: 12px;">CD Bustarviejo - Lotería de Navidad ${new Date().getFullYear()}</p>
              <p style="margin: 5px 0 0 0; font-size: 11px; color: #94a3b8;">📧 cdbustarviejo@gmail.com</p>
            </div>
          </div>
        `;
        
        // Enviar email al padre
        if (orderData.email_padre) {
          await base44.functions.invoke('sendEmail', {
            to: orderData.email_padre,
            subject: "🍀 Pedido de Lotería Recibido - CD Bustarviejo",
            html: confirmBody
          });
          console.log('✅ Email enviado a:', orderData.email_padre);
        }
        
        // Enviar email al segundo tutor si existe
        if (player?.email_tutor_2) {
          await base44.functions.invoke('sendEmail', {
            to: player.email_tutor_2,
            subject: "🍀 Pedido de Lotería Recibido - CD Bustarviejo",
            html: confirmBody
          });
          console.log('✅ Email enviado a:', player.email_tutor_2);
        }

        toast.success("📧 Emails de confirmación enviados");
      } catch (error) {
        console.error("❌ Error sending lottery order emails:", error);
        toast.error("Error al enviar emails de confirmación");
      }
      
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLotteryOrders'] });
      setShowForm(false);
      setSelectedPlayer("");
      setSelectedCategory("");
      setNumDecimos(1);
      setNotas("");
      setMetodoPago("Transferencia");
      setJustificanteUrl("");
      toast.success("✅ ¡Pedido registrado! Recibirás un email de confirmación");
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setJustificanteUrl(response.file_url);
      toast.success("Justificante subido correctamente");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Error al subir el justificante");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (requierePagoAdelantado && metodoPago !== 'Tarjeta' && !justificanteUrl) {
      toast.error("Debes subir el justificante de pago");
      return;
    }
    
    // Bloqueo de seguridad: no permitir pedir más décimos de los disponibles
    if (decimosDisponibles !== null && numDecimos > decimosDisponibles) {
      toast.error(`Solo quedan ${decimosDisponibles} décimo${decimosDisponibles === 1 ? '' : 's'} disponibles`);
      return;
    }
    
    const total = numDecimos * precioDecimo;

    // Pago con TARJETA (Stripe)
    if (requierePagoAdelantado && metodoPago === 'Tarjeta') {
      if (isIframe) {
        toast.error('Abre la app publicada para pagar con tarjeta');
        setOpeningStripe(false);
        return;
      }
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        const nextUrl = window.location.origin + createPageUrl('ParentLottery');
        base44.auth.redirectToLogin(nextUrl);
        return;
      }

      // Validar jugador si aplica
      let jugador_id = user.id;
      let jugador_nombre = user.full_name;
      let jugador_categoria = 'Staff del Club';
      if (!(isStaff && pedidoPersonal)) {
        const player = players.find(p => p.id === selectedPlayer);
        if (!player) { toast.error('Selecciona un jugador'); return; }
        jugador_id = player.id;
        jugador_nombre = player.nombre;
        jugador_categoria = player.deporte;
      }

      // Lanzar Stripe Checkout (sin crear pedido provisional)
      setOpeningStripe(true);
      const successUrl = `${window.location.origin}${createPageUrl('ParentLottery')}?paid=lottery`;
      const cancelUrl = `${window.location.origin}${createPageUrl('ParentLottery')}?canceled=lottery`;
      try {
        const { data } = await base44.functions.invoke('stripeCheckout', {
          amount: total,
          name: `Lotería de Navidad - ${numDecimos} décimos`,
          currency: 'eur',
          successUrl,
          cancelUrl,
          metadata: {
            tipo: 'loteria',
            temporada: seasonConfig?.temporada || getCurrentSeasonName(),
            user_email: user.email,
            jugador_id,
            jugador_nombre,
            jugador_categoria,
            telefono: user.telefono || '',
            numero_decimos: String(numDecimos),
            precio_por_decimo: String(precioDecimo),
            total: String(total),
            notas: notas || ''
          }
        });
        if (data?.url) {
          window.location.href = data.url;
        } else {
          toast.error('No se pudo iniciar el pago con Stripe');
          setOpeningStripe(false);
        }
      } catch (err) {
        // Detectar error de stock insuficiente (409)
        const status = err?.response?.status || err?.status;
        const apiData = err?.response?.data || err?.data;
        if (status === 409 && apiData?.error === 'Stock insuficiente') {
          toast.error(apiData.details || 'Ya no quedan décimos suficientes');
          // Forzar refresco para que el usuario vea el stock actualizado
          queryClient.invalidateQueries({ queryKey: ['allLotteryOrders'] });
        } else {
          toast.error('No se pudo iniciar el pago con Stripe');
        }
        setOpeningStripe(false);
      }
      return;
    }

    // Si es staff (entrenador/coordinador/tesorero) sin hijos, pedido a nombre propio
    if (isStaff && pedidoPersonal) {
      createOrderMutation.mutate({
        jugador_id: user.id,
        jugador_nombre: user.full_name,
        jugador_categoria: "Staff del Club",
        email_padre: user.email,
        telefono: user.telefono || "",
        numero_decimos: numDecimos,
        precio_por_decimo: precioDecimo,
        total: total,
        estado: "Solicitado",
        pagado: false,
        metodo_pago: requierePagoAdelantado ? metodoPago : null,
        justificante_url: justificanteUrl,
        temporada: seasonConfig?.temporada || getCurrentSeasonName(),
        notas: notas
      });
    } else {
      // Lógica normal para padres con jugadores
      const player = players.find(p => p.id === selectedPlayer);
      if (!player) {
        toast.error("Selecciona un jugador");
        return;
      }

      createOrderMutation.mutate({
        jugador_id: player.id,
        jugador_nombre: player.nombre,
        jugador_categoria: player.deporte,
        email_padre: user.email,
        telefono: player.telefono,
        numero_decimos: numDecimos,
        precio_por_decimo: precioDecimo,
        total: total,
        estado: "Solicitado",
        pagado: false,
        metodo_pago: requierePagoAdelantado ? metodoPago : null,
        justificante_url: justificanteUrl,
        temporada: seasonConfig?.temporada || getCurrentSeasonName(),
        notas: notas
      });
    }
  };

  const statusColors = {
    "Solicitado": "bg-blue-100 text-blue-700 border-blue-200",
    "Entregado": "bg-green-100 text-green-700 border-green-200",
    "Cancelado": "bg-red-100 text-red-700 border-red-200"
  };

  const totalDecimos = orders.reduce((sum, o) => sum + (o.numero_decimos || 0), 0);
  const totalInvertido = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-green-900 to-red-950 p-4 lg:p-8">
      {/* Animated snowflakes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-fall text-white opacity-70"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
              fontSize: `${10 + Math.random() * 20}px`
            }}
          >
            ❄️
          </div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        {/* Header con animación */}
        <div className="text-center space-y-4 animate-bounce-slow">
          <div className="flex justify-center gap-3 text-6xl">
            <span className="animate-spin-slow">🎄</span>
            <span className="animate-pulse">🎅</span>
            <span className="animate-spin-slow">🎁</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold text-white drop-shadow-2xl">
            🍀 Lotería de Navidad 🍀
          </h1>
          <div className="inline-block bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 text-red-900 px-8 py-4 rounded-3xl shadow-2xl animate-pulse border-4 border-yellow-500">
            <p className="text-3xl lg:text-5xl font-black">
              Número: {NUMERO_LOTERIA}
            </p>
          </div>
        </div>

        {agotado && (
          <Alert className="bg-red-800 border-red-600 border-4 shadow-2xl">
            <AlertCircle className="h-6 w-6 text-yellow-400 animate-pulse" />
            <AlertDescription className="text-white text-lg">
              <strong>🚫 ¡DÉCIMOS AGOTADOS!</strong>
              <br />
              Ya se han vendido los {maxDecimos} décimos disponibles. No se pueden hacer más pedidos.
            </AlertDescription>
          </Alert>
        )}

        {!loteriaAbierta && !agotado && (
          <Alert className="bg-red-800 border-red-600 border-4 shadow-2xl">
            <AlertCircle className="h-6 w-6 text-yellow-400" />
            <AlertDescription className="text-white text-lg">
              <strong>❄️ Los pedidos de lotería están cerrados actualmente.</strong>
              <br />
              Podrás consultar tus pedidos anteriores aquí.
            </AlertDescription>
          </Alert>
        )}

        {loteriaAbierta && (
          <Alert className="bg-gradient-to-r from-green-700 to-green-800 border-green-500 border-4 shadow-2xl">
            <Gift className="h-6 w-6 text-yellow-300 animate-bounce" />
            <AlertDescription className="text-white text-lg">
              <div className="flex items-center justify-between">
                <div>
                  <strong>📊 Décimos Vendidos:</strong>
                  <br />
                  {maxDecimos ? (
                    
                      <>
                        <span><span className="text-2xl font-bold text-yellow-300">{decimosDisponibles}</span> disponibles de {maxDecimos}</span>
                      </>
                    
                  ) : (
                    <span className="text-2xl font-bold text-yellow-300">{totalDecimosVendidos}</span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-yellow-300">{totalDecimosVendidos}</div>
                  <div className="text-xs text-green-200">vendidos</div>
                </div>
              </div>
              {maxDecimos && (
                <div className="mt-2 bg-white/20 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-yellow-300 h-full transition-all duration-500"
                    style={{ width: `${(totalDecimosVendidos / maxDecimos) * 100}%` }}
                  />
                </div>
              )}
              {!maxDecimos && (
                <p className="text-xs text-green-200 mt-2">Sin límite configurado</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Info Card con tema navideño */}
        <Card className="border-4 border-yellow-400 bg-gradient-to-br from-white via-red-50 to-green-50 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-red-600 via-green-600 to-red-600 border-b-4 border-yellow-400">
            <CardTitle className="text-white text-2xl flex items-center gap-3 justify-center">
              <Gift className="w-8 h-8 animate-bounce" />
              ¡Comparte la Suerte de Navidad!
              <Star className="w-8 h-8 animate-spin-slow" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-red-100 to-red-200 p-4 rounded-2xl border-2 border-red-300 shadow-lg">
                <p className="text-2xl font-bold text-red-900 mb-2">🎟️ Sobre la Lotería</p>
                <div className="space-y-2 text-red-900">
                  <p>💰 <strong>Precio:</strong> {precioDecimo}€ por décimo</p>
                  <p>📅 <strong>Sorteo:</strong> 22 de Diciembre</p>
                  <p>🎁 <strong>Premio Gordo:</strong> 400.000€ al décimo</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-100 to-green-200 p-4 rounded-2xl border-2 border-green-300 shadow-lg">
                <p className="text-2xl font-bold text-green-900 mb-2">👨‍🏫 Cómo Funciona</p>
                <div className="space-y-2 text-green-900">
                  <p>1️⃣ Haz tu pedido aquí</p>
                  {requierePagoAdelantado ? (
                    <>
                      <div>
                        <p>2️⃣ Elige cómo pagar:</p>
                        <ul className="list-disc ml-5 space-y-1">
                          <li><strong>💳 Tarjeta (recomendado):</strong> pagas ahora y listo. No tienes que subir justificante ni hacer nada más.</li>
                          <li><strong>🏦 Transferencia:</strong> realiza la transferencia y sube el justificante desde el formulario.</li>
                        </ul>
                        <p>3️⃣ Tu entrenador te entregará los décimos</p>
                        <p>4️⃣ ¡Y a esperar el sorteo! 🎉</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p>2️⃣ Tu entrenador te entregará los décimos</p>
                        <p>3️⃣ Pagas al entrenador al recibirlos</p>
                        <p>4️⃣ ¡Y a esperar el sorteo! 🎉</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {totalDecimos > 0 && (
              <div className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 p-6 rounded-2xl border-4 border-yellow-500 shadow-2xl text-center">
                <p className="text-3xl font-black text-red-900 mb-2 animate-pulse">
                  🌟 ¡Ya tienes {totalDecimos} décimo{totalDecimos > 1 ? 's' : ''}! 🌟
                </p>
                <p className="text-xl font-bold text-red-800">
                  Inversión total: {totalInvertido}€
                </p>
                <p className="text-lg text-red-700 mt-2">
                  ¡Mucha suerte en el sorteo! 🍀
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {loteriaAbierta && (
          <div className="text-center">
            <Button
              onClick={() => setShowForm(!showForm)}
              size="lg"
              className="bg-gradient-to-r from-red-600 via-green-600 to-red-600 hover:from-red-700 hover:via-green-700 hover:to-red-700 text-white font-bold text-xl px-12 py-6 rounded-3xl shadow-2xl border-4 border-yellow-400 transform hover:scale-110 transition-all"
            >
              <Sparkles className="w-6 h-6 mr-3 animate-spin" />
              {showForm ? "Cerrar Formulario" : "¡Pedir Décimos Ahora!"}
              <PartyPopper className="w-6 h-6 ml-3 animate-bounce" />
            </Button>
          </div>
        )}

        {showForm && loteriaAbierta && (
          <Card className="border-4 border-yellow-400 shadow-2xl bg-white">
            <CardHeader className="bg-gradient-to-r from-green-600 to-red-600 border-b-4 border-yellow-400">
              <CardTitle className="text-white text-2xl text-center">
                🎄 Solicitar Décimos de Lotería 🎄
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {isStaff ? (
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border-2 border-blue-300">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-blue-900 font-bold text-lg">👔 Pedido Personal - Staff del Club</p>
                          <p className="text-blue-800 text-sm">A nombre de: <strong>{user?.full_name}</strong></p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-blue-900">Pedir a mi nombre</Label>
                          <Switch checked={pedidoPersonal} onCheckedChange={setPedidoPersonal} />
                        </div>
                      </div>
                    </div>

                    {!pedidoPersonal && (
                      <div className="space-y-2">
                        <Label className="text-lg font-bold text-slate-900">👤 Jugador</Label>
                        <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                          <SelectTrigger className="border-2 border-red-300 h-12 text-lg">
                            <SelectValue placeholder="Selecciona un jugador" />
                          </SelectTrigger>
                          <SelectContent>
                            {players.map(player => (
                              <SelectItem key={player.id} value={player.id}>
                                {player.nombre} - {player.deporte}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-lg font-bold text-slate-900">👤 Jugador</Label>
                    <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                      <SelectTrigger className="border-2 border-red-300 h-12 text-lg">
                        <SelectValue placeholder="Selecciona un jugador" />
                      </SelectTrigger>
                      <SelectContent>
                        {players.map(player => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.nombre} - {player.deporte}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-lg font-bold text-slate-900">🎟️ Número de Décimos</Label>
                  {(() => {
                    // Tope real: el menor entre 10 (límite por pedido) y los décimos que aún quedan disponibles
                    const maxPermitido = decimosDisponibles !== null
                      ? Math.max(1, Math.min(10, decimosDisponibles))
                      : 10;
                    return (
                      <>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => setNumDecimos(Math.max(1, numDecimos - 1))}
                            disabled={numDecimos <= 1}
                            className="h-16 w-16 bg-red-600 hover:bg-red-700 text-white font-bold text-2xl p-0 rounded-xl border-2 border-yellow-400 shadow-lg disabled:opacity-30"
                          >
                            <ChevronDown className="w-8 h-8" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            max={maxPermitido}
                            value={numDecimos}
                            onChange={(e) => setNumDecimos(Math.max(1, Math.min(maxPermitido, parseInt(e.target.value) || 1)))}
                            className="border-2 border-green-300 h-16 text-3xl text-center font-black flex-1"
                          />
                          <Button
                            type="button"
                            onClick={() => setNumDecimos(Math.min(maxPermitido, numDecimos + 1))}
                            disabled={numDecimos >= maxPermitido}
                            className="h-16 w-16 bg-green-600 hover:bg-green-700 text-white font-bold text-2xl p-0 rounded-xl border-2 border-yellow-400 shadow-lg disabled:opacity-30"
                          >
                            <ChevronUp className="w-8 h-8" />
                          </Button>
                        </div>
                        {decimosDisponibles !== null && decimosDisponibles <= 5 && decimosDisponibles > 0 && (
                          <p className="text-sm text-orange-700 font-semibold mt-1">
                            ⚠️ ¡Quedan solo {decimosDisponibles} décimo{decimosDisponibles > 1 ? 's' : ''} disponibles!
                          </p>
                        )}
                        <div className="bg-gradient-to-r from-yellow-400 to-yellow-300 p-4 rounded-xl border-2 border-yellow-500 text-center">
                          <p className="text-2xl font-black text-red-900">
                            Total: {numDecimos * precioDecimo}€
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>

{/* Sección de Pago */}
                {requierePagoAdelantado ? (
                  <div className="space-y-4">
                    <Label className="text-lg font-bold text-slate-900">💳 Método de Pago</Label>
                    <Select value={metodoPago} onValueChange={setMetodoPago}>
                      <SelectTrigger className="border-2 border-red-300 h-12 text-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Transferencia">🏦 Transferencia Bancaria</SelectItem>
                        {seasonConfig?.bizum_activo && (
                         <SelectItem value="Bizum">📱 Bizum</SelectItem>
                        )}
                        <SelectItem value="Tarjeta">💳 Tarjeta (Stripe)</SelectItem>
                        </SelectContent>
                    </Select>

                    {metodoPago === "Tarjeta" && (
                      <div className="bg-white rounded-lg p-3 border-2 border-orange-300">
                        <p className="text-sm text-slate-900 font-semibold">💳 Pago inmediato con tarjeta (Stripe)</p>
                        {isIframe && (
                          <p className="text-xs text-red-600 mt-1">Abre la app publicada para poder pagar con tarjeta.</p>
                        )}
                      </div>
                    )}

                    {metodoPago === "Bizum" && seasonConfig?.bizum_telefono && (
                      <div className="bg-white rounded-lg p-3 border-2 border-green-300">
                        <p className="text-sm text-slate-900">
                          📱 <strong>Bizum</strong> está disponible, pero te recomendamos pagar con <strong>tarjeta</strong> para confirmar al instante y no tener que subir justificante.
                        </p>
                      </div>
                    )}

                    {metodoPago === "Transferencia" && (
                      <PaymentInstructions
                        playerName={isStaff && pedidoPersonal ? user?.full_name : (players.find(p => p.id === selectedPlayer)?.nombre || "")}
                        playerCategory="Lotería Navidad"
                        amount={numDecimos * precioDecimo}
                        paymentType="Único"
                        paymentMonth="LOTERIA"
                      />
                    )}

                    {/* Justificante obligatorio (no aplica a Tarjeta) */}
                    {metodoPago !== 'Tarjeta' && (
                    <div className="space-y-3 p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                      <Label className="text-base font-semibold text-orange-900">
                        📎 Justificante de Pago * (Obligatorio si no pagas con tarjeta)
                      </Label>
                      <p className="text-sm text-orange-800">
                        {metodoPago === "Bizum" 
                          ? "Si eliges Bizum, sube una captura del justificante."
                          : "Si eliges transferencia, sube una captura o foto del justificante."}
                      </p>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('lottery-file-upload').click()}
                          disabled={uploadingFile}
                          className="flex-1 bg-white"
                        >
                          {uploadingFile ? (
                            
                              <>
                                <span className="inline-flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Subiendo...</span>
                              </>
                            
                          ) : (
                            
                              <>
                                <span className="inline-flex items-center"><Upload className="w-4 h-4 mr-2" />{justificanteUrl ? "Cambiar justificante" : "Subir justificante"}</span>
                              </>
                            
                          )}
                        </Button>
                        {justificanteUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setJustificanteUrl("")}
                            className="bg-white"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <input
                        id="lottery-file-upload"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      {justificanteUrl ? (
                        <p className="text-sm text-green-600 font-medium">✓ Justificante subido correctamente</p>
                      ) : (
                        <p className="text-sm text-red-600 font-medium">⚠️ Debes subir el justificante para continuar</p>
                      )}
                    </div>
                    )}
                  </div>
                  ) : (
                    <div className="bg-gradient-to-r from-green-100 to-green-200 p-4 rounded-xl border-2 border-green-300">
                    <p className="text-green-900 font-bold text-lg mb-2">👨‍🏫 Pago al Entrenador</p>
                    <p className="text-green-800 text-sm">
                      Tu entrenador te entregará los décimos y le pagarás directamente cuando los recibas.
                    </p>
                    <p className="text-green-700 text-xs mt-2">
                      💡 Importe a pagar: <strong>{numDecimos * precioDecimo}€</strong>
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-lg font-bold text-slate-900">📝 Notas (opcional)</Label>
                  <Textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Alguna nota adicional..."
                    className="border-2 border-red-300 min-h-[80px]"
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                    className="flex-1 h-12 text-lg border-2"
                  >
                    Cancelar
                  </Button>
                  <Button 
                   type="submit" 
                   className="flex-1 h-12 text-lg bg-gradient-to-r from-green-600 to-red-600 hover:from-green-700 hover:to-red-700 border-2 border-yellow-400 font-bold"
                   disabled={openingStripe || createOrderMutation.isPending || (requierePagoAdelantado && metodoPago !== 'Tarjeta' && !justificanteUrl)}
                  >
                    {openingStripe ? (<><Loader2 className="w-5 h-5 animate-spin mr-2" /> Abriendo Stripe...</>) : (createOrderMutation.isPending ? "Enviando..." : "🎁 Confirmar Pedido")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Mis Pedidos */}
        <Card className="border-4 border-yellow-400 shadow-2xl bg-white">
          <CardHeader className="bg-gradient-to-r from-red-600 to-green-600 border-b-4 border-yellow-400">
            <CardTitle className="text-white text-2xl">🎅 Mis Pedidos de Lotería</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-8xl mb-4 animate-bounce">🎄</div>
                <p className="text-2xl text-slate-700 font-bold">No has pedido lotería todavía</p>
                {loteriaAbierta && (
                  <p className="text-lg text-slate-500 mt-2">¡Haz clic arriba para pedir tus décimos!</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <Card key={order.id} className="border-2 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">{order.jugador_nombre}</h3>
                          <p className="text-sm text-slate-600">{order.jugador_categoria}</p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          {order.pagado && (
                            <Badge className="bg-green-100 text-green-700 border-2 border-green-300 text-base px-4 py-2">
                              💰 PAGADO
                            </Badge>
                          )}
                          {order.estado === "Entregado" && (
                            <Badge className="bg-purple-100 text-purple-700 border-2 border-purple-300 text-base px-4 py-2">
                              ✅ ENTREGADO
                            </Badge>
                          )}
                          {!order.pagado && order.estado !== "Entregado" && (
                            <Badge className="bg-orange-100 text-orange-700 border-2 border-orange-300 text-base px-4 py-2">
                              🕐 PENDIENTE
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 rounded-xl space-y-2">
                        <p className="text-lg">🎟️ <strong>Décimos:</strong> {order.numero_decimos}</p>
                        <p className="text-lg">💰 <strong>Total:</strong> {order.total}€</p>
                        {order.estado === "Entregado" && order.fecha_entrega && (
                          <p className="text-lg">📅 <strong>Fecha entrega:</strong> {new Date(order.fecha_entrega).toLocaleDateString('es-ES')}</p>
                        )}
                        {order.notas && (
                          <p className="text-slate-600 mt-2 border-t pt-2">📝 {order.notas}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer navideño */}
        <div className="text-center text-white space-y-3 pb-8">
          <p className="text-2xl font-bold animate-pulse">🎄 ¡Feliz Navidad y Mucha Suerte! 🍀</p>
          <p className="text-lg">CD Bustarviejo • Sorteo 22 de Diciembre</p>
          <div className="flex justify-center gap-4 text-4xl">
            <span className="animate-bounce">⭐</span>
            <span className="animate-pulse">🎁</span>
            <span className="animate-bounce">⭐</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
          }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}