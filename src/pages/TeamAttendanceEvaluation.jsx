import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { User, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import IndividualReportDialog from "../components/coach/IndividualReportDialog";
import BulkReportDialog from "../components/coach/BulkReportDialog";
import { usePageTutorial } from "../components/tutorials/useTutorial";

import PlayerAttendanceRow from "../components/attendance/PlayerAttendanceRow";
import AttendanceLiveStats from "../components/attendance/AttendanceLiveStats";
import AttendanceConfig from "../components/attendance/AttendanceConfig";
import CheckinGrid from "../components/attendance/CheckinGrid";

// Lazy load: el gráfico pesa mucho (recharts) y no se necesita al inicio
const AttendanceStatsChart = lazy(() => import("../components/attendance/AttendanceStatsChart"));

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
  const [showChart, setShowChart] = useState(false);
  const [checkinMode, setCheckinMode] = useState(false);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      // La selección inicial de categoría se hace en otro useEffect cuando availableCategories esté listo
      if (!currentUser.es_coordinador && currentUser.role !== "admin" && currentUser.categorias_entrena?.length > 0) {
        setSelectedCategory(currentUser.categorias_entrena[0]);
      }
    };
    fetchUser();
  }, []);

  // Solo cargar jugadores activos, con staleTime alto para no re-fetch continuamente
  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.filter({ activo: true }),
    initialData: [],
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  // Cargar configuración de categorías para check-in automático
  const { data: categoryConfigs } = useQuery({
    queryKey: ['categoryConfigs'],
    queryFn: () => base44.entities.CategoryConfig.filter({ activa: true }),
    initialData: [],
    staleTime: 5 * 60 * 1000,
  });

  // Cargar horarios de entrenamiento para saber hora inicio
  const { data: trainingSchedules } = useQuery({
    queryKey: ['trainingSchedules'],
    queryFn: () => base44.entities.TrainingSchedule.filter({ activo: true }),
    initialData: [],
    staleTime: 5 * 60 * 1000,
  });

  // Obtener config de la categoría seleccionada
  const currentCategoryConfig = useMemo(() => 
    categoryConfigs.find(c => c.nombre === selectedCategory),
    [categoryConfigs, selectedCategory]
  );

  // Detectar si check-in está activo para esta categoría
  useEffect(() => {
    setCheckinMode(!!currentCategoryConfig?.checkin_automatico);
  }, [currentCategoryConfig]);

  // Obtener hora de inicio del entrenamiento de hoy
  const todayTrainingTime = useMemo(() => {
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const today = dayNames[new Date(selectedDate).getDay()];
    const schedule = trainingSchedules.find(s => 
      s.categoria === selectedCategory && s.dia_semana === today
    );
    return schedule?.hora_inicio || null;
  }, [trainingSchedules, selectedCategory, selectedDate]);

  // Solo cargar asistencias de la categoría seleccionada, con filter en servidor
  const { data: attendances } = useQuery({
    queryKey: ['attendances', selectedCategory],
    queryFn: () => selectedCategory 
      ? base44.entities.Attendance.filter({ categoria: selectedCategory }) 
      : Promise.resolve([]),
    initialData: [],
    enabled: !!selectedCategory,
    staleTime: 2 * 60 * 1000,
  });

  // Real-time: solo escuchar cambios de Attendance (ligero, sin polling)
  useEffect(() => {
    if (!selectedCategory) return;
    const unsub = base44.entities.Attendance.subscribe((event) => {
      if (event.data?.categoria === selectedCategory || event.type === 'delete') {
        queryClient.invalidateQueries({ queryKey: ['attendances', selectedCategory] });
      }
    });
    return unsub;
  }, [selectedCategory, queryClient]);

  const saveSessionMutation = useMutation({
    mutationFn: async (data) => {
      const existing = attendances.find(a => a.categoria === selectedCategory && a.fecha === selectedDate);
      if (existing) {
        return base44.entities.Attendance.update(existing.id, data);
      } else {
        return base44.entities.Attendance.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', selectedCategory] });
      setHasUnsavedChanges(false);
      toast.success("✅ Sesión guardada");
    },
    onError: () => toast.error("❌ Error al guardar")
  });

  const sendIndividualReportMutation = useMutation({
    mutationFn: async ({ player, dateRange, sendMethod }) => {
      const playerAttendances = attendances.filter(a => 
        a.categoria === selectedCategory && a.fecha >= dateRange.start && a.fecha <= dateRange.end
      );
      const playerData = [];
      playerAttendances.forEach(attendance => {
        const playerRecord = attendance.asistencias?.find(a => a.jugador_id === player.id);
        if (playerRecord) playerData.push({ fecha: attendance.fecha, ...playerRecord });
      });
      if (playerData.length === 0) throw new Error("No hay datos para el periodo seleccionado");

      const evaluacionesConActitud = playerData.filter(d => d.actitud != null && (d.estado === 'presente' || d.estado === 'tardanza'));
      const actitudPromedio = evaluacionesConActitud.length > 0
        ? (evaluacionesConActitud.reduce((sum, d) => sum + d.actitud, 0) / evaluacionesConActitud.length).toFixed(1)
        : 'No evaluado';

      const reportText = buildReportText(player, selectedCategory, dateRange, playerData, actitudPromedio, user);

      if (sendMethod === 'email' || sendMethod === 'both') {
        const recipients = [player.email_padre, player.email_tutor_2].filter(Boolean);
        if (recipients.length === 0) throw new Error(`${player.nombre} no tiene emails configurados`);
        for (const email of recipients) {
          await base44.functions.invoke('sendEmail', {
            to: email,
            subject: `Reporte - ${player.nombre} - ${format(new Date(dateRange.start), "dd/MM/yyyy")} al ${format(new Date(dateRange.end), "dd/MM/yyyy")}`,
            html: `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;line-height:1.5;">${reportText}</pre>`
          });
          await new Promise(r => setTimeout(r, 300));
        }
      }
      
      if (sendMethod === 'chat' || sendMethod === 'both') {
        await sendPrivateChat(player, selectedCategory, reportText, user);
      }
      return { success: true };
    },
    onSuccess: () => {
      toast.success("✅ Reporte enviado");
      setShowIndividualDialog(false);
      setSelectedPlayer(null);
    },
    onError: (error) => toast.error(error.message || "❌ Error al enviar")
  });

  const sendReportsMutation = useMutation({
    mutationFn: async ({ dateRange, sendMethod }) => {
      const relevantAttendances = attendances.filter(a => 
        a.categoria === selectedCategory && a.fecha >= dateRange.start && a.fecha <= dateRange.end
      );
      let sentCount = 0;
      for (const player of categoryPlayers) {
        const playerAttendances = [];
        relevantAttendances.forEach(attendance => {
          const rec = attendance.asistencias?.find(a => a.jugador_id === player.id);
          if (rec && (rec.estado === 'presente' || rec.estado === 'tardanza')) {
            playerAttendances.push({ fecha: attendance.fecha, ...rec });
          }
        });
        if (playerAttendances.length === 0) continue;

        const evaluacionesConActitud = playerAttendances.filter(d => d.actitud != null);
        const actitudPromedio = evaluacionesConActitud.length > 0
          ? (evaluacionesConActitud.reduce((sum, d) => sum + d.actitud, 0) / evaluacionesConActitud.length).toFixed(1)
          : 'No evaluado';

        const reportText = buildReportText(player, selectedCategory, dateRange, playerAttendances, actitudPromedio, user);

        try {
          if (sendMethod === 'email' || sendMethod === 'both') {
            for (const email of [player.email_padre, player.email_tutor_2].filter(Boolean)) {
              await base44.functions.invoke('sendEmail', {
                to: email,
                subject: `Reporte - ${player.nombre} - ${format(new Date(dateRange.start), "dd/MM/yyyy")} al ${format(new Date(dateRange.end), "dd/MM/yyyy")}`,
                html: `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;line-height:1.5;">${reportText}</pre>`
              });
            }
          }
          if (sendMethod === 'chat' || sendMethod === 'both') {
            await sendPrivateChat(player, selectedCategory, reportText, user);
          }
          sentCount++;
        } catch (error) {
          console.error(`Error report ${player.nombre}:`, error);
        }
        await new Promise(r => setTimeout(r, 300));
      }
      return { sentCount };
    },
    onSuccess: (data) => {
      if (data.sentCount > 0) toast.success(`✅ ${data.sentCount} reportes enviados`);
      else toast.warning("No se enviaron reportes");
    },
    onError: () => toast.error("❌ Error al enviar reportes")
  });

  const categoryPlayers = useMemo(() => 
    (players || []).filter(p => {
      if (p.activo === false) return false;
      if (p.deporte === selectedCategory || p.categoria_principal === selectedCategory) return true;
      if ((p.categorias || []).includes(selectedCategory)) return true;
      return false;
    }).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [players, selectedCategory]
  );

  // Mini-historial: últimas 5 sesiones por jugador (memoizado)
  const playerHistory = useMemo(() => {
    const history = {};
    const catAttendances = (attendances || [])
      .sort((a, b) => b.fecha?.localeCompare(a.fecha));
    categoryPlayers.forEach(p => {
      const sessions = [];
      for (const att of catAttendances) {
        const record = att.asistencias?.find(a => a.jugador_id === p.id);
        if (record) sessions.push({ fecha: att.fecha, estado: record.estado });
        if (sessions.length >= 5) break;
      }
      history[p.id] = sessions.reverse();
    });
    return history;
  }, [attendances, categoryPlayers]);

  const liveStats = useMemo(() => {
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

  const handleMarkAllPresent = useCallback(() => {
    setSessionData(prev => {
      const next = { ...prev };
      categoryPlayers.forEach(p => {
        if (!next[p.id]?.asistencia) next[p.id] = { ...(next[p.id] || {}), asistencia: 'presente' };
      });
      return next;
    });
    setHasUnsavedChanges(true);
    toast.success(`✅ Marcados como presentes`);
  }, [categoryPlayers]);

  const handleDefaultEvaluation = useCallback(() => {
    let count = 0;
    setSessionData(prev => {
      const next = { ...prev };
      categoryPlayers.forEach(p => {
        const estado = next[p.id]?.asistencia;
        if ((estado === 'presente' || estado === 'tardanza') && !next[p.id]?.actitud) {
          next[p.id] = { ...(next[p.id] || {}), actitud: 3 };
          count++;
        }
      });
      return next;
    });
    if (count === 0) { toast.info("Todos ya evaluados"); return; }
    setHasUnsavedChanges(true);
    toast.success(`⭐ ${count} evaluados con 3/5`);
  }, [categoryPlayers]);

  // Autoguardado cada 30s
  useEffect(() => {
    if (!hasUnsavedChanges || !selectedCategory || !user) return;
    const timer = setTimeout(() => {
      handleSave();
      toast.info("💾 Autoguardado");
    }, 30000);
    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, sessionData, generalNotes]);

  useEffect(() => {
    const existing = attendances.find(a => a.categoria === selectedCategory && a.fecha === selectedDate);
    if (existing) {
      const data = {};
      existing.asistencias?.forEach(a => {
        data[a.jugador_id] = { asistencia: a.estado, actitud: a.actitud, observaciones: a.observaciones };
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

  const handleChange = useCallback((playerId, field, value) => {
    setSessionData(prev => ({
      ...prev,
      [playerId]: { ...(prev[playerId] || {}), [field]: value }
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Handler para check-in desde la cuadrícula
  const handleCheckin = useCallback((playerId, estado, horaCheckin) => {
    setSessionData(prev => {
      if (!estado) {
        // Toggle off: quitar check-in
        const { [playerId]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [playerId]: { 
          ...(prev[playerId] || {}), 
          asistencia: estado, 
          hora_checkin: horaCheckin 
        }
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    const asistencias = categoryPlayers.map(p => ({
      jugador_id: p.id,
      jugador_nombre: p.nombre,
      estado: sessionData[p.id]?.asistencia || "ausente",
      hora_checkin: sessionData[p.id]?.hora_checkin || null,
      actitud: sessionData[p.id]?.actitud || null,
      observaciones: sessionData[p.id]?.observaciones || ""
    }));
    saveSessionMutation.mutate({
      fecha: selectedDate,
      categoria: selectedCategory,
      entrenador_email: user.email,
      entrenador_nombre: user.full_name,
      modo_checkin: checkinMode,
      asistencias,
      observaciones_generales: generalNotes
    });
  }, [categoryPlayers, sessionData, selectedDate, selectedCategory, user, generalNotes]);

  const handleOpenIndividualReport = useCallback((player) => {
    setSelectedPlayer(player);
    setShowIndividualDialog(true);
  }, []);

  const handleSetGeneralNotes = useCallback((val) => {
    setGeneralNotes(val);
    setHasUnsavedChanges(true);
  }, []);

  const availableCategories = useMemo(() => {
    if (!user) return [];
    // Admins y coordinadores ven todas las categorías activas (de CategoryConfig + las que ya tienen jugadores)
    if (user.role === "admin" || user.es_coordinador) {
      const fromConfig = (categoryConfigs || []).filter(c => !c.es_actividad_complementaria).map(c => c.nombre);
      const fromPlayers = (players || []).map(p => p.categoria_principal || p.deporte).filter(Boolean);
      return [...new Set([...fromConfig, ...fromPlayers])];
    }
    return user.categorias_entrena || [];
  }, [user, players, categoryConfigs]);

  // Asegurar selección inicial cuando llegan las categorías disponibles (admin/coordinador)
  useEffect(() => {
    if (!selectedCategory && availableCategories.length > 0) {
      setSelectedCategory(availableCategories[0]);
    }
  }, [availableCategories, selectedCategory]);

  if (!user || (!user.es_entrenador && !user.es_coordinador && user.role !== "admin") || availableCategories.length === 0) {
    return (
      <div className="p-4 lg:p-6">
        <div className="text-center py-12">
          <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No tienes equipos asignados</p>
        </div>
      </div>
    );
  }

  const existing = attendances.find(a => a.categoria === selectedCategory && a.fecha === selectedDate);

  return (
    <div className="p-3 lg:p-6 space-y-3">
      <IndividualReportDialog
        player={selectedPlayer}
        isOpen={showIndividualDialog}
        onClose={() => { setShowIndividualDialog(false); setSelectedPlayer(null); }}
        onSend={(data) => sendIndividualReportMutation.mutate(data)}
        isLoading={sendIndividualReportMutation.isPending}
      />
      <BulkReportDialog
        isOpen={showBulkDialog}
        onClose={() => setShowBulkDialog(false)}
        onSend={(data) => sendReportsMutation.mutate(data)}
        isLoading={sendReportsMutation.isPending}
        selectedCategory={selectedCategory}
      />

      {/* Header compacto */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900">📋 Asistencia</h1>
          <p className="text-slate-500 text-xs">Registro de sesión</p>
        </div>
        <div className="flex items-center gap-2">
          {existing && (
            <span className="text-[10px] text-green-600 bg-green-50 px-2 py-1 rounded">
              ✅ {format(new Date(existing.updated_date), "dd/MM HH:mm")}
            </span>
          )}
        </div>
      </div>

      {/* Resumen en vivo */}
      {selectedCategory && categoryPlayers.length > 0 && (
        <AttendanceLiveStats
          stats={liveStats}
          onMarkAllPresent={handleMarkAllPresent}
          onDefaultEvaluation={handleDefaultEvaluation}
        />
      )}

      {hasUnsavedChanges && (
        <div className="flex items-center gap-2 text-orange-900 bg-orange-50 border-2 border-orange-400 rounded-xl py-2 px-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-medium">Cambios sin guardar</span>
        </div>
      )}

      {/* Gráfico - carga diferida y bajo demanda */}
      {attendances.filter(a => a.categoria === selectedCategory).length > 0 && (
        showChart ? (
          <Suspense fallback={<div className="text-center py-6 text-slate-400 text-sm">Cargando gráfico...</div>}>
            <AttendanceStatsChart
              attendances={attendances.filter(a => a.categoria === selectedCategory)}
              categoryPlayers={categoryPlayers}
            />
          </Suspense>
        ) : (
          <button
            onClick={() => setShowChart(true)}
            className="w-full py-3 bg-white rounded-xl shadow-sm border text-sm text-slate-500 active:bg-slate-50"
          >
            📊 Ver estadísticas de asistencia
          </button>
        )
      )}

      {/* Configuración */}
      <AttendanceConfig
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        availableCategories={availableCategories}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        generalNotes={generalNotes}
        setGeneralNotes={handleSetGeneralNotes}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSave}
        onShowBulkDialog={() => setShowBulkDialog(true)}
        existing={existing}
        isSendingReports={sendReportsMutation.isPending}
      />

      {/* Lista de jugadores - modo check-in o modo manual */}
      {categoryPlayers.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl shadow-sm">
          <p className="text-slate-500 text-sm">No hay jugadores en este equipo</p>
        </div>
      ) : checkinMode ? (
        <>
          <CheckinGrid
            players={categoryPlayers}
            sessionData={sessionData}
            trainingStartTime={todayTrainingTime}
            minutesTardanza={currentCategoryConfig?.checkin_minutos_tardanza || 10}
            onCheckin={handleCheckin}
          />
          {/* Después del check-in, evaluación manual */}
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-slate-700">📝 Evaluación post-entrenamiento (opcional):</p>
            {categoryPlayers.filter(p => sessionData[p.id]?.asistencia === 'presente' || sessionData[p.id]?.asistencia === 'tardanza').map((player) => (
              <PlayerAttendanceRow
                key={player.id}
                player={player}
                data={sessionData[player.id]}
                history={playerHistory[player.id]}
                onChange={handleChange}
                onReport={handleOpenIndividualReport}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          {categoryPlayers.map((player) => (
            <PlayerAttendanceRow
              key={player.id}
              player={player}
              data={sessionData[player.id]}
              history={playerHistory[player.id]}
              onChange={handleChange}
              onReport={handleOpenIndividualReport}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helpers fuera del componente para evitar recreación

function buildReportText(player, category, dateRange, playerData, actitudPromedio, user) {
  const ultimasEvaluaciones = playerData
    .filter(d => d.estado === 'presente' || d.estado === 'tardanza')
    .slice(0, 3)
    .map(d => format(new Date(d.fecha), "dd/MM/yy"))
    .join('\n  ');

  return `🔒 MENSAJE PRIVADO - Solo para la familia de ${player.nombre}

Estimados padres/tutores de ${player.nombre},

====================================
📊 REPORTE DE ENTRENAMIENTO
====================================

Jugador: ${player.nombre}
Categoria: ${category}
Periodo: ${format(new Date(dateRange.start), "dd/MM/yyyy")} - ${format(new Date(dateRange.end), "dd/MM/yyyy")}

Sesiones evaluadas: ${playerData.length}
Actitud promedio: ${actitudPromedio}/5

Ultimas evaluaciones:
  ${ultimasEvaluaciones || 'Sin evaluaciones'}

${playerData.map(data => `
📅 ${format(new Date(data.fecha), "dd 'de' MMMM 'de' yyyy", { locale: es })}
   Estado: ${data.estado === 'presente' ? '✅ Presente' : data.estado === 'ausente' ? '❌ Ausente' : data.estado === 'justificado' ? '📝 Justificada' : '⏰ Tardanza'}
${(data.estado === 'presente' || data.estado === 'tardanza') && data.actitud != null ? `   Actitud: ${'⭐'.repeat(data.actitud)} (${data.actitud}/5)` : ''}
${data.observaciones ? `   Obs: ${data.observaciones}` : ''}
`).join('---\n')}

👨‍🏫 Entrenador: ${user.full_name}

🔒 Este reporte es PRIVADO para su familia.

CD Bustarviejo`.trim();
}

async function sendPrivateChat(player, category, reportText, user) {
  if (!player.email_padre) return;
  const existingConvs = await base44.entities.PrivateConversation.filter({
    participante_familia_email: player.email_padre,
    participante_staff_email: user.email,
    categoria: category
  });
  let conversation = existingConvs[0];
  if (!conversation) {
    conversation = await base44.entities.PrivateConversation.create({
      participante_familia_email: player.email_padre,
      participante_familia_nombre: `Padre de ${player.nombre}`,
      participante_staff_email: user.email,
      participante_staff_nombre: user.full_name,
      participante_staff_rol: 'entrenador',
      categoria: category,
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
  await base44.entities.PrivateConversation.update(conversation.id, {
    ultimo_mensaje: "📊 Reporte de entrenamiento enviado",
    ultimo_mensaje_fecha: new Date().toISOString(),
    ultimo_mensaje_de: "staff",
    no_leidos_familia: (conversation.no_leidos_familia || 0) + 1
  });
}