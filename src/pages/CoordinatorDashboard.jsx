import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Users, 
  Calendar, 
  Trophy, 
  TrendingUp,
  MessageCircle,
  Sparkles,
  BarChart3,
  Shield
} from "lucide-react";
import StandingsWidget from "../components/standings/StandingsWidget";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CoordinatorDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  // Fetch data
  const { data: allPlayers = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
  });

  const { data: allCallups = [] } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
  });

  const { data: allStandings = [] } = useQuery({
    queryKey: ['standings'],
    queryFn: () => base44.entities.Clasificacion.list(),
  });

  const { data: allCoaches = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.es_entrenador === true);
    },
  });

  // Calcular stats globales
  const stats = useMemo(() => {
    const activePlayers = allPlayers.filter(p => p.activo === true);
    const categories = [...new Set(activePlayers.map(p => p.deporte))].filter(Boolean);
    const coaches = allCoaches.length;
    
    // Próximos eventos (7 días)
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingEvents = allEvents.filter(e => {
      const eventDate = new Date(e.fecha);
      return eventDate >= now && eventDate <= in7Days && e.publicado;
    });

    return {
      totalPlayers: activePlayers.length,
      categories: categories.length,
      coaches,
      upcomingEvents: upcomingEvents.length
    };
  }, [allPlayers, allEvents, allCoaches]);

  // Próximos eventos
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return allEvents
      .filter(e => new Date(e.fecha) >= now && e.publicado)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .slice(0, 5);
  }, [allEvents]);

  // Próximas convocatorias
  const upcomingCallups = useMemo(() => {
    const now = new Date();
    return allCallups
      .filter(c => new Date(c.fecha_partido) >= now && c.publicada)
      .sort((a, b) => new Date(a.fecha_partido) - new Date(b.fecha_partido))
      .slice(0, 5);
  }, [allCallups]);

  // Clasificaciones por categoría
  const standingsByCategory = useMemo(() => {
    const byCategory = {};
    allStandings.forEach(s => {
      if (!byCategory[s.categoria]) {
        byCategory[s.categoria] = [];
      }
      byCategory[s.categoria].push(s);
    });
    
    // Ordenar cada categoría por jornada y posición
    Object.keys(byCategory).forEach(cat => {
      byCategory[cat].sort((a, b) => {
        if (b.jornada !== a.jornada) return b.jornada - a.jornada;
        return a.posicion - b.posicion;
      });
    });
    
    return byCategory;
  }, [allStandings]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        
        {/* Header */}
        <div className="text-center lg:text-left">
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
            🎓 Panel Coordinador Deportivo
          </h1>
          <p className="text-slate-600 text-sm lg:text-base">
            {user?.full_name} - Vista global del club
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg hover:scale-105 transition-transform">
            <CardContent className="p-4 lg:p-6 text-center">
              <Users className="w-10 h-10 lg:w-12 lg:h-12 text-blue-600 mx-auto mb-2" />
              <p className="text-3xl lg:text-4xl font-bold text-blue-700">{stats.totalPlayers}</p>
              <p className="text-xs lg:text-sm text-blue-600 mt-1">Jugadores Activos</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-green-100 shadow-lg hover:scale-105 transition-transform">
            <CardContent className="p-4 lg:p-6 text-center">
              <Shield className="w-10 h-10 lg:w-12 lg:h-12 text-green-600 mx-auto mb-2" />
              <p className="text-3xl lg:text-4xl font-bold text-green-700">{stats.categories}</p>
              <p className="text-xs lg:text-sm text-green-600 mt-1">Categorías Activas</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg hover:scale-105 transition-transform">
            <CardContent className="p-4 lg:p-6 text-center">
              <Users className="w-10 h-10 lg:w-12 lg:h-12 text-purple-600 mx-auto mb-2" />
              <p className="text-3xl lg:text-4xl font-bold text-purple-700">{stats.coaches}</p>
              <p className="text-xs lg:text-sm text-purple-600 mt-1">Entrenadores</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg hover:scale-105 transition-transform">
            <CardContent className="p-4 lg:p-6 text-center">
              <Calendar className="w-10 h-10 lg:w-12 lg:h-12 text-orange-600 mx-auto mb-2" />
              <p className="text-3xl lg:text-4xl font-bold text-orange-700">{stats.upcomingEvents}</p>
              <p className="text-xs lg:text-sm text-orange-600 mt-1">Eventos 7 días</p>
            </CardContent>
          </Card>
        </div>

        {/* Banner de Chats */}
        <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-purple-900">💬 Mensajes</h3>
                <p className="text-xs text-purple-700">Comunicación</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <Link to={createPageUrl("Chatbot")}>
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg relative">
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm font-bold text-center">🤖 Asistente</p>
                  <p className="text-xs text-indigo-100 text-center">Consulta IA</p>
                </div>
              </Link>

              <Link to={createPageUrl("FamilyChats")}>
                <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg">
                  <p className="text-sm font-bold text-center">💬 Familias</p>
                  <p className="text-xs text-green-100 text-center">Todas</p>
                </div>
              </Link>

              <Link to={createPageUrl("CoordinatorChat")}>
                <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg">
                  <p className="text-sm font-bold text-center">🏟️ Coordinador</p>
                  <p className="text-xs text-cyan-100 text-center">Mi chat</p>
                </div>
              </Link>

              <Link to={createPageUrl("StaffChat")}>
                <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg">
                  <p className="text-sm font-bold text-center">💼 Staff</p>
                  <p className="text-xs text-slate-100 text-center">Interno</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Clasificaciones del Club */}
        <Card className="border-2 border-green-300 bg-white shadow-lg">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-lg">🏆 Clasificaciones del Club</h3>
                <p className="text-sm text-slate-600">Todas las categorías</p>
              </div>
            </div>

            {Object.keys(standingsByCategory).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(standingsByCategory).map(([categoria, standings]) => (
                  <div key={categoria}>
                    <StandingsWidget 
                      categoria={categoria}
                      compact={true}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>No hay clasificaciones disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendario Unificado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Próximos Eventos */}
          <Card className="border-2 border-orange-300 bg-white shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-6 h-6 text-orange-600" />
                <h3 className="font-bold text-slate-900">📅 Próximos Eventos</h3>
              </div>

              {upcomingEvents.length > 0 ? (
                <div className="space-y-2">
                  {upcomingEvents.map(event => (
                    <div key={event.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 text-sm">{event.titulo}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            📍 {event.destinatario_categoria || "Todos"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-orange-600">
                            {format(new Date(event.fecha), "d MMM", { locale: es })}
                          </p>
                          {event.hora && (
                            <p className="text-xs text-slate-500">{event.hora}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No hay eventos próximos</p>
              )}
            </CardContent>
          </Card>

          {/* Próximas Convocatorias */}
          <Card className="border-2 border-blue-300 bg-white shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-6 h-6 text-blue-600" />
                <h3 className="font-bold text-slate-900">🎓 Próximas Convocatorias</h3>
              </div>

              {upcomingCallups.length > 0 ? (
                <div className="space-y-2">
                  {upcomingCallups.map(callup => (
                    <div key={callup.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 text-sm">{callup.titulo}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            📍 {callup.categoria}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-blue-600">
                            {format(new Date(callup.fecha_partido), "d MMM", { locale: es })}
                          </p>
                          {callup.hora_partido && (
                            <p className="text-xs text-slate-500">{callup.hora_partido}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No hay convocatorias próximas</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats Footer */}
        <div className="bg-slate-800 rounded-3xl p-4 lg:p-6 shadow-2xl border-2 border-slate-700">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-blue-500 mb-1">
                {stats.totalPlayers}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Jugadores Activos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-green-500 mb-1">
                {stats.categories}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Categorías</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-purple-500 mb-1">
                {stats.coaches}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Entrenadores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-orange-500 mb-1">
                {stats.upcomingEvents}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Eventos Próximos</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}