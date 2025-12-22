import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Mail, Phone, User, Eye, Clock, Heart, FileText, AlertCircle, Loader2, FileSignature, Download, Calendar, MapPin, Camera, CreditCard, FileCheck, CheckCircle2, UserX } from "lucide-react";
import PlayerDetailDialog from "./PlayerDetailDialog";
import PlayerDocumentDownload from "./PlayerDocumentDownload";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getActiveCustomPlan, getPendingPaymentsCount } from "../payments/paymentHelpers";

const categoryColors = {
  "Prebenjamín": "bg-purple-100 text-purple-700",
  "Benjamín": "bg-blue-100 text-blue-700",
  "Alevín": "bg-green-100 text-green-700",
  "Infantil": "bg-yellow-100 text-yellow-700",
  "Cadete": "bg-orange-100 text-orange-700",
  "Juvenil": "bg-red-100 text-red-700",
  "Senior": "bg-slate-100 text-slate-700"
};

const positionColors = {
  "Portero": "bg-blue-500",
  "Defensa": "bg-green-500",
  "Centrocampista": "bg-yellow-500",
  "Delantero": "bg-red-500"
};

const sportColors = {
  "Fútbol Masculino": "bg-blue-500",
  "Fútbol Femenino": "bg-pink-500",
  "Baloncesto": "bg-orange-500"
};

const sportIcons = {
  "Fútbol Masculino": "⚽",
  "Fútbol Femenino": "⚽",
  "Baloncesto": "🏀"
};

const DIAS_ORDEN = {
  "Lunes": 1,
  "Martes": 2,
  "Miércoles": 3,
  "Jueves": 4,
  "Viernes": 5
};

