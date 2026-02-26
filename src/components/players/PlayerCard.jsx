import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Eye, Heart, AlertCircle, UserX, Smartphone, User, FileCheck, Clock, Calendar, MapPin, FileSignature, CheckCircle2, CreditCard, Camera, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PlayerDetailDialog from "./PlayerDetailDialog";
import PlayerDocumentDownload from "./PlayerDocumentDownload";
import MinorAccessDialog from "../minor/MinorAccessDialog";
import { getActiveCustomPlan, getPendingPaymentsCount } from "../payments/paymentHelpers";
import { base44 } from "@/api/base44Client";
import PlayerCardRenewal from "./card/PlayerCardRenewal";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const categoryColors = {
  "Prebenjamín": "bg-purple-100 text-purple-700",
  "Benjamín": "bg-blue-100 text-blue-700",
  "Alevín": "bg-green-100 text-green-700",
  "Infantil": "bg-yellow-100 text-yellow-700",
  "Cadete": "bg-orange-100 text-orange-700",
  "Juvenil": "bg-red-100 text-red-700",
  "Senior": "bg-slate-100 text-slate-700"
};

const positionEmoji = {
  "Portero": "🧤",
  "Defensa": "🛡️",
  "Medio": "🎯",
  "Delantero": "⚡"
};

const DIAS_ORDEN = { "Lunes": 1, "Martes": 2, "Miércoles": 3, "Jueves": 4, "Viernes": 5 };

const calcularEdad = (fechaNac) => {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNac);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
};

const getSuggestedCategory = (edad, deporteActual) => {
  if (!edad) return null;
  const esJugadoraFemenina = deporteActual === "Fútbol Femenino";
  if (esJugadoraFemenina || deporteActual?.includes("Femenino")) {
    if (edad <= 5) return "Fútbol Pre-Benjamín (Mixto)";
    if (edad <= 7) return "Fútbol Benjamín (Mixto)";
    if (edad <= 9) return "Fútbol Alevín (Mixto)";
    if (edad <= 11) return "Fútbol Infantil (Mixto)";
    return "Fútbol Femenino";
  }
  if (edad >= 4 && edad <= 5) return "Fútbol Pre-Benjamín (Mixto)";
  if (edad >= 6 && edad <= 7) return "Fútbol Benjamín (Mixto)";
  if (edad >= 8 && edad <= 9) return "Fútbol Alevín (Mixto)";
  if (edad >= 10 && edad <= 11) return "Fútbol Infantil (Mixto)";
  if (edad >= 12 && edad <= 15) return "Fútbol Cadete";
  if (edad >= 16 && edad <= 18) return "Fútbol Juvenil";
  if (edad >= 19) return "Fútbol Aficionado";
  return deporteActual;
};

