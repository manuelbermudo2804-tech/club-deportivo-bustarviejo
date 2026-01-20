import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import AlertCenter from "./AlertCenter";
import RoleAlertBlock from "./RoleAlertBlock";

export default function TreasurerAlertCenter({
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
  
  // Stats de TESORERO
  paymentsInReviewTreasurer,
  pendingClothingOrders,
  pendingLotteryOrders,
  pendingMemberRequests,
}) {
  return (
    <Card className="border-2 border-orange-200 bg-white shadow-lg overflow-hidden">
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

          {/* Columna Derecha - Tareas como Tesorero */}
          <div className="p-4 border-t lg:border-t-0 border-orange-200">
            <RoleAlertBlock color="green" icon="💰" title="Mis Tareas como Tesorero" subtitle="Gestión financiera">
              <AlertCenter 
                paymentsInReview={paymentsInReviewTreasurer}
                pendingClothingOrders={pendingClothingOrders}
                pendingLotteryOrders={pendingLotteryOrders}
                pendingMemberRequests={pendingMemberRequests}
                isAdmin={false}
                isCoach={false}
                isParent={false}
                isTreasurer={true}
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