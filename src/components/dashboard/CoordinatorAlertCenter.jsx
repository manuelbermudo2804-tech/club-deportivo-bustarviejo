import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import AlertCenter from "./AlertCenter";
import RoleAlertBlock from "./RoleAlertBlock";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function CoordinatorAlertCenter({
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
  
  // Stats de COORDINADOR
  pendingCallupResponsesCoordinator,
  pendingMatchObservations,
  unreadFamilyMessages,
}) {
  // Usuario actual (para saber si también es entrenador)
  const { data: meUser } = useQuery({ queryKey: ['me-coordinator-alertcenter'], queryFn: () => base44.auth.me() });


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

          {/* Columna Derecha - Tareas como Coordinador */}
          <div className="p-4 border-t lg:border-t-0 border-orange-200">
            <RoleAlertBlock color="cyan" icon="🎓" title="Mis Tareas como Coordinador" subtitle="Supervisión general">
              <AlertCenter 
                pendingCallupResponses={pendingCallupResponsesCoordinator}
                pendingMatchObservations={pendingMatchObservations}
                isAdmin={false}
                isCoach={meUser?.es_entrenador === true}
                isCoordinator={true}
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