export default function PlayerCard({ player, onEdit, onViewProfile, isParent = false, readOnly = false, schedules = [], isCoachOrCoordinator = false, payments = [], seasonConfig = null, callups = [], onRenew = null, onMarkNotRenewing = null, onDelete = null, customPlans = [], evaluations = [], attendanceRecords = [] }) {
  const [showDetail, setShowDetail] = useState(false);
  const [showMinorAccess, setShowMinorAccess] = useState(false);
  const [parentUser, setParentUser] = useState(null);

  // Evaluaciones del jugador actual
  const playerEvaluations = evaluations.filter(e => e.jugador_id === player.id).sort((a, b) => new Date(b.fecha_evaluacion) - new Date(a.fecha_evaluacion));
  const lastEvaluation = playerEvaluations[0];
  const avgRating = lastEvaluation ? ((lastEvaluation.tecnica + lastEvaluation.tactica + lastEvaluation.fisica + lastEvaluation.actitud + lastEvaluation.trabajo_equipo) / 5).toFixed(1) : null;

  // Asistencia
  const playerAttendance = attendanceRecords.filter(a => a.asistencias?.some(att => att.jugador_id === player.id));
  const lastAttendance = playerAttendance[playerAttendance.length - 1];
  const attendanceStatus = lastAttendance?.asistencias?.find(att => att.jugador_id === player.id)?.estado;

  const playerCategory = player.categoria_principal || player.deporte;
  const playerSchedules = schedules
    .filter(s => s.categoria === playerCategory && s.activo)
    .sort((a, b) => DIAS_ORDEN[a.dia_semana] - DIAS_ORDEN[b.dia_semana]);

  const hasMedicalInfo = player.ficha_medica && Object.values(player.ficha_medica).some(val => val);
  const hasEnlaceFirmaJugador = !!player.enlace_firma_jugador;
  const hasEnlaceFirmaTutor = !!player.enlace_firma_tutor;
  const firmaJugadorOk = player.firma_jugador_completada === true;
  const firmaTutorOk = player.firma_tutor_completada === true;
  const esMayorDeEdad = calcularEdad(player.fecha_nacimiento) >= 18;
  const edadActual = calcularEdad(player.fecha_nacimiento);
  const categorySuggested = getSuggestedCategory(edadActual, playerCategory);
  const needsCategoryChange = categorySuggested && playerCategory !== categorySuggested;

  // Firmas status
  const getFirmasStatus = () => {
    const tieneAlgunEnlace = hasEnlaceFirmaJugador || hasEnlaceFirmaTutor;
    if (!tieneAlgunEnlace) return "none";
    if (esMayorDeEdad) {
      if (hasEnlaceFirmaJugador && !firmaJugadorOk) return "pending";
      if (hasEnlaceFirmaJugador && firmaJugadorOk) return "complete";
      return "none";
    }
    const firmasRequeridas = [];
    if (hasEnlaceFirmaJugador) firmasRequeridas.push({ ok: firmaJugadorOk });
    if (hasEnlaceFirmaTutor) firmasRequeridas.push({ ok: firmaTutorOk });
    if (firmasRequeridas.length === 0) return "none";
    return firmasRequeridas.every(f => f.ok) ? "complete" : "pending";
  };
  const firmasStatus = getFirmasStatus();

  // Season & payments
  const getCurrentSeason = () => {
    if (seasonConfig?.temporada) return seasonConfig.temporada;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  };
  const currentSeason = getCurrentSeason();
  const normalizeTemporada = (temp) => temp ? temp.replace(/-/g, "/").trim() : "";
  const normalizedCurrentSeason = normalizeTemporada(currentSeason);

  const playerPayments = payments.filter(p => {
    if (p.jugador_id !== player.id) return false;
    return normalizeTemporada(p.temporada) === normalizedCurrentSeason;
  });

  const customPlan = getActiveCustomPlan(player.id, customPlans, normalizedCurrentSeason);
  let expectedPayments, paidCount, pendingCount, allPaid;
  if (customPlan && customPlan.cuotas) {
    expectedPayments = customPlan.cuotas.length;
    const planPayments = playerPayments.filter(p => p.tipo_pago === "Plan Especial");
    paidCount = planPayments.filter(p => p.estado === "Pagado").length;
    pendingCount = planPayments.filter(p => p.estado === "Pendiente").length;
    allPaid = paidCount === expectedPayments;
  } else {
    const hasPagoUnico = playerPayments.some(p => p.tipo_pago === "Único" || p.tipo_pago === "único");
    expectedPayments = hasPagoUnico ? 1 : 3;
    paidCount = playerPayments.filter(p => p.estado === "Pagado").length;
    pendingCount = getPendingPaymentsCount(player.id, payments, customPlans, normalizedCurrentSeason);
    allPaid = hasPagoUnico
      ? playerPayments.find(p => p.tipo_pago === "Único" || p.tipo_pago === "único")?.estado === "Pagado"
      : paidCount >= 3;
  }

  // Next callup
  const today = new Date().toISOString().split('T')[0];
  const nextCallup = callups
    .filter(c => c.publicada && !c.cerrada && c.fecha_partido >= today && c.jugadores_convocados?.some(j => j.jugador_id === player.id))
    .sort((a, b) => new Date(a.fecha_partido) - new Date(b.fecha_partido))[0];

  // Checklist
  const checklistItems = {
    foto: !!player.foto_url,
    dni: !!(player.dni_jugador_url || player.libro_familia_url),
    firma: firmasStatus === "complete" || firmasStatus === "none",
    pago: allPaid || playerPayments.length === 0
  };
  const completedItems = Object.values(checklistItems).filter(Boolean).length;
  const totalItems = Object.keys(checklistItems).length;
  const fichaCompleta = completedItems === totalItems;

  // Status badge config
  const getStatusBadge = () => {
    if (player.estado_renovacion === "pendiente" && seasonConfig?.permitir_renovaciones)
      return { text: "⚠️ RENOVAR", cls: "bg-red-500 text-white animate-pulse" };
    if (player.estado_renovacion === "no_renueva" && seasonConfig?.permitir_renovaciones)
      return { text: "❌ No renueva", cls: "bg-slate-500 text-white" };
    if (player.activo) return { text: "Activo", cls: "bg-green-500 text-white" };
    return { text: "Inactivo", cls: "bg-slate-400 text-white" };
  };
  const statusBadge = getStatusBadge();

  // Payment bar
  const PaymentBar = () => {
    if (playerPayments.length === 0 && !customPlan) return null;
    
    if (customPlan && customPlan.cuotas) {
      return (
        <div className="flex gap-0.5 h-5 rounded-lg overflow-hidden">
          {customPlan.cuotas.sort((a, b) => a.numero - b.numero).map((cuota) => {
            const pagosCuota = playerPayments.filter(p => p.tipo_pago === "Plan Especial" && p.mes === `Cuota ${cuota.numero}`);
            let pagoCuota = pagosCuota.find(p => p.estado === "Pagado") || pagosCuota.find(p => p.estado === "En revisión") || pagosCuota[0];
            const isPaid = pagoCuota?.estado === "Pagado";
            const isReview = pagoCuota?.estado === "En revisión";
            return (
              <div key={cuota.numero} className={`flex-1 flex items-center justify-center text-[9px] font-bold ${isPaid ? 'bg-green-500 text-white' : isReview ? 'bg-amber-400 text-white' : 'bg-red-400 text-white'}`}>
                {cuota.numero}{isPaid ? '✓' : isReview ? '⏳' : ''}
              </div>
            );
          })}
        </div>
      );
    }
    
    if (playerPayments.some(p => p.tipo_pago === "Único" || p.tipo_pago === "único")) {
      const pago = playerPayments.find(p => p.tipo_pago === "Único" || p.tipo_pago === "único");
      const isPaid = pago?.estado === "Pagado";
      const isReview = pago?.estado === "En revisión";
      return (
        <div className={`h-5 rounded-lg flex items-center justify-center text-[10px] font-bold ${isPaid ? 'bg-green-500 text-white' : isReview ? 'bg-amber-400 text-white' : 'bg-red-400 text-white'}`}>
          {isPaid ? '✅ Pagado' : isReview ? '⏳ En revisión' : '✗ Pendiente'}
        </div>
      );
    }

    return (
      <div className="flex gap-0.5 h-5 rounded-lg overflow-hidden">
        {["Junio", "Septiembre", "Diciembre"].map((mes) => {
          const pago = playerPayments.find(p => p.mes === mes);
          const isPaid = pago?.estado === "Pagado";
          const isReview = pago?.estado === "En revisión";
          return (
            <div key={mes} className={`flex-1 flex items-center justify-center text-[9px] font-bold ${isPaid ? 'bg-green-500 text-white' : isReview ? 'bg-amber-400 text-white' : 'bg-red-400 text-white'}`}>
              {mes.slice(0, 3)}{isPaid ? '✓' : isReview ? '⏳' : ''}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <PlayerDetailDialog player={player} open={showDetail} onOpenChange={setShowDetail} />
      {parentUser && (
        <MinorAccessDialog open={showMinorAccess} onOpenChange={setShowMinorAccess} player={player} parentUser={parentUser} />
      )}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className="border-none shadow-lg hover:shadow-xl transition-shadow bg-white overflow-hidden cursor-pointer"
          onClick={(e) => {
            if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('select')) {
              setShowDetail(true);
            }
          }}
        >
          {/* ═══════ HEADER: Foto + Info principal ═══════ */}
          <div className="flex gap-4 p-4 pb-3">
            {/* Foto */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200 shadow-md">
                {player.foto_url ? (
                  <img src={player.foto_url} alt={player.nombre} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-10 h-10 text-orange-400" />
                  </div>
                )}
              </div>
              {/* Ficha status indicator */}
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] ${fichaCompleta ? 'bg-green-500' : 'bg-amber-500'}`}>
                {fichaCompleta ? '✓' : `${completedItems}`}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-lg text-slate-900 leading-tight truncate">{player.nombre}</h3>
                <Badge className={`${statusBadge.cls} text-[10px] flex-shrink-0`}>{statusBadge.text}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  {playerCategory || "Sin categoría"}
                </span>
                {player.posicion && player.posicion !== "Sin asignar" && (
                  <span className="text-xs text-slate-500">
                    {positionEmoji[player.posicion] || "📍"} {player.posicion}
                  </span>
                )}
                {edadActual && (
                  <span className="text-xs text-slate-400">{edadActual} años</span>
                )}
              </div>
              {isCoachOrCoordinator && hasMedicalInfo && (
                <Badge className="bg-red-50 text-red-600 text-[10px] mt-1.5">
                  <Heart className="w-3 h-3 mr-0.5" /> Ficha médica
                </Badge>
              )}
            </div>
          </div>

          <CardContent className="px-4 pb-4 pt-0 space-y-2.5">

            {/* ═══════ CATEGORY REVIEW (admin) ═══════ */}
            {player.categoria_requiere_revision && onEdit && (
              <div className="bg-orange-50 border border-orange-300 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-orange-900">Categoría a revisar</p>
                    <p className="text-[11px] text-orange-700 mt-0.5">{player.motivo_revision_categoria || "No coincide con la edad"}</p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-green-500 text-green-600" onClick={async (e) => {
                        e.stopPropagation();
                        const u = await base44.auth.me();
                        await base44.entities.Player.update(player.id, { categoria_requiere_revision: false, categoria_revisada_por: u?.email, fecha_revision_categoria: new Date().toISOString(), motivo_revision_categoria: "" });
                        window.location.reload();
                      }}>✅ Correcta</Button>
                      <Button size="sm" className="flex-1 h-7 text-[11px] bg-orange-600" onClick={(e) => { e.stopPropagation(); onEdit(player); }}>
                        <Pencil className="w-3 h-3 mr-1" />Corregir
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════ RENEWAL ═══════ */}
            {player.estado_renovacion === "pendiente" && isParent && seasonConfig?.permitir_renovaciones && (
              <PlayerCardRenewal
                player={player}
                needsCategoryChange={needsCategoryChange}
                categorySuggested={categorySuggested}
                edadActual={edadActual}
                onRenew={onRenew}
                onMarkNotRenewing={onMarkNotRenewing}
              />
            )}

            {/* ═══════ QUICK STATUS ROW (clickable for parents) ═══════ */}
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              {isParent ? (
                <Link
                  to={createPageUrl('ParentPayments')}
                  onClick={(e) => e.stopPropagation()}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors ${allPaid ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : pendingCount > 0 ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                >
                  {allPaid ? '✅' : pendingCount > 0 ? '❌' : '➖'} Pagos {allPaid ? 'al día' : playerPayments.length === 0 ? '' : `${paidCount}/${expectedPayments}`} →
                </Link>
              ) : (
                <span className={`inline-flex items-center gap-1 ${allPaid ? 'text-green-600' : pendingCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  {allPaid ? '✅' : pendingCount > 0 ? '❌' : '➖'} Pagos {allPaid ? 'al día' : playerPayments.length === 0 ? '' : `${paidCount}/${expectedPayments}`}
                </span>
              )}
              {isParent ? (
                <Link
                  to={createPageUrl('FederationSignatures')}
                  onClick={(e) => e.stopPropagation()}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors ${firmasStatus === 'complete' ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : firmasStatus === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                >
                  {firmasStatus === 'complete' ? '✅' : firmasStatus === 'pending' ? '⏳' : '➖'} Firmas →
                </Link>
              ) : (
                <span className={`inline-flex items-center gap-1 ${firmasStatus === 'complete' ? 'text-green-600' : firmasStatus === 'pending' ? 'text-amber-600' : 'text-slate-400'}`}>
                  {firmasStatus === 'complete' ? '✅' : firmasStatus === 'pending' ? '⏳' : '➖'} Firmas
                </span>
              )}
              {isParent && onEdit ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(player); }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors ${checklistItems.foto && checklistItems.dni ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'}`}
                >
                  {checklistItems.foto && checklistItems.dni ? '✅' : '⏳'} Docs {!(checklistItems.foto && checklistItems.dni) ? '→' : ''}
                </button>
              ) : (
                <span className={`inline-flex items-center gap-1 ${checklistItems.foto && checklistItems.dni ? 'text-green-600' : 'text-amber-600'}`}>
                  {checklistItems.foto && checklistItems.dni ? '✅' : '⏳'} Docs
                </span>
              )}
            </div>

            {/* ═══════ PAYMENT BAR ═══════ */}
            <PaymentBar />

            {/* ═══════ NEXT MATCH ═══════ */}
            {nextCallup && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏆</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-indigo-900 truncate">{nextCallup.titulo || `vs ${nextCallup.rival}`}</p>
                    <div className="flex items-center gap-2 text-[11px] text-indigo-600 mt-0.5">
                      <span>{format(new Date(nextCallup.fecha_partido), "EEE d MMM", { locale: es })}</span>
                      <span>·</span>
                      <span>{nextCallup.hora_partido}</span>
                      {nextCallup.ubicacion && (
                        <>
                          <span>·</span>
                          <span className="truncate">{nextCallup.ubicacion}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════ SCHEDULE ═══════ */}
            {playerSchedules.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span className="truncate">
                  {playerSchedules.map(s => `${s.dia_semana} ${s.hora_inicio}-${s.hora_fin}`).join(' · ')}
                </span>
              </div>
            )}

            {/* ═══════ EVALUATION ═══════ */}
            {lastEvaluation && (
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-bold text-blue-900">📊 Evaluación</p>
                  <span className="text-sm font-bold text-blue-700">{avgRating}/5</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { label: 'Tec', val: lastEvaluation.tecnica },
                    { label: 'Tác', val: lastEvaluation.tactica },
                    { label: 'Fís', val: lastEvaluation.fisica },
                    { label: 'Act', val: lastEvaluation.actitud },
                    { label: 'Eq', val: lastEvaluation.trabajo_equipo }
                  ].map(item => (
                    <div key={item.label} className="text-center bg-white rounded-lg py-1.5 border border-blue-100">
                      <p className="text-[10px] font-bold text-blue-600">{item.val}</p>
                      <p className="text-[8px] text-blue-500">{item.label}</p>
                    </div>
                  ))}
                </div>
                {lastEvaluation.observaciones && (
                  <p className="text-[10px] text-blue-700 mt-2 italic">"{lastEvaluation.observaciones.substring(0, 60)}..."</p>
                )}
              </div>
            )}

            {/* ═══════ ATTENDANCE ═══════ */}
            {lastAttendance && (
              <div className={`rounded-xl p-3 border ${attendanceStatus === 'presente' ? 'bg-green-50 border-green-200' : attendanceStatus === 'justificado' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-xs font-bold mb-1">
                  {attendanceStatus === 'presente' ? '✅ Presente' : attendanceStatus === 'justificado' ? '📋 Justificado' : '❌ Ausente'}
                </p>
                <p className="text-[10px] text-slate-600">
                  Última sesión: {format(new Date(lastAttendance.fecha), "d MMM", { locale: es })}
                </p>
              </div>
            )}

            {/* ═══════ MEDICAL INFO ═══════ */}
            {hasMedicalInfo && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs font-bold text-red-900 mb-1">❤️ Ficha Médica</p>
                {player.ficha_medica?.alergias && <p className="text-[10px] text-red-700"><strong>Alergias:</strong> {player.ficha_medica.alergias}</p>}
                {player.ficha_medica?.grupo_sanguineo && <p className="text-[10px] text-red-700"><strong>Grupo:</strong> {player.ficha_medica.grupo_sanguineo}</p>}
                {player.ficha_medica?.condiciones_medicas && <p className="text-[10px] text-red-700"><strong>Condiciones:</strong> {player.ficha_medica.condiciones_medicas}</p>}
              </div>
            )}

            {/* ═══════ JUVENILE ACCESS ═══════ */}
            {isParent && edadActual >= 13 && edadActual < 18 && !player.acceso_menor_autorizado && !player.acceso_menor_revocado && !player.es_mayor_edad && (
              <Button
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation();
                  const u = await base44.auth.me();
                  setParentUser(u);
                  setShowMinorAccess(true);
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-xs h-8"
              >
                <Smartphone className="w-3.5 h-3.5 mr-1" />
                Activar Acceso Juvenil ({player.nombre?.split(" ")[0]})
              </Button>
            )}
            {player.acceso_menor_autorizado && !player.acceso_menor_revocado && (
              <div className="flex items-center gap-1.5 text-[11px] text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5 border border-green-200">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Acceso juvenil activo: {player.acceso_menor_email}</span>
              </div>
            )}

            {/* ═══════ ACTIONS ═══════ */}
            <div className="flex gap-2 pt-1">
              {onViewProfile && (
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onViewProfile(player, 'pagos'); }} className="flex-1 h-8 text-xs">
                  <FileText className="w-3.5 h-3.5 mr-1" />Perfil
                </Button>
              )}
              {!readOnly && onEdit && (
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(player); }} className="flex-1 h-8 text-xs hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300">
                  <Pencil className="w-3.5 h-3.5 mr-1" />Editar
                </Button>
              )}
              {!readOnly && onDelete && (
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(player); }} className="flex-1 h-8 text-xs hover:bg-red-50 hover:text-red-700 border-red-200">
                  <UserX className="w-3.5 h-3.5 mr-1" />Eliminar
                </Button>
              )}
            </div>

            {/* ═══════ DOCUMENT DOWNLOAD ═══════ */}
            {(player.foto_url || player.dni_jugador_url || player.libro_familia_url || player.dni_tutor_legal_url) && (
              <div className="pt-1 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                <PlayerDocumentDownload player={player} variant="dropdown" showLabels={true} />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}