import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Mail, Phone, User, Eye, Clock, Heart, FileText, CheckCircle2, AlertCircle, Loader2, FileSignature, Download } from "lucide-react";
import PlayerDetailDialog from "./PlayerDetailDialog";
import PlayerDocumentDownload from "./PlayerDocumentDownload";

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

export default function PlayerCard({ player, onEdit, onViewProfile, isParent = false, readOnly = false, schedules = [], isCoachOrCoordinator = false, payments = [] }) {
  const [showDetail, setShowDetail] = useState(false);
  
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
  
  // Calcular estado de pagos del jugador
  const getCurrentSeason = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  };
  
  const currentSeason = getCurrentSeason();
  // Normalizar temporada: soportar formatos "2024/2025", "2024-2025", etc.
  const normalizeTemporada = (temp) => {
    if (!temp) return "";
    return temp.replace(/-/g, "/").trim();
  };
  const normalizedCurrentSeason = normalizeTemporada(currentSeason);
  const playerPayments = payments.filter(p => 
    p.jugador_id === player.id && 
    normalizeTemporada(p.temporada) === normalizedCurrentSeason
  );
  
  // Verificar si tiene pago único pagado
  const hasPagoUnico = playerPayments.some(p => 
    (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
    p.estado === "Pagado"
  );
  
  // Contar estados de pago
  const paidCount = playerPayments.filter(p => p.estado === "Pagado").length;
  const reviewCount = playerPayments.filter(p => p.estado === "En revisión").length;
  
  // Calcular cuotas esperadas (3 para tres meses, 1 para único)
  const expectedPayments = hasPagoUnico ? 1 : 3;
  const allPaid = hasPagoUnico || paidCount >= 3;
  const hasPending = !allPaid && (paidCount + reviewCount) < expectedPayments;
  
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

          {/* Badge de estado */}
          <div className="absolute top-3 left-3">
            <Badge className={player.activo ? "bg-green-500 text-white" : "bg-slate-500 text-white"}>
              {player.activo ? "Activo" : "Inactivo"}
            </Badge>
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

          {/* Click para ver detalles */}
          {isCoachOrCoordinator && hasMedicalInfo && (
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-2">
              <div className="flex items-center justify-center gap-2 text-sm text-blue-700 font-medium">
                <Eye className="w-4 h-4" />
                <span>Click para ver ficha médica completa</span>
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

          {/* Estado de Pagos */}
          <div className="bg-slate-50 rounded-lg p-2 border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Pagos {currentSeason}:</span>
              {allPaid ? (
                <Badge className="bg-green-100 text-green-700 text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Completo
                </Badge>
              ) : reviewCount > 0 ? (
                <Badge className="bg-orange-100 text-orange-700 text-xs flex items-center gap-1">
                  <Loader2 className="w-3 h-3" />
                  {reviewCount} en revisión
                </Badge>
              ) : paidCount > 0 ? (
                <Badge className="bg-yellow-100 text-yellow-700 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {paidCount}/3 pagados
                </Badge>
              ) : hasPending ? (
                <Badge className="bg-red-100 text-red-700 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Pendiente
                </Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-600 text-xs">
                  Sin datos
                </Badge>
              )}
            </div>
            {!allPaid && playerPayments.length > 0 && (
              <div className="flex gap-1 mt-1">
                {["Junio", "Septiembre", "Diciembre"].map(mes => {
                  const pago = playerPayments.find(p => p.mes === mes);
                  const isPaid = pago?.estado === "Pagado";
                  const isReview = pago?.estado === "En revisión";
                  return (
                    <div 
                      key={mes} 
                      className={`flex-1 h-1.5 rounded-full ${
                        isPaid ? 'bg-green-500' : 
                        isReview ? 'bg-orange-400' : 
                        'bg-red-300'
                      }`}
                      title={`${mes}: ${isPaid ? 'Pagado' : isReview ? 'En revisión' : 'Pendiente'}`}
                    />
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