import React, { Suspense } from "react";

const RegistrationTypeSelector = React.lazy(() => import("../players/RegistrationTypeSelector"));
const WelcomeScreen = React.lazy(() => import("../WelcomeScreen"));
const MinorOnboarding = React.lazy(() => import("../minor/MinorOnboarding"));
const AccessCodeVerification = React.lazy(() => import("../access/AccessCodeVerification"));

export default function OnboardingController({
  onboardingView,
  user,
  minorPlayerData,
}) {
  const renderOnboarding = () => {
    switch (onboardingView) {
      case 'access_code':
        return (
          <Suspense fallback={null}>
            <AccessCodeVerification
              user={user}
              onSuccess={(data) => {
                window.location.reload();
              }}
            />
          </Suspense>
        );
      case 'selector':
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
            <Suspense fallback={null}>
              <RegistrationTypeSelector
                onSelectFamily={async () => {
                  localStorage.setItem('installPromptAfterOnboarding', 'true');
                  localStorage.setItem('hasSeenWelcome', 'true');
                  // Nota: updateMe debe estar disponible en el contexto del usuario
                  window.location.reload();
                }}
                onSelectAdultPlayer={async () => {
                  localStorage.setItem('installPromptAfterOnboarding', 'true');
                  localStorage.setItem('hasSeenWelcome', 'true');
                  window.location.reload();
                }}
                onSelectSecondParent={async () => {
                  localStorage.setItem('installPromptAfterOnboarding', 'true');
                  localStorage.setItem('hasSeenWelcome', 'true');
                  window.location.reload();
                }}
              />
            </Suspense>
          </div>
        );
      case 'minor_onboarding':
        return (
          <Suspense fallback={null}>
            <MinorOnboarding
              playerName={minorPlayerData?.nombre}
              parentName={minorPlayerData?.nombre_tutor_legal || minorPlayerData?.email_padre}
              onComplete={() => {
                localStorage.setItem('hasSeenWelcome', 'true');
                window.location.reload();
              }}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  return renderOnboarding();
}