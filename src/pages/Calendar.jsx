import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar as CalendarIcon, Bell, Grid, List, ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";

import EventForm from "../components/calendar/EventForm";
import EventCard from "../components/calendar/EventCard";
import CalendarExport from "../components/calendar/CalendarExport";
import AgendaView from "../components/calendar/AgendaView";

export default function Calendar() {
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("all");
  const [viewMode, setViewMode] = useState("cards"); // "calendar", "cards", or "agenda"
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === "admin");
      } catch (error) {
        setIsAdmin(false);
      }
    };
    checkUser();
  }, []);

  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-fecha'),
    initialData: [],
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
    initialData: [],
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const { data: schedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => base44.entities.TrainingSchedule.list(),
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

  const myPlayersSports = useMemo(() => {
    if (!user) return [];
    if (isAdmin) return [];
    
    const sports = new Set();
    
    // Agregar deportes de jugadores relacionados
    const myPlayers = players.filter(p => 
      p.email_padre === user.email || 
      p.email_tutor_2 === user.email ||
      p.email_jugador === user.email
    );
    myPlayers.forEach(p => sports.add(p.deporte));
    
    // Agregar categorías que entrena (si es entrenador/coordinador)
    if (user.categorias_entrena && user.categorias_entrena.length > 0) {
      user.categorias_entrena.forEach(cat => sports.add(cat));
    }
    
    return [...sports];
  }, [user, players, isAdmin]);

  const visibleCallups = useMemo(() => {
    if (isAdmin) return callups.filter(c => c.publicada);
    
    return callups.filter(callup => {
      if (!callup.publicada) return false;
      return myPlayersSports.includes(callup.categoria);
    });
  }, [callups, isAdmin, myPlayersSports]);

  const getTrainingsForWeek = (date) => {
    const weekDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = weekDays[date.getDay()];
    
    return schedules.filter(schedule => 
      schedule.activo && schedule.dia_semana === dayName &&
      (isAdmin || myPlayersSports.includes(schedule.categoria))
    );
  };

  const allCalendarItems = useMemo(() => {
    const eventItems = events
      .filter(event => isAdmin || event.publicado)
      .map(event => ({
        ...event,
        type: 'event',
        date: event.fecha,
        title: event.titulo,
        category: event.deporte,
      }));

    const callupItems = visibleCallups.map(callup => ({
      ...callup,
      type: 'callup',
      date: callup.fecha_partido,
      title: `⚽ ${callup.titulo}`,
      category: callup.categoria,
      color: 'blue',
    }));

    return [...eventItems, ...callupItems].sort((a, b) => 
      a.date.localeCompare(b.date)
    );
  }, [events, visibleCallups, isAdmin]);

  const filteredItems = allCalendarItems.filter(item => {
    const matchesType = typeFilter === "all" || 
      (item.type === 'event' && item.tipo === typeFilter) ||
      (item.type === 'callup' && typeFilter === "Partido");
    const matchesSport = sportFilter === "all" || 
      item.category === sportFilter || 
      (item.type === 'event' && item.deporte === "Todos");
    return matchesType && matchesSport;
  });

  const today = new Date().toISOString().split('T')[0];
  const upcomingItems = filteredItems.filter(e => e.date >= today);
  const pastItems = filteredItems.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date));

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getItemsForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return filteredItems.filter(item => item.date === dayStr);
  };

  const handleCardClick = (date) => {
    const itemDate = new Date(date);
    setCurrentMonth(itemDate);
    setViewMode("calendar");
  };

  const eventTypes = [
    "all",
    "Partido",
    "Reunión",
    "Torneo",
    "Gestion Club",
    "Fiesta Club",
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
          <p className="text-slate-600 mt-1 text-sm">Eventos del club y partidos</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarExport 
            events={events.filter(e => isAdmin || e.publicado)} 
            callups={visibleCallups}
            schedules={schedules.filter(s => s.activo && (isAdmin || myPlayersSports.includes(s.categoria)))}
            userEmail={user?.email}
            userName={user?.full_name}
          />
          <div className="flex bg-white rounded-lg shadow-sm p-1">
            <Button
              size="sm"
              variant={viewMode === "calendar" ? "default" : "ghost"}
              onClick={() => setViewMode("calendar")}
              className={viewMode === "calendar" ? "bg-orange-600 hover:bg-orange-700" : ""}
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "agenda" ? "default" : "ghost"}
              onClick={() => setViewMode("agenda")}
              className={viewMode === "agenda" ? "bg-orange-600 hover:bg-orange-700" : ""}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "cards" ? "default" : "ghost"}
              onClick={() => setViewMode("cards")}
              className={viewMode === "cards" ? "bg-orange-600 hover:bg-orange-700" : ""}
            >
              <Grid className="w-4 h-4" />
            </Button>
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
              Nuevo Evento
            </Button>
          )}
        </div>
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
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={sportFilter === "all" ? "default" : "outline"}
          onClick={() => setSportFilter("all")}
          className={sportFilter === "all" ? "bg-orange-600 hover:bg-orange-700 h-9 text-xs" : "h-9 text-xs"}
        >
          Todos
        </Button>
        <Button
          size="sm"
          variant={sportFilter === "Fútbol Masculino" ? "default" : "outline"}
          onClick={() => setSportFilter("Fútbol Masculino")}
          className={sportFilter === "Fútbol Masculino" ? "bg-blue-600 hover:bg-blue-700 h-9 text-xs" : "h-9 text-xs"}
        >
          ⚽ Fútbol M
        </Button>
        <Button
          size="sm"
          variant={sportFilter === "Fútbol Femenino" ? "default" : "outline"}
          onClick={() => setSportFilter("Fútbol Femenino")}
          className={sportFilter === "Fútbol Femenino" ? "bg-pink-600 hover:bg-pink-700 h-9 text-xs" : "h-9 text-xs"}
        >
          ⚽ Fútbol F
        </Button>
        <Button
          size="sm"
          variant={sportFilter === "Baloncesto" ? "default" : "outline"}
          onClick={() => setSportFilter("Baloncesto")}
          className={sportFilter === "Baloncesto" ? "bg-orange-600 hover:bg-orange-700 h-9 text-xs" : "h-9 text-xs"}
        >
          🏀 Basket
        </Button>
        <div className="h-9 w-px bg-slate-300 mx-1"></div>
        {eventTypes.map((type) => (
          <Button
            key={type}
            size="sm"
            variant={typeFilter === type ? "default" : "outline"}
            onClick={() => setTypeFilter(type)}
            className={typeFilter === type ? "bg-orange-600 hover:bg-orange-700 h-9 text-xs" : "h-9 text-xs"}
          >
            {type === "all" ? "Todos" : type}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : viewMode === "agenda" ? (
        <AgendaView 
          items={filteredItems.filter(i => i.type !== 'training')}
          onItemClick={(item) => {
            if (item.type === 'event' && isAdmin) {
              handleEdit(item);
            }
          }}
        />
      ) : viewMode === "calendar" ? (
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h2>
            <Button
              variant="ghost"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 lg:gap-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="text-center text-xs lg:text-sm font-bold text-slate-700 py-2 bg-slate-50 rounded">
                {day}
              </div>
            ))}
            
            {Array.from({ length: daysInMonth[0].getDay() === 0 ? 6 : daysInMonth[0].getDay() - 1 }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] lg:min-h-[120px]" />
            ))}

            {daysInMonth.map(day => {
              const dayItems = getItemsForDay(day);
              const isToday = isSameDay(day, new Date());
              const events = dayItems.filter(i => i.type === 'event');
              const callups = dayItems.filter(i => i.type === 'callup');
              const totalItems = events.length + callups.length;

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] lg:min-h-[100px] border-2 rounded-lg p-1.5 lg:p-2 ${
                    isToday ? 'bg-orange-50 border-orange-500' : 'bg-white border-slate-200'
                  } hover:border-orange-400 transition-colors overflow-hidden cursor-pointer`}
                  onClick={() => {
                    if (totalItems > 0) {
                      setCurrentMonth(day);
                      setViewMode("cards");
                    }
                  }}
                >
                  <div className={`text-sm lg:text-base font-bold mb-1 ${isToday ? 'text-orange-600' : 'text-slate-800'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {totalItems > 0 ? (
                      <div className="flex flex-col gap-1">
                        {callups.slice(0, 1).map((c, idx) => (
                          <div key={`callup-${idx}`} className="text-[10px] lg:text-xs px-1.5 py-1 rounded bg-blue-600 text-white font-semibold truncate" title={`Partido: ${c.categoria}`}>
                            ⚽ Partido
                          </div>
                        ))}
                        {events.filter(e => e.importante).slice(0, 1).map((e, idx) => (
                          <div key={`important-${idx}`} className="text-[10px] lg:text-xs px-1.5 py-1 rounded bg-red-600 text-white font-semibold truncate" title={e.titulo}>
                            ⭐ {e.titulo.substring(0, 10)}
                          </div>
                        ))}
                        {events.filter(e => !e.importante).slice(0, 1).map((e, idx) => (
                          <div key={`event-${idx}`} className="text-[10px] lg:text-xs px-1.5 py-1 rounded bg-orange-600 text-white font-semibold truncate" title={e.titulo}>
                            {e.titulo.substring(0, 10)}
                          </div>
                        ))}
                        {totalItems > 2 && (
                          <div className="text-[10px] lg:text-xs text-slate-500 font-semibold text-center mt-0.5">
                            +{totalItems - 2} más
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-orange-600" />
              Próximos ({upcomingItems.length})
            </h2>
            {upcomingItems.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-xl shadow-md">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-slate-500 text-sm">No hay eventos próximos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <AnimatePresence>
                  {upcomingItems.map((item) => 
                    item.type === 'event' ? (
                      <div key={`event-${item.id}`} onClick={() => handleCardClick(item.date)} className="cursor-pointer">
                        <EventCard
                          event={item}
                          onEdit={handleEdit}
                          isAdmin={isAdmin}
                        />
                      </div>
                    ) : (
                      <Card 
                        key={`callup-${item.id}`} 
                        className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => handleCardClick(item.date)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <Badge className="bg-blue-600 text-white">Partido</Badge>
                            <span className="text-xs text-slate-600">
                              {format(new Date(item.date), "d MMM yyyy", { locale: es })}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-900 mb-2">{item.titulo}</h3>
                          <div className="space-y-1 text-sm text-slate-700">
                            <p>⚽ {item.categoria}</p>
                            {item.rival && <p>🆚 {item.rival}</p>}
                            {item.ubicacion && <p>📍 {item.ubicacion}</p>}
                            {item.hora_partido && <p>🕐 {item.hora_partido}</p>}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {pastItems.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h2 className="text-lg font-bold text-slate-500 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Pasados ({pastItems.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 opacity-60">
                <AnimatePresence>
                  {pastItems.slice(0, 4).map((item) =>
                    item.type === 'event' ? (
                      <EventCard
                        key={`past-event-${item.id}`}
                        event={item}
                        onEdit={handleEdit}
                        isAdmin={isAdmin}
                      />
                    ) : (
                      <Card key={`past-callup-${item.id}`} className="bg-slate-50 border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline">Partido</Badge>
                            <span className="text-xs text-slate-600">
                              {format(new Date(item.date), "d MMM yyyy", { locale: es })}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-700 mb-2">{item.titulo}</h3>
                        </CardContent>
                      </Card>
                    )
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}