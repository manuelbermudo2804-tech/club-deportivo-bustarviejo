import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Save, Send, User, AlertCircle, XCircle, Clock, Star, Mail, CheckCircle2, Users, HeartPulse, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import IndividualReportDialog from "../components/coach/IndividualReportDialog";
import BulkReportDialog from "../components/coach/BulkReportDialog";
import { usePageTutorial } from "../components/tutorials/useTutorial";
import AttendanceStatsChart from "../components/attendance/AttendanceStatsChart";

export default function TeamAttendanceEvaluation() {
  usePageTutorial("coach_attendance");
  
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionData, setSessionData] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [generalNotes, setGeneralNotes] = useState("");
  const [showIndividualDialog, setShowIndividualDialog] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Coordinador puede ver todas las categorías
      if (currentUser.es_coordinador) {
        return;
      }
      if (currentUser.role === "admin") {
        // Admin can see all categories
        const allPlayers = await base44.entities.Player.list();
        const categories = [...new Set(allPlayers.map(p => p.deporte).filter(Boolean))];
        if (categories.length > 0) {
          setSelectedCategory(categories[0]);
        }
      } else if (currentUser.categorias_entrena?.length > 0) {
        setSelectedCategory(currentUser.categorias_entrena[0]);
      }
    };
    fetchUser();
  }, []);

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const { data: attendances } = useQuery({
    queryKey: ['attendances', selectedCategory, selectedDate],
    queryFn: () => base44.entities.Attendance.list(),
    initialData: [],
  });

  const saveSessionMutation = useMutation({
    mutationFn: async (data) => {
      const existing = attendances.find(a => 
        a.categoria === selectedCategory && 
        a.fecha === selectedDate
      );
      
      if (existing) {
        return base44.entities.Attendance.update(existing.id, data);
      } else {
        return base44.entities.Attendance.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      setHasUnsavedChanges(false);
      toast.success("✅ Sesión guardada correctamente");
    },
    onError: () => {
      toast.error("❌ Error al guardar la sesión");
    }
  });

  const sendIndividualReportMutation = useMutation({
    mutationFn: async ({ player, dateRange, sendMethod }) => {
      const playerAttendances = attendances.filter(a => 
        a.categoria === selectedCategory &&
        a.fecha >= dateRange.start &&
        a.fecha <= dateRange.end
      );

      const playerData = [];
      playerAttendances.forEach(attendance => {
        const playerRecord = attendance.asistencias?.find(a => a.jugador_id === player.id);
        if (playerRecord) {
          playerData.push({
            fecha: attendance.fecha,
            ...playerRecord
          });
        }
      });

      if (playerData.length === 0) {
        throw new Error("No hay datos de asistencia para el periodo seleccionado");
      }

      // Calcular actitud promedio
      const evaluacionesConActitud = playerData.filter(d => d.actitud != null && (d.estado === 'presente' || d.estado === 'tardanza'));
      const actitudPromedio = evaluacionesConActitud.length > 0
        ? (evaluacionesConActitud.reduce((sum, d) => sum + d.actitud, 0) / evaluacionesConActitud.length).toFixed(1)
        : 'No evaluado';
      
      // Últimas 3 evaluaciones
      const ultimasEvaluaciones = playerData
        .filter(d => d.estado === 'presente' || d.estado === 'tardanza')
        .slice(0, 3)
        .map(d => format(new Date(d.fecha), "dd/MM/yy"))
        .join('\n  ');

      const reportText = `🔒 MENSAJE PRIVADO - Solo para la familia de ${player.nombre}

Estimados padres/tutores de ${player.nombre},

Este es un reporte PRIVADO E INDIVIDUAL sobre el rendimiento de su hijo/a en los entrenamientos.

====================================
📊 REPORTE DE ENTRENAMIENTO
====================================

Jugador: ${player.nombre}
Categoria: ${selectedCategory}
Periodo: ${format(new Date(dateRange.start), "dd/MM/yyyy")} - ${format(new Date(dateRange.end), "dd/MM/yyyy")}

====================================
📈 RESUMEN
====================================

Sesiones evaluadas: ${playerData.length}
Actitud promedio: ${actitudPromedio}/5

Ultimas evaluaciones:
  ${ultimasEvaluaciones || 'Sin evaluaciones'}

====================================
📋 DETALLE POR SESION
====================================

${playerData.map(data => `
📅 Fecha: ${format(new Date(data.fecha), "dd 'de' MMMM 'de' yyyy", { locale: es })}
   Estado: ${data.estado === 'presente' ? '✅ Presente' : 
  data.estado === 'ausente' ? '❌ Ausente' : 
  data.estado === 'justificado' ? '📝 Ausencia Justificada' : 
  '⏰ Tardanza'}
${(data.estado === 'presente' || data.estado === 'tardanza') && data.actitud != null ? `   Actitud: ${'⭐'.repeat(data.actitud)} (${data.actitud}/5)` : ''}
${data.observaciones ? `   Observaciones: ${data.observaciones}` : ''}
`).join('\n-----------------------------------\n')}

====================================

👨‍🏫 Entrenador: ${user.full_name}

🔒 IMPORTANTE: Este reporte es PRIVADO y PERSONAL para su familia. 
Solo ustedes pueden ver esta información. No se comparte con otras familias.

Para cualquier consulta, pueden responder en el chat del entrenador.

Atentamente,

CD Bustarviejo
Email: cdbustarviejo@gmail.com
      `.trim();

      if (sendMethod === 'email' || sendMethod === 'both') {
        const recipients = [];
        if (player.email_padre) recipients.push(player.email_padre);
        if (player.email_tutor_2) recipients.push(player.email_tutor_2);

        console.log('📧 Enviando reporte individual a:', recipients);
        console.log('📊 Datos del reporte:', { player: player.nombre, dateRange, dataLength: playerData.length });
        
        if (recipients.length === 0) {
          throw new Error(`El jugador ${player.nombre} no tiene emails de padres/tutores configurados`);
        }

        for (const email of recipients) {
          console.log('📤 Enviando a:', email);
          try {
            await base44.integrations.Core.SendEmail({
              from_name: `${user.full_name} - CD Bustarviejo`,
              to: email,
              subject: `Reporte de Entrenamiento - ${player.nombre} - ${format(new Date(dateRange.start), "dd/MM/yyyy")} al ${format(new Date(dateRange.end), "dd/MM/yyyy")}`,
              body: reportText
            });
            console.log('✅ Email enviado a:', email);
          } catch (error) {
            console.error('❌ Error enviando email a:', email, error);
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      if (sendMethod === 'chat' || sendMethod === 'both') {
        // Enviar mensaje privado al padre principal
        if (player.email_padre) {
          // Buscar o crear conversación privada
          const existingConvs = await base44.entities.PrivateConversation.filter({
            participante_familia_email: player.email_padre,
            participante_staff_email: user.email,
            categoria: selectedCategory
          });
          
          let conversation = existingConvs[0];
          if (!conversation) {
            conversation = await base44.entities.PrivateConversation.create({
              participante_familia_email: player.email_padre,
              participante_familia_nombre: `Padre de ${player.nombre}`,
              participante_staff_email: user.email,
              participante_staff_nombre: user.full_name,
              participante_staff_rol: 'entrenador',
              categoria: selectedCategory,
              jugadores_relacionados: [{ jugador_id: player.id, jugador_nombre: player.nombre }],
              archivada: false
            });
          }
          
          await base44.entities.PrivateMessage.create({
            conversacion_id: conversation.id,
            remitente_email: user.email,
            remitente_nombre: user.full_name,
            remitente_tipo: "staff",
            mensaje: reportText,
            leido: false
          });
          
          // Actualizar conversación
          await base44.entities.PrivateConversation.update(conversation.id, {
            ultimo_mensaje: "📊 Reporte de entrenamiento enviado",
            ultimo_mensaje_fecha: new Date().toISOString(),
            ultimo_mensaje_de: "staff",
            no_leidos_familia: (conversation.no_leidos_familia || 0) + 1
          });
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      toast.success("✅ Reporte individual enviado correctamente");
      setShowIndividualDialog(false);
      setSelectedPlayer(null);
    },
    onError: (error) => {
      toast.error(error.message || "❌ Error al enviar el reporte");
    }
  });

  const sendReportsMutation = useMutation({
    mutationFn: async ({ dateRange, sendMethod }) => {
      const categoryPlayers = players.filter(p => {
        if (p.activo === false) return false;
        if (p.deporte === selectedCategory || p.categoria_principal === selectedCategory) return true;
        if ((p.categorias || []).includes(selectedCategory)) return true;
        return false;
      });

      let sentCount = 0;
      const results = [];

      const relevantAttendances = attendances.filter(a => 
        a.categoria === selectedCategory &&
        a.fecha >= dateRange.start &&
        a.fecha <= dateRange.end
      );

      for (const player of categoryPlayers) {
        const playerAttendances = [];
        relevantAttendances.forEach(attendance => {
          const playerRecord = attendance.asistencias?.find(a => a.jugador_id === player.id);
          if (playerRecord && (playerRecord.estado === 'presente' || playerRecord.estado === 'tardanza')) {
            playerAttendances.push({
              fecha: attendance.fecha,
              ...playerRecord
            });
          }
        });
        
        if (playerAttendances.length === 0) continue;

        // Calcular actitud promedio
        const evaluacionesConActitud = playerAttendances.filter(d => d.actitud != null);
        const actitudPromedio = evaluacionesConActitud.length > 0
          ? (evaluacionesConActitud.reduce((sum, d) => sum + d.actitud, 0) / evaluacionesConActitud.length).toFixed(1)
          : 'No evaluado';

        // Últimas 3 evaluaciones
        const ultimasEvaluaciones = playerAttendances
          .slice(0, 3)
          .map(d => format(new Date(d.fecha), "dd/MM/yy"))
          .join('\n  ');

        const reportText = `🔒 MENSAJE PRIVADO - Solo para la familia de ${player.nombre}

Estimados padres/tutores de ${player.nombre},

Este es un reporte PRIVADO E INDIVIDUAL sobre el rendimiento de su hijo/a en los entrenamientos.

====================================
📊 REPORTE DE ENTRENAMIENTO
====================================

Jugador: ${player.nombre}
Categoria: ${selectedCategory}
Periodo: ${format(new Date(dateRange.start), "dd/MM/yyyy")} - ${format(new Date(dateRange.end), "dd/MM/yyyy")}

====================================
📈 RESUMEN
====================================

Sesiones evaluadas: ${playerAttendances.length}
Actitud promedio: ${actitudPromedio}/5

Ultimas evaluaciones:
  ${ultimasEvaluaciones || 'Sin evaluaciones'}

====================================
📋 DETALLE POR SESION
====================================

${playerAttendances.map(data => `
📅 Fecha: ${format(new Date(data.fecha), "dd 'de' MMMM 'de' yyyy", { locale: es })}
   Estado: ✅ Presente
${data.actitud != null ? `   Actitud: ${'⭐'.repeat(data.actitud)} (${data.actitud}/5)` : ''}
${data.observaciones ? `   Observaciones: ${data.observaciones}` : ''}
`).join('\n-----------------------------------\n')}

====================================

👨‍🏫 Entrenador: ${user.full_name}

🔒 IMPORTANTE: Este reporte es PRIVADO y PERSONAL para su familia. 
Solo ustedes pueden ver esta información. No se comparte con otras familias.

Para cualquier consulta, pueden responder en el chat del entrenador.

Atentamente,

CD Bustarviejo
Email: cdbustarviejo@gmail.com
        `.trim();

        try {
          if (sendMethod === 'email' || sendMethod === 'both') {
            console.log('📧 Enviando reporte masivo para:', player.nombre, 'Emails:', { padre: player.email_padre, tutor2: player.email_tutor_2 });
            
            if (player.email_padre) {
              console.log('📤 Enviando a padre:', player.email_padre);
              await base44.integrations.Core.SendEmail({
                from_name: `${user.full_name} - CD Bustarviejo`,
                to: player.email_padre,
                subject: `Reporte de Entrenamiento - ${player.nombre} - ${format(new Date(dateRange.start), "dd/MM/yyyy")} al ${format(new Date(dateRange.end), "dd/MM/yyyy")}`,
                body: reportText
              });
              console.log('✅ Enviado a padre');
            }
            if (player.email_tutor_2) {
              console.log('📤 Enviando a tutor 2:', player.email_tutor_2);
              await base44.integrations.Core.SendEmail({
                from_name: `${user.full_name} - CD Bustarviejo`,
                to: player.email_tutor_2,
                subject: `Reporte de Entrenamiento - ${player.nombre} - ${format(new Date(dateRange.start), "dd/MM/yyyy")} al ${format(new Date(dateRange.end), "dd/MM/yyyy")}`,
                body: reportText
              });
              console.log('✅ Enviado a tutor 2');
            }
          }
          
          if (sendMethod === 'chat' || sendMethod === 'both') {
            // Enviar mensaje privado al padre principal
            if (player.email_padre) {
              // Buscar o crear conversación privada
              const existingConvs = await base44.entities.PrivateConversation.filter({
                participante_familia_email: player.email_padre,
                participante_staff_email: user.email,
                categoria: selectedCategory
              });
              
              let conversation = existingConvs[0];
              if (!conversation) {
                conversation = await base44.entities.PrivateConversation.create({
                  participante_familia_email: player.email_padre,
                  participante_familia_nombre: `Padre de ${player.nombre}`,
                  participante_staff_email: user.email,
                  participante_staff_nombre: user.full_name,
                  participante_staff_rol: 'entrenador',
                  categoria: selectedCategory,
                  jugadores_relacionados: [{ jugador_id: player.id, jugador_nombre: player.nombre }],
                  archivada: false
                });
              }
              
              await base44.entities.PrivateMessage.create({
                conversacion_id: conversation.id,
                remitente_email: user.email,
                remitente_nombre: user.full_name,
                remitente_tipo: "staff",
                mensaje: reportText,
                leido: false
              });
              
              // Actualizar conversación
              await base44.entities.PrivateConversation.update(conversation.id, {
                ultimo_mensaje: "📊 Reporte de entrenamiento enviado",
                ultimo_mensaje_fecha: new Date().toISOString(),
                ultimo_mensaje_de: "staff",
                no_leidos_familia: (conversation.no_leidos_familia || 0) + 1
              });
            }
          }
          sentCount++;
          results.push({ player: player.nombre, success: true });
        } catch (error) {
          console.error(`Error sending report for ${player.nombre}:`, error);
          results.push({ player: player.nombre, success: false, error: error.message });
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      return { sentCount, results };
    },
    onSuccess: (data) => {
      if (data.sentCount > 0) {
        toast.success(`✅ ${data.sentCount} reportes enviados correctamente`);
      } else {
        toast.warning("No se enviaron reportes");
      }
    },
    onError: () => {
      toast.error("❌ Error al enviar los reportes");
    }
  });

  const categoryPlayers = players.filter(p => {
    if (p.activo === false) return false;
    if (p.deporte === selectedCategory || p.categoria_principal === selectedCategory) return true;
    if ((p.categorias || []).includes(selectedCategory)) return true;
    return false;
  }).sort((a, b) => a.nombre.localeCompare(b.nombre));

  // Mini-historial: últimas 5 sesiones por jugador
  const playerHistory = React.useMemo(() => {
    const history = {};
    const catAttendances = (attendances || [])
      .filter(a => a.categoria === selectedCategory)
      .sort((a, b) => b.fecha?.localeCompare(a.fecha));
    
    categoryPlayers.forEach(p => {
      const sessions = [];
      for (const att of catAttendances) {
        const record = att.asistencias?.find(a => a.jugador_id === p.id);
        if (record) sessions.push({ fecha: att.fecha, estado: record.estado });
        if (sessions.length >= 5) break;
      }
      history[p.id] = sessions.reverse(); // oldest first
    });
    return history;
  }, [attendances, selectedCategory, categoryPlayers]);

  // Resumen en vivo
  const liveStats = React.useMemo(() => {
    let presente = 0, ausente = 0, justificado = 0, tardanza = 0, sinMarcar = 0;
    categoryPlayers.forEach(p => {
      const s = sessionData[p.id]?.asistencia;
      if (s === 'presente') presente++;
      else if (s === 'ausente') ausente++;
      else if (s === 'justificado') justificado++;
      else if (s === 'tardanza') tardanza++;
      else sinMarcar++;
    });
    return { presente, ausente, justificado, tardanza, sinMarcar, total: categoryPlayers.length };
  }, [sessionData, categoryPlayers]);

  const handleMarkAllPresent = () => {
    const newData = { ...sessionData };
    categoryPlayers.forEach(p => {
      if (!newData[p.id]?.asistencia) {
        newData[p.id] = { ...(newData[p.id] || {}), asistencia: 'presente' };
      }
    });
    setSessionData(newData);
    setHasUnsavedChanges(true);
    toast.success(`✅ ${liveStats.sinMarcar} jugadores marcados como presentes`);
  };

  useEffect(() => {
    const existing = attendances.find(a => 
      a.categoria === selectedCategory && 
      a.fecha === selectedDate
    );
    
    if (existing) {
      const data = {};
      existing.asistencias.forEach(a => {
        data[a.jugador_id] = {
          asistencia: a.estado,
          actitud: a.actitud,
          observaciones: a.observaciones
        };
      });
      setSessionData(data);
      setGeneralNotes(existing.observaciones_generales || "");
      setHasUnsavedChanges(false);
    } else {
      setSessionData({});
      setGeneralNotes("");
      setHasUnsavedChanges(false);
    }
  }, [selectedCategory, selectedDate, attendances]);

  const handleChange = (playerId, field, value) => {
    setSessionData(prev => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] || {}),
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    const asistencias = categoryPlayers.map(p => ({
      jugador_id: p.id,
      jugador_nombre: p.nombre,
      estado: sessionData[p.id]?.asistencia || "ausente",
      actitud: sessionData[p.id]?.actitud || null,
      observaciones: sessionData[p.id]?.observaciones || ""
    }));

    const data = {
      fecha: selectedDate,
      categoria: selectedCategory,
      entrenador_email: user.email,
      entrenador_nombre: user.full_name,
      asistencias,
      observaciones_generales: generalNotes
    };

    saveSessionMutation.mutate(data);
  };

  const handleSendBulkReports = (data) => {
    sendReportsMutation.mutate(data);
  };

  const handleOpenIndividualReport = (player) => {
    setSelectedPlayer(player);
    setShowIndividualDialog(true);
  };

  const handleSendIndividualReport = (data) => {
    sendIndividualReportMutation.mutate(data);
  };

  // Get available categories for the user
  const availableCategories = React.useMemo(() => {
    if (!user) return [];
    if (user.es_coordinador) {
      const allPlayers = players || [];
      return [...new Set(allPlayers.map(p => p.deporte).filter(Boolean))];
    }
    return user.categorias_entrena || [];
  }, [user, players]);

  if (!user || !user.es_entrenador || availableCategories.length === 0) {
    return (
      <div className="p-4 lg:p-6">
        <div className="text-center py-12">
          <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No tienes equipos asignados</p>
          <p className="text-xs text-slate-400 mt-2">Esta funcionalidad es solo para entrenadores</p>
        </div>
      </div>
    );
  }

  const existing = attendances.find(a => 
    a.categoria === selectedCategory && 
    a.fecha === selectedDate
  );

  const presentCount = categoryPlayers.filter(p => sessionData[p.id]?.asistencia === 'presente').length;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <IndividualReportDialog
        player={selectedPlayer}
        isOpen={showIndividualDialog}
        onClose={() => {
          setShowIndividualDialog(false);
          setSelectedPlayer(null);
        }}
        onSend={handleSendIndividualReport}
        isLoading={sendIndividualReportMutation.isPending}
      />

      <BulkReportDialog
        isOpen={showBulkDialog}
        onClose={() => setShowBulkDialog(false)}
        onSend={handleSendBulkReports}
        isLoading={sendReportsMutation.isPending}
        selectedCategory={selectedCategory}
      />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">📋 Asistencia y Evaluación</h1>
          <p className="text-slate-600 mt-1 text-sm">Registro completo de sesión de entrenamiento</p>
        </div>
        {existing && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
            ✅ Guardado {format(new Date(existing.updated_date), "dd/MM HH:mm")}
          </span>
        )}
      </div>

      {/* Resumen en vivo */}
      {selectedCategory && categoryPlayers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl shadow-sm p-3 border">
          <span className="text-sm font-semibold text-slate-700 mr-1">{liveStats.total} jugadores:</span>
          {liveStats.presente > 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">✅ {liveStats.presente}</span>}
          {liveStats.ausente > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">❌ {liveStats.ausente}</span>}
          {liveStats.justificado > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">📝 {liveStats.justificado}</span>}
          {liveStats.tardanza > 0 && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">⏰ {liveStats.tardanza}</span>}
          {liveStats.sinMarcar > 0 && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-medium">⬜ {liveStats.sinMarcar} sin marcar</span>}
          <div className="flex-1" />
          {liveStats.sinMarcar > 0 && (
            <Button size="sm" variant="outline" onClick={handleMarkAllPresent} className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50">
              <Users className="w-3 h-3 mr-1" />
              Marcar todos presentes
            </Button>
          )}
        </div>
      )}

      {hasUnsavedChanges && (
        <Card className="border-2 border-orange-500 bg-orange-50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-orange-900">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Tienes cambios sin guardar</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de estadísticas */}
      {attendances.filter(a => a.categoria === selectedCategory).length > 0 && (
        <AttendanceStatsChart
          attendances={attendances.filter(a => a.categoria === selectedCategory)}
          categoryPlayers={categoryPlayers}
        />
      )}

      <Card className="border shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Equipo</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Fecha</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button 
                onClick={handleSave} 
                disabled={!hasUnsavedChanges}
                className={`flex-1 h-9 text-sm ${hasUnsavedChanges ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600'}`}
              >
                <Save className="w-4 h-4 mr-1" />
                Guardar
              </Button>
            </div>
          </div>
          
          <div>
            <label className="text-xs text-slate-600 mb-1 block">Notas Generales de la Sesión</label>
            <Textarea
              value={generalNotes}
              onChange={(e) => {
                setGeneralNotes(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Observaciones generales del entrenamiento..."
              className="h-16 text-sm"
            />
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t">
            <Button 
              onClick={() => setShowBulkDialog(true)}
              disabled={sendReportsMutation.isPending}
              variant="outline"
              className="flex-1 h-9 text-sm"
              title="🔒 PRIVADO: Envía un reporte personalizado a CADA familia de la categoría. Cada padre recibe SOLO los datos de su hijo en su chat privado o email. NUNCA se envía al chat grupal."
            >
              <Send className="w-4 h-4 mr-1" />
              📨 Enviar Reportes a Todas las Familias (Privado)
            </Button>
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-800 text-center">
              🔒 <strong>100% Privado:</strong> Cada familia recibe SOLO el reporte de su hijo en su chat privado o email personal. Nunca se envía nada al chat del grupo.
            </div>
          </div>
        </CardContent>
      </Card>

      {categoryPlayers.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl shadow-md">
          <p className="text-slate-500 text-sm">No hay jugadores en este equipo</p>
        </div>
      ) : (
        <>
          {/* Vista Móvil */}
          <div className="lg:hidden space-y-3">
            {categoryPlayers.map((player) => {
              const playerData = sessionData[player.id] || {};
              const isPresent = playerData.asistencia === 'presente' || playerData.asistencia === 'tardanza';

              return (
                <div key={player.id} className="bg-white rounded-xl shadow-md p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className="relative">
                      {player.foto_url ? (
                        <img src={player.foto_url} className="w-12 h-12 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                          {player.nombre.charAt(0)}
                        </div>
                      )}
                      {player.lesionado && <span className="absolute -top-1 -right-1 text-sm" title="Lesionado">🏥</span>}
                      {player.sancionado && <span className="absolute -bottom-1 -right-1 text-sm" title="Sancionado">🟥</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-base block">{player.nombre}</span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {player.lesionado && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">🏥 Lesionado</span>}
                        {player.sancionado && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">🟥 Sancionado</span>}
                        {/* Mini historial últimas 5 sesiones */}
                        {playerHistory[player.id]?.length > 0 && (
                          <div className="flex items-center gap-0.5 ml-1" title="Últimas sesiones">
                            {playerHistory[player.id].map((s, i) => (
                              <span key={i} className="text-[10px]">
                                {s.estado === 'presente' ? '🟢' : s.estado === 'tardanza' ? '🟡' : s.estado === 'justificado' ? '🔵' : '🔴'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Asistencia */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-2 block">Asistencia</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: 'presente', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: '✅ Presente', tooltip: 'Asistió al entrenamiento' },
                        { value: 'ausente', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: '❌ Ausente', tooltip: 'No asistió sin justificación' },
                        { value: 'justificado', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100', label: '📝 Justificado', tooltip: 'Falta con justificación (médico, etc.)' },
                        { value: 'tardanza', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100', label: '⏰ Tardanza', tooltip: 'Llegó tarde al entrenamiento' }
                      ].map(({ value, icon: Icon, color, bg, label, tooltip }) => {
                        const isSelected = playerData.asistencia === value;
                        return (
                          <button
                            key={value}
                            onClick={() => handleChange(player.id, 'asistencia', value)}
                            title={tooltip}
                            className={`p-3 rounded-lg transition-all flex flex-col items-center gap-1 ${
                              isSelected ? `${bg} ${color} ring-2 ring-offset-1` : 'bg-slate-50 text-slate-400'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium">{label.split(' ')[1]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Evaluación - Solo si presente */}
                  {isPresent && (
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">😊 Actitud</label>
                      <Select
                        value={playerData.actitud?.toString() || ""}
                        onValueChange={(value) => handleChange(player.id, 'actitud', parseInt(value))}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(num => (
                            <SelectItem key={num} value={num.toString()}>
                              {'⭐'.repeat(num)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Observaciones */}
                  {isPresent && (
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Observaciones</label>
                      <input
                        type="text"
                        value={playerData.observaciones || ""}
                        onChange={(e) => handleChange(player.id, 'observaciones', e.target.value)}
                        placeholder="Notas del jugador..."
                        className="w-full h-9 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  )}

                  {/* Botón enviar reporte */}
                  <Button
                    onClick={() => handleOpenIndividualReport(player)}
                    size="sm"
                    variant="outline"
                    className="w-full"
                    title={`🔒 PRIVADO: Envía reporte SOLO a los padres de ${player.nombre} en su chat privado o email. NUNCA al chat del grupo.`}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    🔒 Enviar Reporte Privado a Padres
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Vista Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full bg-white rounded-xl shadow-md">
              <thead className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold sticky left-0 bg-orange-600 z-10">Jugador</th>
                  <th className="p-3 text-center text-xs font-semibold min-w-[140px]">Asistencia</th>
                  <th className="p-3 text-center text-xs font-semibold min-w-[80px]">Actitud</th>
                  <th className="p-3 text-left text-xs font-semibold min-w-[200px]">Observaciones</th>
                  <th className="p-3 text-center text-xs font-semibold min-w-[100px]">Reporte</th>
                </tr>
              </thead>
              <tbody>
                {categoryPlayers.map((player, idx) => {
                  const playerData = sessionData[player.id] || {};
                  const isPresent = playerData.asistencia === 'presente' || playerData.asistencia === 'tardanza';

                  return (
                    <tr key={player.id} className={`border-b ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                      <td className="p-3 sticky left-0 bg-inherit z-10">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-shrink-0">
                            {player.foto_url ? (
                              <img src={player.foto_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                                {player.nombre.charAt(0)}
                              </div>
                            )}
                            {player.lesionado && <span className="absolute -top-1 -right-1 text-[10px]" title="Lesionado">🏥</span>}
                            {player.sancionado && <span className="absolute -bottom-1 -right-1 text-[10px]" title="Sancionado">🟥</span>}
                          </div>
                          <div className="min-w-0">
                            <span className="font-medium text-sm whitespace-nowrap block">{player.nombre}</span>
                            {/* Mini historial */}
                            {playerHistory[player.id]?.length > 0 && (
                              <div className="flex items-center gap-0.5" title="Últimas 5 sesiones">
                                {playerHistory[player.id].map((s, i) => (
                                  <span key={i} className="text-[8px]">
                                    {s.estado === 'presente' ? '🟢' : s.estado === 'tardanza' ? '🟡' : s.estado === 'justificado' ? '🔵' : '🔴'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1 justify-center">
                          {[
                            { value: 'presente', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Presente', tooltip: '✅ Asistió al entrenamiento' },
                            { value: 'ausente', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Ausente', tooltip: '❌ No asistió sin justificación' },
                            { value: 'justificado', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Justificado', tooltip: '📝 Falta con justificación (médico, etc.)' },
                            { value: 'tardanza', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Tardanza', tooltip: '⏰ Llegó tarde al entrenamiento' }
                          ].map(({ value, icon: Icon, color, bg, label, tooltip }) => {
                            const isSelected = playerData.asistencia === value;
                            return (
                              <button
                                key={value}
                                onClick={() => handleChange(player.id, 'asistencia', value)}
                                title={tooltip}
                                className={`p-2 rounded transition-all ${
                                  isSelected ? `${bg} ${color} ring-2 ring-offset-1` : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-2">
                        <Select
                          value={playerData.actitud?.toString() || ""}
                          onValueChange={(value) => handleChange(player.id, 'actitud', parseInt(value))}
                          disabled={!isPresent}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                {'⭐'.repeat(num)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={playerData.observaciones || ""}
                          onChange={(e) => handleChange(player.id, 'observaciones', e.target.value)}
                          placeholder="Notas..."
                          disabled={!isPresent}
                          className="w-full h-8 px-2 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-slate-100"
                        />
                      </td>
                      <td className="p-2">
                        <Button
                          onClick={() => handleOpenIndividualReport(player)}
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          title={`🔒 PRIVADO: Envía reporte SOLO a los padres de ${player.nombre} en su chat privado o email. NUNCA al chat del grupo.`}
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          🔒 Privado
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}