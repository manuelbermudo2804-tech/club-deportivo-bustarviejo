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
  
  console.log('🎓 [CoordinatorAlertCenter] Datos unificados:', {
    hasParentTasks,
    parentCallups: notifications.pendingCallups,
    coordResponses: notifications.pendingCallupResponses,
    coordObs: notifications.pendingMatchObservations,
    familyUnread: notifications.unreadFamilyMessages,
    staffUnread: notifications.unreadStaffMessages,
  });
  
  return (
    <Card className="border-2 border-orange-200 bg-white shadow-lg overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col lg:grid lg:grid-cols-2 lg:divide-x divide-orange-200">
          {/* Columna Izquierda - Tareas como Padre */}
          {hasParentTasks && (
            <RoleAlertBlock color="blue" icon="👨‍👩‍👧" title="Mis Tareas como Padre" subtitle="Gestión familiar">
              <AlertCenter 
                pendingCallups={notifications.pendingCallups || 0}
                pendingPayments={notifications.pendingPayments || 0}
                paymentsInReview={notifications.paymentsInReview || 0}
                overduePayments={notifications.overduePayments || 0}
                pendingSignatures={notifications.pendingSignatures || 0}
                unreadPrivateMessages={0}
                unreadCoordinatorMessages={0}
                unreadCoachMessages={0}
                unreadAdminMessages={0}
                hasActiveAdminChat={false}
                unreadStaffMessages={0}
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
                pendingCallupResponses={notifications.pendingCallupResponses || 0}
                pendingMatchObservations={notifications.pendingMatchObservations || 0}
                unreadCoordinatorMessages={0}
                unreadStaffMessages={0}
                isAdmin={false}
                isCoach={user?.es_entrenador === true}
                isCoordinator={true}
                isParent={false}
                userEmail={user?.email}
                userSports={[]}
              />
            </RoleAlertBlock>

            {user?.es_entrenador === true && (
              <div className="mt-4">
                <RoleAlertBlock color="blue" icon="🏃" title="Mis Tareas como Entrenador" subtitle="Gestión deportiva">
                  <AlertCenter 
                    pendingCallupResponses={notifications.pendingCallupResponses || 0}
                    pendingMatchObservations={notifications.pendingMatchObservations || 0}
                    isAdmin={false}
                    isCoach={true}
                    isCoordinator={false}
                    isParent={false}
                    userEmail={user?.email}
                    userSports={[]}
                  />
                </RoleAlertBlock>
              </div>
            )}

            {user?.es_entrenador === true && (
              <div className="mt-4">
                <RoleAlertBlock color="blue" icon="🏃" title="Mis Tareas como Entrenador" subtitle="Gestión deportiva">
                  <AlertCenter 
                    pendingCallupResponses={notifications.pendingCallupResponses || 0}
                    pendingMatchObservations={notifications.pendingMatchObservations || 0}
                    isAdmin={false}
                    isCoach={true}
                    isCoordinator={false}
                    isParent={false}
                    userEmail={user?.email}
                    userSports={[]}
                  />
                </RoleAlertBlock>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}