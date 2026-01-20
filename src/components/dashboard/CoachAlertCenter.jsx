import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import AlertCenter from "./AlertCenter";
import RoleAlertBlock from "./RoleAlertBlock";

export default function CoachAlertCenter({
  // Stats de PADRE
  pendingCallupsParent,
  pendingPaymentsParent,
  paymentsInReviewParent,
  overduePaymentsParent,
  pendingSignaturesParent,
  unreadPrivateMessages,
  unreadCoordinatorMessages,
  unreadAdminMessages,
  hasActiveAdminChat,
  myPlayersSports,
  userEmail,
  
  // Stats de ENTRENADOR
  pendingCallupResponsesCoach,
  pendingMatchObservations,
}) {
  return (
    <Card className="border-2 border-orange-200 bg-white shadow-lg overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col lg:grid lg:grid-cols-2 lg:divide-x divide-orange-200">
          {/* Columna Izquierda - Tareas como Padre */}
          <RoleAlertBlock color="blue" icon="👨‍👩‍👧" title="Mis Tareas como Padre" subtitle="Gestión familiar">
            <AlertCenter 
              pendingCallups={pendingCallupsParent}
              pendingPayments={pendingPaymentsParent}
              paymentsInReview={paymentsInReviewParent}
              overduePayments={overduePaymentsParent}
              pendingSignatures={pendingSignaturesParent}
              unreadPrivateMessages={unreadPrivateMessages}
              unreadCoordinatorMessages={unreadCoordinatorMessages}
              unreadAdminMessages={unreadAdminMessages}
              hasActiveAdminChat={hasActiveAdminChat}
              isAdmin={false}
              isCoach={false}
              isParent={true}
              userEmail={userEmail}
              userSports={myPlayersSports}
            />
          </RoleAlertBlock>

          {/* Columna Derecha - Tareas como Entrenador */}
          <div className="p-4 border-t lg:border-t-0 border-orange-200">
            <RoleAlertBlock color="blue" icon="🏃" title="Mis Tareas como Entrenador" subtitle="Gestión deportiva">
              <AlertCenter 
                pendingCallupResponses={pendingCallupResponsesCoach}
                pendingMatchObservations={pendingMatchObservations}
                isAdmin={false}
                isCoach={true}
                isParent={false}
                userEmail={userEmail}
                userSports={[]}
              />
            </RoleAlertBlock>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}