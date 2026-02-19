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
import AlertCenter from "../components/dashboard/AlertCenter";
import SectionedButtonGrid from "../components/dashboard/SectionedButtonGrid";
import SocialLinks from "../components/SocialLinks";
import CoordinatorClassificationsMatchesBanner from "../components/dashboard/CoordinatorClassificationsMatchesBanner";
import ShareFormButton from "../components/players/ShareFormButton";
import DesktopDashboardHeader from "../components/dashboard/DesktopDashboardHeader";
import DashboardButtonCard from "../components/dashboard/DashboardButtonCard";
import AttendanceRankingWidget from "../components/dashboard/AttendanceRankingWidget";
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

  const coordLocalStorageKey = user?.email ? `dashboard_buttons_coordinator_${user.email}` : null;

  const { data: buttonConfigs = [] } = useQuery({
    queryKey: ['dashboardButtonConfig', user?.email],
    queryFn: async () => {
      const configs = await base44.entities.DashboardButtonConfig.filter({ 
        user_email: user?.email,
        panel_type: "coordinator"
      });
      if (configs[0]?.selected_buttons && coordLocalStorageKey) {
        try { localStorage.setItem(coordLocalStorageKey, JSON.stringify(configs[0].selected_buttons)); } catch(e) {}
      }
      return configs;
    },
    staleTime: 600000,
    enabled: !!user,
  });

  const userButtonConfig = buttonConfigs[0];

  const cachedCoordButtonIds = useMemo(() => {
    if (!coordLocalStorageKey) return null;
    try {
      const cached = localStorage.getItem(coordLocalStorageKey);
      return cached ? JSON.parse(cached) : null;
    } catch(e) { return null; }
  }, [coordLocalStorageKey]);

  const saveButtonConfigMutation = useMutation({
    mutationFn: async (newSelectedIds) => {
      if (coordLocalStorageKey) {
        try { localStorage.setItem(coordLocalStorageKey, JSON.stringify(newSelectedIds)); } catch(e) {}
      }
      if (userButtonConfig) {
        return await base44.entities.DashboardButtonConfig.update(userButtonConfig.id, {
          selected_buttons: newSelectedIds
        });
      } else {
        return await base44.entities.DashboardButtonConfig.create({
          user_email: user?.email,
          panel_type: "coordinator",
          selected_buttons: newSelectedIds
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardButtonConfig'] });
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

        {/* Ranking de asistencia por categoría */}
        <AttendanceRankingWidget highlightCategories={myCategories} />

        {/* AlertCenter - Una barra por rol */}
        <div className="space-y-3">
          {/* Barra COORDINADOR / ENTRENADOR */}
          <div className="rounded-xl border-2 border-cyan-500/30 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-4 py-2">
              <p className="text-white font-bold text-sm flex items-center gap-2">
                🎓 {user?.es_entrenador ? 'Coordinación y Entrenamiento' : 'Tu trabajo de coordinador'}
              </p>
            </div>
            <div className="bg-cyan-950/40 p-3">
              <AlertCenter 
                pendingCallupResponses={notifications?.pendingCallupResponses || 0}
                pendingMatchObservations={notifications?.pendingMatchObservations || 0}
                isCoach={user?.es_entrenador === true}
                isCoordinator={true}
              />
            </div>
          </div>
          {/* Barra PADRE (solo si tiene hijos) */}
          {hasPlayers && (
            <div className="rounded-xl border-2 border-orange-500/30 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-2">
                <p className="text-white font-bold text-sm flex items-center gap-2">👨‍👩‍👧 Tus hijos en el club</p>
              </div>
              <div className="bg-orange-950/40 p-3">
                <AlertCenter 
                  pendingCallups={notifications?.pendingCallups || 0}
                  pendingPayments={notifications?.pendingPayments || 0}
                  paymentsInReview={notifications?.paymentsInReview || 0}
                  overduePayments={notifications?.overduePayments || 0}
                  pendingSignatures={notifications?.pendingSignatures || 0}
                  isParent={true}
                  isCoach={false}
                  userEmail={user?.email}
                />
              </div>
            </div>
          )}
        </div>

        {/* Botón personalizar */}
        <div className="flex justify-end">
          <DashboardButtonSelector
            allButtons={ALL_COORDINATOR_BUTTONS.filter(b => !b.conditional || (b.conditionKey === "canManageSignatures" && user?.puede_gestionar_firmas))}
            selectedButtonIds={userButtonConfig?.selected_buttons || cachedCoordButtonIds || DEFAULT_COORDINATOR_BUTTONS}
            onSave={(newConfig) => saveButtonConfigMutation.mutate(newConfig)}
            minButtons={MIN_BUTTONS}
            maxButtons={MAX_BUTTONS}
            defaultButtons={DEFAULT_COORDINATOR_BUTTONS}
            panelName="Panel Coordinador"
          />
        </div>

        {/* GRID DE BOTONES CENTRALES - Separados por sección */}
        <SectionedButtonGrid
          buttons={(userButtonConfig?.selected_buttons || cachedCoordButtonIds || DEFAULT_COORDINATOR_BUTTONS)
            .map(id => ALL_COORDINATOR_BUTTONS.find(b => b.id === id))
            .filter(Boolean)
            .filter(b => !b.conditional || (b.conditionKey === "canManageSignatures" && user?.puede_gestionar_firmas))
          }
          roleSection="coordinator"
          roleSectionLabel="🎓 Coordinación"
          clubSectionLabel="👨‍👩‍👧 Club y Familia"
        />

        {/* Stats Footer - solo móvil */}
        <div className="lg:hidden bg-slate-800/90 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-slate-700/60">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center bg-slate-700/30 rounded-xl py-2">
              <div className="text-xl font-bold text-blue-400">{stats.totalPlayers}</div>
              <div className="text-slate-500 text-[9px] font-medium uppercase tracking-wider">Jugadores</div>
            </div>
            <div className="text-center bg-slate-700/30 rounded-xl py-2">
              <div className="text-xl font-bold text-green-400">{stats.categories}</div>
              <div className="text-slate-500 text-[9px] font-medium uppercase tracking-wider">Categorías</div>
            </div>
            <div className="text-center bg-slate-700/30 rounded-xl py-2">
              <div className="text-xl font-bold text-orange-400">{stats.upcomingEvents}</div>
              <div className="text-slate-500 text-[9px] font-medium uppercase tracking-wider">Eventos 7d</div>
            </div>
          </div>
        </div>

        <ContactCard />

      </div>
    </div>
  );
}