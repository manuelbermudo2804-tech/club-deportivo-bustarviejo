import React, { Suspense } from "react";
import NotificationBadge from "../NotificationBadge";
import SessionManager from "../SessionManager";
import PlanPaymentReminders from "../reminders/PlanPaymentReminders";
import AutomaticRenewalReminders from "../reminders/AutomaticRenewalReminders";
import AutomaticRenewalClosure from "../renewals/AutomaticRenewalClosure";
import RenewalNotificationEngine from "../renewals/RenewalNotificationEngine";
import PostRenewalPaymentReminder from "../renewals/PostRenewalPaymentReminder";
import CallupSoundNotifier from "../notifications/CallupSoundNotifier";
import AnnouncementSoundNotifier from "../notifications/AnnouncementSoundNotifier";
import PaymentSoundNotifier from "../notifications/PaymentSoundNotifier";

const PaymentApprovalNotifier = React.lazy(() => import("../payments/PaymentApprovalNotifier"));

export default function EngineLoaders({ user, isAdmin, enginesReady, enginesStage2Ready, enginesStage3Ready, enginesStage4Ready, enginesStage5Ready }) {
  return (
    <>
      {enginesReady && (
        <Suspense fallback={null}>
          <SessionManager />
        </Suspense>
      )}

      {enginesStage2Ready && (
        <Suspense fallback={null}>
          <NotificationBadge />
          <PaymentApprovalNotifier isAdmin={isAdmin} />
        </Suspense>
      )}

      {enginesStage3Ready && (
        <Suspense fallback={null}>
          <PlanPaymentReminders user={user} />
          <AutomaticRenewalReminders />
          <AutomaticRenewalClosure />
        </Suspense>
      )}

      {enginesStage4Ready && (
        <Suspense fallback={null}>
          <RenewalNotificationEngine />
          <PostRenewalPaymentReminder />
        </Suspense>
      )}

      {enginesStage5Ready && (
        <Suspense fallback={null}>
          <CallupSoundNotifier user={user} />
          <AnnouncementSoundNotifier user={user} />
          <PaymentSoundNotifier user={user} />
        </Suspense>
      )}
    </>
  );
}