import React, { Suspense } from "react";

// Stage 1: esencial
const SessionManager = React.lazy(() => import("../SessionManager"));

// Stage 2: notificaciones y pagos
const NotificationBadge = React.lazy(() => import("../NotificationBadge"));
const PaymentApprovalNotifier = React.lazy(() => import("../payments/PaymentApprovalNotifier"));

// Stage 3: recordatorios, renovaciones y sonidos (consolidado)
const PlanPaymentReminders = React.lazy(() => import("../reminders/PlanPaymentReminders"));
const AutomaticRenewalReminders = React.lazy(() => import("../reminders/AutomaticRenewalReminders"));
const AutomaticRenewalClosure = React.lazy(() => import("../renewals/AutomaticRenewalClosure"));
const RenewalNotificationEngine = React.lazy(() => import("../renewals/RenewalNotificationEngine"));
const PostRenewalPaymentReminder = React.lazy(() => import("../renewals/PostRenewalPaymentReminder"));
const CallupSoundNotifier = React.lazy(() => import("../notifications/CallupSoundNotifier"));
const AnnouncementSoundNotifier = React.lazy(() => import("../notifications/AnnouncementSoundNotifier"));
const PaymentSoundNotifier = React.lazy(() => import("../notifications/PaymentSoundNotifier"));

export default function EngineLoaders({ user, isAdmin, enginesReady, enginesStage2Ready, enginesStage3Ready }) {
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
          <RenewalNotificationEngine />
          <PostRenewalPaymentReminder />
          <CallupSoundNotifier user={user} />
          <AnnouncementSoundNotifier user={user} />
          <PaymentSoundNotifier user={user} />
        </Suspense>
      )}
    </>
  );
}