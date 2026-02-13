import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import DashboardButtonSelector from "../components/dashboard/DashboardButtonSelector";
import { ALL_COORDINATOR_BUTTONS, DEFAULT_COORDINATOR_BUTTONS, MIN_BUTTONS, MAX_BUTTONS } from "../components/dashboard/CoordinatorDashboardButtons";
import { MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ContactCard from "../components/ContactCard";
import { useUnifiedNotifications } from "../components/notifications/useUnifiedNotifications";
import CoordinatorAlertCenter from "../components/dashboard/CoordinatorAlertCenter";
import SocialLinks from "../components/SocialLinks";
import CoordinatorClassificationsMatchesBanner from "../components/dashboard/CoordinatorClassificationsMatchesBanner";
import ShareFormButton from "../components/players/ShareFormButton";
import DesktopDashboardHeader from "../components/dashboard/DesktopDashboardHeader";
import DashboardButtonCard from "../components/dashboard/DashboardButtonCard";
import { Users, Calendar, Bell } from "lucide-react";



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
        <div className="lg:hidden flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SocialLinks />
            <Link to={createPageUrl("Chatbot")}>
              <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800">
                <Sparkles className="w-4 h-4 mr-1" />
                🤖 IA
              </Button>
            </Link>
          </div>
          <ShareFormButton />
        </div>
        
        <div className="lg:hidden text-center">
          <h1 className="text-3xl font-bold text-white mb-2">🎓 Panel Coordinador</h1>
          <p className="text-slate-400 text-sm">{user?.full_name} - Vista global</p>
        </div>

        <DesktopDashboardHeader
          user={user}
          roleName="Coordinador Deportivo"
          roleEmoji="🎓"
          kpis={[
            { icon: Users, label: "Jugadores Activos", value: stats.totalPlayers, color: "from-blue-600 to-blue-700" },
            { icon: Calendar, label: "Categorías", value: stats.categories, color: "from-green-600 to-green-700" },
            { icon: Bell, label: "Eventos 7 días", value: stats.upcomingEvents, color: "from-orange-600 to-orange-700" },
          ]}
        />

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
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4 stagger-animation">
          {(userButtonConfig?.selected_buttons || DEFAULT_COORDINATOR_BUTTONS)
            .map(id => ALL_COORDINATOR_BUTTONS.find(b => b.id === id))
            .filter(Boolean)
            .filter(b => !b.conditional || (b.conditionKey === "canManageSignatures" && user?.puede_gestionar_firmas))
            .map((item, index) => (
            <DashboardButtonCard key={index} item={item} />
          ))}
        </div>

        {/* Stats Footer - solo móvil */}
        <div className="lg:hidden bg-slate-800 rounded-3xl p-4 shadow-2xl border-2 border-slate-700">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500 mb-1">{stats.totalPlayers}</div>
              <div className="text-slate-400 text-[10px]">Jugadores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500 mb-1">{stats.categories}</div>
              <div className="text-slate-400 text-[10px]">Categorías</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500 mb-1">{stats.upcomingEvents}</div>
              <div className="text-slate-400 text-[10px]">Eventos 7d</div>
            </div>
          </div>
        </div>

        <ContactCard />

      </div>
    </div>
  );
}