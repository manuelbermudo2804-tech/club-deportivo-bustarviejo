import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useUnifiedNotifications } from "./notifications/useUnifiedNotifications";

export default function NotificationBadge() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { notifications } = useUnifiedNotifications(user);

  useEffect(() => {
    if (!user) return;

    const chatTotal =
      (notifications.unreadCoordinatorMessages || 0) +
      (notifications.unreadCoachMessages || 0) +
      (notifications.unreadStaffMessages || 0) +
      (notifications.unreadAdminMessages || 0) +
      (notifications.unreadPrivateMessages || 0) +
      (notifications.unreadFamilyMessages || 0);

    const unreadCount =
      chatTotal +
      (notifications.pendingCallups || 0) +
      (notifications.unreadAnnouncements || 0);

    document.title = unreadCount > 0 ? `(${unreadCount}) CD Bustarviejo` : 'CD Bustarviejo';

    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) navigator.setAppBadge(unreadCount).catch(() => {});
      else navigator.clearAppBadge?.().catch(() => {});
    }

    return () => {
      document.title = 'CD Bustarviejo';
      navigator.clearAppBadge?.().catch(() => {});
    };
  }, [user, notifications]);

  return null;
}