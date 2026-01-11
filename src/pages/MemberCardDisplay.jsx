import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, MapPin, Phone, Store } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function MemberCardDisplay() {
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [memberData, setMemberData] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [seasonConfig, setSeasonConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Cargar configuración de temporada
        const configs = await base44.entities.SeasonConfig.filter({ activa: true });
        const activeConfig = configs[0];
        setSeasonConfig(activeConfig);

        if (!activeConfig?.programa_socios_activo) {
          setLoading(false);
          return;
        }

        // Buscar jugadores de este padre
        const allPlayers = await base44.entities.Player.filter({ 
          $or: [
            { email_padre: currentUser.email },
            { email_tutor_2: currentUser.email }
          ],
          activo: true
        });

        console.log('🎫 [MemberCard] Jugadores encontrados:', allPlayers.length);

        if (allPlayers.length === 0) {
          console.log('❌ [MemberCard] Sin jugadores - no hay carnet');
          setLoading(false);
          return;
        }

        // Cargar todos los pagos
        const allPayments = await base44.entities.Payment.list();
        console.log('💰 [MemberCard] Pagos totales cargados:', allPayments.length);
        
        // VERIFICAR: Todas las primeras cuotas (Junio o pago único) de TODOS los hijos deben estar pagadas
        let todasPrimerasCuotasPagadas = true;

        for (const player of allPlayers) {
          const playerPayments = allPayments.filter(p => p.jugador_id === player.id);
          console.log(`🔍 [MemberCard] Pagos de ${player.nombre}:`, playerPayments.length);
          
          // Si tiene pago único, verificar que esté pagado
          const uniquePayment = playerPayments.find(p => p.tipo_pago === "Único");
          if (uniquePayment) {
            console.log(`💳 [MemberCard] ${player.nombre} - Pago único estado: ${uniquePayment.estado}`);
            if (uniquePayment.estado !== "Pagado") {
              todasPrimerasCuotasPagadas = false;
              console.log(`❌ [MemberCard] ${player.nombre} - Pago único NO pagado`);
              break;
            }
            continue;
          }

          // Si tiene pago fraccionado, verificar que Junio esté pagado
          const junioPago = playerPayments.find(p => p.tipo_pago === "Tres meses" && p.mes === "Junio");
          console.log(`📅 [MemberCard] ${player.nombre} - Pago Junio:`, junioPago ? `${junioPago.estado}` : 'No encontrado');
          if (!junioPago || junioPago.estado !== "Pagado") {
            todasPrimerasCuotasPagadas = false;
            console.log(`❌ [MemberCard] ${player.nombre} - Primera cuota NO pagada`);
            break;
          }
        }

        console.log('✅ [MemberCard] Todas primeras cuotas pagadas:', todasPrimerasCuotasPagadas);

        // Si no todas las primeras cuotas están pagadas, NO mostrar carnet
        if (!todasPrimerasCuotasPagadas) {
          console.log('❌ [MemberCard] Carnet NO disponible - primeras cuotas pendientes');
          setMemberData(null);
          setIsActive(false);
          setLoading(false);
          return;
        }

        // Si llegamos aquí, el padre ES SOCIO (tiene todas las primeras cuotas pagadas)
        console.log('✅ [MemberCard] Padre ES SOCIO - creando datos de carnet');
        setMemberData({
          id: currentUser.id,
          nombre_completo: currentUser.full_name,
          email: currentUser.email
        });

        // Ahora verificar si las cuotas ACTUALES están pagadas (con periodo de gracia)
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        let currentPaymentMonth;
        
        if (currentMonth >= 1 && currentMonth <= 8) {
          currentPaymentMonth = "Diciembre";
        } else if (currentMonth === 9 || currentMonth === 10 || currentMonth === 11) {
          currentPaymentMonth = "Septiembre";
        } else {
          currentPaymentMonth = "Junio";
        }

        console.log(`📅 [MemberCard] Cuota actual a verificar: ${currentPaymentMonth}`);

        // Para cada hijo, verificar si su cuota actual está pagada o en periodo de gracia
        let todasCuotasActualesOK = true;

        for (const player of allPlayers) {
          const playerPayments = allPayments.filter(p => p.jugador_id === player.id);
          
          // Si tiene pago único ya pagado, OK
          const uniquePayment = playerPayments.find(p => p.tipo_pago === "Único" && p.estado === "Pagado");
          if (uniquePayment) {
            console.log(`✅ [MemberCard] ${player.nombre} - Pago único OK`);
            continue;
          }

          // Si tiene pago fraccionado, verificar cuota actual
          const currentPayment = playerPayments.find(p => 
            p.tipo_pago === "Tres meses" && 
            p.mes === currentPaymentMonth
          );

          if (!currentPayment) {
            console.log(`❌ [MemberCard] ${player.nombre} - Cuota ${currentPaymentMonth} no encontrada`);
            todasCuotasActualesOK = false;
            break;
          }

          if (currentPayment.estado === "Pagado") {
            console.log(`✅ [MemberCard] ${player.nombre} - Cuota ${currentPaymentMonth} pagada`);
            continue;
          }

          // Si está pendiente, verificar periodo de gracia
          if (currentPayment.estado === "Pendiente") {
            const FECHAS_LIMITE = {
              "Junio": new Date(now.getFullYear(), 5, 30),
              "Septiembre": new Date(now.getFullYear(), 8, 30),
              "Diciembre": new Date(now.getFullYear(), 11, 31)
            };

            const fechaLimite = FECHAS_LIMITE[currentPaymentMonth];
            const diasGracia = activeConfig.dias_gracia_carnet || 15;
            const fechaLimiteConGracia = new Date(fechaLimite);
            fechaLimiteConGracia.setDate(fechaLimiteConGracia.getDate() + diasGracia);

            console.log(`⏰ [MemberCard] ${player.nombre} - Periodo gracia hasta: ${fechaLimiteConGracia.toLocaleDateString()}`);

            if (now > fechaLimiteConGracia) {
              console.log(`❌ [MemberCard] ${player.nombre} - Periodo de gracia expirado`);
              todasCuotasActualesOK = false;
              break;
            } else {
              console.log(`✅ [MemberCard] ${player.nombre} - Dentro del periodo de gracia`);
            }
          } else {
            console.log(`❌ [MemberCard] ${player.nombre} - Estado cuota: ${currentPayment.estado}`);
            todasCuotasActualesOK = false;
            break;
          }
        }

        console.log('🎫 [MemberCard] Estado final carnet:', todasCuotasActualesOK ? 'ACTIVO ✅' : 'EXPIRADO ❌');
        setIsActive(todasCuotasActualesOK);
        setLoading(false);
      } catch (error) {
        console.error("Error loading member card:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Actualizar reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!seasonConfig?.programa_socios_activo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">El programa de socios no está activo en esta temporada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!memberData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <XCircle className="w-16 h-16 text-slate-400 mx-auto" />
            <p className="text-lg font-semibold text-slate-900">No eres socio del club</p>
            <p className="text-sm text-slate-600">Para obtener tu carnet digital, hazte socio en la sección correspondiente</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 transition-all duration-500 ${
      isActive 
        ? 'bg-gradient-to-br from-green-600 via-green-700 to-green-900' 
        : 'bg-gradient-to-br from-red-600 via-red-700 to-red-900'
    }`}>
      <div className="max-w-md w-full space-y-6">
        {/* CARNET DIGITAL */}
        <Card className="border-4 border-white shadow-2xl">
          <CardContent className="p-0">
            {/* Header del carnet */}
            <div className={`p-6 text-center text-white ${
              isActive ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-red-600 to-red-700'
            }`}>
              <h1 className="text-2xl font-bold mb-1">🎫 CARNET DE SOCIO</h1>
              <p className="text-sm opacity-90">CD Bustarviejo</p>
            </div>

            {/* Estado del carnet - GRANDE Y CLARO */}
            <div className={`p-8 text-center ${
              isActive ? 'bg-green-50' : 'bg-red-50'
            }`}>
              {isActive ? (
                <>
                  <CheckCircle2 className="w-24 h-24 text-green-600 mx-auto mb-4 animate-pulse" />
                  <p className="text-4xl font-black text-green-900 mb-2">ACTIVO</p>
                  <p className="text-lg text-green-700 font-semibold">Válido para descuentos</p>
                </>
              ) : (
                <>
                  <XCircle className="w-24 h-24 text-red-600 mx-auto mb-4 animate-pulse" />
                  <p className="text-4xl font-black text-red-900 mb-2">EXPIRADO</p>
                  <p className="text-lg text-red-700 font-semibold">No válido para descuentos</p>
                </>
              )}
            </div>

            {/* Reloj antifraude */}
            <div className="bg-slate-900 text-white p-4 text-center border-t-4 border-orange-500">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5" />
                <p className="text-sm font-medium">Hora actual (antifraude)</p>
              </div>
              <p className="text-3xl font-mono font-bold tracking-wider">
                {format(currentTime, 'HH:mm:ss')}
              </p>
              <p className="text-sm opacity-75 mt-1">
                {format(currentTime, "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </p>
            </div>

            {/* Datos del socio */}
            <div className="p-6 bg-white space-y-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Socio</p>
                <p className="text-xl font-bold text-slate-900">{user?.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Número de Socio</p>
                <p className="text-lg font-mono font-bold text-orange-600">#{memberData.id.slice(-8).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Válido hasta</p>
                <p className="text-base font-semibold text-slate-700">
                  {memberData.fecha_caducidad ? format(new Date(memberData.fecha_caducidad), "d 'de' MMMM yyyy", { locale: es }) : "31 Diciembre " + new Date().getFullYear()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de comercios con descuentos */}
        {seasonConfig?.comercios_descuento && seasonConfig.comercios_descuento.length > 0 && (
          <Card className="border-2 border-white shadow-xl">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Store className="w-6 h-6" />
                🏪 Descuentos Disponibles
              </h2>
              <div className="space-y-3">
                {seasonConfig.comercios_descuento.map((comercio, index) => (
                  <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900">{comercio.nombre}</h3>
                        {comercio.categoria && (
                          <Badge className="mt-1 bg-orange-100 text-orange-700 text-xs">
                            {comercio.categoria}
                          </Badge>
                        )}
                      </div>
                      <Badge className="bg-green-600 text-white text-lg font-bold px-3 py-1">
                        {comercio.descuento}
                      </Badge>
                    </div>
                    {comercio.direccion && (
                      <p className="text-sm text-slate-600 flex items-center gap-1 mt-2">
                        <MapPin className="w-3 h-3" />
                        {comercio.direccion}
                      </p>
                    )}
                    {comercio.telefono && (
                      <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        {comercio.telefono}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instrucciones de uso */}
        <Card className="border-2 border-white shadow-xl bg-white/95">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">📱 Muestra este carnet</strong> al comercio para aplicar tu descuento. 
              El reloj en tiempo real garantiza que el carnet es auténtico y no una captura de pantalla.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}