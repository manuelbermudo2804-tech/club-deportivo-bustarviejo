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
        
        // If admin, load all categories from CategoryConfig for the selector
        if (currentUser.role === "admin") {
          setSelectedCategory("all");
          // Load all category names so admin can pick one to create callups
          try {
            const catConfigs = await base44.entities.CategoryConfig.filter({ activa: true });
            const catNames = [...new Set(catConfigs.map(c => c.nombre).filter(Boolean))];
            setCoachCategories(catNames);
          } catch {}
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
      // Send emails to parents AND second tutors
      const emailPromises = callup.jugadores_convocados.flatMap(async (jugador) => {
        const emails = [];
        if (jugador.email_padre) emails.push(jugador.email_padre);
        if (jugador.email_tutor_2) emails.push(jugador.email_tutor_2);
        if (!jugador.email_padre && jugador.email_jugador) emails.push(jugador.email_jugador);
        
        if (emails.length === 0) return;
        
        const sendToEmails = emails.map(async (email) => {
          const subject = `Convocatoria: ${callup.titulo} - CD Bustarviejo`;
          const body = `
Hola,

${jugador.jugador_nombre} ha sido convocado para el siguiente evento:

════════════════════════════════════════
📋 CONVOCATORIA
════════════════════════════════════════
${callup.tipo}: ${callup.titulo}
${callup.rival ? `Rival: ${callup.rival}` : ''}
Categoría: ${callup.categoria}

📅 Fecha: ${format(new Date(callup.fecha_partido), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
⏰ Hora del partido: ${callup.hora_partido}
${callup.hora_concentracion ? `🕐 Hora de concentración: ${callup.hora_concentracion}` : ''}
📍 Ubicación: ${callup.ubicacion}
${callup.enlace_ubicacion ? `🗺️ Google Maps: ${callup.enlace_ubicacion}` : ''}
${callup.local_visitante ? `🏟️ ${callup.local_visitante}` : ''}

${callup.descripcion ? `\nInstrucciones:\n${callup.descripcion}` : ''}

════════════════════════════════════════
⚠️ IMPORTANTE: CONFIRMA TU ASISTENCIA
════════════════════════════════════════
Por favor, accede a la aplicación del club y confirma tu asistencia lo antes posible.

Entrenador: ${callup.entrenador_nombre}


Atentamente,

Club de Fútbol Bustarviejo
${callup.entrenador_nombre}

════════════════════════════════════════
Datos de contacto:
════════════════════════════════════════
Email: cdbustarviejo@gmail.com
          `;
          
          try {
            console.log('📤 [CoachCallups] Enviando convocatoria a:', email);
            await base44.functions.invoke('sendEmail', {
              to: email,
              subject: subject,
              html: body
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

  // Filter by status
  const filteredByStatus = statusFilter === "all" 
    ? upcomingCallups 
    : upcomingCallups.filter(c => c.publicada === (statusFilter === "published"));

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
      <div className="bg-gradient-to-r from-orange-600 via-orange-700 to-amber-700 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="text-white">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold">Convocatorias</h1>
            </div>
            <p className="text-orange-100 text-sm ml-13">
              {user.role === "admin" 
                ? "Gestiona todas las convocatorias del club" 
                : `Gestiona las convocatorias de tus equipos`}
            </p>
          </div>
          <div className="flex gap-2">
            {filteredByStatus.length > 0 && (
              <ExportButton 
                data={prepareExportData()} 
                filename={`convocatorias_${(selectedCategory || '').replace(/\s+/g, '_')}`}
              />
            )}
            <Button
              onClick={handleNewCallup}
              className="bg-white text-orange-700 hover:bg-orange-50 shadow-lg font-semibold"
              disabled={!canCreateCallup}
            >
              <Plus className="w-5 h-5 mr-2" />
              Nueva Convocatoria
            </Button>
          </div>
        </div>
      </div>

      {/* Category selector for coaches with multiple categories OR admin */}
      {coachCategories.length > 0 && (
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

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mt-4">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="published">Publicadas</TabsTrigger>
          <TabsTrigger value="draft">Borradores</TabsTrigger>
        </TabsList>
      </Tabs>

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
    </>
  );
}