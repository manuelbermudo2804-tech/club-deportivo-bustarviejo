import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar as CalendarIcon, Bell } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import EventForm from "../components/calendar/EventForm";
import EventCard from "../components/calendar/EventCard";

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
      
      if (eventData.publicado) {
        toast.success("✅ Evento creado y publicado");
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
      
      const originalEvent = events.find(e => e.id === id);
      if (!originalEvent?.publicado && eventData.publicado) {
        toast.success("✅ Evento publicado");
      }
      
      return updatedEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowForm(false);
      setEditingEvent(null);
    },
  });

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
    "Otro"
  ];

  const newEventsCount = events.filter(e => {
    if (!e.publicado || e.notificado || !e.created_date) return false;
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const created = new Date(e.created_date);
    return created > oneDayAgo;
  }).length;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Calendario</h1>
            {newEventsCount > 0 && !isAdmin && (
              <Badge className="bg-red-500 text-white text-xs">
                <Bell className="w-3 h-3 mr-1" />
                {newEventsCount}
              </Badge>
            )}
          </div>
          <p className="text-slate-600 mt-1 text-sm">Eventos y partidos</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingEvent(null);
              setShowForm(!showForm);
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo
          </Button>
        )}
      </div>

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

      {/* Filtros compactos */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={sportFilter === "all" ? "default" : "outline"}
            onClick={() => setSportFilter("all")}
            className={sportFilter === "all" ? "bg-orange-600 hover:bg-orange-700 h-8 text-xs" : "h-8 text-xs"}
          >
            🏃 Todos
          </Button>
          <Button
            size="sm"
            variant={sportFilter === "Fútbol Masculino" ? "default" : "outline"}
            onClick={() => setSportFilter("Fútbol Masculino")}
            className={sportFilter === "Fútbol Masculino" ? "bg-blue-600 hover:bg-blue-700 h-8 text-xs" : "h-8 text-xs"}
          >
            ⚽ Fútbol M
          </Button>
          <Button
            size="sm"
            variant={sportFilter === "Fútbol Femenino" ? "default" : "outline"}
            onClick={() => setSportFilter("Fútbol Femenino")}
            className={sportFilter === "Fútbol Femenino" ? "bg-pink-600 hover:bg-pink-700 h-8 text-xs" : "h-8 text-xs"}
          >
            ⚽ Fútbol F
          </Button>
          <Button
            size="sm"
            variant={sportFilter === "Baloncesto" ? "default" : "outline"}
            onClick={() => setSportFilter("Baloncesto")}
            className={sportFilter === "Baloncesto" ? "bg-orange-600 hover:bg-orange-700 h-8 text-xs" : "h-8 text-xs"}
          >
            🏀 Basket
          </Button>
        </div>

        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList className="bg-white shadow-sm flex-wrap h-auto p-1">
            {eventTypes.map((type) => (
              <TabsTrigger
                key={type}
                value={type}
                className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 text-xs px-2 py-1"
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
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-orange-600" />
              Próximos ({upcomingEvents.length})
            </h2>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-xl shadow-md">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-slate-500 text-sm">No hay eventos próximos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h2 className="text-lg font-bold text-slate-500 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Pasados ({pastEvents.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 opacity-60">
                <AnimatePresence>
                  {pastEvents.slice(0, 4).map((event) => (
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