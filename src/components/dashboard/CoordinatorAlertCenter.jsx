import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import AlertCenter from "./AlertCenter";
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

  // Contar mensajes de familias no leídos (para coordinador/entrenador)
  const { data: chatMessages = [] } = useQuery({
    queryKey: ['coordinator-chatmessages-count'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date', 500),
    enabled: !!userEmail,
    refetchInterval: 15000,
  });
  const unreadForCoordinatorCount = chatMessages.filter(m => 
    m.tipo === 'padre_a_grupo' && (!m.leido_por || !m.leido_por.some(lp => lp.email === userEmail))
  ).length;

  return (
    <Card className="border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-cyan-50 shadow-lg overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col lg:grid lg:grid-cols-2 lg:divide-x divide-orange-200">
          {/* Columna Izquierda - Tareas como Padre */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg">👨‍👩‍👧</span>
              </div>
              <div>
                <h3 className="font-bold text-blue-900">Mis Tareas como Padre</h3>
                <p className="text-xs text-blue-700">Gestión familiar</p>
              </div>
            </div>
            
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
          </div>

          {/* Columna Derecha - Tareas como Coordinador */}
          <div className="p-4 border-t lg:border-t-0 border-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg">🎓</span>
              </div>
              <div>
                <h3 className="font-bold text-cyan-900">Mis Tareas como Coordinador</h3>
                <p className="text-xs text-cyan-700">Supervisión general</p>
              </div>
            </div>
            
            <AlertCenter 
              pendingCallupResponses={pendingCallupResponsesCoordinator}
              pendingMatchObservations={pendingMatchObservations}
              unreadCoordinatorMessages={unreadForCoordinatorCount}
              isAdmin={false}
              isCoach={meUser?.es_entrenador === true}
              isCoordinator={true}
              isParent={false}
              userEmail={userEmail}
              userSports={[]}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}