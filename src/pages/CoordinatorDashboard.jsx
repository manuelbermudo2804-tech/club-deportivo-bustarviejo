import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import DashboardButtonSelector from "../components/dashboard/DashboardButtonSelector";
import { ALL_COORDINATOR_BUTTONS, DEFAULT_COORDINATOR_BUTTONS, MIN_BUTTONS, MAX_BUTTONS } from "../components/dashboard/CoordinatorDashboardButtons";
import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ContactCard from "../components/ContactCard";
import { useUnifiedNotifications } from "../components/notifications/useUnifiedNotifications";
import CoordinatorAlertCenter from "../components/dashboard/CoordinatorAlertCenter";
import SocialLinks from "../components/SocialLinks";
import CoordinatorClassificationsMatchesBanner from "../components/dashboard/CoordinatorClassificationsMatchesBanner";
import CaptacionShareBanner from "../components/dashboard/CaptacionShareBanner";
import { useChatNotificationBubbles } from "../components/notifications/useChatNotificationBubbles";


export default function CoordinatorDashboard() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [myCategories, setMyCategories] = useState([]);
  const [hasPlayers, setHasPlayers] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      
      // Verificar que sea coordinador
      if (currentUser.es_coordinador !== true) {
        console.error('❌ Usuario no es coordinador, redirigiendo...');
        window.location.href = createPageUrl('Home');
        return;
      }
      
      setUser(currentUser);
      setMyCategories(currentUser.categorias_coordina || []);
      setHasPlayers(currentUser.tiene_hijos_jugando === true);
    };
    fetchUser();
  }, []);

  // ÚNICA fuente de verdad para TODAS las notificaciones
  const { notifications } = useUnifiedNotifications(user);
  const chatBubbles = useChatNotificationBubbles(user);

  // Contadores de chat eliminados - se recrearán desde cero

  // Fetch data SOLO para stats visuales (NO para contadores de notificaciones)
  const { data: allPlayers = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    enabled: !!user,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-fecha', 200),
    enabled: !!user,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: buttonConfigs = [] } = useQuery({
    queryKey: ['dashboardButtonConfig', user?.email],
    queryFn: async () => {
      const configs = await base44.entities.DashboardButtonConfig.filter({ 
        user_email: user?.email,
        panel_type: "coordinator"
      });
      return configs;
    },
    staleTime: 600000,
    enabled: !!user,
  });

  const userButtonConfig = buttonConfigs[0];

  const saveButtonConfigMutation = useMutation({
    mutationFn: async (selectedButtonIds) => {
      if (userButtonConfig) {
        return await base44.entities.DashboardButtonConfig.update(userButtonConfig.id, {
          selected_buttons: selectedButtonIds
        });
      } else {
        return await base44.entities.DashboardButtonConfig.create({
          user_email: user?.email,
          panel_type: "coordinator",
          selected_buttons: selectedButtonIds
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardButtonConfig'] });
      toast.success("✅ Configuración guardada");
    },
  });

  // Stats globales (SOLO visuales)
  const stats = useMemo(() => {
    const activePlayers = allPlayers.filter(p => p.activo === true);
    const categories = [...new Set(activePlayers.map(p => p.deporte))].filter(Boolean);
    
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingEvents = allEvents.filter(e => {
      const eventDate = new Date(e.fecha);
      return eventDate >= now && eventDate <= in7Days && e.publicado;
    });

    return {
      totalPlayers: activePlayers.length,
      categories: categories.length,
      upcomingEvents: upcomingEvents.length
    };
  }, [allPlayers, allEvents]);



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">

      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        <SocialLinks />
        <CaptacionShareBanner link="https://alta-socio.vercel.app/jugadores.html" />
        
        {/* Header */}


        <div className="text-center lg:text-left">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            🎓 Panel Coordinador Deportivo
          </h1>
          <p className="text-slate-400 text-sm lg:text-base">
            {user?.full_name} - Vista global del club
          </p>
        </div>

        {/* Banner de Chats - FUENTE ÚNICA */}
        <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-purple-900">💬 Mensajes</h3>
                <p className="text-sm text-purple-700">Comunicación con familias y staff</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 lg:gap-2">
              <Link to={createPageUrl("Chatbot")} className="flex-1">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg p-2 text-white hover:scale-105 transition-all shadow-lg relative h-full flex flex-col items-center justify-center min-h-[70px]">
                  <p className="text-base font-bold mb-0.5">🤖</p>
                  <p className="text-xs font-bold text-center">Asistente</p>
                </div>
              </Link>

              <Link to={createPageUrl("CoordinatorChat")} className="flex-1">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-2 text-white hover:scale-105 transition-all shadow-lg relative h-full flex flex-col items-center justify-center min-h-[70px]">
                   {(notifications?.unreadCoordinatorForStaff || 0) > 0 && (
                      <div className="absolute -top-2 -right-2 px-2 py-1 bg-cyan-500 text-white text-xs rounded-lg font-bold animate-pulse shadow-lg border-2 border-white">
                        💬 {notifications.unreadCoordinatorForStaff}
                      </div>
                    )}
                   <p className="text-base font-bold mb-0.5">💬</p>
                   <p className="text-xs font-bold text-center">Familias</p>
                   <p className="text-[9px] text-blue-100 text-center">Coord</p>
                </div>
              </Link>

              {user?.es_entrenador && (
                <Link to={createPageUrl("CoachParentChat")} className="flex-1">
                  <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-2 text-white hover:scale-105 transition-all shadow-lg relative h-full flex flex-col items-center justify-center min-h-[70px]">
                     {(notifications?.unreadCoachForStaff || 0) > 0 && (
                       <div className="absolute -top-2 -right-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-lg font-bold animate-pulse shadow-lg border-2 border-white">
                         ⚽ {notifications.unreadCoachForStaff}
                       </div>
                     )}
                     <p className="text-base font-bold mb-0.5">⚽</p>
                     <p className="text-xs font-bold text-center">Familias</p>
                     <p className="text-[9px] text-red-100 text-center">Entrena</p>
                  </div>
                </Link>
              )}

              <Link to={createPageUrl("StaffChat")} className="flex-1">
                <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg p-2 text-white hover:scale-105 transition-all shadow-lg relative h-full flex flex-col items-center justify-center min-h-[70px]">
                  {(notifications?.unreadStaffMessages || 0) > 0 && (
                    <div className="absolute -top-2 -right-2 px-2 py-1 bg-purple-500 text-white text-xs rounded-lg font-bold animate-pulse shadow-lg border-2 border-white">
                      💼 {notifications.unreadStaffMessages}
                    </div>
                  )}
                  <p className="text-base font-bold mb-0.5">💼</p>
                  <p className="text-xs font-bold text-center">Staff</p>
                  <p className="text-[9px] text-slate-100 text-center">Interno</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Banner Clasificaciones + Partidos - Estilo ParentDashboard */}
        <CoordinatorClassificationsMatchesBanner />

        {/* AlertCenter unificado */}
        <CoordinatorAlertCenter user={user} />

        {/* Botón personalizar */}
        <div className="flex justify-end">
          <DashboardButtonSelector
            allButtons={ALL_COORDINATOR_BUTTONS.filter(b => !b.conditional || (b.conditionKey === "canManageSignatures" && user?.puede_gestionar_firmas))}
            selectedButtonIds={userButtonConfig?.selected_buttons || DEFAULT_COORDINATOR_BUTTONS}
            onSave={(newConfig) => saveButtonConfigMutation.mutate(newConfig)}
            minButtons={MIN_BUTTONS}
            maxButtons={MAX_BUTTONS}
            defaultButtons={DEFAULT_COORDINATOR_BUTTONS}
            panelName="Panel Coordinador"
          />
        </div>

        {/* GRID DE BOTONES CENTRALES */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 stagger-animation">
          {(userButtonConfig?.selected_buttons || DEFAULT_COORDINATOR_BUTTONS)
            .map(id => ALL_COORDINATOR_BUTTONS.find(b => b.id === id))
            .filter(Boolean)
            .filter(b => !b.conditional || (b.conditionKey === "canManageSignatures" && user?.puede_gestionar_firmas))
            .map((item, index) => (
            <Link key={index} to={item.url} className="group">
              <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500 btn-hover-shine">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
                <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl ${item.gradient} opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50`}></div>
                <div className={`absolute top-0 left-0 w-24 h-24 bg-gradient-to-br ${item.gradient} opacity-20 blur-xl transition-opacity duration-300 group-hover:opacity-40`}></div>
                <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                  <div className={`w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce transition-all duration-300`}>
                    <item.icon className="w-6 h-6 lg:w-10 lg:h-10 text-white transition-transform duration-300" />
                  </div>
                  <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">{item.title}</h3>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Stats Footer */}
        <div className="bg-slate-800 rounded-3xl p-4 lg:p-6 shadow-2xl border-2 border-slate-700">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
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
              <div className="text-2xl lg:text-4xl font-bold text-orange-500 mb-1">
                {stats.upcomingEvents}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Eventos 7 días</div>
            </div>
          </div>
        </div>

        <ContactCard />

      </div>
    </div>
  );
}