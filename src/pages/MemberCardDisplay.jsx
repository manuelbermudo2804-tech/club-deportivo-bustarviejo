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

        // 1. Verificar si el usuario ES SOCIO (existe en ClubMember con estado_pago = "Pagado")
        const members = await base44.entities.ClubMember.filter({ 
          email: currentUser.email,
          estado_pago: "Pagado"
        });

        console.log('🎫 [MemberCard] ClubMember encontrado:', members.length > 0 ? 'SÍ' : 'NO');

        if (members.length === 0) {
          console.log('❌ [MemberCard] Usuario NO es socio pagado');
          setLoading(false);
          return;
        }

        // Usuario ES SOCIO → Mostrar carnet
        const member = members[0];
        setMemberData(member);
        console.log('✅ [MemberCard] Usuario ES SOCIO:', member.nombre_completo);

        // 2. Verificar COLOR del carnet (verde/rojo): todas las cuotas actuales de TODOS los hijos al día
        const allPlayers = await base44.entities.Player.filter({ 
          $or: [
            { email_padre: currentUser.email },
            { email_tutor_2: currentUser.email }
          ],
          activo: true
        });

        console.log('👨‍👩‍👧 [MemberCard] Hijos encontrados:', allPlayers.length);

        // Si no tiene hijos, carnet siempre verde (socio sin hijos o socio externo)
        if (allPlayers.length === 0) {
          console.log('✅ [MemberCard] Sin hijos - carnet VERDE por defecto');
          setIsActive(true);
          setLoading(false);
          return;
        }

        // Determinar cuota actual según la fecha
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

        // Cargar todos los pagos
        const allPayments = await base44.entities.Payment.list();

        // Verificar cuotas actuales de TODOS los hijos
        let todasCuotasAlDia = true;

        for (const player of allPlayers) {
          const playerPayments = allPayments.filter(p => p.jugador_id === player.id);
          
          // Si tiene pago único pagado, OK
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
            console.log(`❌ [MemberCard] ${player.nombre} - Cuota ${currentPaymentMonth} no existe`);
            todasCuotasAlDia = false;
            break;
          }

          if (currentPayment.estado === "Pagado") {
            console.log(`✅ [MemberCard] ${player.nombre} - Cuota ${currentPaymentMonth} pagada`);
            continue;
          }

          // Si está pendiente, verificar periodo de gracia (15 días después de fecha límite)
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

            if (now <= fechaLimiteConGracia) {
              console.log(`✅ [MemberCard] ${player.nombre} - Dentro del periodo de gracia`);
              continue;
            } else {
              console.log(`❌ [MemberCard] ${player.nombre} - Periodo de gracia expirado`);
              todasCuotasAlDia = false;
              break;
            }
          } else {
            console.log(`❌ [MemberCard] ${player.nombre} - Estado cuota: ${currentPayment.estado}`);
            todasCuotasAlDia = false;
            break;
          }
        }

        console.log('🎫 [MemberCard] Estado final carnet:', todasCuotasAlDia ? 'VERDE ✅' : 'ROJO ❌');
        setIsActive(todasCuotasAlDia);
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
            {/* Header del carnet con logo */}
             <div className={`p-6 text-center text-white ${
               isActive ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-red-600 to-red-700'
             }`}>
               <img 
                 src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg" 
                 alt="Logo CD Bustarviejo" 
                 className="w-12 h-12 mx-auto mb-2 rounded-lg shadow-lg"
               />
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
                  {memberData.fecha_vencimiento ? format(new Date(memberData.fecha_vencimiento), "d 'de' MMMM yyyy", { locale: es }) : "Sin fecha de vencimiento"}
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

        {/* ¿Qué es el carnet de socio? */}
        <Card className="border-2 border-white shadow-xl bg-white/95">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 mb-2">🎫 ¿Qué es el Carnet de Socio?</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                El carnet digital te identifica como <strong>socio oficial del CD Bustarviejo</strong> y te permite acceder a descuentos exclusivos en comercios colaboradores de la zona.
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <h4 className="font-bold text-slate-900 text-sm">📱 Cómo usar tu carnet:</h4>
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-green-600 mt-0.5">1.</span>
                  <p>Muestra tu carnet digital en el comercio adherido</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-green-600 mt-0.5">2.</span>
                  <p>El comercio verificará que el carnet está <strong>ACTIVO</strong> (verde)</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-green-600 mt-0.5">3.</span>
                  <p>El reloj en tiempo real garantiza que no es una captura de pantalla</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-green-600 mt-0.5">4.</span>
                  <p>¡Disfruta de tu descuento inmediatamente!</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
              <h4 className="font-bold text-orange-900 text-sm mb-2">⚠️ Importante:</h4>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• Solo válido si aparece <strong>ACTIVO</strong> (verde)</li>
                <li>• Asegúrate de tener cuotas al día para mantenerlo activo</li>
                <li>• No válido si está <strong>EXPIRADO</strong> (rojo)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}