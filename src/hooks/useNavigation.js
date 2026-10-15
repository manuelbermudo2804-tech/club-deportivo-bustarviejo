import { useMemo, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  buildAdminNavigation,
  buildCoachNavigation,
  buildCoordinatorNavigation,
  buildParentNavigation,
  buildPlayerNavigation,
  buildTreasurerNavigation,
  buildMinorNavigation,
} from "../components/layout/navigationItems";
import useLandingMenuItems from "./useLandingMenuItems";
import useDorsalPending from "./useDorsalPending";
import { createPageUrl } from "@/utils";

/**
 * Centralizes all navigation-building logic that was spread across Layout.
 * Returns the correct navigation items array for the current user's role.
 */
export default function useNavigation({
  user,
  isAdmin,
  isCoach,
  isCoordinator,
  isTreasurer,
  isPlayer,
  isMinor,
  hasPlayers,
  loteriaVisible,
  isMemberPaid,
  programaSociosActivo,
  onlyComplementary,
  porraActiva,
  // Notification counts
  playersNeedingReview,
  pendingSignaturesAdmin,
  pendingInvitations,
  pendingCallupResponses,
  chatMenuCounts,
  unreadAnnouncementsCount,
  pendingCallupsCount,
  pendingSignaturesCount,
  pendingLotteryOrders,
  pendingMemberRequests,
  pendingClothingOrders,
  marketNewCount,
  unresolvedAdminChats,
  paymentsInReview,
  pendingFeedback,
  volunteerNewCount,
}) {
  // Landings con panel de gestión accesibles para este usuario
  const landingMenuItems = useLandingMenuItems(user, isAdmin);

  // Jugadores activos sin dorsal en la temporada siguiente (solo admin)
  const pendingDorsalCount = useDorsalPending(isAdmin);

  // Contador de incidencias LOPIVI nuevas (solo admin)
  const [pendingLopiviCount, setPendingLopiviCount] = useState(0);
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const load = async () => {
      try {
        const n = await base44.entities.LopiviIncidencia.count({ estado: "nueva" });
        if (!cancelled) setPendingLopiviCount(n);
      } catch {}
    };
    load();
    const interval = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 5 * 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isAdmin]);

  const navCtx = {
    playersNeedingReview, pendingSignaturesAdmin, pendingInvitations,
    pendingCallupResponses, chatMenuCounts, unreadAnnouncementsCount,
    pendingCallupsCount, pendingSignaturesCount, hasPlayers, loteriaVisible,
    pendingLotteryOrders, pendingMemberRequests, pendingClothingOrders,
    marketNewCount, unresolvedAdminChats, paymentsInReview,
    pendingFeedback,
    pendingLopiviCount,
    pendingDorsalCount,
    programaSociosActivo, isMemberPaid, isPlayer, user, onlyComplementary,
    porraActiva,
    landingMenuItems,
  };

  // Each role builds its own menu — memoized with relevant deps
  const adminNav = useMemo(() => buildAdminNavigation(navCtx),
    [playersNeedingReview, pendingSignaturesAdmin, pendingInvitations, pendingCallupResponses, chatMenuCounts, unreadAnnouncementsCount, pendingCallupsCount, pendingSignaturesCount, hasPlayers, loteriaVisible, pendingLotteryOrders, pendingMemberRequests, pendingClothingOrders, marketNewCount, unresolvedAdminChats, paymentsInReview, pendingFeedback, pendingLopiviCount, pendingDorsalCount]);

  const coachNav = useMemo(() => buildCoachNavigation(navCtx),
    [programaSociosActivo, isMemberPaid, pendingCallupResponses, chatMenuCounts, isPlayer, pendingCallupsCount, pendingSignaturesCount, unreadAnnouncementsCount, hasPlayers, loteriaVisible, marketNewCount, user?.puede_gestionar_firmas, porraActiva, landingMenuItems]);

  const coordinatorNav = useMemo(() => buildCoordinatorNavigation(navCtx),
    [programaSociosActivo, isMemberPaid, pendingCallupResponses, chatMenuCounts, isPlayer, pendingCallupsCount, pendingSignaturesCount, unreadAnnouncementsCount, hasPlayers, loteriaVisible, marketNewCount, user?.puede_gestionar_firmas, user?.es_entrenador, porraActiva, landingMenuItems]);

  const parentNav = useMemo(() => buildParentNavigation(navCtx),
    [programaSociosActivo, isMemberPaid, pendingCallupsCount, pendingSignaturesCount, chatMenuCounts, hasPlayers, loteriaVisible, marketNewCount, onlyComplementary, porraActiva, landingMenuItems]);

  const playerNav = useMemo(() => buildPlayerNavigation(navCtx),
    [programaSociosActivo, isMemberPaid, pendingCallupsCount, pendingSignaturesCount, chatMenuCounts, loteriaVisible, marketNewCount, onlyComplementary, porraActiva, landingMenuItems]);

  const treasurerNav = useMemo(() => buildTreasurerNavigation(navCtx),
    [programaSociosActivo, isMemberPaid, pendingCallupsCount, pendingSignaturesCount, chatMenuCounts, hasPlayers, loteriaVisible, unreadAnnouncementsCount, marketNewCount, porraActiva, landingMenuItems]);

  const minorNav = useMemo(() => buildMinorNavigation(navCtx),
    [pendingCallupsCount]);

  // Select the right nav based on role priority
  const nav = isAdmin ? adminNav
    : isMinor ? minorNav
    : isCoordinator ? coordinatorNav
    : isTreasurer ? treasurerNav
    : isCoach ? coachNav
    : isPlayer ? playerNav
    : parentNav;

  // Globito de oportunidades de voluntariado nuevas
  const voluntariadoUrl = createPageUrl("Voluntariado");
  const boardTasksUrl = createPageUrl("BoardTasks");
  return useMemo(() => {
    let items = nav;
    // Los miembros de Junta deben ver el acceso desde cualquier panel, no solo el de administración.
    if (user?.es_junta === true && !isAdmin && !items.some((item) => item.url === boardTasksUrl)) {
      const taskItem = { title: "🗂️ Tareas de la Junta", url: boardTasksUrl, icon: ClipboardList };
      const homeIndex = items.findIndex((item) => item.url === createPageUrl("Home") || item.url === createPageUrl("CoachDashboard") || item.url === createPageUrl("CoordinatorDashboard") || item.url === createPageUrl("TreasurerDashboard"));
      items = [...items];
      items.splice(homeIndex >= 0 ? homeIndex + 1 : 0, 0, taskItem);
    }
    if (volunteerNewCount > 0) {
      items = items.map((item) => item.url === voluntariadoUrl ? { ...item, badge: volunteerNewCount } : item);
    }
    return items;
  }, [nav, volunteerNewCount, user?.es_junta, isAdmin, boardTasksUrl]);
}