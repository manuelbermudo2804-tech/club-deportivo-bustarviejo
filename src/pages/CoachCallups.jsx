import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Check, X, Clock, AlertCircle } from "lucide-react";
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

export default function CoachCallups() {
  const [showForm, setShowForm] = useState(false);
  const [editingCallup, setEditingCallup] = useState(null);
  const [user, setUser] = useState(null);
  const [coachCategories, setCoachCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const queryClient = useQueryClient();

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
        
        // If admin, set to "admin" mode (can see all categories)
        if (currentUser.role === "admin") {
          setSelectedCategory("admin");
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
    
    if (targetCategory === "all" || targetCategory === "admin") {
      // If "all" or "admin" is selected, show players from all coach's categories (or all players for admin)
      if (user?.role === "admin") {
        return p.activo; // Admins can see all active players
      }
      return coachCategories.includes(p.deporte) && p.activo;
    }
    // Otherwise, show players from the specific selected category
    return p.deporte === targetCategory && p.activo;
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
      toast.success("Convocatoria creada correctamente");
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
      toast.success("Convocatoria actualizada");
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
            await base44.integrations.Core.SendEmail({
              from_name: `CD Bustarviejo - ${callup.entrenador_nombre}`,
              to: email,
              subject: subject,
              body: body
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
      
      // Send to chat
      const mensaje = `🏆 NUEVA CONVOCATORIA\n\n📌 ${callup.titulo}\n${callup.rival ? `🆚 ${callup.rival}\n` : ''}\n📅 ${format(new Date(callup.fecha_partido), "EEEE d 'de' MMMM", { locale: es })}\n⏰ ${callup.hora_partido}\n📍 ${callup.ubicacion}${callup.enlace_ubicacion ? `\n🗺️ ${callup.enlace_ubicacion}` : ''}\n\n⚠️ CONFIRMA TU ASISTENCIA en la app\n\n👨‍🏫 ${callup.entrenador_nombre}`;
      
      await base44.entities.ChatMessage.create({
        remitente_email: user.email,
        remitente_nombre: callup.entrenador_nombre,
        mensaje: mensaje,
        prioridad: "Importante",
        tipo: "admin_a_grupo",
        deporte: callup.categoria,
        categoria: "",
        grupo_id: callup.categoria,
        leido: false,
        archivos_adjuntos: []
      });
      
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

  const handleCancel = () => {
    setShowForm(false);
    setEditingCallup(null);
  };

  const handleNewCallup = () => {
    setEditingCallup(null);
    setShowForm(true);
  };

  // Filter callups for coach's categories
  const myCallups = callups.filter(c => {
    if (user?.role === "admin") return true; // Admins see all callups
    
    // Coach/Coordinator can see callups they created OR from their categories
    const isMyCallup = c.entrenador_email === user?.email;
    const isFromMyCategories = coachCategories.includes(c.categoria);
    
    console.log('🔍 Convocatoria:', c.titulo, '| Categoría:', c.categoria, '| Mis categorías:', coachCategories, '| Es de mis categorías:', isFromMyCategories);
    
    if (selectedCategory === "all" || selectedCategory === "admin") {
      return isMyCallup || isFromMyCategories;
    }
    return isMyCallup || c.categoria === selectedCategory;
  });
  
  // Separate upcoming ONLY - past callups are hidden
  const today = new Date().toISOString().split('T')[0];
  const upcomingCallups = myCallups.filter(c => c.fecha_partido >= today && !c.cerrada);

  // Filter by status
  const filteredByStatus = statusFilter === "all" 
    ? upcomingCallups 
    : upcomingCallups.filter(c => c.publicada === (statusFilter === "published"));

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
  // Admins and coaches with categories can create; coordinators can only view unless they're also coaches
  const canCreateCallup = user?.role === "admin" || 
    (user?.es_entrenador && selectedCategory && selectedCategory !== "all" && selectedCategory !== "admin");

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            🏆 Convocatorias
          </h1>
          <p className="text-slate-600 mt-1">
            {user.role === "admin" 
              ? "Gestiona todas las convocatorias del club" 
              : `Gestiona las convocatorias de tus equipos`}
          </p>
        </div>
        <div className="flex gap-2">
          {filteredByStatus.length > 0 && (
            <ExportButton 
              data={prepareExportData()} 
              filename={`convocatorias_${selectedCategory.replace(/\s+/g, '_')}`}
            />
          )}
          <Button
            onClick={handleNewCallup}
            className="bg-orange-600 hover:bg-orange-700 shadow-lg"
            disabled={!canCreateCallup}
          >
            <Plus className="w-5 h-5 mr-2" />
            Nueva Convocatoria
          </Button>
        </div>
      </div>

      {/* Category selector for coaches with multiple categories */}
      {coachCategories.length > 1 && user.role !== "admin" && (
        <Card className="border-2 border-blue-300 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-blue-900 mb-2 block">
                  Selecciona una categoría para gestionar:
                </label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="bg-white">
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
            {selectedCategory === "all" && !editingCallup && (
              <p className="text-sm text-blue-700 mt-2">
                💡 Para crear una convocatoria, selecciona primero una categoría específica
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Próximas Convocatorias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{upcomingCallups.length}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Confirmados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{totalConfirmed}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{totalPending}</div>
          </CardContent>
        </Card>
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
          />
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
                  isCoach={user?.es_entrenador || user?.role === "admin"}
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
  );
}