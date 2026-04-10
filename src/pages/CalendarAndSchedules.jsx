import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Calendar as CalendarIcon, Bell, Grid, List, ChevronLeft, ChevronRight, Clock, MapPin, Trash2, ExternalLink, Info, Trophy } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import CalendarSyncButton from "../components/calendar/CalendarSyncButton";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

import EventCard from "../components/calendar/EventCard";
import CalendarExport from "../components/calendar/CalendarExport";
import AgendaView from "../components/calendar/AgendaView";
import TrainingScheduleForm from "../components/training/TrainingScheduleForm";
import ContactCard from "../components/ContactCard";
import { useActiveSeason } from "../components/season/SeasonProvider";
import UpcomingMatchesSection from "../components/calendar/UpcomingMatchesSection";
import MyLeagueSchedules from "../components/competition/MyLeagueSchedules";

const DIAS_ORDEN = {
  "Lunes": 1,
  "Martes": 2,
  "Miércoles": 3,
  "Jueves": 4,
  "Viernes": 5
};

const DAY_COLORS = {
  "Lunes": "from-blue-600 to-blue-700",
  "Martes": "from-green-600 to-green-700",
  "Miércoles": "from-orange-600 to-orange-700",
  "Jueves": "from-purple-600 to-purple-700",
  "Viernes": "from-pink-600 to-pink-700"
};

const UBICACION_MAPS_URL = "https://www.google.com/maps/place/Campo+de+F%C3%BAtbol+Municipal+Bustarviejo/@40.8569444,-3.7230556,17z";

