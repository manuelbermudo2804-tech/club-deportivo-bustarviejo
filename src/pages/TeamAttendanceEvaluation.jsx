import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Save, Send, User, AlertCircle, CheckCircle2, XCircle, Clock, Star, Mail } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import IndividualReportDialog from "../components/coach/IndividualReportDialog";
import BulkReportDialog from "../components/coach/BulkReportDialog";

export default function TeamAttendanceEvaluation() {
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

      const reportText = `
📋 REPORTE DE ENTRENAMIENTO - PERIODO
═══════════════════════════════════

👤 Jugador: ${player.nombre}
⚽ Categoría: ${selectedCategory}
📅 Periodo: ${format(new Date(dateRange.start), "dd/MM/yyyy")} - ${format(new Date(dateRange.end), "dd/MM/yyyy")}
👨‍🏫 Entrenador: ${user.full_name}

═══════════════════════════════════
📊 RESUMEN DEL PERIODO
═══════════════════════════════════

Total de sesiones: ${playerData.length}
Asistencias: ${playerData.filter(p => p.estado === 'presente').length}
Ausencias: ${playerData.filter(p => p.estado === 'ausente').length}
Justificadas: ${playerData.filter(p => p.estado === 'justificado').length}
Tardanzas: ${playerData.filter(p => p.estado === 'tardanza').length}

═══════════════════════════════════
📝 DETALLE POR SESIÓN
═══════════════════════════════════

${playerData.map(data => `
📅 ${format(new Date(data.fecha), "dd 'de' MMMM", { locale: es })}
${data.estado === 'presente' ? '✅ Presente' : 
  data.estado === 'ausente' ? '❌ Ausente' : 
  data.estado === 'justificado' ? '📝 Ausencia Justificada' : 
  '⏰ Llegada con retraso'}

${data.estado === 'presente' ? `
⭐ Evaluación:
  🎯 Técnica: ${data.tecnica || 'No evaluado'}/5
  📐 Táctica: ${data.tactica || 'No evaluado'}/5
  💪 Física: ${data.fisica || 'No evaluado'}/5
  😊 Actitud: ${data.actitud || 'No evaluado'}/5
  🤝 Trabajo en Equipo: ${data.trabajo_equipo || 'No evaluado'}/5
  ${data.observaciones ? `\n📝 Observaciones: ${data.observaciones}` : ''}
` : ''}
`).join('\n───────────────────────────────────\n')}

═══════════════════════════════════
Este reporte ha sido generado automáticamente.
Para cualquier consulta, contacta con tu entrenador.

Atentamente,
${user.full_name}
CD Bustarviejo
      `.trim();

      if (sendMethod === 'email' || sendMethod === 'both') {
        const recipients = [];
        if (player.email_padre) recipients.push(player.email_padre);
        if (player.email_tutor_2) recipients.push(player.email_tutor_2);

        for (const email of recipients) {
          await base44.integrations.Core.SendEmail({
            from_name: `${user.full_name} - CD Bustarviejo`,
            to: email,
            subject: `Reporte de Entrenamiento - ${player.nombre} - ${format(new Date(dateRange.start), "dd/MM/yyyy")} al ${format(new Date(dateRange.end), "dd/MM/yyyy")}`,
            body: reportText
          });
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      if (sendMethod === 'chat' || sendMethod === 'both') {
        await base44.entities.ChatMessage.create({
          remitente_email: user.email,
          remitente_nombre: user.full_name,
          mensaje: reportText,
          prioridad: "Normal",
          tipo: "admin_a_grupo",
          deporte: selectedCategory,
          grupo_id: selectedCategory,
          leido: false,
          archivos_adjuntos: []
        });
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
      const categoryPlayers = players.filter(p => 
        p.deporte === selectedCategory && p.activo
      );

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
          if (playerRecord && playerRecord.estado === 'presente') {
            playerAttendances.push({
              fecha: attendance.fecha,
              ...playerRecord
            });
          }
        });
        
        if (playerAttendances.length === 0) continue;

        const reportText = `
📋 REPORTE DE ENTRENAMIENTO - PERIODO
═══════════════════════════════════

👤 Jugador: ${player.nombre}
⚽ Categoría: ${selectedCategory}
📅 Periodo: ${format(new Date(dateRange.start), "dd/MM/yyyy")} - ${format(new Date(dateRange.end), "dd/MM/yyyy")}
👨‍🏫 Entrenador: ${user.full_name}

═══════════════════════════════════
📊 RESUMEN DEL PERIODO
═══════════════════════════════════

Total de sesiones asistidas: ${playerAttendances.length}

═══════════════════════════════════
📝 DETALLE POR SESIÓN
═══════════════════════════════════

${playerAttendances.map(data => `
📅 ${format(new Date(data.fecha), "dd 'de' MMMM", { locale: es })}
✅ Presente

⭐ Evaluación:
  🎯 Técnica: ${data.tecnica || 'No evaluado'}/5
  📐 Táctica: ${data.tactica || 'No evaluado'}/5
  💪 Física: ${data.fisica || 'No evaluado'}/5
  😊 Actitud: ${data.actitud || 'No evaluado'}/5
  🤝 Trabajo en Equipo: ${data.trabajo_equipo || 'No evaluado'}/5
  ${data.observaciones ? `\n📝 Observaciones: ${data.observaciones}` : ''}
`).join('\n───────────────────────────────────\n')}

═══════════════════════════════════
Este reporte ha sido generado automáticamente.
Para cualquier consulta, contacta con tu entrenador.

Atentamente,
${user.full_name}
CD Bustarviejo
        `.trim();

        try {
          if (sendMethod === 'email' || sendMethod === 'both') {
            if (player.email_padre) {
              await base44.integrations.Core.SendEmail({
                from_name: `${user.full_name} - CD Bustarviejo`,
                to: player.email_padre,
                subject: `Reporte de Entrenamiento - ${player.nombre} - ${format(new Date(dateRange.start), "dd/MM/yyyy")} al ${format(new Date(dateRange.end), "dd/MM/yyyy")}`,
                body: reportText
              });
            }
            if (player.email_tutor_2) {
              await base44.integrations.Core.SendEmail({
                from_name: `${user.full_name} - CD Bustarviejo`,
                to: player.email_tutor_2,
                subject: `Reporte de Entrenamiento - ${player.nombre} - ${format(new Date(dateRange.start), "dd/MM/yyyy")} al ${format(new Date(dateRange.end), "dd/MM/yyyy")}`,
                body: reportText
              });
            }
          }
          
          if (sendMethod === 'chat' || sendMethod === 'both') {
            await base44.entities.ChatMessage.create({
              remitente_email: user.email,
              remitente_nombre: user.full_name,
              mensaje: reportText,
              prioridad: "Normal",
              tipo: "admin_a_grupo",
              deporte: selectedCategory,
              grupo_id: selectedCategory,
              leido: false,
              archivos_adjuntos: []
            });
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

  const categoryPlayers = players.filter(p => 
    p.deporte === selectedCategory && p.activo
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

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
          tecnica: a.tecnica,
          tactica: a.tactica,
          fisica: a.fisica,
          actitud: a.actitud,
          trabajo_equipo: a.trabajo_equipo,
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
      tecnica: sessionData[p.id]?.tecnica || null,
      tactica: sessionData[p.id]?.tactica || null,
      fisica: sessionData[p.id]?.fisica || null,
      actitud: sessionData[p.id]?.actitud || null,
      trabajo_equipo: sessionData[p.id]?.trabajo_equipo || null,
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
    if (user.role === "admin") {
      const allPlayers = players || [];
      return [...new Set(allPlayers.map(p => p.deporte).filter(Boolean))];
    }
    return user.categorias_entrena || [];
  }, [user, players]);

  if (!user || (user.role !== "admin" && (!user.es_entrenador || availableCategories.length === 0))) {
    return (
      <div className="p-4 lg:p-6">
        <div className="text-center py-12">
          <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No tienes equipos asignados</p>
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

          <div className="flex gap-2 pt-2 border-t">
            <Button 
              onClick={() => setShowBulkDialog(true)}
              disabled={sendReportsMutation.isPending}
              variant="outline"
              className="flex-1 h-9 text-sm"
            >
              <Send className="w-4 h-4 mr-1" />
              Enviar Reportes Masivos
            </Button>
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
              const isPresent = playerData.asistencia === 'presente';

              return (
                <div key={player.id} className="bg-white rounded-xl shadow-md p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-3 pb-3 border-b">
                    {player.foto_url ? (
                      <img src={player.foto_url} className="w-12 h-12 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                        {player.nombre.charAt(0)}
                      </div>
                    )}
                    <span className="font-semibold text-base">{player.nombre}</span>
                  </div>

                  {/* Asistencia */}
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-2 block">Asistencia</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: 'presente', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: '✅ Presente' },
                        { value: 'ausente', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: '❌ Ausente' },
                        { value: 'justificado', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100', label: '📝 Justificado' },
                        { value: 'tardanza', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100', label: '⏰ Tardanza' }
                      ].map(({ value, icon: Icon, color, bg, label }) => {
                        const isSelected = playerData.asistencia === value;
                        return (
                          <button
                            key={value}
                            onClick={() => handleChange(player.id, 'asistencia', value)}
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

                  {/* Evaluaciones - Solo si presente */}
                  {isPresent && (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { field: 'tecnica', label: '🎯 Técnica' },
                        { field: 'tactica', label: '📐 Táctica' },
                        { field: 'fisica', label: '💪 Física' },
                        { field: 'actitud', label: '😊 Actitud' },
                        { field: 'trabajo_equipo', label: '🤝 Equipo' }
                      ].map(({ field, label }) => (
                        <div key={field}>
                          <label className="text-xs font-medium text-slate-600 mb-1 block">{label}</label>
                          <Select
                            value={playerData[field]?.toString() || ""}
                            onValueChange={(value) => handleChange(player.id, field, parseInt(value))}
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
                      ))}
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
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar Reporte Individual
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
                  <th className="p-3 text-center text-xs font-semibold min-w-[80px]">Técnica</th>
                  <th className="p-3 text-center text-xs font-semibold min-w-[80px]">Táctica</th>
                  <th className="p-3 text-center text-xs font-semibold min-w-[80px]">Física</th>
                  <th className="p-3 text-center text-xs font-semibold min-w-[80px]">Actitud</th>
                  <th className="p-3 text-center text-xs font-semibold min-w-[80px]">Equipo</th>
                  <th className="p-3 text-left text-xs font-semibold min-w-[200px]">Observaciones</th>
                  <th className="p-3 text-center text-xs font-semibold min-w-[100px]">Reporte</th>
                </tr>
              </thead>
              <tbody>
                {categoryPlayers.map((player, idx) => {
                  const playerData = sessionData[player.id] || {};
                  const isPresent = playerData.asistencia === 'presente';

                  return (
                    <tr key={player.id} className={`border-b ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                      <td className="p-3 sticky left-0 bg-inherit z-10">
                        <div className="flex items-center gap-2">
                          {player.foto_url ? (
                            <img src={player.foto_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                              {player.nombre.charAt(0)}
                            </div>
                          )}
                          <span className="font-medium text-sm whitespace-nowrap">{player.nombre}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1 justify-center">
                          {[
                            { value: 'presente', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Presente' },
                            { value: 'ausente', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Ausente' },
                            { value: 'justificado', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Justificado' },
                            { value: 'tardanza', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Tardanza' }
                          ].map(({ value, icon: Icon, color, bg, label }) => {
                            const isSelected = playerData.asistencia === value;
                            return (
                              <button
                                key={value}
                                onClick={() => handleChange(player.id, 'asistencia', value)}
                                title={label}
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
                      {['tecnica', 'tactica', 'fisica', 'actitud', 'trabajo_equipo'].map(field => (
                        <td key={field} className="p-2">
                          <Select
                            value={playerData[field]?.toString() || ""}
                            onValueChange={(value) => handleChange(player.id, field, parseInt(value))}
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
                      ))}
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
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          Enviar
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