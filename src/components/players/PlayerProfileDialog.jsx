import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  User, Mail, Phone, Calendar, MapPin, FileText, CreditCard, 
  Star, CheckCircle2, XCircle, Clock, Award, Heart, Edit,
  TrendingUp, Activity, Settings2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import FeeAdjustmentDialog from "../payments/FeeAdjustmentDialog";

export default function PlayerProfileDialog({ 
  player, 
  open, 
  onOpenChange, 
  onEdit,
  payments: propPayments = [],
  evaluations = [],
  attendances = [],
  isAdmin = false,
  initialTab = "info"
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showFeeAdjustment, setShowFeeAdjustment] = useState(false);
  const [directPayments, setDirectPayments] = useState(null);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  // Cargar pagos directamente si los props están vacíos
  useEffect(() => {
    if (!open || !player?.id) return;
    const propsHavePayments = propPayments.some(p => p.jugador_id === player.id);
    if (!propsHavePayments) {
      base44.entities.Payment.filter({ jugador_id: player.id }, '-created_date', 50)
        .then(data => {
          const filtered = data.filter(p => !p.is_deleted);
          if (filtered.length > 0) setDirectPayments(filtered);
        })
        .catch(() => {});
    } else {
      setDirectPayments(null);
    }
  }, [open, player?.id, propPayments]);

  // Usar pagos directos si están disponibles, o filtrar de props
  const playerPayments = directPayments || propPayments.filter(p => p.jugador_id === player.id);
  const playerEvaluations = evaluations.filter(e => e.jugador_id === player.id);
  const playerAttendances = attendances.filter(a => 
    a.asistencias?.some(asist => asist.jugador_id === player.id)
  );

  // Calcular estadísticas
  const totalPaid = playerPayments
    .filter(p => p.estado === "Pagado")
    .reduce((sum, p) => sum + (p.cantidad || 0), 0);
  
  const pendingPayments = playerPayments.filter(p => p.estado === "Pendiente").length;
  
  const totalAttendances = playerAttendances.reduce((sum, a) => {
    const playerAtt = a.asistencias?.find(asist => asist.jugador_id === player.id);
    return sum + (playerAtt?.estado === "presente" ? 1 : 0);
  }, 0);

  const avgEvaluation = playerEvaluations.length > 0 
    ? (playerEvaluations.reduce((sum, e) => sum + (e.tecnica + e.tactica + e.fisica + e.actitud + e.trabajo_equipo) / 5, 0) / playerEvaluations.length).toFixed(1)
    : null;

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl flex items-center gap-3">
              {player.foto_url ? (
                <img src={player.foto_url} className="w-12 h-12 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                  {player.nombre.charAt(0)}
                </div>
              )}
              {player.nombre}
            </DialogTitle>
            {isAdmin && onEdit && (
              <Button
                size="sm"
                onClick={() => {
                  onEdit(player);
                  onOpenChange(false);
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar Jugador
              </Button>
            )}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">
              <User className="w-4 h-4 mr-2" />
              Información
            </TabsTrigger>
            <TabsTrigger value="pagos">
              <CreditCard className="w-4 h-4 mr-2" />
              Pagos
            </TabsTrigger>
            <TabsTrigger value="evaluaciones">
              <Star className="w-4 h-4 mr-2" />
              Evaluaciones
            </TabsTrigger>
            <TabsTrigger value="asistencia">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Asistencia
            </TabsTrigger>
          </TabsList>

          {/* Tab: Información Personal */}
          <TabsContent value="info" className="space-y-4 mt-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="pt-6 pb-4">
                  <div className="text-center">
                    <CreditCard className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-700">{totalPaid.toFixed(0)}€</p>
                    <p className="text-xs text-blue-600">Total Pagado</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="pt-6 pb-4">
                  <div className="text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-700">{totalAttendances}</p>
                    <p className="text-xs text-green-600">Asistencias</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="pt-6 pb-4">
                  <div className="text-center">
                    <Star className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-700">{avgEvaluation || "-"}</p>
                    <p className="text-xs text-purple-600">Promedio</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="pt-6 pb-4">
                  <div className="text-center">
                    <Activity className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-orange-700">{playerEvaluations.length}</p>
                    <p className="text-xs text-orange-600">Evaluaciones</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Información Personal */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Datos Personales</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Fecha de Nacimiento</p>
                      <p className="font-medium text-slate-900">
                        {player.fecha_nacimiento 
                          ? `${format(new Date(player.fecha_nacimiento), 'dd/MM/yyyy')} (${calculateAge(player.fecha_nacimiento)} años)`
                          : "No especificada"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Tipo Inscripción</p>
                      <Badge variant="outline">{player.tipo_inscripcion || "No especificado"}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Categoría</p>
                      <Badge className="bg-orange-100 text-orange-700">{player.deporte}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Estado</p>
                      <Badge className={player.activo ? "bg-green-500 text-white" : "bg-slate-500 text-white"}>
                        {player.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {player.autorizacion_fotografia && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700 font-semibold mb-1">📸 Autorización de Fotografías y Videos</p>
                    <Badge className={player.autorizacion_fotografia === "SI AUTORIZO" ? "bg-green-500 text-white" : "bg-red-500 text-white"}>
                      {player.autorizacion_fotografia}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contacto */}
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Información de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                <div className="space-y-3">
                  {player.email_padre && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Email Tutor 1</p>
                        <p className="font-medium text-slate-900">{player.email_padre}</p>
                      </div>
                    </div>
                  )}
                  {player.telefono && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Teléfono Tutor 1</p>
                        <p className="font-medium text-slate-900">{player.telefono}</p>
                      </div>
                    </div>
                  )}
                  {player.email_tutor_2 && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Email Tutor 2</p>
                        <p className="font-medium text-slate-900">{player.email_tutor_2}</p>
                      </div>
                    </div>
                  )}
                  {player.direccion && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Dirección</p>
                        <p className="font-medium text-slate-900">{player.direccion}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Información Médica */}
            {player.ficha_medica && Object.values(player.ficha_medica).some(val => val) && (
              <Card className="border-none shadow-lg border-l-4 border-red-500">
                <CardHeader className="border-b">
                  <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                    <Heart className="w-5 h-5" />
                    Información Médica
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  {player.ficha_medica.grupo_sanguineo && (
                    <div>
                      <p className="text-xs text-slate-500">Grupo Sanguíneo</p>
                      <Badge className="bg-red-100 text-red-700">{player.ficha_medica.grupo_sanguineo}</Badge>
                    </div>
                  )}
                  {player.ficha_medica.alergias && (
                    <div>
                      <p className="text-xs text-slate-500">Alergias</p>
                      <p className="text-sm text-slate-900">{player.ficha_medica.alergias}</p>
                    </div>
                  )}
                  {player.ficha_medica.condiciones_medicas && (
                    <div>
                      <p className="text-xs text-slate-500">Condiciones Médicas</p>
                      <p className="text-sm text-slate-900">{player.ficha_medica.condiciones_medicas}</p>
                    </div>
                  )}
                  {(player.ficha_medica.contacto_emergencia_nombre || player.ficha_medica.contacto_emergencia_telefono) && (
                    <div>
                      <p className="text-xs text-slate-500">Contacto de Emergencia 1</p>
                      <p className="text-sm text-slate-900">
                        {player.ficha_medica.contacto_emergencia_nombre}
                        {player.ficha_medica.contacto_emergencia_telefono && 
                          ` - ${player.ficha_medica.contacto_emergencia_telefono}`}
                      </p>
                    </div>
                  )}
                  {(player.ficha_medica.contacto_emergencia_2_nombre || player.ficha_medica.contacto_emergencia_2_telefono) && (
                    <div>
                      <p className="text-xs text-slate-500">Contacto de Emergencia 2</p>
                      <p className="text-sm text-slate-900">
                        {player.ficha_medica.contacto_emergencia_2_nombre}
                        {player.ficha_medica.contacto_emergencia_2_telefono && 
                          ` - ${player.ficha_medica.contacto_emergencia_2_telefono}`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Historial de Pagos */}
          <TabsContent value="pagos" className="space-y-4 mt-6">
            {/* Banner de ajuste de cuota */}
            {player.ajuste_cuota?.cuota_ajustada != null && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-yellow-900">💰 Cuota Ajustada</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="line-through text-slate-400 text-lg">{player.ajuste_cuota.cuota_original?.toFixed(0)}€</span>
                      <span className="text-2xl font-bold text-green-700">{player.ajuste_cuota.cuota_ajustada?.toFixed(0)}€</span>
                    </div>
                    <p className="text-xs text-yellow-800 mt-1">{player.ajuste_cuota.motivo}</p>
                    {player.ajuste_cuota.notas && (
                      <p className="text-xs text-slate-500 mt-0.5 italic">{player.ajuste_cuota.notas}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      Ajustado por {player.ajuste_cuota.ajustado_por} el {player.ajuste_cuota.fecha_ajuste ? new Date(player.ajuste_cuota.fecha_ajuste).toLocaleDateString('es-ES') : ''}
                    </p>
                  </div>
                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => setShowFeeAdjustment(true)}>
                      <Settings2 className="w-4 h-4 mr-1" /> Modificar
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Botón ajustar cuota (solo admin, si no hay ajuste previo) */}
            {isAdmin && !player.ajuste_cuota?.cuota_ajustada && playerPayments.length > 0 && (
              <Button
                variant="outline"
                className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={() => setShowFeeAdjustment(true)}
              >
                <Settings2 className="w-4 h-4 mr-2" />
                Ajustar Cuota del Jugador
              </Button>
            )}

            {playerPayments.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="pt-6 text-center py-12">
                  <CreditCard className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No hay pagos registrados</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Resumen de Pagos */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-none shadow-lg bg-green-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-green-700 mb-1">Total Pagado</p>
                        <p className="text-3xl font-bold text-green-600">{totalPaid.toFixed(0)}€</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-none shadow-lg bg-blue-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-blue-700 mb-1">Total Pagos</p>
                        <p className="text-3xl font-bold text-blue-600">{playerPayments.length}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg bg-orange-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-orange-700 mb-1">Pendientes</p>
                        <p className="text-3xl font-bold text-orange-600">{pendingPayments}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Lista de Pagos */}
                <Card className="border-none shadow-lg">
                  <CardHeader className="border-b">
                    <CardTitle className="text-lg">Historial de Pagos</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {playerPayments
                        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                        .map(payment => (
                          <div key={payment.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge className={
                                  payment.estado === "Pagado" ? "bg-green-500 text-white" :
                                  payment.estado === "En revisión" ? "bg-orange-500 text-white" :
                                  "bg-red-500 text-white"
                                }>
                                  {payment.estado === "Pagado" ? "✓" : payment.estado === "En revisión" ? "○" : "✗"} {payment.estado}
                                </Badge>
                                <Badge variant="outline">{payment.mes}</Badge>
                                <Badge variant="outline">{payment.temporada}</Badge>
                              </div>
                              <p className="text-sm text-slate-600">
                                {payment.tipo_pago} - {payment.metodo_pago}
                                {payment.fecha_pago && ` • ${format(new Date(payment.fecha_pago), 'dd/MM/yyyy')}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-slate-900">{payment.cantidad}€</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Tab: Evaluaciones */}
          <TabsContent value="evaluaciones" className="space-y-4 mt-6">
            {playerEvaluations.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="pt-6 text-center py-12">
                  <Star className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No hay evaluaciones registradas</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Promedio General */}
                {avgEvaluation && (
                  <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Star className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                        <p className="text-sm text-purple-700 mb-1">Promedio General</p>
                        <p className="text-5xl font-bold text-purple-600">{avgEvaluation}</p>
                        <p className="text-xs text-purple-500 mt-1">de 5.0</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Lista de Evaluaciones */}
                <Card className="border-none shadow-lg">
                  <CardHeader className="border-b">
                    <CardTitle className="text-lg">Evaluaciones Detalladas</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {playerEvaluations
                        .sort((a, b) => new Date(b.fecha_evaluacion) - new Date(a.fecha_evaluacion))
                        .map(evaluation => {
                          const promedio = (evaluation.tecnica + evaluation.tactica + evaluation.fisica + evaluation.actitud + evaluation.trabajo_equipo) / 5;
                          return (
                            <div key={evaluation.id} className="p-4 bg-slate-50 rounded-lg border space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-slate-900">{evaluation.entrenador_nombre}</p>
                                  <p className="text-xs text-slate-500">
                                    {format(new Date(evaluation.fecha_evaluacion), "dd 'de' MMMM, yyyy", { locale: es })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-purple-600">{promedio.toFixed(1)}</p>
                                  <p className="text-xs text-slate-500">Promedio</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-5 gap-2">
                                <div className="text-center">
                                  <p className="text-xs text-slate-500 mb-1">Técnica</p>
                                  <Badge className="bg-blue-100 text-blue-700">{evaluation.tecnica}</Badge>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-slate-500 mb-1">Táctica</p>
                                  <Badge className="bg-green-100 text-green-700">{evaluation.tactica}</Badge>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-slate-500 mb-1">Física</p>
                                  <Badge className="bg-orange-100 text-orange-700">{evaluation.fisica}</Badge>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-slate-500 mb-1">Actitud</p>
                                  <Badge className="bg-purple-100 text-purple-700">{evaluation.actitud}</Badge>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-slate-500 mb-1">Equipo</p>
                                  <Badge className="bg-pink-100 text-pink-700">{evaluation.trabajo_equipo}</Badge>
                                </div>
                              </div>

                              {evaluation.observaciones && (
                                <div className="bg-white rounded p-3 border">
                                  <p className="text-xs text-slate-500 mb-1">Observaciones</p>
                                  <p className="text-sm text-slate-700">{evaluation.observaciones}</p>
                                </div>
                              )}

                              {evaluation.fortalezas && (
                                <div className="bg-green-50 rounded p-3 border border-green-200">
                                  <p className="text-xs text-green-700 mb-1 font-semibold">Fortalezas</p>
                                  <p className="text-sm text-green-900">{evaluation.fortalezas}</p>
                                </div>
                              )}

                              {evaluation.aspectos_mejorar && (
                                <div className="bg-orange-50 rounded p-3 border border-orange-200">
                                  <p className="text-xs text-orange-700 mb-1 font-semibold">Aspectos a Mejorar</p>
                                  <p className="text-sm text-orange-900">{evaluation.aspectos_mejorar}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Tab: Asistencia */}
          <TabsContent value="asistencia" className="space-y-4 mt-6">
            {playerAttendances.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="pt-6 text-center py-12">
                  <CheckCircle2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No hay registro de asistencias</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stats de Asistencia */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="border-none shadow-lg bg-green-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-700">{totalAttendances}</p>
                        <p className="text-xs text-green-600">Presente</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg bg-red-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-red-700">
                          {playerAttendances.reduce((sum, a) => {
                            const playerAtt = a.asistencias?.find(asist => asist.jugador_id === player.id);
                            return sum + (playerAtt?.estado === "ausente" ? 1 : 0);
                          }, 0)}
                        </p>
                        <p className="text-xs text-red-600">Ausente</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg bg-blue-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-700">
                          {playerAttendances.reduce((sum, a) => {
                            const playerAtt = a.asistencias?.find(asist => asist.jugador_id === player.id);
                            return sum + (playerAtt?.estado === "justificado" ? 1 : 0);
                          }, 0)}
                        </p>
                        <p className="text-xs text-blue-600">Justificado</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg bg-orange-50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-orange-700">
                          {playerAttendances.reduce((sum, a) => {
                            const playerAtt = a.asistencias?.find(asist => asist.jugador_id === player.id);
                            return sum + (playerAtt?.estado === "tardanza" ? 1 : 0);
                          }, 0)}
                        </p>
                        <p className="text-xs text-orange-600">Tardanza</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Lista de Asistencias */}
                <Card className="border-none shadow-lg">
                  <CardHeader className="border-b">
                    <CardTitle className="text-lg">Historial de Asistencia</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      {playerAttendances
                        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                        .slice(0, 20)
                        .map(attendance => {
                          const playerAtt = attendance.asistencias?.find(asist => asist.jugador_id === player.id);
                          if (!playerAtt) return null;
                          
                          return (
                            <div key={attendance.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                              <div className="flex items-center gap-3">
                                {playerAtt.estado === "presente" && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                                {playerAtt.estado === "ausente" && <XCircle className="w-5 h-5 text-red-600" />}
                                {playerAtt.estado === "justificado" && <FileText className="w-5 h-5 text-blue-600" />}
                                {playerAtt.estado === "tardanza" && <Clock className="w-5 h-5 text-orange-600" />}
                                <div>
                                  <p className="text-sm font-medium text-slate-900">
                                    {format(new Date(attendance.fecha), "dd 'de' MMMM, yyyy", { locale: es })}
                                  </p>
                                  <p className="text-xs text-slate-500">{attendance.entrenador_nombre}</p>
                                </div>
                              </div>
                              <Badge className={
                                playerAtt.estado === "presente" ? "bg-green-100 text-green-700" :
                                playerAtt.estado === "ausente" ? "bg-red-100 text-red-700" :
                                playerAtt.estado === "justificado" ? "bg-blue-100 text-blue-700" :
                                "bg-orange-100 text-orange-700"
                              }>
                                {playerAtt.estado}
                              </Badge>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Dialog de ajuste de cuota */}
      <FeeAdjustmentDialog
        open={showFeeAdjustment}
        onOpenChange={setShowFeeAdjustment}
        player={player}
        payments={playerPayments}
      />
    </Dialog>
  );
}