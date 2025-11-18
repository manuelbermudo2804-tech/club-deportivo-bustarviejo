import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Save, Send, User, AlertCircle, CheckCircle2, XCircle, Clock, Star } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function TeamAttendanceEvaluation() {
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionData, setSessionData] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [generalNotes, setGeneralNotes] = useState("");
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (currentUser.categorias_entrena?.length > 0) {
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

  const sendReportsMutation = useMutation({
    mutationFn: async ({ method }) => {
      const categoryPlayers = players.filter(p => 
        p.deporte === selectedCategory && p.activo
      );

      let sentCount = 0;
      const results = [];

      for (const player of categoryPlayers) {
        const playerData = sessionData[player.id] || {};
        
        if (!playerData.asistencia) continue;

        const reportText = `
📋 REPORTE DE ENTRENAMIENTO
═══════════════════════════════════

👤 Jugador: ${player.nombre}
⚽ Categoría: ${selectedCategory}
📅 Fecha: ${format(new Date(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: es })}
👨‍🏫 Entrenador: ${user.full_name}

═══════════════════════════════════
✅ ASISTENCIA
═══════════════════════════════════
${playerData.asistencia === 'presente' ? '✅ Presente' : 
  playerData.asistencia === 'ausente' ? '❌ Ausente' : 
  playerData.asistencia === 'justificado' ? '📝 Ausencia Justificada' : 
  '⏰ Llegada con retraso'}

${playerData.asistencia === 'presente' ? `
═══════════════════════════════════
⭐ EVALUACIÓN DEL ENTRENAMIENTO
═══════════════════════════════════
🎯 Técnica: ${playerData.tecnica || 'No evaluado'}/5
📐 Táctica: ${playerData.tactica || 'No evaluado'}/5
💪 Física: ${playerData.fisica || 'No evaluado'}/5
😊 Actitud: ${playerData.actitud || 'No evaluado'}/5
🤝 Trabajo en Equipo: ${playerData.trabajo_equipo || 'No evaluado'}/5

${playerData.observaciones ? `📝 Observaciones:
${playerData.observaciones}` : ''}
` : ''}

${generalNotes ? `
═══════════════════════════════════
📌 NOTAS GENERALES DE LA SESIÓN
═══════════════════════════════════
${generalNotes}
` : ''}

═══════════════════════════════════
Este reporte ha sido generado automáticamente.
Para cualquier consulta, contacta con tu entrenador.

Atentamente,
${user.full_name}
CD Bustarviejo
        `.trim();

        try {
          if (method === 'email') {
            // Enviar por email a los padres
            if (player.email_padre) {
              await base44.integrations.Core.SendEmail({
                from_name: `${user.full_name} - CD Bustarviejo`,
                to: player.email_padre,
                subject: `Reporte de Entrenamiento - ${player.nombre} - ${format(new Date(selectedDate), "dd/MM/yyyy")}`,
                body: reportText
              });
            }
            if (player.email_tutor_2) {
              await base44.integrations.Core.SendEmail({
                from_name: `${user.full_name} - CD Bustarviejo`,
                to: player.email_tutor_2,
                subject: `Reporte de Entrenamiento - ${player.nombre} - ${format(new Date(selectedDate), "dd/MM/yyyy")}`,
                body: reportText
              });
            }
          } else if (method === 'chat') {
            // Enviar por chat al grupo
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

  const handleSendReports = (method) => {
    if (hasUnsavedChanges) {
      toast.error("Debes guardar los cambios antes de enviar reportes");
      return;
    }
    
    if (window.confirm(`¿Enviar reportes por ${method === 'email' ? 'Email' : 'Chat'}?`)) {
      sendReportsMutation.mutate({ method });
    }
  };

  if (!user || !user.categorias_entrena || user.categorias_entrena.length === 0) {
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
                  {user.categorias_entrena.map(cat => (
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
              onClick={() => handleSendReports('email')}
              disabled={hasUnsavedChanges || sendReportsMutation.isPending || presentCount === 0}
              variant="outline"
              className="flex-1 h-9 text-sm"
            >
              <Send className="w-4 h-4 mr-1" />
              Enviar por Email
            </Button>
            <Button 
              onClick={() => handleSendReports('chat')}
              disabled={hasUnsavedChanges || sendReportsMutation.isPending || presentCount === 0}
              variant="outline"
              className="flex-1 h-9 text-sm"
            >
              <Send className="w-4 h-4 mr-1" />
              Enviar por Chat
            </Button>
          </div>
        </CardContent>
      </Card>

      {categoryPlayers.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl shadow-md">
          <p className="text-slate-500 text-sm">No hay jugadores en este equipo</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
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
                          { value: 'presente', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
                          { value: 'ausente', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
                          { value: 'justificado', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
                          { value: 'tardanza', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' }
                        ].map(({ value, icon: Icon, color, bg }) => {
                          const isSelected = playerData.asistencia === value;
                          return (
                            <button
                              key={value}
                              onClick={() => handleChange(player.id, 'asistencia', value)}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}