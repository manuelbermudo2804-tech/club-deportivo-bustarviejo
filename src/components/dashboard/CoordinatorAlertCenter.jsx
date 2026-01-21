import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import AlertCenter from "./AlertCenter";
import RoleAlertBlock from "./RoleAlertBlock";
import { useUnifiedNotifications } from "../notifications/useUnifiedNotifications";

export default function CoordinatorAlertCenter({ user }) {
  // ÚNICA fuente de verdad para todas las notificaciones
  const { notifications } = useUnifiedNotifications(user);
  
  console.log('🎓 [CoordinatorAlertCenter] Renderizando con notifications:', notifications);


  const hasParentTasks = user?.tiene_hijos_jugando === true;
  
  // Extraer contadores sanitizados del hook unificado
  const parentPendingCallups = hasParentTasks ? (notifications.pendingCallups || 0) : 0;
  const parentPendingPayments = hasParentTasks ? (notifications.pendingPayments || 0) : 0;
  const parentPaymentsInReview = hasParentTasks ? (notifications.paymentsInReview || 0) : 0;
  const parentOverduePayments = hasParentTasks ? (notifications.overduePayments || 0) : 0;
  const parentPendingSignatures = hasParentTasks ? (notifications.pendingSignatures || 0) : 0;
  const unreadPrivate = hasParentTasks ? (notifications.unreadPrivateMessages || 0) : 0;
  const hasAdminChat = hasParentTasks ? (notifications.hasActiveAdminConversation || false) : false;
  
  const coordPendingResponses = notifications.pendingCallupResponses || 0;
  const coordPendingObservations = notifications.pendingMatchObservations || 0;
  const coordUnreadFamily = notifications.unreadFamilyMessages || 0;
  
  return (
    <Card className="border-2 border-orange-200 bg-white shadow-lg overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col lg:grid lg:grid-cols-2 lg:divide-x divide-orange-200">
          {/* Columna Izquierda - Tareas como Padre */}
          {hasParentTasks && (
            <RoleAlertBlock color="blue" icon="👨‍👩‍👧" title="Mis Tareas como Padre" subtitle="Gestión familiar">
              <AlertCenter 
                pendingCallups={parentPendingCallups}
                pendingPayments={parentPendingPayments}
                paymentsInReview={parentPaymentsInReview}
                overduePayments={parentOverduePayments}
                pendingSignatures={parentPendingSignatures}
                unreadPrivateMessages={unreadPrivate}
                unreadCoordinatorMessages={0}
                unreadAdminMessages={0}
                hasActiveAdminChat={hasAdminChat}
                isAdmin={false}
                isCoach={false}
                isParent={true}
                userEmail={user?.email}
                userSports={[]}
              />
            </RoleAlertBlock>
          )}

          {/* Columna Derecha - Tareas como Coordinador */}
          <div className={`p-4 ${hasParentTasks ? 'border-t lg:border-t-0' : ''} border-orange-200`}>
            <RoleAlertBlock color="cyan" icon="🎓" title="Mis Tareas como Coordinador" subtitle="Supervisión general">
              <AlertCenter 
                pendingCallupResponses={coordPendingResponses}
                pendingMatchObservations={coordPendingObservations}
                unreadCoordinatorMessages={coordUnreadFamily}
                isAdmin={false}
                isCoach={user?.es_entrenador === true}
                isCoordinator={true}
                isParent={false}
                userEmail={user?.email}
                userSports={[]}
              />
            </RoleAlertBlock>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}