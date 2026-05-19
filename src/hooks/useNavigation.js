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
import useLandingMenuItems from "./useLandingMenuItems";

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
  // Landings con panel de gestión accesibles para este usuario
  const landingMenuItems = useLandingMenuItems(user, isAdmin);

  const navCtx = {
    playersNeedingReview, pendingSignaturesAdmin, pendingInvitations,
    pendingCallupResponses, chatMenuCounts, unreadAnnouncementsCount,
    pendingCallupsCount, pendingSignaturesCount, hasPlayers, loteriaVisible,
    pendingLotteryOrders, pendingMemberRequests, pendingClothingOrders,
    marketNewCount, unresolvedAdminChats, paymentsInReview,
    pendingFeedback,
    programaSociosActivo, isMemberPaid, isPlayer, user, onlyComplementary,
    porraActiva,
    landingMenuItems,
  };

  // Each role builds its own menu — memoized with relevant deps
  const adminNav = useMemo(() => buildAdminNavigation(navCtx),
    [playersNeedingReview, pendingSignaturesAdmin, pendingInvitations, pendingCallupResponses, chatMenuCounts, unreadAnnouncementsCount, pendingCallupsCount, pendingSignaturesCount, hasPlayers, loteriaVisible, pendingLotteryOrders, pendingMemberRequests, pendingClothingOrders, marketNewCount, unresolvedAdminChats, paymentsInReview, pendingFeedback]);

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
  if (isAdmin) return adminNav;
  if (isMinor) return minorNav;
  if (isCoordinator) return coordinatorNav;
  if (isTreasurer) return treasurerNav;
  if (isCoach) return coachNav;
  if (isPlayer) return playerNav;
  return parentNav;
}