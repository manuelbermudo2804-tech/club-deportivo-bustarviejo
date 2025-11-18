import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import VisualNotification from "./VisualNotification";

export default function NotificationManager({ user }) {
  const queryClient = useQueryClient();
  const [displayedNotifications, setDisplayedNotifications] = useState([]);

  const { data: notifications } = useQuery({
    queryKey: ['appNotifications', user?.email],
    queryFn: async () => {
      const all = await base44.entities.AppNotification.list('-created_date');
      return all.filter(n => 
        n.usuario_email === user?.email && 
        !n.vista
      );
    },
    enabled: !!user?.email,
    refetchInterval: 5000,
    initialData: [],
  });

  const markAsViewedMutation = useMutation({
    mutationFn: async (notificationId) => {
      const notification = notifications.find(n => n.id === notificationId);
      if (notification) {
        await base44.entities.AppNotification.update(notificationId, {
          ...notification,
          vista: true,
          fecha_vista: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appNotifications'] });
    }
  });

  useEffect(() => {
    if (notifications.length > 0) {
      // Mostrar solo la primera notificación no vista
      const newNotification = notifications[0];
      if (!displayedNotifications.find(n => n.id === newNotification.id)) {
        setDisplayedNotifications([newNotification]);
      }
    }
  }, [notifications]);

  const handleDismiss = (notificationId) => {
    setDisplayedNotifications(prev => prev.filter(n => n.id !== notificationId));
    markAsViewedMutation.mutate(notificationId);
  };

  return (
    <>
      {displayedNotifications.map(notification => (
        <VisualNotification
          key={notification.id}
          notification={notification}
          onDismiss={handleDismiss}
        />
      ))}
    </>
  );
}