export default function PlayerCard({ player, onEdit, onViewProfile, isParent = false, readOnly = false, schedules = [], isCoachOrCoordinator = false, payments = [], seasonConfig = null, callups = [], onRenew = null, onMarkNotRenewing = null, onDelete = null, customPlans = [] }) {
  const [showDetail, setShowDetail] = useState(false);
  const [showRenewalSuggestion, setShowRenewalSuggestion] = useState(false);
  const [confirmingNotRenew, setConfirmingNotRenew] = useState(false);
  const [confirmingRenew, setConfirmingRenew] = useState(false);
  
  // Filtrar horarios del jugador según su categoría/deporte
  const playerSchedules = schedules
    .filter(s => s.categoria === player.deporte && s.activo)
    .sort((a, b) => DIAS_ORDEN[a.dia_semana] - DIAS_ORDEN[b.dia_semana]);

  const hasMedicalInfo = player.ficha_medica && Object.values(player.ficha_medica).some(val => val);
  
  // Calcular estado de firmas de federación
  const hasEnlaceFirmaJugador = !!player.enlace_firma_jugador;
  const hasEnlaceFirmaTutor = !!player.enlace_firma_tutor;
  const firmaJugadorOk = player.firma_jugador_completada === true;
  const firmaTutorOk = player.firma_tutor_completada === true;
  
  // Determinar si es mayor de edad (no necesita firma de tutor)
  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNac);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  };
  const esMayorDeEdad = calcularEdad(player.fecha_nacimiento) >= 18;
  const edadActual = calcularEdad(player.fecha_nacimiento);
  
  // Sugerir categoría según edad y género (si aplica)
  const getSuggestedCategory = (edad, deporteActual) => {
    if (!edad) return null;

    // Detectar si es jugadora (categoría actual femenina o equipos mixtos pequeños con niña)
    const esJugadoraFemenina = deporteActual === "Fútbol Femenino";

    // Para jugadoras de fútbol femenino o categorías mixtas de chicas
    if (esJugadoraFemenina || deporteActual?.includes("Femenino")) {
      // Chicas pequeñas van a equipos mixtos
      if (edad <= 5) return "Fútbol Pre-Benjamín (Mixto)";
      if (edad <= 7) return "Fútbol Benjamín (Mixto)";
      if (edad <= 9) return "Fútbol Alevín (Mixto)";
      if (edad <= 11) return "Fútbol Infantil (Mixto)";
      // A partir de 12 años → Fútbol Femenino
      return "Fútbol Femenino";
    }

    // Para jugadores masculinos o baloncesto - RANGOS OFICIALES EXACTOS
    if (edad >= 4 && edad <= 5) return "Fútbol Pre-Benjamín (Mixto)";
    if (edad >= 6 && edad <= 7) return "Fútbol Benjamín (Mixto)";
    if (edad >= 8 && edad <= 9) return "Fútbol Alevín (Mixto)";
    if (edad >= 10 && edad <= 11) return "Fútbol Infantil (Mixto)";
    if (edad >= 12 && edad <= 15) return "Fútbol Cadete"; // Cadete: 12-15 años (incluye 14)
    if (edad >= 16 && edad <= 18) return "Fútbol Juvenil"; // Juvenil: 16-18 años
    if (edad >= 19) return "Fútbol Aficionado"; // Aficionado: 19+ años
    
    // Fallback para baloncesto o casos especiales
    return deporteActual;
  };
  
  const categorySuggested = getSuggestedCategory(edadActual, player.deporte);
  const needsCategoryChange = categorySuggested && player.deporte !== categorySuggested;
  
  // Estado de firmas: 
  // - "none": No hay enlaces asignados
  // - "pending": Hay enlaces pero faltan firmas
  // - "complete": Todas las firmas necesarias están completadas
  const getFirmasStatus = () => {
    const tieneAlgunEnlace = hasEnlaceFirmaJugador || hasEnlaceFirmaTutor;
    if (!tieneAlgunEnlace) return "none";
    
    if (esMayorDeEdad) {
      // Solo necesita firma del jugador
      if (hasEnlaceFirmaJugador && !firmaJugadorOk) return "pending";
      if (hasEnlaceFirmaJugador && firmaJugadorOk) return "complete";
      return "none";
    } else {
      // Necesita ambas firmas
      const firmasRequeridas = [];
      if (hasEnlaceFirmaJugador) firmasRequeridas.push({ tipo: "jugador", ok: firmaJugadorOk });
      if (hasEnlaceFirmaTutor) firmasRequeridas.push({ tipo: "tutor", ok: firmaTutorOk });
      
      if (firmasRequeridas.length === 0) return "none";
      const todasOk = firmasRequeridas.every(f => f.ok);
      return todasOk ? "complete" : "pending";
    }
  };
  
  const firmasStatus = getFirmasStatus();
  const firmasPendientes = [];
  if (hasEnlaceFirmaJugador && !firmaJugadorOk) firmasPendientes.push("Jugador");
  if (hasEnlaceFirmaTutor && !firmaTutorOk && !esMayorDeEdad) firmasPendientes.push("Tutor");
  
  // Usar la temporada activa de SeasonConfig si está disponible, sino calcular
  const getCurrentSeason = () => {
    // Si hay seasonConfig activa, usar esa temporada
    if (seasonConfig?.temporada) {
      return seasonConfig.temporada;
    }
    // Fallback: calcular basado en fecha
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  };
  
  const currentSeason = getCurrentSeason();
  
  // Normalizar temporada: soportar formatos "2024/2025", "2024-2025", "2025/2026", "2025-2026" etc.
  const normalizeTemporada = (temp) => {
    if (!temp) return "";
    // Convertir guiones a barras y eliminar espacios
    return temp.replace(/-/g, "/").trim();
  };
  
  const normalizedCurrentSeason = normalizeTemporada(currentSeason);
  
  // Filtrar pagos del jugador para la temporada actual
  const playerPayments = payments.filter(p => {
    if (p.jugador_id !== player.id) return false;
    const normalizedPaymentSeason = normalizeTemporada(p.temporada);
    return normalizedPaymentSeason === normalizedCurrentSeason;
  });
  
  // Verificar si tiene plan especial activo
  const customPlan = getActiveCustomPlan(player.id, customPlans, normalizedCurrentSeason);
  
  let expectedPayments, paidCount, reviewCount, pendingCount, allPaid;
  
  if (customPlan && customPlan.cuotas) {
    // Plan especial: consultar pagos reales de BD
    expectedPayments = customPlan.cuotas.length;
    const planPayments = playerPayments.filter(p => p.tipo_pago === "Plan Especial");
    paidCount = planPayments.filter(p => p.estado === "Pagado").length;
    reviewCount = planPayments.filter(p => p.estado === "En revisión").length;
    pendingCount = planPayments.filter(p => p.estado === "Pendiente").length;
    allPaid = paidCount === expectedPayments;
  } else {
    // Lógica estándar: pago único o tres meses
    const hasPagoUnico = playerPayments.some(p => 
      p.tipo_pago === "Único" || p.tipo_pago === "único"
    );
    
    expectedPayments = hasPagoUnico ? 1 : 3;
    paidCount = playerPayments.filter(p => p.estado === "Pagado").length;
    reviewCount = playerPayments.filter(p => p.estado === "En revisión").length;
    pendingCount = getPendingPaymentsCount(player.id, payments, customPlans, normalizedCurrentSeason);
    allPaid = hasPagoUnico 
      ? playerPayments.find(p => p.tipo_pago === "Único" || p.tipo_pago === "único")?.estado === "Pagado"
      : paidCount >= 3;
  }
  
  const hasPending = !allPaid && (paidCount + reviewCount) < expectedPayments;
  
  // Próximo evento (partido/convocatoria) del jugador
  const today = new Date().toISOString().split('T')[0];
  const nextCallup = callups
    .filter(c => 
      c.publicada && 
      !c.cerrada && 
      c.fecha_partido >= today &&
      c.jugadores_convocados?.some(j => j.jugador_id === player.id)
    )
    .sort((a, b) => new Date(a.fecha_partido) - new Date(b.fecha_partido))[0];
  
  // Checklist de ficha completa
  const checklistItems = {
    foto: !!player.foto_url,
    dni: !!(player.dni_jugador_url || player.libro_familia_url),
    firma: firmasStatus === "complete" || firmasStatus === "none",
    pago: allPaid || playerPayments.length === 0
  };
  const completedItems = Object.values(checklistItems).filter(Boolean).length;
  const totalItems = Object.keys(checklistItems).length;
  const fichaCompleta = completedItems === totalItems;
  
  return (
    <>
      <PlayerDetailDialog
        player={player}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400"
        onClick={(e) => {
          // Solo abrir el modal si no se hizo click en un botón o link
          if (!e.target.closest('button') && !e.target.closest('a')) {
            setShowDetail(true);
          }
        }}
      >
        <div className="relative">
          {player.foto_url ? (
            <img
              src={player.foto_url}
              alt={player.nombre}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <User className="w-20 h-20 text-white/50" />
            </div>
          )}
          
          {/* Badge de número de camiseta */}
          {player.numero_camiseta && (
            <div className="absolute top-3 right-3 w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
              {player.numero_camiseta}
            </div>
          )}

          {/* Badge de estado + renovación - SOLO mostrar badges de renovación si permitir_renovaciones está activo */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {player.estado_renovacion === "pendiente" && seasonConfig?.permitir_renovaciones ? (
              <Badge className="bg-red-600 text-white animate-pulse shadow-lg">
                ⚠️ RENOVAR JUGADOR
              </Badge>
            ) : player.estado_renovacion === "no_renueva" && seasonConfig?.permitir_renovaciones ? (
              <Badge className="bg-slate-600 text-white shadow-lg">
                ❌ NO RENUEVA
              </Badge>
            ) : player.activo ? (
              <Badge className="bg-green-500 text-white">Activo</Badge>
            ) : !seasonConfig?.permitir_renovaciones && !player.activo ? (
              <Badge className="bg-slate-500 text-white">Inactivo</Badge>
            ) : (
              <Badge className="bg-yellow-500 text-white animate-pulse">⚠️ PENDIENTE RENOVAR</Badge>
            )}
            {player.categoria_requiere_revision && (
              <Badge className="bg-orange-500 text-white text-[10px] animate-pulse">
                🔍 Revisar categoría
              </Badge>
            )}
            {fichaCompleta ? (
              <Badge className="bg-emerald-600 text-white text-[10px]">
                <FileCheck className="w-3 h-3 mr-1" />
                Ficha completa
              </Badge>
            ) : (
              <Badge className="bg-amber-500 text-white text-[10px] animate-pulse">
                ⚠️ {completedItems}/{totalItems} completo
              </Badge>
            )}
          </div>

          {/* Badge de deporte */}
          <div className="absolute bottom-3 left-3">
            <Badge className={`${sportColors[player.deporte]} text-white`}>
              {sportIcons[player.deporte]} {player.deporte}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">{player.nombre}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge className={categoryColors[player.categoria]}>
                {player.categoria}
              </Badge>
              {player.posicion && (
                <Badge className={`${positionColors[player.posicion]} text-white`}>
                  {player.posicion}
                </Badge>
              )}
              {isCoachOrCoordinator && hasMedicalInfo && (
                <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  Ficha Médica
                </Badge>
              )}
            </div>
          </div>

          {/* Advertencia de categoría a revisar (solo admin) */}
          {player.categoria_requiere_revision && onEdit && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-400 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-orange-700 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-orange-900 mb-1">🔍 Categoría a Revisar</p>
                  <p className="text-xs text-orange-800 leading-relaxed mb-2">
                    {player.motivo_revision_categoria || "La categoría no coincide con la edad del jugador"}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await base44.entities.Player.update(player.id, {
                          categoria_requiere_revision: false,
                          categoria_revisada_por: user?.email,
                          fecha_revision_categoria: new Date().toISOString(),
                          motivo_revision_categoria: ""
                        });
                        window.location.reload();
                      }}
                      variant="outline"
                      className="flex-1 border-green-600 text-green-600 hover:bg-green-50"
                    >
                      ✅ Es correcta
                    </Button>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(player);
                      }}
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Corregir
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sugerencia de renovación con cambio de categoría - SOLO si permitir_renovaciones está activo */}
          {player.estado_renovacion === "pendiente" && needsCategoryChange && isParent && seasonConfig?.permitir_renovaciones && (
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-400 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-purple-700 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-purple-900 mb-1">🎉 Sugerencia de Cambio de Categoría</p>
                  <p className="text-xs text-purple-800 leading-relaxed mb-2">
                    {player.nombre} tiene {edadActual} años. Recomendamos cambiar de <strong>{player.deporte}</strong> a <strong>{categorySuggested}</strong>
                  </p>
                  <div className="space-y-2">
                    {confirmingRenew ? (
                      <div className="bg-purple-100 border-2 border-purple-400 rounded-lg p-2">
                        <p className="text-xs text-purple-900 mb-2 font-bold">✅ ¿Confirmar renovación con cambio?</p>
                        <p className="text-xs text-purple-800 mb-2">{player.deporte} → {categorySuggested}</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRenew(player, categorySuggested);
                              setConfirmingRenew(false);
                            }}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            ✅ Confirmar y ACTIVAR
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmingRenew(false);
                            }}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : onRenew && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingRenew(true);
                        }}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg"
                      >
                        ✨ Renovar y ACTIVAR
                      </Button>
                    )}
                    {onMarkNotRenewing && !confirmingNotRenew && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingNotRenew(true);
                        }}
                        className="w-full border-slate-400 text-slate-700 hover:bg-slate-100"
                      >
                        ❌ No voy a renovar
                      </Button>
                    )}
                    {confirmingNotRenew && (
                      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-2">
                        <p className="text-xs text-red-800 mb-2 font-bold">⚠️ ¿Seguro que NO quieres renovar?</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkNotRenewing(player);
                              setConfirmingNotRenew(false);
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                          >
                            Confirmar NO renovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmingNotRenew(false);
                            }}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Renovar sin cambio de categoría - SOLO si permitir_renovaciones está activo */}
          {player.estado_renovacion === "pendiente" && !needsCategoryChange && isParent && seasonConfig?.permitir_renovaciones && (
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-400 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-orange-700 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-orange-900 mb-1">⏰ Renovación Pendiente</p>
                  <p className="text-xs text-orange-800 leading-relaxed mb-2">
                    Es momento de renovar la inscripción de {player.nombre} para la próxima temporada en <strong>{player.deporte}</strong>
                  </p>
                  <div className="space-y-2">
                    {confirmingRenew ? (
                      <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-2">
                        <p className="text-xs text-orange-900 mb-2 font-bold">✅ ¿Confirmar renovación?</p>
                        <p className="text-xs text-orange-800 mb-2">Mantiene {player.deporte}</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRenew(player, null);
                              setConfirmingRenew(false);
                            }}
                            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            ✅ Confirmar y ACTIVAR
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmingRenew(false);
                            }}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : onRenew && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingRenew(true);
                        }}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg"
                      >
                        🔄 Renovar y ACTIVAR
                      </Button>
                    )}
                    {onMarkNotRenewing && !confirmingNotRenew && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingNotRenew(true);
                        }}
                        className="w-full border-slate-400 text-slate-700 hover:bg-slate-100"
                      >
                        ❌ No voy a renovar
                      </Button>
                    )}
                    {confirmingNotRenew && (
                      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-2">
                        <p className="text-xs text-red-800 mb-2 font-bold">⚠️ ¿Seguro que NO quieres renovar?</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkNotRenewing(player);
                              setConfirmingNotRenew(false);
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                          >
                            Confirmar NO renovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmingNotRenew(false);
                            }}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Click para ver detalles */}
          {isCoachOrCoordinator && hasMedicalInfo && (
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-2">
              <div className="flex items-center justify-center gap-2 text-sm text-blue-700 font-medium">
                <Eye className="w-4 h-4" />
                <span>Click para ver ficha médica completa</span>
              </div>
            </div>
          )}

          {/* Checklist de ficha completa */}
          {!fichaCompleta && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-bold text-amber-900">Documentación pendiente:</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${checklistItems.foto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  <Camera className="w-3 h-3" />
                  {checklistItems.foto ? '✓ Foto' : '✗ Foto'}
                </div>
                <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${checklistItems.dni ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  <FileText className="w-3 h-3" />
                  {checklistItems.dni ? '✓ DNI/Libro' : '✗ DNI/Libro'}
                </div>
                <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${checklistItems.firma ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  <FileSignature className="w-3 h-3" />
                  {checklistItems.firma ? '✓ Firmas' : '✗ Firmas'}
                </div>
                <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${checklistItems.pago ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  <CreditCard className="w-3 h-3" />
                  {checklistItems.pago ? '✓ Pagos' : '✗ Pagos'}
                </div>
              </div>
            </div>
          )}

          {/* Próximo partido/convocatoria */}
          {nextCallup && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-purple-700" />
                <p className="text-xs font-bold text-purple-900">🏆 Próximo partido:</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-purple-800">{nextCallup.titulo || `vs ${nextCallup.rival}`}</p>
                <div className="flex items-center gap-3 text-xs text-purple-700">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(nextCallup.fecha_partido), "EEE d MMM", { locale: es })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {nextCallup.hora_partido}
                  </span>
                </div>
                {nextCallup.ubicacion && (
                  <p className="text-xs text-purple-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {nextCallup.ubicacion}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Horarios de Entrenamientos */}
          {playerSchedules.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-green-700" />
                <p className="text-xs font-bold text-green-900">Horarios de Entrenamiento:</p>
              </div>
              <div className="space-y-1">
                {playerSchedules.map((schedule, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1 border border-green-200">
                    <span className="font-semibold text-green-800">{schedule.dia_semana}</span>
                    <span className="text-slate-700">{schedule.hora_inicio} - {schedule.hora_fin}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(player.email || player.telefono) && (
            <div className="space-y-1 text-sm text-slate-600">
              {player.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{player.email}</span>
                </div>
              )}
              {player.telefono && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{player.telefono}</span>
                </div>
              )}
            </div>
          )}

          {/* Estado de Firmas de Federación */}
          {firmasStatus !== "none" && (
            <div className={`rounded-lg p-2 border ${
              firmasStatus === "complete" ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileSignature className={`w-3.5 h-3.5 ${
                    firmasStatus === "complete" ? "text-green-600" : "text-yellow-600"
                  }`} />
                  <span className="text-xs font-medium text-slate-700">Firmas Federación:</span>
                </div>
                {firmasStatus === "complete" ? (
                  <Badge className="bg-green-100 text-green-700 text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Completadas
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-700 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Pendiente
                  </Badge>
                )}
              </div>
              {firmasStatus === "pending" && firmasPendientes.length > 0 && (
                <div className="flex gap-2 mt-1.5">
                  {hasEnlaceFirmaJugador && (
                    <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      firmaJugadorOk ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {firmaJugadorOk ? "✅" : "⏳"} Jugador
                    </div>
                  )}
                  {hasEnlaceFirmaTutor && !esMayorDeEdad && (
                    <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      firmaTutorOk ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {firmaTutorOk ? "✅" : "⏳"} Tutor
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Estado de Pagos - Barra única con 3 segmentos */}
          <div className="bg-slate-50 rounded-lg p-3 border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">💳 Pagos {currentSeason}:</span>
              {allPaid ? (
                <Badge className="bg-green-100 text-green-700 text-xs">✅ Completo</Badge>
              ) : playerPayments.length === 0 && !customPlan ? (
                <Badge className="bg-slate-200 text-slate-600 text-xs">Sin registrar</Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-700 text-xs">{paidCount}/{expectedPayments}</Badge>
              )}
            </div>
            
            {/* Si tiene plan especial */}
            {customPlan && customPlan.cuotas ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-purple-600" />
                    <span className="text-xs font-bold text-purple-900">Plan Especial</span>
                  </div>
                  <span className="text-xs text-purple-700">{paidCount}/{customPlan.cuotas.length} pagadas</span>
                </div>
                <div className="flex gap-1 h-6 rounded-lg overflow-hidden bg-slate-200">
                  {customPlan.cuotas.map((cuota, idx) => {
                    // Buscar el pago real en BD para esta cuota
                    const pagoCuota = playerPayments.find(p => 
                      p.tipo_pago === "Plan Especial" && 
                      p.mes === `Cuota ${cuota.numero}`
                    );
                    const isPaid = pagoCuota?.estado === "Pagado";
                    const isReview = pagoCuota?.estado === "En revisión";
                    
                    return (
                      <div 
                        key={idx}
                        className={`flex-1 flex items-center justify-center text-[10px] font-bold ${
                          isPaid ? 'bg-green-500 text-white' : 
                          isReview ? 'bg-orange-400 text-white animate-pulse' :
                          'bg-red-400 text-white'
                        }`}
                        title={`Cuota ${cuota.numero}: ${cuota.cantidad}€ - ${isPaid ? 'Pagada' : isReview ? 'En revisión' : 'Pendiente'}`}
                      >
                        {cuota.numero} {isPaid ? '✓' : isReview ? '⏳' : '✗'}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-purple-600 mt-1">
                  💰 Total plan: {customPlan.deuda_final?.toFixed(0)}€ • {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
                </p>
              </div>
            ) : playerPayments.some(p => p.tipo_pago === "Único" || p.tipo_pago === "único") ? (
              /* Si es pago único */
              <div className="flex h-6 rounded-lg overflow-hidden">
                {(() => {
                  const pagoUnico = playerPayments.find(p => p.tipo_pago === "Único" || p.tipo_pago === "único");
                  const isPaid = pagoUnico?.estado === "Pagado";
                  const isReview = pagoUnico?.estado === "En revisión";
                  const isPending = pagoUnico?.estado === "Pendiente";
                  
                  return (
                    <div className={`flex-1 flex items-center justify-center text-xs font-bold ${
                      isPaid ? 'bg-green-500 text-white' :
                      isReview ? 'bg-orange-400 text-white animate-pulse' :
                      isPending ? 'bg-red-400 text-white' :
                      'bg-red-400 text-white'
                    }`}>
                      {isPaid ? '✅ Pago Único Completo' : 
                       isReview ? '⏳ Pago Único en Revisión' : 
                       '✗ Pago Único Pendiente'}
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Barra estándar con 3 segmentos lado a lado */
              <div className="flex gap-1 h-6 rounded-lg overflow-hidden bg-slate-200">
                {["Jun", "Sep", "Dic"].map((mes, idx) => {
                  const mesCompleto = ["Junio", "Septiembre", "Diciembre"][idx];
                  const pago = playerPayments.find(p => p.mes === mesCompleto);
                  const isPaid = pago?.estado === "Pagado";
                  const isReview = pago?.estado === "En revisión";
                  const isPending = pago?.estado === "Pendiente";
                  const noPayment = !pago;
                  
                  return (
                    <div 
                      key={mes}
                      className={`flex-1 flex items-center justify-center text-[10px] font-bold transition-all ${
                        isPaid ? 'bg-green-500 text-white' : 
                        isReview ? 'bg-orange-400 text-white animate-pulse' : 
                        isPending || noPayment ? 'bg-red-400 text-white' :
                        'bg-red-400 text-white'
                      }`}
                    >
                      {mes} {isPaid ? '✓' : isReview ? '⏳' : (isPending || noPayment) ? '✗' : '✗'}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2 flex-wrap">
            {onViewProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProfile(player, 'pagos');
                }}
                className="flex-1 hover:bg-purple-50 hover:text-purple-700"
              >
                <FileText className="w-4 h-4 mr-1" />
                Perfil
              </Button>
            )}
            {!readOnly && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(player);
                }}
                className="flex-1 hover:bg-orange-50 hover:text-orange-700"
              >
                <Pencil className="w-4 h-4 mr-1" />
                Editar
              </Button>
            )}
            {!readOnly && onDelete && (player.estado_renovacion === "no_renueva" || !player.activo) && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(player);
                }}
                className="flex-1 hover:bg-red-50 hover:text-red-700 border-red-300"
              >
                <UserX className="w-4 h-4 mr-1" />
                Eliminar
              </Button>
            )}
          </div>
          
          {/* Botón de descarga de documentos */}
          {(player.foto_url || player.dni_jugador_url || player.libro_familia_url || player.dni_tutor_legal_url) && (
            <div className="pt-2 border-t" onClick={(e) => e.stopPropagation()}>
              <PlayerDocumentDownload player={player} variant="dropdown" showLabels={true} />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
    </>
  );
}