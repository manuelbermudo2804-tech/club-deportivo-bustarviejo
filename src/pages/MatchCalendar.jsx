import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Download,
  ExternalLink,
  Home,
  Plane,
  Filter
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

// Generar enlace Google Calendar
const generateGoogleCalendarUrl = (match) => {
  const startDate = parseISO(`${match.fecha_partido}T${match.hora_partido || "10:00"}`);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 horas
  
  const formatDate = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `⚽ ${match.titulo || `Partido vs ${match.rival}`}`,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details: `Categoría: ${match.categoria}\nTipo: ${match.local_visitante || 'Partido'}\n${match.descripcion || ''}`,
    location: match.ubicacion || '',
    sf: 'true'
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Generar archivo ICS para Outlook/Apple Calendar
const generateICSFile = (match) => {
  const startDate = parseISO(`${match.fecha_partido}T${match.hora_partido || "10:00"}`);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  
  const formatICSDate = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').slice(0, -1);
  
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CD Bustarviejo//Match Calendar//ES
BEGIN:VEVENT
UID:${match.id}@cdbustarviejo.app
DTSTAMP:${formatICSDate(new Date())}Z
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:⚽ ${match.titulo || `Partido vs ${match.rival}`}
DESCRIPTION:Categoría: ${match.categoria}\\nTipo: ${match.local_visitante || 'Partido'}
LOCATION:${match.ubicacion || ''}
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `partido-${match.fecha_partido}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function MatchCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("calendar"); // calendar, list

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: convocatorias = [], isLoading: loadingConvocatorias } = useQuery({
    queryKey: ['convocatorias'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
    initialData: [],
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['matchEvents'],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list('-fecha');
      return allEvents.filter(e => e.tipo === "Partido");
    },
    initialData: [],
  });

  const { data: players = [] } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => 
        p.email_padre === user?.email || p.email_tutor_2 === user?.email
      );
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const isLoading = loadingConvocatorias || loadingEvents;

  // Combinar convocatorias y eventos de partido
  const allMatches = [
    ...convocatorias.filter(c => c.publicada).map(c => ({
      ...c,
      source: 'convocatoria',
      fecha: c.fecha_partido,
      hora: c.hora_partido
    })),
    ...events.filter(e => e.publicado !== false).map(e => ({
      ...e,
      source: 'event',
      fecha: e.fecha,
      hora: e.hora,
      fecha_partido: e.fecha,
      hora_partido: e.hora,
      rival: e.rival || e.titulo,
      categoria: e.destinatario_categoria || e.categoria
    }))
  ];

  // Categorías únicas
  const categories = [...new Set(allMatches.map(m => m.categoria).filter(Boolean))];
  
  // Categorías de mis jugadores
  const myCategories = [...new Set(players.map(p => p.deporte))];

  // Filtrar partidos
  const filteredMatches = allMatches.filter(m => {
    if (categoryFilter === "all") return true;
    if (categoryFilter === "mine") return myCategories.includes(m.categoria);
    return m.categoria === categoryFilter;
  });

  // Días del mes actual
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Partidos por día
  const getMatchesForDay = (day) => {
    return filteredMatches.filter(m => {
      const matchDate = parseISO(m.fecha_partido || m.fecha);
      return isSameDay(matchDate, day);
    });
  };

  // Partidos próximos (para vista lista)
  const upcomingMatches = filteredMatches
    .filter(m => new Date(m.fecha_partido || m.fecha) >= new Date())
    .sort((a, b) => new Date(a.fecha_partido || a.fecha) - new Date(b.fecha_partido || b.fecha));

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Calendario de Partidos</h1>
            <p className="text-slate-600">Todos los partidos del club</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de categoría */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {myCategories.length > 0 && (
                <SelectItem value="mine">⭐ Mis equipos</SelectItem>
              )}
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Vista */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === "calendar" 
                  ? "bg-green-600 text-white" 
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              📅 Mes
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === "list" 
                  ? "bg-green-600 text-white" 
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              📋 Lista
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : viewMode === "calendar" ? (
        /* Vista Calendario */
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-xl">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="text-white hover:bg-white/20">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-xl font-bold capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: es })}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="text-white hover:bg-white/20">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {/* Cabecera días */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(day => (
                <div key={day} className="text-center text-sm font-semibold text-slate-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 gap-1">
              {/* Espacios vacíos al inicio */}
              {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {daysInMonth.map(day => {
                const dayMatches = getMatchesForDay(day);
                const isToday = isSameDay(day, new Date());
                const isPast = day < new Date() && !isToday;

                return (
                  <div
                    key={day.toString()}
                    className={`aspect-square p-1 rounded-lg border transition-all ${
                      isToday 
                        ? "bg-green-50 border-green-500 ring-2 ring-green-200" 
                        : isPast 
                          ? "bg-slate-50 border-slate-200 opacity-60" 
                          : "bg-white border-slate-200 hover:border-green-300"
                    }`}
                  >
                    <div className="text-xs font-medium text-slate-700 mb-1">
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5 overflow-hidden max-h-[60px]">
                      {dayMatches.slice(0, 2).map((match, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedMatch(match)}
                          className={`w-full text-left px-1 py-0.5 rounded text-[10px] font-medium truncate transition-colors ${
                            match.local_visitante === "Local"
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-orange-100 text-orange-800 hover:bg-orange-200"
                          }`}
                        >
                          {match.hora_partido?.slice(0, 5)} {match.rival?.slice(0, 8)}
                        </button>
                      ))}
                      {dayMatches.length > 2 && (
                        <div className="text-[10px] text-slate-500 text-center">
                          +{dayMatches.length - 2} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Leyenda */}
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-sm text-slate-600">Local</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500"></div>
                <span className="text-sm text-slate-600">Visitante</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Vista Lista */
        <div className="space-y-4">
          {upcomingMatches.length === 0 ? (
            <Card className="border-none shadow-lg">
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No hay partidos próximos</p>
              </CardContent>
            </Card>
          ) : (
            upcomingMatches.map(match => (
              <MatchCard 
                key={match.id} 
                match={match} 
                onSelect={() => setSelectedMatch(match)}
                isMyTeam={myCategories.includes(match.categoria)}
              />
            ))
          )}
        </div>
      )}

      {/* Modal de detalle del partido */}
      <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">⚽</span>
              {selectedMatch?.titulo || `Partido vs ${selectedMatch?.rival}`}
            </DialogTitle>
          </DialogHeader>

          {selectedMatch && (
            <div className="space-y-4">
              {/* Info del partido */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-slate-900">
                      {format(parseISO(selectedMatch.fecha_partido), "EEEE, d 'de' MMMM", { locale: es })}
                    </p>
                    <p className="text-sm text-slate-600 capitalize">
                      {format(parseISO(selectedMatch.fecha_partido), "yyyy")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-slate-900">{selectedMatch.hora_partido || "Por confirmar"}</p>
                    {selectedMatch.hora_concentracion && (
                      <p className="text-sm text-orange-600">Concentración: {selectedMatch.hora_concentracion}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {selectedMatch.local_visitante === "Local" ? (
                    <Home className="w-5 h-5 text-green-600" />
                  ) : (
                    <Plane className="w-5 h-5 text-orange-600" />
                  )}
                  <Badge className={selectedMatch.local_visitante === "Local" ? "bg-green-600" : "bg-orange-600"}>
                    {selectedMatch.local_visitante || "Partido"}
                  </Badge>
                </div>

                {selectedMatch.ubicacion && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-semibold text-slate-900">{selectedMatch.ubicacion}</p>
                      {selectedMatch.enlace_ubicacion && (
                        <a 
                          href={selectedMatch.enlace_ubicacion} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Ver mapa <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-green-600" />
                  <p className="font-semibold text-slate-900">{selectedMatch.categoria}</p>
                </div>
              </div>

              {selectedMatch.descripcion && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm text-slate-700">{selectedMatch.descripcion}</p>
                </div>
              )}

              {/* Botones de exportar */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Añadir a mi calendario:</p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => window.open(generateGoogleCalendarUrl(selectedMatch), '_blank')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" 
                      alt="Google" 
                      className="w-5 h-5 mr-2"
                    />
                    Google
                  </Button>
                  <Button
                    onClick={() => generateICSFile(selectedMatch)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Outlook / Apple
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente de tarjeta de partido
function MatchCard({ match, onSelect, isMyTeam }) {
  const matchDate = parseISO(match.fecha_partido);
  const isLocal = match.local_visitante === "Local";

  return (
    <Card 
      className={`border-none shadow-lg overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:scale-[1.01] ${
        isMyTeam ? "ring-2 ring-green-500" : ""
      }`}
      onClick={onSelect}
    >
      <div className={`h-2 ${isLocal ? "bg-green-500" : "bg-orange-500"}`} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              {isMyTeam && <Badge className="bg-green-600 text-xs">⭐ Mi equipo</Badge>}
              <Badge variant="outline" className="text-xs">{match.categoria}</Badge>
            </div>
            
            <h3 className="font-bold text-lg text-slate-900">
              vs {match.rival || "Rival por confirmar"}
            </h3>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(matchDate, "EEE d MMM", { locale: es })}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {match.hora_partido || "Por confirmar"}
              </div>
              {match.ubicacion && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {match.ubicacion}
                </div>
              )}
            </div>
          </div>

          <div className="text-right">
            <Badge className={`${isLocal ? "bg-green-600" : "bg-orange-600"} text-white`}>
              {isLocal ? "🏠 Local" : "✈️ Visitante"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}