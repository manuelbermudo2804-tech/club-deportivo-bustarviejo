import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import DashboardButtonSelector from "../components/dashboard/DashboardButtonSelector";
import { ALL_COACH_BUTTONS, DEFAULT_COACH_BUTTONS, MIN_BUTTONS, MAX_BUTTONS } from "../components/dashboard/CoachDashboardButtons";

import { 
  Users, 
  Trophy,
  MessageCircle,
  Sparkles,
  Bell,
  AlertCircle,
  TrendingUp,
  Image,
  FileText,
  Calendar,
  Megaphone,
  Clock
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ContactCard from "../components/ContactCard";
import MiniKPIBanner from "../components/dashboard/MiniKPIBanner";
import RenewalStatusWidget from "../components/renewals/RenewalStatusWidget";
import AlertCenter from "../components/dashboard/AlertCenter";
import CoachAlertCenter from "../components/dashboard/CoachAlertCenter";
import SocialLinks from "../components/SocialLinks";
import { useUnifiedNotifications } from "../components/notifications/useUnifiedNotifications";
import CoachClassificationsMatchesBanner from "../components/dashboard/CoachClassificationsMatchesBanner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { calculatePaymentStats } from "../components/payments/paymentHelpers";
import PendingTasksBar from "../components/notifications/PendingTasksBar";

export default function CoachDashboard() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [myCategories, setMyCategories] = useState([]);
  const [hasPlayers, setHasPlayers] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setMyCategories(currentUser.categorias_entrena || []);
      setHasPlayers(currentUser.tiene_hijos_jugando === true);
    };
    fetchUser();
  }, []);

  const { notifications } = useUnifiedNotifications(user);

  // Debounced display counts to avoid initial flicker while data hydrates
  const [displayFamilyUnread, setDisplayFamilyUnread] = useState(0);
  const [displayStaffUnread, setDisplayStaffUnread] = useState(0);
  const [displayCoordUnread, setDisplayCoordUnread] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDisplayFamilyUnread(notifications?.unreadFamilyMessages || 0), 300);
    return () => clearTimeout(t);
  }, [notifications?.unreadFamilyMessages]);

  useEffect(() => {
    const t = setTimeout(() => setDisplayStaffUnread(notifications?.unreadStaffMessages || 0), 300);
    return () => clearTimeout(t);
  }, [notifications?.unreadStaffMessages]);

  useEffect(() => {
    const t = setTimeout(() => setDisplayCoordUnread(notifications?.unreadCoordinatorMessages || 0), 300);
    return () => clearTimeout(t);
  }, [notifications?.unreadCoordinatorMessages]);

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: allCallups = [] } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
  });

  const { data: allStandings = [] } = useQuery({
    queryKey: ['standings'],
    queryFn: () => base44.entities.Clasificacion.list('-jornada', 200),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
  });

  const { data: allAttendances = [] } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list(),
  });

  const { data: allMatchObservations = [] } = useQuery({
    queryKey: ['matchObservations'],
    queryFn: () => base44.entities.MatchObservation.list(),
  });

  const { data: allPayments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
    enabled: hasPlayers,
  });

  // Season config para mostrar banner de renovaciones cuando el entrenador tambin es padre
  const { data: seasonConfigs = [] } = useQuery({
    queryKey: ['seasonConfigs'],
    queryFn: () => base44.entities.SeasonConfig.list(),
    staleTime: 600000,
    enabled: hasPlayers,
  });

  // (legacy) conversations queries not needed for badge counters (using unified)
  const { data: allCoordinatorConvs = [] } = useQuery({
    queryKey: ['coordinatorConversations'],
    queryFn: () => base44.entities.CoordinatorConversation.list(),
    enabled: false,
  });

  const { data: allCoachConvs = [] } = useQuery({
    queryKey: ['coachConversations'],
    queryFn: () => base44.entities.CoachConversation.list(),
    enabled: false,
  });

  const { data: allAdminConvs = [] } = useQuery({
    queryKey: ['adminConversations'],
    queryFn: () => base44.entities.AdminConversation.list(),
    enabled: hasPlayers,
  });

  const { data: buttonConfigs = [] } = useQuery({
    queryKey: ['dashboardButtonConfig', user?.email],
    queryFn: async () => {
      const configs = await base44.entities.DashboardButtonConfig.filter({ 
        user_email: user?.email,
        panel_type: "coach"
      });
      return configs;
    },
    staleTime: 600000,
    enabled: !!user,
  });

  const userButtonConfig = buttonConfigs[0];

  // Unread counters for badges in Mensajes tiles (centralized)
  const unreadFamiliesForCoach = notifications?.unreadFamilyMessages || 0;
  const unreadCoordinatorAsCoord = notifications?.unreadCoordinatorMessages || 0;

  const { data: staffConversationCoach } = useQuery({
    queryKey: ['staffConversationCoach'],
    queryFn: async () => {
      const convs = await base44.entities.StaffConversation.filter({ categoria: 'General' });
      return convs[0] || null;
    },
    enabled: !!user,
  });

  const { data: staffMessagesCoach = [] } = useQuery({
    queryKey: ['staffMessagesCoach', staffConversationCoach?.id],
    queryFn: async () => {
      if (!staffConversationCoach?.id) return [];
      return await base44.entities.StaffMessage.filter({ conversacion_id: staffConversationCoach.id }, 'created_date');
    },
    enabled: !!user && !!staffConversationCoach?.id,
  });

  const unreadStaffMessages = useMemo(() => {
    return (staffMessagesCoach || []).filter(m =>
      m.autor_email !== user?.email && !(m.leido_por || []).some(l => l.email === user?.email)
    ).length;
  }, [staffMessagesCoach, user?.email]);

   const saveButtonConfigMutation = useMutation({
    mutationFn: async (selectedButtonIds) => {
      if (userButtonConfig) {
        return await base44.entities.DashboardButtonConfig.update(userButtonConfig.id, {
          selected_buttons: selectedButtonIds
        });
      } else {
        return await base44.entities.DashboardButtonConfig.create({
          user_email: user?.email,
          panel_type: "coach",
          selected_buttons: selectedButtonIds
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardButtonConfig'] });
      toast.success("✅ Configuración guardada");
    },
  });

  // Filtrar mis datos
  const myPlayers = useMemo(() => 
    allPlayers.filter(p => myCategories.includes(p.deporte) && p.activo),
    [allPlayers, myCategories]
  );

  const myCallups = useMemo(() => {
    const now = new Date();
    return allCallups.filter(c => 
      c.entrenador_email === user?.email && 
      c.publicada && 
      new Date(c.fecha_partido) >= now &&
      !c.cerrada
    );
  }, [allCallups, user?.email]);

  // Convocatorias pendientes de respuesta
  const pendingCallupResponses = useMemo(() => {
    let count = 0;
    myCallups.forEach(callup => {
      callup.jugadores_convocados?.forEach(jugador => {
        if (jugador.confirmacion === "pendiente") count++;
      });
    });
    return count;
  }, [myCallups]);

  // Observaciones post-partido pendientes
  const pendingMatchObservations = useMemo(() => {
    const now = new Date();
    return myCallups.filter(callup => {
      const matchDate = new Date(callup.fecha_partido);
      if (matchDate > now) return false;
      
      // Calcular fin estimado (2h + 15min)
      if (callup.hora_partido) {
        const [hours, minutes] = callup.hora_partido.split(':').map(Number);
        const matchStart = new Date(matchDate);
        matchStart.setHours(hours, minutes, 0, 0);
        const matchEnd = new Date(matchStart.getTime() + 135 * 60000);
        if (now < matchEnd) return false;
      }
      
      // Verificar si ya existe observación
      const hasObservation = allMatchObservations.some(obs =>
        obs.categoria === callup.categoria &&
        obs.rival === callup.rival &&
        obs.fecha_partido === callup.fecha_partido
      );
      return !hasObservation;
    }).length;
  }, [myCallups, allMatchObservations]);

  // Asistencia promedio
  const attendanceAverage = useMemo(() => {
    const myAttendances = allAttendances.filter(a => 
      myCategories.includes(a.categoria) && a.entrenador_email === user?.email
    );
    if (myAttendances.length === 0) return 0;
    
    const totalPresent = myAttendances.reduce((sum, att) => {
      return sum + att.asistencias.filter(a => a.estado === "presente").length;
    }, 0);
    const totalExpected = myAttendances.reduce((sum, att) => sum + att.asistencias.length, 0);
    
    return totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0;
  }, [allAttendances, myCategories, user?.email]);

  // Stats como PADRE (si tiene hijos)
  const myParentPlayers = useMemo(() => 
    hasPlayers ? allPlayers.filter(p => 
      (p.email_padre === user?.email || p.email_tutor_2 === user?.email) && p.activo
    ) : [],
    [hasPlayers, allPlayers, user?.email]
  );

  // Temporada activa y jugadores inactivos pendientes de renovar (como en ParentDashboard)
  const activeSeason = seasonConfigs.find?.(s => s.activa) || null;
  const pendingInactivePlayers = useMemo(() => {
    if (!hasPlayers) return [];
    return allPlayers.filter(p =>
      (p.email_padre === user?.email || p.email_tutor_2 === user?.email) &&
      p.activo === false &&
      p.estado_renovacion === 'pendiente' &&
      (!activeSeason || p.temporada_renovacion === activeSeason.temporada)
    );
  }, [hasPlayers, allPlayers, user?.email, activeSeason]);

  const myPlayersSports = useMemo(() => 
    [...new Set(myParentPlayers.map(p => p.deporte))],
    [myParentPlayers]
  );

  const parentStats = useMemo(() => {
    if (!hasPlayers) return {};

    const myPlayerIds = myParentPlayers.map(p => p.id);

    const myCallups = allCallups.filter(c => {
      return c.jugadores_convocados?.some(j => myPlayerIds.includes(j.jugador_id));
    });

    const pendingCallups = myCallups.filter(c => {
      return c.jugadores_convocados?.some(j => 
        myPlayerIds.includes(j.jugador_id) && j.confirmacion === "pendiente"
      );
    }).length;

    // Usar helper centralizado
    const { pendingPayments, overduePayments, paymentsInReview } = calculatePaymentStats(allPayments, myPlayerIds);

    const pendingSignatures = myParentPlayers.filter(p =>
      (p.enlace_firma_jugador && !p.firma_jugador_completada) ||
      (p.enlace_firma_tutor && !p.firma_tutor_completada)
    ).length;

    const myCoordConv = allCoordinatorConvs.find(c => c.padre_email === user?.email);
    const unreadCoordinator = myCoordConv?.no_leidos_padre || 0;

    const myCoachConv = allCoachConvs.find(c => c.padre_email === user?.email);
    const unreadCoach = myCoachConv?.no_leidos_padre || 0;

    const myAdminConv = allAdminConvs.find(c => c.padre_email === user?.email && !c.resuelta);
    const hasActiveAdminChat = !!myAdminConv;
    const unreadAdmin = myAdminConv?.no_leidos_padre || 0;

    return {
      pendingCallups,
      pendingPayments,
      paymentsInReview,
      overduePayments,
      pendingSignatures,
      unreadCoordinator,
      unreadCoach,
      unreadAdmin,
      hasActiveAdminChat,
    };
  }, [hasPlayers, allCallups, allPayments, myParentPlayers, allCoordinatorConvs, allCoachConvs, allAdminConvs, user?.email]);

  const stats = useMemo(() => ({
    myPlayers: myPlayers.length,
    pendingResponses: pendingCallupResponses,
    attendanceAvg: attendanceAverage,
    nextMatch: myCallups.length > 0 ? myCallups[0] : null
  }), [myPlayers, pendingCallupResponses, attendanceAverage, myCallups]);



  const showCoordinatorTile = user?.es_coordinador || user?.role === "admin";

  console.log('🔍 [CoachDashboard] User data:', { 
    email: user?.email, 
    role: user?.role, 
    es_coordinador: user?.es_coordinador, 
    es_entrenador: user?.es_entrenador 
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <PendingTasksBar notifications={{ 
        ...notifications, 
        role: user?.role, 
        isCoordinator: user?.es_coordinador === true, 
        isCoach: user?.es_entrenador === true 
      }} />
      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        <SocialLinks />
        
        {/* Header */}

        {/* Mini KPIs Staff (Entrenador) */}
        {user && (
          (() => {
            const att30 = attendanceAverage || 0;
            const attTone = att30 >= 80 ? 'green' : att30 >= 65 ? 'amber' : 'red';

            const pending = (notifications?.pendingCallupResponses ?? pendingCallupResponses) || 0;
            const pendingTone = pending === 0 ? 'green' : pending <= 5 ? 'amber' : 'red';

            return (
              <MiniKPIBanner
                className="mt-1"
                items={[
                  { label: 'asistencia 30d', value: `${att30}%`, tone: attTone },
                  { label: 'respuestas conv.', value: pending, tone: pendingTone },
                ]}
              />
            );
          })()
        )}

        <div className="text-center lg:text-left">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            🏃 Panel Entrenador
          </h1>
          <p className="text-slate-400 text-sm lg:text-base">
            {user?.full_name} {myCategories.length > 0 && `• ${myCategories.join(", ")}`}
          </p>
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
            
            <div className={`grid ${showCoordinatorTile ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'} gap-2 auto-rows-fr items-stretch`}>
              <Link to={createPageUrl("Chatbot")}>
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg relative h-full flex flex-col justify-center">
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm font-bold text-center">🤖 Asistente</p>
                  <p className="text-xs text-indigo-100 text-center">Consulta IA</p>
                </div>
              </Link>

              <Link to={createPageUrl("CoachParentChat")} className="relative">
                <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center relative">
                  {displayFamilyUnread > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                      <span className="text-white text-xs font-bold">{displayFamilyUnread}</span>
                    </div>
                  )}
                  <p className="text-sm font-bold text-center">💬 Familias</p>
                  <p className="text-xs text-green-100 text-center">Mi equipo</p>
                </div>
              </Link>

              {(user?.es_coordinador || user?.role === "admin") && (
                <Link to={createPageUrl("CoordinatorChat")} className="relative">
                <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center relative">
                  {displayCoordUnread > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                      <span className="text-white text-xs font-bold">{displayCoordUnread}</span>
                    </div>
                  )}
                  <p className="text-sm font-bold text-center">🏟️ Coordinador</p>
                  <p className="text-xs text-cyan-100 text-center">Consultas</p>
                </div>
              </Link>
              )}

               <Link to={createPageUrl("StaffChat")} className={`${showCoordinatorTile ? '' : 'col-span-2 lg:col-span-1'} relative`}>
                <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center relative">
                  {displayStaffUnread > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                      <span className="text-white text-xs font-bold">{displayStaffUnread}</span>
                    </div>
                  )}
                  <p className="text-sm font-bold text-center">💼 Staff</p>
                  <p className="text-xs text-slate-100 text-center">Interno</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Aviso renovaciones (entrenador que tambin es padre) */}
        {hasPlayers && activeSeason?.permitir_renovaciones && pendingInactivePlayers.length > 0 && (
          <Card className="border-2 border-emerald-300 bg-emerald-50 shadow-lg">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-900">Es hora de renovar tu plaza</p>
                    <p className="text-xs text-emerald-800">Tienes {pendingInactivePlayers.length} jugador(es) pendientes de renovar</p>
                  </div>
                </div>
                <Link to={createPageUrl('ParentPlayers')}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">Renovar ahora</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estado de renovaciones (progreso) */}
        {hasPlayers && activeSeason?.permitir_renovaciones && myParentPlayers.length > 0 && myParentPlayers.some(p => p.estado_renovacion === "pendiente" && p.temporada_renovacion === activeSeason?.temporada) && (
          <RenewalStatusWidget 
            players={myParentPlayers} 
            payments={allPayments}
            seasonConfig={activeSeason}
          />
        )}

        {/* Banner Clasificaciones + Partidos - Estilo ParentDashboard */}
        <CoachClassificationsMatchesBanner myCategories={myCategories} />

        {/* AlertCenter - Dual si tiene hijos, solo entrenador si no */}
        {hasPlayers ? (
          <CoachAlertCenter 
            pendingCallupsParent={parentStats.pendingCallups}
            pendingPaymentsParent={parentStats.pendingPayments}
            paymentsInReviewParent={parentStats.paymentsInReview}
            overduePaymentsParent={parentStats.overduePayments}
            pendingSignaturesParent={parentStats.pendingSignatures}
            unreadPrivateMessages={0}
            unreadCoordinatorMessages={parentStats.unreadCoordinator}
            unreadAdminMessages={parentStats.unreadAdmin}
            hasActiveAdminChat={parentStats.hasActiveAdminChat}
            myPlayersSports={myPlayersSports}
            userEmail={user?.email}
            pendingCallupResponsesCoach={pendingCallupResponses}
            pendingMatchObservations={pendingMatchObservations}
          />
        ) : (
          <AlertCenter 
            pendingCallupResponses={pendingCallupResponses}
            pendingMatchObservations={pendingMatchObservations}
            isCoach={true}
          />
        )}

        {/* Botón personalizar */}
        <div className="flex justify-end">
          <DashboardButtonSelector
            allButtons={ALL_COACH_BUTTONS.filter(b => !b.conditional || (b.conditionKey === "canManageSignatures" && user?.puede_gestionar_firmas))}
            selectedButtonIds={userButtonConfig?.selected_buttons || DEFAULT_COACH_BUTTONS}
            onSave={(newConfig) => saveButtonConfigMutation.mutate(newConfig)}
            minButtons={MIN_BUTTONS}
            maxButtons={MAX_BUTTONS}
            defaultButtons={DEFAULT_COACH_BUTTONS}
            panelName="Panel Entrenador"
          />
        </div>

        {/* GRID DE BOTONES CENTRALES */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 stagger-animation">
          {(userButtonConfig?.selected_buttons || DEFAULT_COACH_BUTTONS)
            .map(id => ALL_COACH_BUTTONS.find(b => b.id === id))
            .filter(Boolean)
            .filter(b => !b.conditional || (b.conditionKey === "canManageSignatures" && user?.puede_gestionar_firmas))
            .map((item, index) => (
            <Link key={index} to={item.url} className="group">
              <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500 btn-hover-shine">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
                <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl ${item.gradient} opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50`}></div>
                <div className={`absolute top-0 left-0 w-24 h-24 bg-gradient-to-br ${item.gradient} opacity-20 blur-xl transition-opacity duration-300 group-hover:opacity-40`}></div>
                {item.id === 'clasificaciones' && pendingMatchObservations > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full px-2 py-1 shadow-lg">
                    {pendingMatchObservations}
                  </div>
                )}
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-blue-500 mb-1">
                {stats.myPlayers}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Mi Plantilla</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-green-500 mb-1">
                {stats.attendanceAvg}%
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Asistencia Media</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-yellow-500 mb-1">
                {stats.pendingResponses}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Respuestas Pendientes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-4xl font-bold text-orange-500 mb-1">
                {stats.nextMatch ? format(new Date(stats.nextMatch.fecha_partido), "d MMM", { locale: es }) : "-"}
              </div>
              <div className="text-slate-400 text-[10px] lg:text-sm">Próximo Partido</div>
            </div>
          </div>
        </div>

        <ContactCard />

      </div>
    </div>
  );
}