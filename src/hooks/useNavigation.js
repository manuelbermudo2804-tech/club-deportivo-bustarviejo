import { useMemo } from "react";
import {
  buildAdminNavigation,
  buildCoachNavigation,
  buildCoordinatorNavigation,
  buildParentNavigation,
  buildPlayerNavigation,
  buildTreasurerNavigation,
  buildMinorNavigation,
} from "../components/layout/navigationItems";

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
}) {
  const navCtx = {
    playersNeedingReview, pendingSignaturesAdmin, pendingInvitations,
    pendingCallupResponses, chatMenuCounts, unreadAnnouncementsCount,
    pendingCallupsCount, pendingSignaturesCount, hasPlayers, loteriaVisible,
    pendingLotteryOrders, pendingMemberRequests, pendingClothingOrders,
    marketNewCount, unresolvedAdminChats, paymentsInReview,
    pendingFeedback,
    programaSociosActivo, isMemberPaid, isPlayer, user, onlyComplementary,
    porraActiva,
  };

  // Each role builds its own menu — memoized with relevant deps
  const adminNav = useMemo(() => buildAdminNavigation(navCtx),
    [playersNeedingReview, pendingSignaturesAdmin, pendingInvitations, pendingCallupResponses, chatMenuCounts, unreadAnnouncementsCount, pendingCallupsCount, pendingSignaturesCount, hasPlayers, loteriaVisible, pendingLotteryOrders, pendingMemberRequests, pendingClothingOrders, marketNewCount, unresolvedAdminChats, paymentsInReview, pendingFeedback]);

  const coachNav = useMemo(() => buildCoachNavigation(navCtx),
    [programaSociosActivo, isMemberPaid, pendingCallupResponses, chatMenuCounts, isPlayer, pendingCallupsCount, pendingSignaturesCount, unreadAnnouncementsCount, hasPlayers, loteriaVisible, marketNewCount, user?.puede_gestionar_firmas, porraActiva]);

  const coordinatorNav = useMemo(() => buildCoordinatorNavigation(navCtx),
    [programaSociosActivo, isMemberPaid, pendingCallupResponses, chatMenuCounts, isPlayer, pendingCallupsCount, pendingSignaturesCount, unreadAnnouncementsCount, hasPlayers, loteriaVisible, marketNewCount, user?.puede_gestionar_firmas, user?.es_entrenador, porraActiva]);

  const parentNav = useMemo(() => buildParentNavigation(navCtx),
    [programaSociosActivo, isMemberPaid, pendingCallupsCount, pendingSignaturesCount, chatMenuCounts, hasPlayers, loteriaVisible, marketNewCount, onlyComplementary, porraActiva]);

  const playerNav = useMemo(() => buildPlayerNavigation(navCtx),
    [programaSociosActivo, isMemberPaid, pendingCallupsCount, pendingSignaturesCount, chatMenuCounts, loteriaVisible, marketNewCount, onlyComplementary, porraActiva]);

  const treasurerNav = useMemo(() => buildTreasurerNavigation(navCtx),
    [programaSociosActivo, isMemberPaid, pendingCallupsCount, pendingSignaturesCount, chatMenuCounts, hasPlayers, loteriaVisible, unreadAnnouncementsCount, marketNewCount, porraActiva]);

  const minorNav = useMemo(() => buildMinorNavigation(navCtx),
    [pendingCallupsCount]);

  // Select the right nav based on role priority
  if (isAdmin) return adminNav;
  if (isMinor) return minorNav;
  if (isCoordinator) return coordinatorNav;
  if (isTreasurer) return treasurerNav;
  if (isCoach) return coachNav;
  if (isPlayer) return playerNav;
  return parentNav;
}