import React, { useState, useEffect, useMemo } from "react";
// @ts-ignore
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
import RenewalStatusWidget from "../components/renewals/RenewalStatusWidget";
import AlertCenter from "../components/dashboard/AlertCenter";
import SectionedButtonGrid from "../components/dashboard/SectionedButtonGrid";
import SocialLinks from "../components/SocialLinks";
import { useUnifiedNotifications } from "../components/notifications/useUnifiedNotifications";
import useFamilyAlertExtras from "@/hooks/useFamilyAlertExtras";
import usePendingAttendance from "@/hooks/usePendingAttendance";
const EMPTY = [];

import CoachClassificationsMatchesBanner from "../components/dashboard/CoachClassificationsMatchesBanner";
import BirthdayBanner from "../components/birthday/BirthdayBanner";
import ShareFormButton from "../components/players/ShareFormButton";
import PorraPromoBanner from "../components/porra/PorraPromoBanner";
import MeteoDashboardBanner from "../components/meteo/MeteoDashboardBanner";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { calculatePaymentStats } from "../components/payments/paymentHelpers";
import DesktopDashboardHeader from "../components/dashboard/DesktopDashboardHeader";
import DashboardButtonCard from "../components/dashboard/DashboardButtonCard";
import MainSponsorBadge from "../components/sponsors/MainSponsorBadge";


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


  // Contadores de chat eliminados - se recrearán desde cero

  // Solo jugadores activos de mis categorías
  const { data: allPlayers = [] } = useQuery({
    queryKey: ['coachPlayers', myCategories.join(',')],
    queryFn: async () => {
      if (!myCategories.length) return [];
      // Una sola petición: jugadores cuya categoría principal o adicional sea una de las mías
      return base44.entities.Player.filter({
        activo: true,
        $or: [{ deporte: { $in: myCategories } }, { categorias: { $in: myCategories } }],
      }, '-updated_date', 300);
    },
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    enabled: myCategories.length > 0,
  });

  // Hijos del entrenador (buscados por email aunque el indicador manual esté desactualizado)
  const { data: myParentPlayersDirect = [] } = useQuery({
    queryKey: ['myParentPlayersForCoach', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const [byPadre, byTutor2] = await Promise.all([
        base44.entities.Player.filter({ email_padre: user.email, activo: true }).catch(() => []),
        base44.entities.Player.filter({ email_tutor_2: user.email, activo: true }).catch(() => []),
      ]);
      const map = new Map();
      [...byPadre, ...byTutor2].forEach(p => map.set(p.id, p));
      // Excluir su propia ficha de jugador +18 (no es "hijo")
      const playerId = user?.player_id;
      return Array.from(map.values()).filter(p => p.id !== playerId);
    },
    // Consultar por email aunque el indicador manual esté desactualizado.
    enabled: !!user?.email,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Mostrar tareas familiares si el indicador está marcado o si encontramos hijos vinculados por email.
  const showParentSection = hasPlayers === true || myParentPlayersDirect.length > 0;

  // Solo mis convocatorias activas
  const { data: allCallups = [] } = useQuery({
    queryKey: ['coachCallups', user?.email],
    queryFn: () => base44.entities.Convocatoria.filter({ entrenador_email: user?.email, cerrada: false }, '-fecha_partido', 30),
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    enabled: !!user?.email,
  });

  // Convocatorias de los equipos de MIS HIJOS (pueden ser de otro entrenador)
  const childIdsKey = myParentPlayersDirect.map(p => p.id).join(',');
  const { data: childCallups = [] } = useQuery({
    queryKey: ['coachChildCallups', childIdsKey],
    queryFn: async () => {
      const cats = [...new Set(myParentPlayersDirect.flatMap(p => p.categorias?.length ? p.categorias : [p.deporte]).filter(Boolean))];
      if (!cats.length) return [];
      return base44.entities.Convocatoria.filter({ categoria: { $in: cats }, publicada: true, cerrada: false }, '-fecha_partido', 30);
    },
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
    enabled: myParentPlayersDirect.length > 0,
  });

  // Solo asistencias de mis categorías (últimas 30)
  const { data: allAttendances = [] } = useQuery({
    queryKey: ['coachAttendances', user?.email],
    queryFn: () => base44.entities.Attendance.filter({ entrenador_email: user?.email }, '-fecha', 30),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    enabled: !!user?.email,
  });

  const pendingAttendance = usePendingAttendance(myCategories);

  // Solo pagos de mis hijos (no todo el club)
  const parentPlayerIds = useMemo(() => myParentPlayersDirect.map(p => p.id), [myParentPlayersDirect]);
  const { data: allPayments = [] } = useQuery({
    queryKey: ['coachParentPayments', parentPlayerIds.join(',')],
    queryFn: async () => {
      if (!parentPlayerIds.length) return [];
      return base44.entities.Payment.filter({ jugador_id: { $in: parentPlayerIds }, is_deleted: { $ne: true } }, '-created_date');
    },
    enabled: showParentSection && parentPlayerIds.length > 0,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Season config para mostrar banner de renovaciones cuando el entrenador tambin es padre
  const { data: seasonConfigs = [] } = useQuery({
    queryKey: ['activeSeasonConfigList'],
    queryFn: () => base44.entities.SeasonConfig.filter({ activa: true }),
    staleTime: 10 * 60_000,
    gcTime: 20 * 60_000,
    refetchOnWindowFocus: false,
  });

  const loteriaVisible = useMemo(() => {
    const active = seasonConfigs.find(s => s.activa);
    return active?.loteria_navidad_abierta === true;
  }, [seasonConfigs]);

  // Solo mis conversaciones admin
  const { data: allAdminConvs = [] } = useQuery({
    queryKey: ['coachAdminConvs', user?.email],
    queryFn: () => base44.entities.AdminConversation.filter({ padre_email: user?.email, resuelta: false }),
    enabled: showParentSection && !!user?.email,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
  });

  const coachLocalStorageKey = user?.email ? `dashboard_buttons_coach_${user.email}` : null;

  const { data: buttonConfigs = [] } = useQuery({
    queryKey: ['dashboardButtonConfig', user?.email],
    queryFn: async () => {
      const configs = await base44.entities.DashboardButtonConfig.filter({ 
        user_email: user?.email,
        panel_type: "coach"
      });
      if (configs[0]?.selected_buttons && coachLocalStorageKey) {
        try { localStorage.setItem(coachLocalStorageKey, JSON.stringify(configs[0].selected_buttons)); } catch(e) {}
      }
      return configs;
    },
    staleTime: 600000,
    enabled: !!user,
  });

  const userButtonConfig = buttonConfigs[0];

  const cachedCoachButtonIds = useMemo(() => {
    if (!coachLocalStorageKey) return null;
    try {
      const cached = localStorage.getItem(coachLocalStorageKey);
      return cached ? JSON.parse(cached) : null;
    } catch(e) { return null; }
  }, [coachLocalStorageKey]);

   const saveButtonConfigMutation = useMutation({
    mutationFn: async (newSelectedIds) => {
      if (coachLocalStorageKey) {
        try { localStorage.setItem(coachLocalStorageKey, JSON.stringify(newSelectedIds)); } catch(e) {}
      }
      if (userButtonConfig) {
        return await base44.entities.DashboardButtonConfig.update(userButtonConfig.id, {
          selected_buttons: newSelectedIds
        });
      } else {
        return await base44.entities.DashboardButtonConfig.create({
          user_email: user?.email,
          panel_type: "coach",
          selected_buttons: newSelectedIds
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardButtonConfig'] });
    },
  });

  // Ya vienen filtrados por categoría y activos
  const myPlayers = allPlayers;

  // Próximas convocatorias publicadas (incluye las de hoy), de la más cercana a la más lejana
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const myCallups = useMemo(() => {
    return allCallups
      .filter(c => c.publicada && c.fecha_partido >= todayStr)
      .sort((a, b) => a.fecha_partido.localeCompare(b.fecha_partido));
  }, [allCallups, todayStr]);

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



  // Asistencia promedio — ya vienen filtrados por entrenador_email
  const attendanceAverage = useMemo(() => {
    const myAttendances = allAttendances;
    if (myAttendances.length === 0) return 0;
    
    const totalPresent = myAttendances.reduce((sum, att) => {
      return sum + (att.asistencias || []).filter(a => a.estado === "presente").length;
    }, 0);
    const totalExpected = myAttendances.reduce((sum, att) => sum + (att.asistencias || []).length, 0);
    
    return totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0;
  }, [allAttendances]);

  // Stats como PADRE (si tiene hijos)
  const myParentPlayers = myParentPlayersDirect;

  // Temporada activa y jugadores inactivos pendientes de renovar (como en ParentDashboard)
  const activeSeason = seasonConfigs.find?.(s => s.activa) || null;

  const myPlayersSports = useMemo(() => 
    [...new Set((myParentPlayers || []).map(p => p.deporte))],
    [myParentPlayers]
  );

  const parentStats = useMemo(() => {
    if (!showParentSection) return {};

    const myPlayerIds = myParentPlayers.map(p => p.id);

    const byId = new Map([...allCallups, ...childCallups].map(c => [c.id, c]));
    const myCallups = [...byId.values()].filter(c => {
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

    // Ya vienen filtradas por padre_email + resuelta=false
    const myAdminConv = allAdminConvs[0] || null;
    const hasActiveAdminChat = !!myAdminConv;

    return {
      pendingCallups,
      pendingPayments,
      paymentsInReview,
      overduePayments,
      pendingSignatures,
      hasActiveAdminChat,
    };
  }, [showParentSection, allCallups, childCallups, allPayments, myParentPlayers, allAdminConvs]);

  const familyCallups = useMemo(
    () => [...new Map([...allCallups, ...childCallups].map(c => [c.id, c])).values()],
    [allCallups, childCallups]
  );
  const familyExtras = useFamilyAlertExtras(user, showParentSection ? myParentPlayers : EMPTY, familyCallups);

  const stats = useMemo(() => ({
    myPlayers: myPlayers.length,
    pendingResponses: pendingCallupResponses,
    attendanceAvg: attendanceAverage,
    nextMatch: myCallups.length > 0 ? myCallups[0] : null
  }), [myPlayers, pendingCallupResponses, attendanceAverage, myCallups]);



  const showCoordinatorTile = user?.es_coordinador || user?.role === "admin";



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">

      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        {/* Móvil */}
        <div className="lg:hidden flex items-center gap-1.5 w-full">
          <SocialLinks />
          <Link to={createPageUrl("Chatbot")} className="flex-shrink-0">
            <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 px-2.5">
              <Sparkles className="w-4 h-4 mr-1" />
              IA
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <MainSponsorBadge />
          </div>
          <ShareFormButton />
        </div>
        
        {/* Móvil: header simple */}
        <div className="lg:hidden text-center">
          <h1 className="text-3xl font-bold text-white mb-2">🏃 Panel Entrenador</h1>
          <p className="text-slate-400 text-sm">{user?.full_name} {myCategories.length > 0 && `• ${myCategories.join(", ")}`}</p>
        </div>

        {/* Desktop: header mejorado con KPIs */}
        <DesktopDashboardHeader
          user={user}
          roleName="Panel Entrenador"
          roleEmoji="🏃"
          subtitle={myCategories.join(", ")}
          kpis={[
            { icon: Users, label: "Mi Plantilla", value: stats.myPlayers, color: "from-blue-600 to-blue-700" },
            { icon: TrendingUp, label: "Asistencia Media", value: `${stats.attendanceAvg}%`, color: "from-green-600 to-green-700" },
            { icon: Bell, label: "Respuestas Pendientes", value: stats.pendingResponses, color: "from-yellow-600 to-yellow-700", sub: stats.pendingResponses > 0 ? "por confirmar" : null },
            { icon: Calendar, label: "Próximo Partido", value: stats.nextMatch ? format(new Date(stats.nextMatch.fecha_partido), "d MMM", { locale: es }) : "-", color: "from-orange-600 to-orange-700" },
          ]}
        />

        {/* Estado de renovaciones (progreso) */}
        {showParentSection && activeSeason?.permitir_renovaciones && myParentPlayers.length > 0 && myParentPlayers.some(p => p.estado_renovacion === "pendiente" && p.temporada_renovacion === activeSeason?.temporada) && (
          <RenewalStatusWidget 
            players={myParentPlayers} 
            payments={allPayments}
            seasonConfig={activeSeason}
          />
        )}

        {/* Cumpleaños de jugadores de mi equipo */}
        {myPlayers.length > 0 && (
          <BirthdayBanner players={myPlayers} myPlayerIds={[]} mode="coach" />
        )}

        {/* Partidos y clasificaciones de mis equipos */}
        <CoachClassificationsMatchesBanner myCategories={myCategories} />

        {/* AlertCenter - Una sola barra unificada */}
        {showParentSection ? (
          <div className="space-y-3">
            {/* Barra ENTRENADOR */}
            <div className="rounded-xl border-2 border-blue-500/30 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2">
                <p className="text-white font-bold text-sm flex items-center gap-2">🏋️ Tu trabajo de entrenador</p>
              </div>
              <div className="bg-blue-950/40 p-3">
                <AlertCenter 
                  pendingCallupResponses={pendingCallupResponses}
                  pendingAttendance={pendingAttendance}
                  isCoach={true}
                />
              </div>
            </div>
            {/* Barra PADRE/JUGADOR */}
            <div className="rounded-xl border-2 border-orange-500/30 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-2">
                <p className="text-white font-bold text-sm flex items-center gap-2">
                  {hasPlayers ? '👨‍👩‍👧 Tus hijos en el club' : user?.es_jugador ? '⚽ Tu ficha de jugador' : '👨‍👩‍👧 Tu vida en el club'}
                </p>
              </div>
              <div className="bg-orange-950/40 p-3">
                <AlertCenter 
                  pendingCallups={parentStats.pendingCallups}
                  pendingPayments={parentStats.pendingPayments}
                  paymentsInReview={parentStats.paymentsInReview}
                  overduePayments={parentStats.overduePayments}
                  pendingSignatures={notifications?.pendingSignatures || parentStats.pendingSignatures}
                  hasActiveAdminChat={notifications?.hasActiveAdminConversation || parentStats.hasActiveAdminChat}
                  pendingDocuments={familyExtras.pendingDocuments}
                  pendingSurveys={familyExtras.pendingSurveys}
                  pendingCitasRM={familyExtras.pendingCitasRM}
                  rmNuevos={familyExtras.rmNuevos}
                  rmVencen={familyExtras.rmVencen}
                  weekAgenda={familyExtras.weekAgenda}
                  unreadCoordinatorMessages={notifications?.unreadCoordinatorMessages || 0}
                  unreadPrivateMessages={notifications?.unreadPrivateMessages || 0}
                  unreadAdminMessages={notifications?.unreadAdminMessages || 0}
                  isParent={true}
                  isCoach={false}
                  userEmail={user?.email}
                  userSports={myPlayersSports}
                />
              </div>
            </div>
          </div>
        ) : (
          <AlertCenter 
            pendingCallupResponses={pendingCallupResponses}
            pendingAttendance={pendingAttendance}
            isCoach={true}
          />
        )}

        {/* Banner Porra (como en el panel de familias) */}
        <PorraPromoBanner />

        {/* Botón personalizar */}
        <div className="flex justify-end">
          <DashboardButtonSelector
            allButtons={ALL_COACH_BUTTONS.filter(b => {
              if (!b.conditional) return true;
              if (b.conditionKey === "canManageSignatures") return user?.puede_gestionar_firmas;
              if (b.conditionKey === "hasPlayers") return showParentSection;
              if (b.conditionKey === "isPlayer") return user?.es_jugador === true;
              if (b.conditionKey === "loteriaVisible") return loteriaVisible;
              return true;
            })}
            selectedButtonIds={userButtonConfig?.selected_buttons || cachedCoachButtonIds || DEFAULT_COACH_BUTTONS}
            onSave={(newConfig) => saveButtonConfigMutation.mutate(newConfig)}
            minButtons={MIN_BUTTONS}
            maxButtons={MAX_BUTTONS}
            defaultButtons={DEFAULT_COACH_BUTTONS}
            panelName="Panel Entrenador"
          />
        </div>

        {/* GRID DE BOTONES CENTRALES - Separados por sección */}
        <SectionedButtonGrid
          buttons={(userButtonConfig?.selected_buttons || cachedCoachButtonIds || DEFAULT_COACH_BUTTONS)
            .map(id => ALL_COACH_BUTTONS.find(b => b.id === id))
            .filter(Boolean)
            .filter(b => {
              if (!b.conditional) return true;
              if (b.conditionKey === "canManageSignatures") return user?.puede_gestionar_firmas;
              if (b.conditionKey === "hasPlayers") return showParentSection;
              if (b.conditionKey === "isPlayer") return user?.es_jugador === true;
              if (b.conditionKey === "loteriaVisible") return loteriaVisible;
              return true;
            })
          }
          roleSection="coach"
          roleSectionLabel="🏋️ Entrenador"
          clubSectionLabel="👨‍👩‍👧 Club y Familia"
          badgeMap={{}}
        />

        {/* Stats KPIs - solo móvil (compacto) */}
        <div className="lg:hidden grid grid-cols-4 gap-1.5">
          {[
            { value: stats.myPlayers, label: "Plantilla", color: "text-blue-400" },
            { value: `${stats.attendanceAvg}%`, label: "Asistencia", color: "text-green-400" },
            { value: stats.pendingResponses, label: "Respuestas", color: "text-yellow-400" },
            { value: stats.nextMatch ? format(new Date(stats.nextMatch.fecha_partido), "d MMM", { locale: es }) : "-", label: "Partido", color: "text-orange-400" },
          ].map((kpi, i) => (
            <div key={i} className="text-center bg-slate-800/60 rounded-xl py-2 border border-slate-700/40">
              <div className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-slate-500 text-[8px] font-medium uppercase tracking-wider">{kpi.label}</div>
            </div>
          ))}
        </div>

        <ContactCard />

      </div>
    </div>
  );
}