import React, { useEffect } from 'react';
import { useUnifiedNotifications } from './notifications/useUnifiedNotifications';

export default function AppBadgeManager({ user }) {
  const { notifications } = useUnifiedNotifications(user);

  useEffect(() => {
    if (!user || !('setAppBadge' in navigator)) return;

    // Calcular total de notificaciones sin leer
    const totalBadge = (
      (notifications.pendingCallups || 0) +
      (notifications.pendingSignatures || 0) +
      (notifications.pendingCallupResponses || 0) +
      (notifications.unreadAnnouncements || 0) +
      (notifications.pendingMatchObservations || 0) +
      (notifications.unresolvedAdminChats || 0) +
      (notifications.paymentsInReview || 0) +
      (notifications.playersNeedingReview || 0) +
      (notifications.pendingInvitations || 0) +
      (notifications.pendingClothingOrders || 0) +
      (notifications.pendingLotteryOrders || 0) +
      (notifications.pendingMemberRequests || 0)
    );

    // Actualizar badge del icono
    if (totalBadge > 0) {
      navigator.setAppBadge(totalBadge);
    } else {
      navigator.clearAppBadge();
    }

    // Cleanup al desmontar
    return () => {
      navigator.clearAppBadge();
    };
  }, [notifications, user]);

  return null; // Este componente solo maneja el badge, no renderiza UI
}