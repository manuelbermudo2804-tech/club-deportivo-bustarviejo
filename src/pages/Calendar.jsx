import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tantml:react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Calendar as CalendarIcon, Trophy, Bell } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import EventForm from "../components/calendar/EventForm";
import EventCard from "../components/calendar/EventCard";
import SocialLinks from "../components/SocialLinks";
import MatchAppLink from "../components/MatchAppLink";

export default function Calendar() {
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        setIsAdmin(user.role === "admin");
      } catch (error) {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-fecha'),
    initialData: [],
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      const newEvent = await base44.entities.Event.create(eventData);
      
      // Si es admin y está publicado, marcar como notificado después de crear
      if (eventData.publicado) {
        toast.success("✅ Evento creado y publicado. Los usuarios recibirán notificación.");
      }
      
      return newEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowForm(false);
      setEditingEvent(null);
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, eventData }) => {
      const updatedEvent = await base44.entities.Event.update(id, eventData);
      
      // Si cambió de no publicado a publicado, notificar
      const originalEvent = events.find(e => e.id === id);
      if (!originalEvent?.publicado && eventData.publicado) {
        toast.success("✅ Evento publicado. Los usuarios recibirán notificación.");
      }
      
      return updatedEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowForm(false);
      setEditingEvent(null);
    },
  });

  // Mark events as notified when users view them
  const markEventsAsNotified = useMutation({
    mutationFn: async () => {
      const newEvents = events.filter(e => e.publicado && !e.notificado && e.created_date);
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const recentNewEvents = newEvents.filter(e => {
        const created = new Date(e.created_date);
        return created > oneDayAgo;
      });
      
      if (recentNewEvents.length > 0) {
        const updatePromises = recentNewEvents.map(e => 
          base44.entities.Event.update(e.id, { ...e, notificado: true })
        );
        await Promise.all(updatePromises);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  // Mark events as notified when page loads
  useEffect(() => {
    if (events.length > 0 && !isAdmin) {
      markEventsAsNotified.mutate();
    }
  }, [events.length]);

  const handleSubmit = async (eventData) => {
    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, eventData });
    } else {
      createEventMutation.mutate(eventData);
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const visibleEvents = events.filter(event => isAdmin || event.publicado);

  const filteredEvents = visibleEvents.filter(event => {
    const matchesType = typeFilter === "all" || event.tipo === typeFilter;
    const matchesSport = sportFilter === "all" || event.deporte === sportFilter || event.deporte === "Todos";
    return matchesType && matchesSport;
  });

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = filteredEvents.filter(e => e.fecha >= today).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pastEvents = filteredEvents.filter(e => e.fecha < today).sort((a, b) => b.fecha.localeCompare(a.fecha));

  const eventTypes = [
    "all",
    "Partido",
    "Entrenamiento",
    "Reunión",
    "Torneo",
    "Inicio Temporada",
    "Gestión Club",
    "Pago",
    "Inscripción",
    "Pedido Ropa",
    "Fiesta Club",
    "Fin Temporada",
    "Otro"
  ];

  // Count new events for badge
  const newEventsCount = events.filter(e => {
    if (!e.publicado || e.notificado || !e.created_date) return false;
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const created = new Date(e.created_date);
    return created > oneDayAgo;
  }).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">Calendario de Eventos</h1>
            {newEventsCount > 0 && !isAdmin && (
              <Badge className="bg-red-500 text-white animate-pulse">
                <Bell className="w-3 h-3 mr-1" />
                {newEventsCount} nuevo{newEventsCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <p className="text-slate-600 mt-1">Próximos partidos, entrenamientos y actividades</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingEvent(null);
              setShowForm(!showForm);
            }}
            className="bg-orange-600 hover:bg-orange-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Evento
          </Button>
        )}
      </div>

      {/* MatchApp Card */}
      <Card className="border-none shadow-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-3xl opacity-20"></div>
        <CardContent className="relative z-10 py-6 px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-1">Horarios y Resultados</h3>
                <p className="text-slate-300 text-sm">
                  📱 Descarga MatchApp • Ver partidos en directo
                </p>
              </div>
            </div>
            <MatchAppLink className="w-full md:w-auto py-6 px-8 text-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Redes Sociales */}
      <SocialLinks />

      <AnimatePresence>
        {showForm && isAdmin && (
          <EventForm
            event={editingEvent}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingEvent(null);
            }}
            isSubmitting={createEventMutation.isPending || updateEventMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Filtros por Deporte */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button
            variant={sportFilter === "all" ? "default" : "outline"}
            onClick={() => setSportFilter("all")}
            className={sportFilter === "all" ? "bg-orange-600 hover:bg-orange-700" : ""}
          >
            🏃 Todos
          </Button>
          <Button
            variant={sportFilter === "Fútbol Masculino" ? "default" : "outline"}
            onClick={() => setSportFilter("Fútbol Masculino")}
            className={sportFilter === "Fútbol Masculino" ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            ⚽ Fútbol Masculino
          </Button>
          <Button
            variant={sportFilter === "Fútbol Femenino" ? "default" : "outline"}
            onClick={() => setSportFilter("Fútbol Femenino")}
            className={sportFilter === "Fútbol Femenino" ? "bg-pink-600 hover:bg-pink-700" : ""}
          >
            ⚽ Fútbol Femenino
          </Button>
          <Button
            variant={sportFilter === "Baloncesto" ? "default" : "outline"}
            onClick={() => setSportFilter("Baloncesto")}
            className={sportFilter === "Baloncesto" ? "bg-orange-600 hover:bg-orange-700" : ""}
          >
            🏀 Baloncesto
          </Button>
          <Button
            variant={sportFilter === "Paddle" ? "default" : "outline"}
            onClick={() => setSportFilter("Paddle")}
            className={sportFilter === "Paddle" ? "bg-purple-600 hover:bg-purple-700" : ""}
          >
            🎾 Paddle
          </Button>
        </div>

        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList className="bg-white shadow-sm flex-wrap h-auto">
            {eventTypes.map((type) => (
              <TabsTrigger
                key={type}
                value={type}
                className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700"
              >
                {type === "all" ? "Todos" : type}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : (
        <>
          {/* Próximos Eventos */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-orange-600" />
              Próximos Eventos ({upcomingEvents.length})
            </h2>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                <div className="text-6xl mb-4">📅</div>
                <p className="text-slate-500 text-lg">No hay eventos próximos programados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {upcomingEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={handleEdit}
                      isAdmin={isAdmin}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Eventos Pasados */}
          {pastEvents.length > 0 && (
            <div className="space-y-4 pt-8 border-t border-slate-200">
              <h2 className="text-2xl font-bold text-slate-500 flex items-center gap-2">
                <CalendarIcon className="w-6 h-6" />
                Eventos Pasados ({pastEvents.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
                <AnimatePresence>
                  {pastEvents.slice(0, 6).map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={handleEdit}
                      isAdmin={isAdmin}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}