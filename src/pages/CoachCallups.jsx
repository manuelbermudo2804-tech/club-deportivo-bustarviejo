import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Check, X, Clock, AlertCircle, Trophy, CalendarCheck, UserCheck } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExportButton from "../components/ExportButton";

import CallupForm from "../components/callups/CallupForm";
import CallupCard from "../components/callups/CallupCard";
import CancelRescheduleDialog from "../components/callups/CancelRescheduleDialog";
import { buildCallupEmailHtml } from "../components/callups/callupEmailTemplate";
import { usePageTutorial } from "../components/tutorials/useTutorial";
import { CombinedSuccessAnimation } from "../components/animations/SuccessAnimation";
import { useActiveSeason } from "../components/season/SeasonProvider";

export default function CoachCallups() {
  usePageTutorial("coach_callups");
  
  const [showForm, setShowForm] = useState(false);
  const [editingCallup, setEditingCallup] = useState(null);
  const [user, setUser] = useState(null);
  const [coachCategories, setCoachCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [cancelRescheduleCallup, setCancelRescheduleCallup] = useState(null);
  const [cancelRescheduleMode, setCancelRescheduleMode] = useState(null);
  const [cancelRescheduleSubmitting, setCancelRescheduleSubmitting] = useState(false);
  const formRef = React.useRef(null);

  const queryClient = useQueryClient();
  
  // Scroll al formulario cuando se muestra
  useEffect(() => {
    if (showForm && formRef.current) {
      setTimeout(() => {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [showForm]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Check if user is coach/coordinator or admin
        if (!currentUser.es_entrenador && !currentUser.es_coordinador && currentUser.role !== "admin") {
          toast.error("No tienes permisos de entrenador");
          return;
        }
        
        // Get coach categories
        const categories = currentUser.categorias_entrena || [];
        console.log('🔍 Categorías del usuario:', categories);
        setCoachCategories(categories);
        
        // Get user's suggestion preference (default to true)
        setSuggestionsEnabled(currentUser.sugerencias_convocatoria_activas !== false);
        
        // Admin also needs to pick a category to create callups
        if (currentUser.role === "admin") {
          // Admin sin categorías propias → cargar todas desde CategoryConfig
          if (categories.length === 0) {
            try {
              const catConfigs = await base44.entities.CategoryConfig.filter({ activa: true });
              const catNames = [...new Set(catConfigs.map(c => c.nombre).filter(Boolean))];
              setCoachCategories(catNames);
            } catch {}
          }
          // Si tiene 1 categoría, seleccionarla directamente
          if (categories.length === 1) {
            setSelectedCategory(categories[0]);
          } else {
            setSelectedCategory("all");
          }
        } else if (categories.length === 1) {
          // If only one category, select it by default
          setSelectedCategory(categories[0]);
        } else if (categories.length > 1) {
          // Multiple categories, default to "all" for viewing
          setSelectedCategory("all");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // Close form and clear editing when category changes (but NOT when editing a callup)
  useEffect(() => {
    if (!editingCallup) {
      setShowForm(false);
    }
  }, [selectedCategory]);

  const { activeSeason: activeSeasonStr } = useActiveSeason();
  const { data: callups, isLoading } = useQuery({
    queryKey: ['convocatorias'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
    initialData: [],
  });

  const { data: allPlayers } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  // Filter players by selected category (or editing callup's category)
  const players = allPlayers.filter(p => {
    const targetCategory = editingCallup?.categoria || selectedCategory;
    const playerCat = p.categoria_principal || p.deporte;
    
    if (targetCategory === "all" || targetCategory === "admin") {
      if (user?.role === "admin") {
        return p.activo;
      }
      return coachCategories.includes(playerCat) && p.activo;
    }
    return playerCat === targetCategory && p.activo;
  });

  const createCallupMutation = useMutation({
    mutationFn: async (callupData) => {
      const callup = await base44.entities.Convocatoria.create(callupData);
      
      // Send notifications if published
      if (callupData.publicada && !callupData.notificaciones_enviadas) {
        await sendCallupNotifications(callup);
      }
      
      return callup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convocatorias'] });
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      setShowForm(false);
      setEditingCallup(null);
      setSuccessMessage("¡Convocatoria creada!");
      setShowSuccess(true);
    },
  });

  const updateCallupMutation = useMutation({
    mutationFn: async ({ id, callupData }) => {
      const callup = await base44.entities.Convocatoria.update(id, callupData);
      
      // Send notifications if just published
      const original = callups.find(c => c.id === id);
      if (callupData.publicada && !original?.publicada && !callupData.notificaciones_enviadas) {
        await sendCallupNotifications(callup);
      }
      
      return callup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convocatorias'] });
      setShowForm(false);
      setEditingCallup(null);
      setSuccessMessage("¡Convocatoria actualizada!");
      setShowSuccess(true);
    },
  });

  const deleteCallupMutation = useMutation({
    mutationFn: (id) => base44.entities.Convocatoria.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convocatorias'] });
      toast.success("Convocatoria eliminada");
    },
  });

  const sendCallupNotifications = async (callup) => {
    try {
      // Load player data to get minor emails
      let allPlayers = [];
      try {
        allPlayers = await base44.entities.Player.list();
      } catch (e) { console.log('⚠️ Could not load players for minor emails'); }

      // Send emails to parents, second tutors, AND minors with juvenile access
      const emailPromises = callup.jugadores_convocados.flatMap(async (jugador) => {
        const emails = [];
        if (jugador.email_padre) emails.push(jugador.email_padre);
        if (jugador.email_tutor_2) emails.push(jugador.email_tutor_2);
        if (!jugador.email_padre && jugador.email_jugador) emails.push(jugador.email_jugador);
        
        // Also send to minor (juvenile access) if authorized
        const playerData = allPlayers.find(p => p.id === jugador.jugador_id);
        if (playerData?.acceso_menor_email && playerData?.acceso_menor_autorizado && !playerData?.acceso_menor_revocado) {
          if (!emails.includes(playerData.acceso_menor_email)) {
            emails.push(playerData.acceso_menor_email);
            console.log('👦 [CoachCallups] Añadiendo email menor:', playerData.acceso_menor_email);
          }
        }
        
        if (emails.length === 0) return;
        
        const sendToEmails = emails.map(async (email) => {
          const subject = `⚽ Convocatoria: ${callup.rival ? `vs ${callup.rival}` : callup.titulo} - CD Bustarviejo`;
          const htmlBody = buildCallupEmailHtml(callup, jugador.jugador_nombre);
          
          try {
            console.log('📤 [CoachCallups] Enviando convocatoria a:', email);
            await base44.functions.invoke('sendEmail', {
              to: email,
              subject: subject,
              html: htmlBody
            });
            console.log('✅ [CoachCallups] Email enviado a:', email);
          } catch (error) {
            console.error(`❌ [CoachCallups] Error sending email to ${email}:`, error);
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
        });
        
        return Promise.all(sendToEmails);
      });
      
      await Promise.all(emailPromises);
      
      // Send chat message to the team group
      try {
        const grupoId = callup.categoria?.replace(/\s+/g, '_') || 'general';
        const fechaFormateada = format(new Date(callup.fecha_partido), "EEEE d 'de' MMMM", { locale: es });
        const horaTexto = callup.hora_partido ? ` a las ${callup.hora_partido}` : '';
        const rivalTexto = callup.rival ? ` vs ${callup.rival}` : '';
        const localVisitante = callup.local_visitante ? ` (${callup.local_visitante})` : '';
        
        const chatMsg = `🏆 ¡NUEVA CONVOCATORIA!

📋 ${callup.titulo}${rivalTexto}${localVisitante}
📅 ${fechaFormateada}${horaTexto}
📍 ${callup.ubicacion || 'Por confirmar'}
${callup.hora_concentracion ? `🕐 Concentración: ${callup.hora_concentracion}` : ''}

👥 ${callup.jugadores_convocados.length} jugadores convocados

⚠️ Por favor, confirma la asistencia de tu hijo/a lo antes posible desde la sección "Convocatorias" de la app.`;

        await base44.entities.ChatMessage.create({
          remitente_email: user.email,
          remitente_nombre: user.full_name || 'Entrenador',
          mensaje: chatMsg,
          tipo: 'entrenador_a_grupo',
          grupo_id: grupoId,
          deporte: callup.categoria,
          prioridad: 'Importante'
        });
        console.log('💬 [CoachCallups] Mensaje de convocatoria enviado al chat del grupo:', grupoId);
      } catch (chatError) {
        console.error('⚠️ [CoachCallups] Error enviando mensaje al chat:', chatError);
      }

      // Mark as sent
      await base44.entities.Convocatoria.update(callup.id, {
        ...callup,
        notificaciones_enviadas: true
      });
      
      toast.success(`✅ Notificaciones enviadas a ${callup.jugadores_convocados.length} jugadores`);
    } catch (error) {
      console.error("Error sending notifications:", error);
      toast.error("Error al enviar notificaciones");
    }
  };

  const handleSubmit = (callupData) => {
    if (editingCallup) {
      updateCallupMutation.mutate({ id: editingCallup.id, callupData });
    } else {
      createCallupMutation.mutate(callupData);
    }
  };

  const handleEdit = (callup) => {
    setEditingCallup(callup);
    setSelectedCategory(callup.categoria);
    setShowForm(true);
  };

  const handleDelete = (callup) => {
    if (window.confirm(`¿Eliminar la convocatoria "${callup.titulo}"?\n\nEsta acción no se puede deshacer.`)) {
      deleteCallupMutation.mutate(callup.id);
    }
  };

  // Cierre/Reapertura manual
  const handleCloseNow = (callup) => {
    updateCallupMutation.mutate({ id: callup.id, callupData: { ...callup, cerrada: true } });
  };
  const handleReopen = (callup) => {
    updateCallupMutation.mutate({ id: callup.id, callupData: { ...callup, cerrada: false } });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCallup(null);
  };

  const handleOpenCancelDialog = (callup) => {
    setCancelRescheduleCallup(callup);
    setCancelRescheduleMode("cancel");
  };

  const handleOpenRescheduleDialog = (callup) => {
    setCancelRescheduleCallup(callup);
    setCancelRescheduleMode("reschedule");
  };

  const handleConfirmCancelReschedule = async ({ motivo, nuevaFecha, nuevaHora }) => {
    if (!cancelRescheduleCallup) return;
    setCancelRescheduleSubmitting(true);
    
    const isCancelling = cancelRescheduleMode === "cancel";
    const callup = cancelRescheduleCallup;

    const updateData = {
      ...callup,
      estado_convocatoria: isCancelling ? "cancelada" : "reprogramada",
      motivo_cambio: motivo,
    };

    if (isCancelling) {
      updateData.cerrada = true;
    } else {
      updateData.fecha_partido_original = callup.fecha_partido_original || callup.fecha_partido;
      updateData.hora_partido_original = callup.hora_partido_original || callup.hora_partido;
      updateData.fecha_partido = nuevaFecha;
      updateData.hora_partido = nuevaHora;
    }

    await base44.entities.Convocatoria.update(callup.id, updateData);

    // Send notification to chat group
    const grupoId = callup.categoria?.replace(/\s+/g, '_') || 'general';
    const fechaFormateada = format(new Date(callup.fecha_partido), "EEEE d 'de' MMMM", { locale: es });

    let chatMsg;
    if (isCancelling) {
      chatMsg = `🚫 CONVOCATORIA CANCELADA\n\n📋 ${callup.titulo}${callup.rival ? ` vs ${callup.rival}` : ''}\n📅 ${fechaFormateada} a las ${callup.hora_partido}\n\n📝 Motivo: ${motivo}\n\nNo es necesario acudir. Disculpad las molestias.`;
    } else {
      const nuevaFechaFormateada = format(new Date(nuevaFecha), "EEEE d 'de' MMMM", { locale: es });
      chatMsg = `🔄 CONVOCATORIA REPROGRAMADA\n\n📋 ${callup.titulo}${callup.rival ? ` vs ${callup.rival}` : ''}\n\n❌ Antes: ${fechaFormateada} a las ${callup.hora_partido}\n✅ Ahora: ${nuevaFechaFormateada} a las ${nuevaHora}\n\n📝 Motivo: ${motivo}\n\n⚠️ Por favor, revisad vuestra disponibilidad para la nueva fecha.`;
    }

    try {
      await base44.entities.ChatMessage.create({
        remitente_email: user.email,
        remitente_nombre: user.full_name || 'Entrenador',
        mensaje: chatMsg,
        tipo: 'entrenador_a_grupo',
        grupo_id: grupoId,
        deporte: callup.categoria,
        prioridad: 'Urgente'
      });
    } catch (e) {
      console.error('Error sending chat notification:', e);
    }

    // Send emails
    const allPlayersData = await base44.entities.Player.list();
    const emailPromises = callup.jugadores_convocados.map(async (jugador) => {
      const emails = [];
      if (jugador.email_padre) emails.push(jugador.email_padre);
      if (!jugador.email_padre && jugador.email_jugador) emails.push(jugador.email_jugador);
      const playerData = allPlayersData.find(p => p.id === jugador.jugador_id);
      if (playerData?.email_tutor_2) emails.push(playerData.email_tutor_2);
      if (playerData?.acceso_menor_email && playerData?.acceso_menor_autorizado) {
        emails.push(playerData.acceso_menor_email);
      }

      for (const email of [...new Set(emails)]) {
        try {
          const subject = isCancelling
            ? `🚫 CANCELADA: ${callup.titulo}${callup.rival ? ` vs ${callup.rival}` : ''} - CD Bustarviejo`
            : `🔄 REPROGRAMADA: ${callup.titulo}${callup.rival ? ` vs ${callup.rival}` : ''} - CD Bustarviejo`;
          await base44.functions.invoke('sendEmail', {
            to: email,
            subject,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
              <div style="background:${isCancelling ? '#dc2626' : '#d97706'};color:white;padding:20px;border-radius:12px;text-align:center;margin-bottom:20px">
                <h1 style="margin:0;font-size:24px">${isCancelling ? '🚫 Convocatoria Cancelada' : '🔄 Convocatoria Reprogramada'}</h1>
              </div>
              <h2 style="color:#1e293b">${callup.titulo}${callup.rival ? ` vs ${callup.rival}` : ''}</h2>
              <p><strong>Motivo:</strong> ${motivo}</p>
              ${!isCancelling ? `<p><strong>Nueva fecha:</strong> ${format(new Date(nuevaFecha), "EEEE d 'de' MMMM yyyy", { locale: es })} a las ${nuevaHora}</p>` : ''}
              <p style="color:#64748b;font-size:12px;margin-top:20px">Club Deportivo Bustarviejo</p>
            </div>`
          });
          await new Promise(r => setTimeout(r, 200));
        } catch (e) { console.error('Error emailing', email, e); }
      }
    });
    await Promise.all(emailPromises);

    setCancelRescheduleSubmitting(false);
    setCancelRescheduleCallup(null);
    setCancelRescheduleMode(null);
    queryClient.invalidateQueries({ queryKey: ['convocatorias'] });
    setSuccessMessage(isCancelling ? "Convocatoria cancelada y notificaciones enviadas" : "Convocatoria reprogramada y notificaciones enviadas");
    setShowSuccess(true);
  };

  const handlePublish = async (callup) => {
    if (!window.confirm(`¿Publicar y enviar la convocatoria "${callup.titulo}"?\n\nSe notificará a todos los jugadores convocados por email y chat.`)) return;
    
    const updatedData = { ...callup, publicada: true };
    updateCallupMutation.mutate({ id: callup.id, callupData: updatedData });
  };

  const handleNewCallup = () => {
    setEditingCallup(null);
    setShowForm(true);
  };

  const handleToggleSuggestions = async (enabled) => {
    setSuggestionsEnabled(enabled);
    try {
      await base44.auth.updateMe({ sugerencias_convocatoria_activas: enabled });
      toast.success(enabled ? "Sugerencias activadas" : "Sugerencias desactivadas");
    } catch (error) {
      console.error("Error updating suggestion preference:", error);
    }
  };

  // Season range filtering
  const getSeasonRange = (s) => {
    if (!s || !s.includes('/')) return { start: new Date(2000,0,1), end: new Date(2999,11,31) };
    const [y1,y2] = s.split('/').map(n=>parseInt(n,10));
    return { start: new Date(y1, 8, 1), end: new Date(y2, 7, 31) };
  };
  const { start: seasonStart, end: seasonEnd } = getSeasonRange(activeSeasonStr);
  const seasonCallups = callups.filter(c => {
    const d = new Date(c.fecha_partido);
    return !isNaN(d) && d >= seasonStart && d <= seasonEnd;
  });

  // Filter callups for coach's categories
  const myCallups = seasonCallups.filter(c => {
    if (user?.role === "admin") {
      if (selectedCategory === "all") return true;
      return c.categoria === selectedCategory;
    }
    
    // Coach/Coordinator: ONLY see callups from their assigned categories
    const isFromMyCategories = coachCategories.includes(c.categoria);
    
    if (selectedCategory === "all") {
      return isFromMyCategories;
    }
    return c.categoria === selectedCategory && isFromMyCategories;
  });
  
  // Separate upcoming ONLY - past callups are hidden
  const today = new Date().toISOString().split('T')[0];
  const upcomingCallups = myCallups.filter(c => c.fecha_partido >= today && !c.cerrada);

  // Filter by status - handle undefined/null publicada as false (draft)
  const filteredByStatus = statusFilter === "all" 
    ? upcomingCallups 
    : statusFilter === "published"
      ? upcomingCallups.filter(c => c.publicada === true)
      : upcomingCallups.filter(c => !c.publicada);

  // AUTO-CIERRE: 2h15 tras hora_partido o 00:30 del día siguiente si no hay hora
  const autoCloseRanRef = React.useRef(false);
  useEffect(() => {
    if (!callups || autoCloseRanRef.current) return;
    autoCloseRanRef.current = true;

    const now = new Date();
    const toClose = (callups || []).filter(c => {
      if (c.cerrada) return false;
      const baseDate = new Date(c.fecha_partido);
      if (isNaN(baseDate.getTime())) return false;
      let cutoff;
      if (c.hora_partido) {
        const [hh, mm] = String(c.hora_partido).split(':').map(n => parseInt(n, 10));
        const start = new Date(baseDate);
        start.setHours(hh || 0, mm || 0, 0, 0);
        cutoff = new Date(start.getTime() + 135 * 60 * 1000); // 2h15m
      } else {
        cutoff = new Date(baseDate);
        cutoff.setDate(cutoff.getDate() + 1);
        cutoff.setHours(0, 30, 0, 0); // 00:30 del día siguiente
      }
      return now > cutoff;
    });

    if (toClose.length === 0) {
      autoCloseRanRef.current = false; // permitir reintentos cuando cambie callups
      return;
    }

    Promise.all(toClose.map(c => base44.entities.Convocatoria.update(c.id, { ...c, cerrada: true })))
      .then(() => {
        autoCloseRanRef.current = false;
        queryClient.invalidateQueries({ queryKey: ['convocatorias'] });
      })
      .catch(() => { autoCloseRanRef.current = false; });
  }, [callups, queryClient]);

  const prepareExportData = () => {
    return filteredByStatus.map(c => ({
      Titulo: c.titulo,
      Tipo: c.tipo,
      Categoria: c.categoria,
      Fecha: c.fecha_partido,
      Hora: c.hora_partido,
      Ubicacion: c.ubicacion,
      Rival: c.rival || '-',
      Convocados: c.jugadores_convocados.length,
      Confirmados: c.jugadores_convocados.filter(j => j.confirmacion === "asistire").length,
      Pendientes: c.jugadores_convocados.filter(j => j.confirmacion === "pendiente").length,
      Estado: c.publicada ? 'Publicada' : 'Borrador'
    }));
  };

  // Calculate stats
  const totalConfirmed = upcomingCallups.reduce((acc, c) => {
    return acc + c.jugadores_convocados.filter(j => j.confirmacion === "asistire").length;
  }, 0);
  
  const totalPending = upcomingCallups.reduce((acc, c) => {
    return acc + c.jugadores_convocados.filter(j => j.confirmacion === "pendiente").length;
  }, 0);

  if (!user || (!user.es_entrenador && !user.es_coordinador && user.role !== "admin")) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-900 mb-2">Acceso Restringido</h2>
            <p className="text-red-700">Solo los entrenadores pueden acceder a esta sección</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine if user can create callups
  const canCreateCallup = (user?.role === "admin" && selectedCategory && selectedCategory !== "all") || 
    (user?.es_entrenador && selectedCategory && selectedCategory !== "all" && selectedCategory !== "admin");

  return (
    <>
      <CombinedSuccessAnimation 
        show={showSuccess} 
        onComplete={() => setShowSuccess(false)}
        message={successMessage}
        withConfetti={true}
      />
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-orange-600 via-orange-700 to-amber-700 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div className="text-white min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold leading-tight">Convocatorias</h1>
            <p className="text-orange-100 text-xs">
              {user.role === "admin" 
                ? "Gestiona todas las convocatorias del club" 
                : "Gestiona las convocatorias de tus equipos"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleNewCallup}
            className="bg-white text-orange-700 hover:bg-orange-50 shadow-lg font-semibold flex-1 sm:flex-none"
            disabled={!canCreateCallup}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nueva Convocatoria
          </Button>
          {filteredByStatus.length > 0 && (
            <ExportButton 
              data={prepareExportData()} 
              filename={`convocatorias_${(selectedCategory || '').replace(/\s+/g, '_')}`}
            />
          )}
        </div>
      </div>

      {/* Category selector - siempre visible si hay más de 1 categoría, o si solo tiene 1 pero es admin */}
      {(coachCategories.length > 1 || (user.role === "admin" && coachCategories.length > 0)) && (
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-lg shadow">⚽</div>
              <div className="flex-1">
                <label className="text-sm font-semibold text-blue-900 mb-1.5 block">
                  {user.role === "admin" ? "Categoría:" : "Selecciona categoría:"}
                </label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="bg-white border-blue-200">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📊 Ver todas las categorías</SelectItem>
                    {coachCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat.includes("Fútbol") ? "⚽" : "🏀"} {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(selectedCategory === "all" || selectedCategory === "admin") && !editingCallup && (
              <p className="text-sm text-blue-600 mt-2 ml-14">
                💡 Selecciona una categoría para crear una nueva convocatoria
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats compactos */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100 text-center">
          <div className="w-10 h-10 mx-auto mb-2 bg-orange-100 rounded-xl flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-orange-600">{upcomingCallups.length}</div>
          <p className="text-xs text-slate-500 mt-0.5">Próximas</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100 text-center">
          <div className="w-10 h-10 mx-auto mb-2 bg-green-100 rounded-xl flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">{totalConfirmed}</div>
          <p className="text-xs text-slate-500 mt-0.5">Confirmados</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100 text-center">
          <div className="w-10 h-10 mx-auto mb-2 bg-amber-100 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{totalPending}</div>
          <p className="text-xs text-slate-500 mt-0.5">Pendientes</p>
        </div>
      </div>

      {(() => {
        const publishedCount = upcomingCallups.filter(c => c.publicada === true).length;
        const draftCount = upcomingCallups.filter(c => !c.publicada).length;
        return (
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mt-4">
            <TabsList>
              <TabsTrigger value="all">Todas ({upcomingCallups.length})</TabsTrigger>
              <TabsTrigger value="published">✅ Publicadas ({publishedCount})</TabsTrigger>
              <TabsTrigger value="draft">📝 Borradores ({draftCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        );
      })()}

      <AnimatePresence mode="wait">
        {showForm && canCreateCallup && (
          <div ref={formRef}>
          <CallupForm
            key={editingCallup?.id || 'new'}
            callup={editingCallup}
            players={players}
            coachName={user.full_name}
            coachEmail={user.email}
            category={editingCallup?.categoria || selectedCategory}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={createCallupMutation.isPending || updateCallupMutation.isPending}
            userSuggestionsEnabled={suggestionsEnabled}
            onToggleSuggestions={handleToggleSuggestions}
          />
          </div>
        )}
      </AnimatePresence>

      {/* Upcoming Callups */}
      {filteredByStatus.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Próximas Convocatorias</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatePresence>
              {filteredByStatus.map((callup) => (
                <CallupCard
                  key={callup.id}
                  callup={callup}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCloseNow={handleCloseNow}
                  onReopen={handleReopen}
                  onCancel={handleOpenCancelDialog}
                  onReschedule={handleOpenRescheduleDialog}
                  onPublish={handlePublish}
                  isCoach={user?.es_entrenador || user?.role === "admin"}
                  isAdmin={user?.role === "admin"}
                  onRefresh={() => queryClient.invalidateQueries({ queryKey: ['convocatorias'] })}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-slate-500 text-lg mb-4">No hay convocatorias {statusFilter === "published" ? "publicadas" : statusFilter === "draft" ? "borradores" : "próximas"}</p>
          <Button onClick={handleNewCallup} className="bg-orange-600 hover:bg-orange-700" disabled={!canCreateCallup}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Primera Convocatoria
          </Button>
          {selectedCategory === "all" && coachCategories.length > 1 && (
            <p className="text-sm text-slate-500 mt-2">
              Selecciona una categoría para crear una convocatoria.
            </p>
          )}
        </div>
      )}
    </div>

    {cancelRescheduleCallup && (
      <CancelRescheduleDialog
        open={!!cancelRescheduleCallup}
        onOpenChange={(open) => { if (!open) { setCancelRescheduleCallup(null); setCancelRescheduleMode(null); }}}
        callup={cancelRescheduleCallup}
        mode={cancelRescheduleMode}
        onConfirm={handleConfirmCancelReschedule}
        isSubmitting={cancelRescheduleSubmitting}
      />
    )}
    </>
  );
}