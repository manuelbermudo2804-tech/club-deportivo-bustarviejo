import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Mail, Phone, Eye, Heart, FileText, AlertCircle, UserX, Smartphone } from "lucide-react";
import PlayerDetailDialog from "./PlayerDetailDialog";
import PlayerDocumentDownload from "./PlayerDocumentDownload";
import MinorAccessDialog from "../minor/MinorAccessDialog";
import { getActiveCustomPlan, getPendingPaymentsCount } from "../payments/paymentHelpers";
import { base44 } from "@/api/base44Client";

import PlayerCardHeader from "./card/PlayerCardHeader";
import PlayerCardChecklist from "./card/PlayerCardChecklist";
import PlayerCardPayments from "./card/PlayerCardPayments";
import PlayerCardRenewal from "./card/PlayerCardRenewal";
import PlayerCardSignatures from "./card/PlayerCardSignatures";
import PlayerCardNextMatch from "./card/PlayerCardNextMatch";
import PlayerCardSchedule from "./card/PlayerCardSchedule";
import PlayerStatsWidget from "./PlayerStatsWidget";

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

export default function PlayerCard({ player, onEdit, onViewProfile, isParent = false, readOnly = false, schedules = [], isCoachOrCoordinator = false, payments = [], seasonConfig = null, callups = [], onRenew = null, onMarkNotRenewing = null, onDelete = null, customPlans = [] }) {
  const [showDetail, setShowDetail] = useState(false);
  const [showMinorAccess, setShowMinorAccess] = useState(false);
  const [parentUser, setParentUser] = useState(null);

  // Derived data
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
  const firmasPendientes = [];
  if (hasEnlaceFirmaJugador && !firmaJugadorOk) firmasPendientes.push("Jugador");
  if (hasEnlaceFirmaTutor && !firmaTutorOk && !esMayorDeEdad) firmasPendientes.push("Tutor");

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
  let expectedPayments, paidCount, reviewCount, pendingCount, allPaid;
  if (customPlan && customPlan.cuotas) {
    expectedPayments = customPlan.cuotas.length;
    const planPayments = playerPayments.filter(p => p.tipo_pago === "Plan Especial");
    paidCount = planPayments.filter(p => p.estado === "Pagado").length;
    reviewCount = planPayments.filter(p => p.estado === "En revisión").length;
    pendingCount = planPayments.filter(p => p.estado === "Pendiente").length;
    allPaid = paidCount === expectedPayments;
  } else {
    const hasPagoUnico = playerPayments.some(p => p.tipo_pago === "Único" || p.tipo_pago === "único");
    expectedPayments = hasPagoUnico ? 1 : 3;
    paidCount = playerPayments.filter(p => p.estado === "Pagado").length;
    reviewCount = playerPayments.filter(p => p.estado === "En revisión").length;
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

  return (
    <>
      <PlayerDetailDialog player={player} open={showDetail} onOpenChange={setShowDetail} />
      {parentUser && (
        <MinorAccessDialog
          open={showMinorAccess}
          onOpenChange={setShowMinorAccess}
          player={player}
          parentUser={parentUser}
        />
      )}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className="border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400"
          onClick={(e) => {
            if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('select')) {
              setShowDetail(true);
            }
          }}
        >
          <PlayerCardHeader
            player={player}
            seasonConfig={seasonConfig}
            fichaCompleta={fichaCompleta}
            completedItems={completedItems}
            totalItems={totalItems}
          />

          <CardContent className="p-4 space-y-3">
            <div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">{player.nombre}</h3>
              <div className="flex flex-wrap gap-2">
                <Badge className={categoryColors[player.categoria] || "bg-slate-100 text-slate-700"}>
                  {playerCategory || player.categoria || "Sin categoría"}
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

            {/* Category review warning (admin only) */}
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
                          const currentUser = await base44.auth.me();
                          await base44.entities.Player.update(player.id, {
                            categoria_requiere_revision: false,
                            categoria_revisada_por: currentUser?.email,
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
                        onClick={(e) => { e.stopPropagation(); onEdit(player); }}
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

            {/* Renewal section */}
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

            {/* Medical info hint */}
            {isCoachOrCoordinator && hasMedicalInfo && (
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-2">
                <div className="flex items-center justify-center gap-2 text-sm text-blue-700 font-medium">
                  <Eye className="w-4 h-4" />
                  <span>Click para ver ficha médica completa</span>
                </div>
              </div>
            )}

            <PlayerStatsWidget
              playerId={player.id}
              playerCategory={playerCategory}
              fechaNacimiento={player.fecha_nacimiento}
              createdDate={player.created_date}
              compact={true}
            />

            {!fichaCompleta && <PlayerCardChecklist checklistItems={checklistItems} />}
            <PlayerCardNextMatch nextCallup={nextCallup} />
            <PlayerCardSchedule playerSchedules={playerSchedules} />

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

            <PlayerCardSignatures
              firmasStatus={firmasStatus}
              firmasPendientes={firmasPendientes}
              hasEnlaceFirmaJugador={hasEnlaceFirmaJugador}
              hasEnlaceFirmaTutor={hasEnlaceFirmaTutor}
              firmaJugadorOk={firmaJugadorOk}
              firmaTutorOk={firmaTutorOk}
              esMayorDeEdad={esMayorDeEdad}
            />

            <PlayerCardPayments
              currentSeason={currentSeason}
              allPaid={allPaid}
              playerPayments={playerPayments}
              customPlan={customPlan}
              paidCount={paidCount}
              expectedPayments={expectedPayments}
              pendingCount={pendingCount}
            />

            {/* Botón acceso juvenil - solo para padres con jugadores 13-17 años sin acceso ya activado */}
            {isParent && edadActual >= 13 && edadActual < 18 && !player.acceso_menor_autorizado && !player.acceso_menor_revocado && !player.es_mayor_edad && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-bold text-green-900">📱 Acceso Juvenil Disponible</span>
                </div>
                <p className="text-xs text-green-800 mb-2">
                  {player.nombre?.split(" ")[0]} tiene {edadActual} años y puede tener su propio acceso a la app del club.
                </p>
                <Button
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const u = await base44.auth.me();
                    setParentUser(u);
                    setShowMinorAccess(true);
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                >
                  ⚽ Activar Acceso Juvenil
                </Button>
              </div>
            )}

            {/* Badge si ya tiene acceso juvenil activo */}
            {player.acceso_menor_autorizado && !player.acceso_menor_revocado && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-800 font-medium">✅ Acceso juvenil activo: {player.acceso_menor_email}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2 flex-wrap">
              {onViewProfile && (
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onViewProfile(player, 'pagos'); }} className="flex-1 hover:bg-purple-50 hover:text-purple-700">
                  <FileText className="w-4 h-4 mr-1" />
                  Perfil
                </Button>
              )}
              {!readOnly && onEdit && (
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(player); }} className="flex-1 hover:bg-orange-50 hover:text-orange-700">
                  <Pencil className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              )}
              {!readOnly && onDelete && (player.estado_renovacion === "no_renueva" || !player.activo) && (
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(player); }} className="flex-1 hover:bg-red-50 hover:text-red-700 border-red-300">
                  <UserX className="w-4 h-4 mr-1" />
                  Eliminar
                </Button>
              )}
            </div>

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