export default function CalendarAndSchedules() {
  const [activeTab, setActiveTab] = useState("partidos");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("all");
  const [viewMode, setViewMode] = useState("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("parent");
  const [myCategories, setMyCategories] = useState([]);
  
  // Training schedule form state
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === "admin");
        
        if (currentUser.role === "admin") {
          setUserRole("admin");
        } else if (currentUser.role === "jugador") {
          setUserRole("player");
        } else if (currentUser.es_entrenador || currentUser.es_coordinador) {
          setUserRole("coach");
        } else {
          setUserRole("parent");
        }
      } catch (error) {
        setIsAdmin(false);
      }
    };
    checkUser();
  }, []);

  const { activeSeason: activeSeasonStr } = useActiveSeason();

  // Calendar data
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-fecha'),
    initialData: [],
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
    initialData: [],
  });

  const { data: proximosPartidos = [] } = useQuery({
    queryKey: ['proximos-partidos-calendar'],
    queryFn: () => base44.entities.ProximoPartido.filter({ jugado: false }, 'fecha_iso', 50),
    staleTime: 5 * 60_000,
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['trainingSchedules', activeSeasonStr],
    queryFn: () => base44.entities.TrainingSchedule.filter({ temporada: activeSeasonStr }),
    initialData: [],
  });

  // Get my players for filtering
  const myPlayers = useMemo(() => {
    if (!user) return [];
    if (userRole === "player") {
      return players.filter(p => p.id === user?.jugador_id);
    }
    return players.filter(p => 
      (p.email_padre === user?.email || p.email_tutor_2 === user?.email || 
       (p.acceso_menor_email === user?.email && p.acceso_menor_autorizado)) && p.activo
    );
  }, [players, user, userRole]);

  useEffect(() => {
    if (myPlayers.length > 0) {
      const cats = new Set();
      myPlayers.forEach(p => {
        if (p.deporte) cats.add(p.deporte);
        if (p.categoria_principal) cats.add(p.categoria_principal);
        if (p.categorias && Array.isArray(p.categorias)) p.categorias.forEach(c => cats.add(c));
      });
      setMyCategories([...cats]);
    }
  }, [myPlayers]);

  const myPlayersSports = useMemo(() => {
    if (!user) return [];
    if (isAdmin) return [];
    
    const sports = new Set();
    
    myPlayers.forEach(p => sports.add(p.deporte));
    
    if (user.categorias_entrena && user.categorias_entrena.length > 0) {
      user.categorias_entrena.forEach(cat => sports.add(cat));
    }
    
    return [...sports];
  }, [user, myPlayers, isAdmin]);

  // Calendar mutations
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

  // Training schedule mutations
  const createScheduleMutation = useMutation({
    mutationFn: (scheduleData) => base44.entities.TrainingSchedule.create(scheduleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingSchedules'] });
      setShowScheduleForm(false);
      setEditingSchedule(null);
      toast.success("Horario creado correctamente");
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, scheduleData }) => base44.entities.TrainingSchedule.update(id, scheduleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingSchedules'] });
      setShowScheduleForm(false);
      setEditingSchedule(null);
      toast.success("Horario actualizado correctamente");
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id) => base44.entities.TrainingSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingSchedules'] });
      toast.success("Horario eliminado correctamente");
    },
  });

  const handleScheduleSubmit = async (scheduleData) => {
    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule.id, scheduleData });
    } else {
      createScheduleMutation.mutate(scheduleData);
    }
  };

  const handleScheduleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setShowScheduleForm(true);
  };

  const handleScheduleDelete = (schedule) => {
    if (confirm(`¿Eliminar el horario de ${schedule.categoria} - ${schedule.dia_semana}?`)) {
      deleteScheduleMutation.mutate(schedule.id);
    }
  };

  // Calendar computed data
  const visibleCallups = useMemo(() => {
    const getSeasonRange = (s) => {
      if (!s || !s.includes('/')) return { start: new Date(2000,0,1), end: new Date(2999,11,31) };
      const [y1,y2] = s.split('/').map(n=>parseInt(n,10));
      return { start: new Date(y1, 8, 1), end: new Date(y2, 7, 31) };
    };
    const { start: seasonStart, end: seasonEnd } = getSeasonRange(activeSeasonStr);
    const inSeason = (dStr) => { const d = new Date(dStr); return !isNaN(d) && d >= seasonStart && d <= seasonEnd; };

    if (isAdmin) return callups.filter(c => c.publicada && inSeason(c.fecha_partido));
    
    return callups.filter(callup => {
      if (!callup.publicada) return false;
      return myPlayersSports.includes(callup.categoria);
    });
  }, [callups, isAdmin, myPlayersSports]);

  const allCalendarItems = useMemo(() => {
    const getSeasonRange = (s) => {
      if (!s || !s.includes('/')) return { start: new Date(2000,0,1), end: new Date(2999,11,31) };
      const [y1,y2] = s.split('/').map(n=>parseInt(n,10));
      return { start: new Date(y1, 8, 1), end: new Date(y2, 7, 31) };
    };
    const { start: seasonStart, end: seasonEnd } = getSeasonRange(activeSeasonStr);
    const inSeason = (dStr) => { const d = new Date(dStr); return !isNaN(d) && d >= seasonStart && d <= seasonEnd; };

    const eventItems = events
      .filter(event => (isAdmin || event.publicado) && event.tipo !== 'Partido' && inSeason(event.fecha))
      .map(event => ({
        ...event,
        type: 'event',
        date: event.fecha,
        title: event.titulo,
        category: event.deporte,
      }));

    const callupItems = visibleCallups.filter(c => inSeason(c.fecha_partido)).map(callup => ({
      ...callup,
      type: 'callup',
      date: callup.fecha_partido,
      title: `⚽ ${callup.titulo}`,
      category: callup.categoria,
      color: 'blue',
    }));

    // Add ProximoPartido entries that don't already have a matching callup
    // Normalizar categorías para comparación (quitar "(Mixto)" etc.)
    const normCat = (s) => (s || '').trim().toLowerCase().replace(/\(mixto\)/g, '').replace(/\s+/g, ' ').trim();
    const callupDates = new Set(callupItems.map(c => `${normCat(c.category)}|${c.date}`));
    const norm = (s) => (s || '').trim().toLowerCase();
    const matchItems = (proximosPartidos || [])
      .filter(m => m.fecha_iso && inSeason(m.fecha_iso))
      .filter(m => {
        // Skip if there's already a callup for this category+date
        return !callupDates.has(`${normCat(m.categoria)}|${m.fecha_iso}`);
      })
      .map(m => {
        const isLocal = norm(m.local).includes('bustarviejo');
        const rival = isLocal ? m.visitante : m.local;
        return {
          id: `proximo-${m.id}`,
          type: 'match',
          date: m.fecha_iso,
          title: `⚽ J${m.jornada || '?'} vs ${rival}`,
          category: m.categoria,
          categoria: m.categoria,
          rival,
          ubicacion: m.campo,
          hora_partido: m.hora,
          jornada: m.jornada,
          local_visitante: isLocal ? 'Local' : 'Visitante',
          color: 'green',
        };
      });

    return [...eventItems, ...callupItems, ...matchItems].sort((a, b) => 
      a.date.localeCompare(b.date)
    );
  }, [events, visibleCallups, proximosPartidos, isAdmin]);

  const filteredItems = allCalendarItems.filter(item => {
    const matchesType = typeFilter === "all" || 
      (item.type === 'event' && item.tipo === typeFilter) ||
      (item.type === 'callup' && typeFilter === "Partido") ||
      (item.type === 'match' && typeFilter === "Partido");
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

  const eventTypes = ["all", "Partido", "Reunión", "Torneo", "Gestion Club", "Fiesta Club", "Otro"];

  const newEventsCount = events.filter(e => {
    if (!e.publicado || e.notificado || !e.created_date) return false;
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const created = new Date(e.created_date);
    return created > oneDayAgo;
  }).length;

  // Training schedules data
  const filteredSchedules = (() => {
    if (userRole === "admin") {
      return schedules;
    } else if (userRole === "coach") {
      return schedules.filter(s => s.activo);
    } else {
      return schedules.filter(s => s.activo && myCategories.includes(s.categoria));
    }
  })();

  const schedulesByCategory = filteredSchedules.reduce((acc, schedule) => {
    if (!acc[schedule.categoria]) {
      acc[schedule.categoria] = [];
    }
    acc[schedule.categoria].push(schedule);
    return acc;
  }, {});

  Object.keys(schedulesByCategory).forEach(categoria => {
    schedulesByCategory[categoria].sort((a, b) => DIAS_ORDEN[a.dia_semana] - DIAS_ORDEN[b.dia_semana]);
  });

  const canEditSchedules = userRole === "admin";
  const isParentOrPlayer = userRole === "parent" || userRole === "player";

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Calendario y Horarios</h1>
            {newEventsCount > 0 && !isAdmin && (
              <Badge className="bg-red-500 text-white text-xs">
                <Bell className="w-3 h-3 mr-1" />
                {newEventsCount}
              </Badge>
            )}
          </div>
          <p className="text-slate-600 mt-1 text-sm">Eventos, partidos y horarios de entrenamientos</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="partidos" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Partidos
          </TabsTrigger>
          <TabsTrigger value="jornadas" className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Jornadas
          </TabsTrigger>
          <TabsTrigger value="calendario" className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="horarios" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Horarios
          </TabsTrigger>
        </TabsList>

        {/* PARTIDOS TAB */}
        <TabsContent value="partidos" className="space-y-4 mt-4">
          <UpcomingMatchesSection myCategories={myCategories} />
          <ContactCard />
        </TabsContent>

        {/* JORNADAS TAB */}
        <TabsContent value="jornadas" className="space-y-4 mt-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Calendario de Liga</h2>
            <p className="text-sm text-slate-500 mb-4">Todas las jornadas de tus equipos: resultados y partidos pendientes</p>
          </div>
          <MyLeagueSchedules myCategories={myCategories} isAdmin={isAdmin} />
        </TabsContent>

        {/* CALENDARIO TAB */}
        <TabsContent value="calendario" className="space-y-4 mt-4">
          {/* Calendar controls */}
          <div className="flex flex-wrap items-center justify-between gap-2">
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
            </div>
          </div>

          {/* Filters */}
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

          {/* Calendar content */}
          {eventsLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
            </div>
          ) : viewMode === "agenda" ? (
            <AgendaView 
              items={filteredItems.filter(i => i.type !== 'training')}
              onItemClick={() => {}}
            />
          ) : viewMode === "calendar" ? (
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <h2 className="text-xl lg:text-2xl font-bold text-slate-900 capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h2>
                <Button variant="ghost" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
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
                  const eventsForDay = dayItems.filter(i => i.type === 'event');
                  const callupsForDay = dayItems.filter(i => i.type === 'callup');
                  const matchesForDay = dayItems.filter(i => i.type === 'match');
                  const totalItems = eventsForDay.length + callupsForDay.length + matchesForDay.length;

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
                        {totalItems > 0 && (
                          <div className="flex flex-col gap-1">
                            {callupsForDay.slice(0, 1).map((c, idx) => (
                              <div key={`callup-${idx}`} className="text-[10px] lg:text-xs px-1.5 py-1 rounded bg-blue-600 text-white font-semibold truncate">
                                ⚽ Partido
                              </div>
                            ))}
                            {callupsForDay.length === 0 && matchesForDay.slice(0, 1).map((m, idx) => (
                              <div key={`match-${idx}`} className="text-[10px] lg:text-xs px-1.5 py-1 rounded bg-green-600 text-white font-semibold truncate">
                                ⚽ Partido
                              </div>
                            ))}
                            {eventsForDay.filter(e => e.importante).slice(0, 1).map((e, idx) => (
                              <div key={`important-${idx}`} className="text-[10px] lg:text-xs px-1.5 py-1 rounded bg-red-600 text-white font-semibold truncate">
                                ⭐ {e.titulo.substring(0, 10)}
                              </div>
                            ))}
                            {eventsForDay.filter(e => !e.importante).slice(0, 1).map((e, idx) => (
                              <div key={`event-${idx}`} className="text-[10px] lg:text-xs px-1.5 py-1 rounded bg-orange-600 text-white font-semibold truncate">
                                {e.titulo.substring(0, 10)}
                              </div>
                            ))}
                            {totalItems > 2 && (
                              <div className="text-[10px] lg:text-xs text-slate-500 font-semibold text-center mt-0.5">
                                +{totalItems - 2} más
                              </div>
                            )}
                          </div>
                        )}
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
                            <EventCard event={item} isAdmin={false} />
                          </div>
                        ) : (
                          <Card 
                            key={`${item.type}-${item.id}`} 
                            className={`cursor-pointer hover:shadow-lg transition-shadow ${
                              item.type === 'match' 
                                ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
                                : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
                            }`}
                            onClick={() => handleCardClick(item.date)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <Badge className={item.type === 'match' ? "bg-green-600 text-white" : "bg-blue-600 text-white"}>
                                  {item.type === 'match' ? 'Partido (Fed.)' : 'Partido'}
                                </Badge>
                                <span className="text-xs text-slate-600">
                                  {format(new Date(item.date), "d MMM yyyy", { locale: es })}
                                </span>
                              </div>
                              <h3 className="font-bold text-slate-900 mb-2">{item.titulo || item.title}</h3>
                              <div className="space-y-1 text-sm text-slate-700">
                                <p>⚽ {item.categoria}</p>
                                {item.rival && <p>🆚 {item.rival}</p>}
                                {item.ubicacion && <p>📍 {item.ubicacion}</p>}
                                {item.hora_partido && <p>🕐 {item.hora_partido}</p>}
                                {item.local_visitante && <p>{item.local_visitante === 'Local' ? '🏠 Local' : '✈️ Visitante'}</p>}
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
                          <EventCard key={`past-event-${item.id}`} event={item} isAdmin={false} />
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
        </TabsContent>

        {/* HORARIOS TAB */}
        <TabsContent value="horarios" className="space-y-4 mt-4">
          {/* Header for schedules */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-slate-600">
                {canEditSchedules 
                  ? "Gestiona los horarios de entrenamientos por categoría" 
                  : userRole === "player" 
                    ? `Entrenamientos de ${myCategories[0] || "tu equipo"}`
                    : "Consulta los horarios de entrenamientos de tus jugadores"}
              </p>
            </div>
            {canEditSchedules && (
              <Button
                onClick={() => {
                  setEditingSchedule(null);
                  setShowScheduleForm(!showScheduleForm);
                }}
                className="bg-orange-600 hover:bg-orange-700 shadow-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nuevo Horario
              </Button>
            )}
          </div>

          {/* Location Card */}
          <Card className="border-none shadow-lg bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <MapPin className="w-6 h-6 text-green-700 mt-1" />
                  <div>
                    <p className="text-sm text-green-800 mb-1">📍 Ubicación de Entrenamientos:</p>
                    <p className="text-lg font-bold text-green-900">Campo Municipal de Bustarviejo</p>
                  </div>
                </div>
                <a href={UBICACION_MAPS_URL} target="_blank" rel="noopener noreferrer">
                  <Button className="bg-green-600 hover:bg-green-700 shadow-lg">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver en Google Maps
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Info Alert for Parents/Players */}
          {isParentOrPlayer && (
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>ℹ️ Información:</strong> Aquí puedes ver los horarios de entrenamientos de las categorías en las que participan tus jugadores.
              </AlertDescription>
            </Alert>
          )}

          {/* Players Summary for Parents */}
          {userRole === "parent" && myPlayers.length > 0 && (
            <Card className="border-none shadow-lg bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300">
              <CardHeader>
                <CardTitle className="text-lg text-orange-900">Tus Jugadores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {myPlayers.map(player => (
                    <Badge key={player.id} className="bg-orange-600 text-white">
                      {player.nombre} - {player.deporte}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Schedule Form */}
          <AnimatePresence>
            {showScheduleForm && canEditSchedules && (
              <TrainingScheduleForm
                schedule={editingSchedule}
                onSubmit={handleScheduleSubmit}
                onCancel={() => {
                  setShowScheduleForm(false);
                  setEditingSchedule(null);
                }}
                isSubmitting={createScheduleMutation.isPending || updateScheduleMutation.isPending}
              />
            )}
          </AnimatePresence>

          {/* Schedules by Category */}
          {schedulesLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
            </div>
          ) : (userRole === "parent" || userRole === "player") && myPlayers.length === 0 ? (
            <Card className="border-none shadow-lg bg-white">
              <CardContent className="py-12 text-center">
                <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No tienes jugadores registrados</p>
                <p className="text-sm text-slate-400 mt-2">Registra un jugador para ver sus horarios de entrenamientos</p>
              </CardContent>
            </Card>
          ) : Object.keys(schedulesByCategory).length === 0 ? (
            <Card className="border-none shadow-lg bg-white">
              <CardContent className="py-12 text-center">
                <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No hay horarios disponibles</p>
                <p className="text-sm text-slate-400 mt-2">
                  {canEditSchedules 
                    ? 'Haz clic en "Nuevo Horario" para añadir uno'
                    : 'Los horarios de entrenamientos aún no han sido configurados'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.keys(schedulesByCategory).sort().map(categoria => {
                const playersInCategory = myPlayers.filter(p => p.deporte === categoria);
                
                return (
                  <Card key={categoria} className="border-none shadow-lg bg-white overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b-2 border-orange-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl text-orange-900 flex items-center gap-2 mb-2">
                            <CalendarIcon className="w-5 h-5" />
                            {categoria}
                          </CardTitle>
                          {isParentOrPlayer && playersInCategory.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {playersInCategory.map(player => (
                                <Badge key={player.id} variant="outline" className="text-orange-700 border-orange-300">
                                  {player.nombre}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {schedulesByCategory[categoria].map(schedule => (
                          <div
                            key={schedule.id}
                            className={`border-2 rounded-lg p-4 transition-all ${
                              isParentOrPlayer 
                                ? 'border-orange-200 bg-gradient-to-br from-white to-orange-50 hover:shadow-md'
                                : 'border-slate-200 bg-slate-50 hover:border-orange-300'
                            }`}
                          >
                            {userRole === "player" && (
                              <div className={`h-1 -mt-4 -mx-4 mb-3 bg-gradient-to-r ${DAY_COLORS[schedule.dia_semana]}`}></div>
                            )}
                            
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-orange-600 text-white">
                                  {schedule.dia_semana}
                                </Badge>
                                {!schedule.activo && (
                                  <Badge variant="outline" className="text-slate-500">
                                    Inactivo
                                  </Badge>
                                )}
                              </div>
                              {canEditSchedules && (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleScheduleEdit(schedule)}
                                    className="h-8 w-8 p-0"
                                  >
                                    ✏️
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleScheduleDelete(schedule)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-slate-700">
                                <Clock className="w-5 h-5 text-orange-600" />
                                <span className={isParentOrPlayer ? "font-bold text-lg" : "font-semibold"}>
                                  {schedule.hora_inicio} - {schedule.hora_fin}
                                </span>
                              </div>

                              <a
                                href={UBICACION_MAPS_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-start gap-2 text-slate-600 rounded-lg p-2 border hover:bg-green-100 transition-colors cursor-pointer ${
                                  isParentOrPlayer 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-slate-50 border-slate-200 hover:border-green-300'
                                }`}
                              >
                                <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <span className="text-xs font-medium">{schedule.ubicacion || "Campo Municipal de Bustarviejo"}</span>
                                </div>
                                <ExternalLink className="w-3 h-3 text-green-600 flex-shrink-0" />
                              </a>

                              {schedule.notas && (
                                <div className={`mt-2 pt-2 border-t ${isParentOrPlayer ? 'border-orange-200 bg-blue-50 rounded-lg p-2' : 'border-slate-200'}`}>
                                  <p className={`text-xs ${isParentOrPlayer ? 'text-blue-800' : 'text-slate-600 italic'}`}>
                                    {isParentOrPlayer && <strong>📝 Nota:</strong>} {schedule.notas}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {isParentOrPlayer && <ContactCard />}
        </TabsContent>
      </Tabs>
    </div>
  );
}