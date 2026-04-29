import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar, Star, AlertCircle, Send, Mail, MessageCircle, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import PlayerAttendanceCard from "../components/attendance/PlayerAttendanceCard";
import { playerAllCategories } from "../components/utils/playerCategoryFilter";

// Vista de detalle de un jugador individual
function PlayerDetailView({ player, evaluations, onBack, onSendReport, sendingReport }) {
  const stats = useMemo(() => {
    const sortedEvals = [...evaluations].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    const actitudSum = evaluations.reduce((sum, ev) => sum + (ev.actitud || 0), 0);
    const promedioActitud = evaluations.length > 0 ? (actitudSum / evaluations.length).toFixed(1) : 0;
    
    let tendencia = "estable";
    if (sortedEvals.length >= 6) {
      const primeros3 = sortedEvals.slice(0, 3).reduce((sum, ev) => sum + (ev.actitud || 0), 0) / 3;
      const ultimos3 = sortedEvals.slice(-3).reduce((sum, ev) => sum + (ev.actitud || 0), 0) / 3;
      if (ultimos3 > primeros3 + 0.5) tendencia = "mejorando";
      else if (ultimos3 < primeros3 - 0.5) tendencia = "bajando";
    }
    
    return {
      jugador: player,
      totalSesiones: evaluations.length,
      promedioActitud,
      tendencia,
      primeraEvaluacion: sortedEvals[0]?.fecha,
      ultimaEvaluacion: sortedEvals[sortedEvals.length - 1]?.fecha
    };
  }, [evaluations, player]);

  const chartData = useMemo(() => {
    return [...evaluations]
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .map(ev => ({
        fecha: format(parseISO(ev.fecha), "dd/MM", { locale: es }),
        fechaCompleta: format(parseISO(ev.fecha), "dd MMM yyyy", { locale: es }),
        actitud: ev.actitud || 0
      }));
  }, [evaluations]);

  return (
    <div className="space-y-4">
      <Button onClick={onBack} variant="outline" size="sm">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver a la categoría
      </Button>

      <Card className="border-2 border-orange-300">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {player.foto_url ? (
              <img src={player.foto_url} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg" alt="" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg">
                {player.nombre.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <CardTitle className="text-2xl">{player.nombre}</CardTitle>
              <p className="text-slate-600">{player.deporte}</p>
            </div>
            <Button 
              onClick={() => onSendReport(stats, evaluations)} 
              disabled={sendingReport}
              className="bg-orange-600 hover:bg-orange-700 w-full md:w-auto"
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar Reporte
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-slate-600 mb-1">Total Sesiones</p>
            <p className="text-3xl font-bold text-orange-600">{stats.totalSesiones}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-slate-600 mb-1">Actitud Promedio</p>
            <div className="flex items-center justify-center gap-1">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <p className="text-3xl font-bold text-yellow-600">{stats.promedioActitud}</p>
              <span className="text-slate-400">/5</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-slate-600 mb-1">Tendencia</p>
            <div className="flex items-center justify-center gap-2">
              {stats.tendencia === "mejorando" ? (
                <>
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <p className="text-lg font-bold text-green-600">Mejorando</p>
                </>
              ) : stats.tendencia === "bajando" ? (
                <>
                  <TrendingDown className="w-6 h-6 text-red-600" />
                  <p className="text-lg font-bold text-red-600">Bajando</p>
                </>
              ) : (
                <>
                  <Minus className="w-6 h-6 text-slate-600" />
                  <p className="text-lg font-bold text-slate-600">Estable</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-slate-600 mb-1">Periodo</p>
            <p className="text-xs font-medium text-slate-900">
              {stats.primeraEvaluacion && format(parseISO(stats.primeraEvaluacion), "dd MMM", { locale: es })}
            </p>
            <p className="text-xs text-slate-400">→</p>
            <p className="text-xs font-medium text-slate-900">
              {stats.ultimaEvaluacion && format(parseISO(stats.ultimaEvaluacion), "dd MMM", { locale: es })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📈 Evolución de Actitud</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" />
              <YAxis domain={[0, 5]} />
              <Tooltip 
                formatter={(value) => [`${value}/5`, "Actitud"]}
                labelFormatter={(label, payload) => payload[0]?.payload.fechaCompleta || label}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="actitud" 
                stroke="#ea580c" 
                strokeWidth={3}
                dot={{ fill: '#ea580c', r: 5 }}
                activeDot={{ r: 8 }}
                name="Actitud"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📋 Historial de Evaluaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...evaluations].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map((ev, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-900">
                      {format(parseISO(ev.fecha), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                    <span className="font-bold text-orange-600">{ev.actitud}/5</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mb-1">👨‍🏫 {ev.entrenador_nombre}</p>
                {ev.observaciones && (
                  <p className="text-sm text-slate-700 mt-2 bg-white p-2 rounded border-l-4 border-orange-400">
                    💬 {ev.observaciones}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CoachEvaluationReports() {
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [sendingReport, setSendingReport] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedPlayerForReport, setSelectedPlayerForReport] = useState(null);
  const [sendMethod, setSendMethod] = useState("email");

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  // Temporada activa para filtrar attendances
  const { data: activeSeasons = [] } = useQuery({
    queryKey: ['activeSeasonReports'],
    queryFn: () => base44.entities.SeasonConfig.filter({ activa: true }),
    staleTime: 600000,
  });
  const currentSeason = activeSeasons[0];
  const seasonStart = currentSeason?.fecha_inicio || null;

  // Solo jugadores activos
  // Para staff usamos getStaffPlayers (service role) porque RLS limita a entrenadores a ver solo sus hijos
  const { data: players } = useQuery({
    queryKey: ['playersActiveReports', user?.email],
    queryFn: async () => {
      const isStaff = user?.role === 'admin' || user?.es_entrenador || user?.es_coordinador;
      if (isStaff) {
        try {
          const { data } = await base44.functions.invoke('getStaffPlayers', {});
          return (data?.players || []).filter(p => p.activo !== false);
        } catch (e) {
          console.error('[CoachEvaluationReports] getStaffPlayers falló:', e);
          return await base44.entities.Player.filter({ activo: true });
        }
      }
      return await base44.entities.Player.filter({ activo: true });
    },
    initialData: [],
    enabled: !!user,
  });

  // CategoryConfig para excluir actividades complementarias
  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ['categoryConfigsReports'],
    queryFn: () => base44.entities.CategoryConfig.filter({ activa: true }),
    staleTime: 600000,
  });
  const validCategoryNames = useMemo(
    () => new Set(categoryConfigs.filter(c => !c.es_actividad_complementaria).map(c => c.nombre)),
    [categoryConfigs]
  );

  // Attendances filtrados por temporada actual (desde fecha_inicio en adelante)
  const { data: attendances } = useQuery({
    queryKey: ['attendancesSeason', seasonStart],
    queryFn: () => {
      const filter = seasonStart ? { fecha: { $gte: seasonStart } } : {};
      return base44.entities.Attendance.filter(filter, '-fecha');
    },
    initialData: [],
    enabled: !!currentSeason,
  });

  const allCategories = [...new Set(
    players.flatMap(p => playerAllCategories(p)).filter(c => c && validCategoryNames.has(c))
  )].sort();
  const categories = (user?.role === "admin" || user?.es_coordinador) 
    ? allCategories 
    : (user?.categorias_entrena || []).filter(c => validCategoryNames.has(c));

  const filteredAttendances = attendances.filter(att => {
    // Excluir actividades complementarias
    if (!validCategoryNames.has(att.categoria)) return false;
    if (user?.role !== "admin" && !user?.es_coordinador) {
      const coachCategories = user?.categorias_entrena || [];
      if (!coachCategories.includes(att.categoria)) return false;
    }
    return true;
  });

  const evaluationsByCategory = useMemo(() => {
    const categoryMap = {};
    
    filteredAttendances.forEach(attendance => {
      const categoria = attendance.categoria;
      if (!categoryMap[categoria]) {
        categoryMap[categoria] = {};
      }
      
      attendance.asistencias?.forEach(asistencia => {
        if (asistencia.estado === 'presente' || asistencia.estado === 'tardanza') {
          const player = players.find(p => p.id === asistencia.jugador_id);
          if (player) {
            if (!categoryMap[categoria][asistencia.jugador_id]) {
              categoryMap[categoria][asistencia.jugador_id] = {
                jugador: player,
                evaluaciones: []
              };
            }
            
            categoryMap[categoria][asistencia.jugador_id].evaluaciones.push({
              ...asistencia,
              fecha: attendance.fecha,
              categoria: attendance.categoria,
              entrenador_nombre: attendance.entrenador_nombre
            });
          }
        }
      });
    });
    
    Object.keys(categoryMap).forEach(categoria => {
      Object.keys(categoryMap[categoria]).forEach(jugadorId => {
        const playerData = categoryMap[categoria][jugadorId];
        const actitudSum = playerData.evaluaciones.reduce((sum, ev) => sum + (ev.actitud || 0), 0);
        playerData.totalSesiones = playerData.evaluaciones.length;
        playerData.promedioActitud = (actitudSum / playerData.totalSesiones).toFixed(1);
      });
    });
    
    return categoryMap;
  }, [filteredAttendances, players]);

  const handleSendReport = (stats, evaluations) => {
    setSelectedPlayerForReport({ stats, evaluations });
    setShowSendDialog(true);
  };

  const sendPlayerReport = async () => {
    setSendingReport(true);
    const { stats, evaluations } = selectedPlayerForReport;
    
    try {
      const player = stats.jugador;
      const evaluaciones = evaluations.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      
      const reportHTML = `
        <h2 style="color: #ea580c;">Reporte de Asistencia y Evaluación</h2>
        <h3>${player.nombre} - ${player.deporte}</h3>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #64748b; margin-top: 0;">📊 Resumen General</h4>
          <ul style="list-style: none; padding: 0;">
            <li>✅ <strong>Total de sesiones:</strong> ${stats.totalSesiones}</li>
            <li>⭐ <strong>Promedio de actitud:</strong> ${stats.promedioActitud}/5</li>
            <li>📅 <strong>Periodo:</strong> ${format(new Date(evaluaciones[evaluaciones.length - 1].fecha), 'dd/MM/yyyy')} - ${format(new Date(evaluaciones[0].fecha), 'dd/MM/yyyy')}</li>
          </ul>
        </div>
        
        <p style="color: #64748b; font-size: 14px;">
          <strong>📧 Reporte generado por:</strong> ${user.full_name || user.email}<br>
          <strong>📅 Fecha:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}
        </p>
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
        
        <p style="color: #64748b; font-size: 14px;">
          Para cualquier consulta, contacta con el club:<br>
          📧 <a href="mailto:cdbustarviejo@gmail.com" style="color: #ea580c;">cdbustarviejo@gmail.com</a>
        </p>
      `;

      const reportText = `
Estimados padres/tutores,

A continuación el reporte de asistencia y evaluación de ${player.nombre}.

====================================
REPORTE DE ASISTENCIA Y EVALUACION
====================================

Jugador: ${player.nombre}
Categoria: ${player.deporte}
Periodo: ${format(new Date(evaluaciones[evaluaciones.length - 1].fecha), 'dd/MM/yyyy')} - ${format(new Date(evaluaciones[0].fecha), 'dd/MM/yyyy')}

====================================
RESUMEN
====================================

Total de sesiones: ${stats.totalSesiones}
Actitud promedio: ${stats.promedioActitud}/5

====================================

Reporte generado por: ${user.full_name || user.email}
Fecha: ${format(new Date(), 'dd/MM/yyyy HH:mm')}

Para cualquier consulta, contacta con el club:
cdbustarviejo@gmail.com

Atentamente,
CD Bustarviejo
      `.trim();
      
      if (sendMethod === 'email' || sendMethod === 'both') {
        const emailsSent = [];
        const emailErrors = [];
        
        const recipients = [
          player.email_padre,
          ...(player.email_tutor_2 && player.email_tutor_2 !== player.email_padre ? [player.email_tutor_2] : [])
        ].filter(Boolean);
        
        if (recipients.length === 0) {
          toast.warning(`⚠️ ${player.nombre} no tiene email de padre/tutor registrado`);
        } else {
          for (const recipientEmail of recipients) {
            try {
              console.log('📧 [REPORT] Enviando email a:', recipientEmail);
              await base44.functions.invoke('sendEmail', {
                to: recipientEmail,
                subject: `Reporte de Evaluación - ${player.nombre} - CD Bustarviejo`,
                html: reportHTML
              });
              console.log('📧 [REPORT] Email enviado OK a:', recipientEmail);
              emailsSent.push(recipientEmail);
            } catch (emailError) {
              console.error('❌ [REPORT] Error enviando email a:', recipientEmail, emailError);
              emailErrors.push(recipientEmail);
            }
          }
          
          if (emailsSent.length > 0) {
            toast.success(`📧 Email enviado a: ${emailsSent.join(', ')}`);
          }
          if (emailErrors.length > 0) {
            toast.error(`❌ Error enviando email a: ${emailErrors.join(', ')}`);
          }
        }
      }

      if (sendMethod === 'chat' || sendMethod === 'both') {
        // Enviar como PrivateMessage (Mensajes del Club) - chat privado staff→familia
        const parentEmails = [player.email_padre, player.email_tutor_2].filter(Boolean);
        const uniqueEmails = [...new Set(parentEmails)];
        
        for (const parentEmail of uniqueEmails) {
          // Buscar o crear PrivateConversation entre el entrenador y esta familia
          let convs = await base44.entities.PrivateConversation.filter({
            participante_familia_email: parentEmail,
            participante_staff_email: user.email
          });
          
          let conv = convs[0];
          if (!conv) {
            conv = await base44.entities.PrivateConversation.create({
              participante_familia_email: parentEmail,
              participante_familia_nombre: player.nombre_tutor_legal || parentEmail.split('@')[0],
              participante_staff_email: user.email,
              participante_staff_nombre: user.full_name || 'Entrenador',
              participante_staff_rol: user.es_coordinador ? 'coordinador' : 'entrenador',
              categoria: player.categoria_principal || player.deporte || '',
              jugadores_relacionados: [{ jugador_id: player.id, jugador_nombre: player.nombre }],
              ultimo_mensaje: reportText.substring(0, 100),
              ultimo_mensaje_fecha: new Date().toISOString(),
              ultimo_mensaje_de: 'staff'
            });
          }
          
          // Crear el mensaje privado
          await base44.entities.PrivateMessage.create({
            conversacion_id: conv.id,
            remitente_email: user.email,
            remitente_nombre: user.full_name || 'Entrenador',
            remitente_tipo: 'staff',
            mensaje: reportText,
            leido: false
          });
          
          // Actualizar la conversación con último mensaje
          await base44.entities.PrivateConversation.update(conv.id, {
            ultimo_mensaje: reportText.substring(0, 100),
            ultimo_mensaje_fecha: new Date().toISOString(),
            ultimo_mensaje_de: 'staff'
          });
          
          // Notificación
          await base44.entities.AppNotification.create({
            usuario_email: parentEmail,
            titulo: `📊 Reporte de ${player.nombre}`,
            mensaje: `Tu entrenador ha enviado un reporte de evaluación`,
            tipo: 'importante',
            icono: '📊',
            enlace: 'ParentSystemMessages',
            vista: false
          });
        }
      }
      
      toast.success(`Reporte enviado correctamente`);
    } catch (error) {
      console.error("Error sending report:", error);
      toast.error("Error al enviar el reporte");
    } finally {
      setSendingReport(false);
      setShowSendDialog(false);
      setSelectedPlayerForReport(null);
    }
  };

  if (!user || (!user.es_entrenador && !user.es_coordinador && user.role !== "admin")) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-900 mb-2">Acceso Restringido</h2>
            <p className="text-red-700">Solo administradores y entrenadores pueden ver este reporte</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedPlayer) {
    const currentCategory = selectedCategory || categories[0];
    const playerData = evaluationsByCategory[currentCategory]?.[selectedPlayer];
    
    if (!playerData) {
      console.error('No se encontró playerData para:', { selectedPlayer, currentCategory });
      return (
        <div className="p-4 lg:p-6">
          <Button onClick={() => setSelectedPlayer(null)} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <Card className="mt-4">
            <CardContent className="py-12 text-center">
              <p className="text-slate-500">No se encontraron datos del jugador</p>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return (
      <div className="p-4 lg:p-6">
        <PlayerDetailView
          player={playerData.jugador}
          evaluations={playerData.evaluaciones}
          onBack={() => setSelectedPlayer(null)}
          onSendReport={(stats, evals) => handleSendReport(stats, evals)}
          sendingReport={sendingReport}
        />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Reporte - {selectedPlayerForReport?.stats.jugador.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">¿Cómo deseas enviar el reporte?</Label>
              <RadioGroup value={sendMethod} onValueChange={setSendMethod}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-xs text-slate-500">Enviar por correo electrónico</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="chat" id="chat" />
                  <Label htmlFor="chat" className="flex items-center gap-2 cursor-pointer flex-1">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="font-medium">Mensajes del Club (Privado)</p>
                      <p className="text-xs text-slate-500">Solo lo verá la familia del jugador en su sección "Mensajes del Club"</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Send className="w-4 h-4 text-orange-600" />
                    <div>
                      <p className="font-medium">Ambos</p>
                      <p className="text-xs text-slate-500">Email + Mensajes del Club (privado)</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowSendDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={sendPlayerReport}
                disabled={sendingReport}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {sendingReport ? "Enviando..." : "Enviar Reporte"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">📊 Evaluaciones por Categorías</h1>
          <p className="text-slate-600 mt-1">
            {user?.role === "admin" || user?.es_coordinador
              ? "Selecciona una categoría para ver los jugadores evaluados" 
              : "Tus categorías y jugadores evaluados"}
          </p>
        </div>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-500">No hay categorías disponibles</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={selectedCategory || categories[0]} onValueChange={setSelectedCategory} className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            {categories.map(cat => {
              const categoryPlayers = evaluationsByCategory[cat] ? Object.keys(evaluationsByCategory[cat]).length : 0;
              return (
                <TabsTrigger key={cat} value={cat} className="flex-1 min-w-[120px]">
                  {cat.replace('Fútbol ', '').replace(' (Mixto)', '')}
                  {categoryPlayers > 0 && (
                    <Badge className="ml-2 bg-orange-600">{categoryPlayers}</Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map(categoria => {
            const categoryData = evaluationsByCategory[categoria] || {};
            const playersInCategory = Object.values(categoryData).sort((a, b) => 
              parseFloat(b.promedioActitud) - parseFloat(a.promedioActitud)
            );

            return (
              <TabsContent key={categoria} value={categoria} className="space-y-4">
                {playersInCategory.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-slate-500">No hay evaluaciones en esta categoría</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
                        <CardContent className="pt-4 text-center">
                          <p className="text-xs text-orange-800 mb-1">Jugadores Evaluados</p>
                          <p className="text-3xl font-bold text-orange-600">{playersInCategory.length}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-green-50 to-green-100">
                        <CardContent className="pt-4 text-center">
                          <p className="text-xs text-green-800 mb-1">Promedio Categoría</p>
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                            <p className="text-3xl font-bold text-green-600">
                              {(playersInCategory.reduce((sum, p) => sum + parseFloat(p.promedioActitud), 0) / playersInCategory.length).toFixed(1)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                        <CardContent className="pt-4 text-center">
                          <p className="text-xs text-blue-800 mb-1">Total Evaluaciones</p>
                          <p className="text-3xl font-bold text-blue-600">
                            {playersInCategory.reduce((sum, p) => sum + p.totalSesiones, 0)}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {playersInCategory.map(playerData => (
                        <PlayerAttendanceCard
                          key={playerData.jugador.id}
                          player={playerData.jugador}
                          evaluations={playerData.evaluaciones}
                          onViewDetails={() => {
                            console.log('Click en jugador:', playerData.jugador.nombre, playerData.jugador.id);
                            setSelectedCategory(categoria);
                            setSelectedPlayer(playerData.jugador.id);
                          }}
                          onSendReport={() => {
                            const stats = {
                              jugador: playerData.jugador,
                              totalSesiones: playerData.totalSesiones,
                              promedioActitud: playerData.promedioActitud
                            };
                            handleSendReport(stats, playerData.evaluaciones);
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}