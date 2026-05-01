import React, { useState, useEffect, Suspense, useRef, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useFetchUser } from "./components/layout/useFetchUser";
import useEngineStages from "./hooks/useEngineStages";
import useAppUpdater from "./hooks/useAppUpdater";
import useRateLimit from "./hooks/useRateLimit";
import useMarketBadge from "./hooks/useMarketBadge";
import usePwaDetection from "./hooks/usePwaDetection";
import useStripeReturn from "./hooks/useStripeReturn";
import useChunkRecovery from "./hooks/useChunkRecovery";
import useAppBadge from "./hooks/useAppBadge";


import { Menu, X, Smartphone } from "lucide-react";
import { toast } from "sonner";
import useNavigation from "./hooks/useNavigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import MobileHeader from "./components/layout/MobileHeader";
import EngineLoaders from "./components/layout/EngineLoaders";
import { InstallSuccessOverlayFull, FirstLaunchInviteOverlay, UpdateNotificationBar, PaymentSuccessOverlay, RateLimitBanner } from "./components/layout/LayoutOverlays";
import NotificationCenter from "./components/NotificationCenter";
import MobileBottomBar from "./components/mobile/MobileBottomBar";
import MobileBackButton from "./components/mobile/MobileBackButton";
import PullToRefresh from "./components/mobile/PullToRefresh";
import DeleteAccountDialog from "./components/DeleteAccountDialog";
import FeedbackModal from "./components/feedback/FeedbackModal";
import GlobalErrorHandler from "./components/utils/GlobalErrorHandler";
import ErrorBoundary from "./components/common/ErrorBoundary";

import LanguageSelector from "./components/LanguageSelector";
import { useUnifiedNotifications } from "./components/notifications/useUnifiedNotifications";
import { ChatUnreadProvider } from "./components/chat/ChatUnreadProvider";
import ChatCountsBridge from "./components/chat/ChatCountsBridge";
import { SeasonProvider } from "./components/season/SeasonProvider";
import ActiveBanner from "./components/announcements/ActiveBanner";
import AutoPushSubscriber from "./components/notifications/AutoPushSubscriber";
import PushPermissionBanner from "./components/notifications/PushPermissionBanner";
import SponsorRecruitBanner from "./components/sponsors/SponsorRecruitBanner";
const WelcomeScreen = React.lazy(() => import("./components/WelcomeScreen"));



const OnboardingController = React.lazy(() => import("./components/layout/OnboardingController"));
const InstallInstructionsModal = React.lazy(() => import("./components/layout/InstallInstructionsModal"));
const DesktopSidebar = React.lazy(() => import("./components/layout/DesktopSidebar"));
import { Dialog, DialogContent } from "@/components/ui/dialog";
const MobileMenu = React.lazy(() => import("./components/layout/MobileMenu"));
const AutomaticPaymentReminders = React.lazy(() => import("./components/reminders/AutomaticPaymentReminders"));




// ToastContainer eliminado - causaba spam de notificaciones
const EventReminderEngine = React.lazy(() => import("./components/events/EventReminderEngine"));
const DocumentReminderEngine = React.lazy(() => import("./components/documents/DocumentReminderEngine"));
const SponsorBanner = React.lazy(() => import("./components/sponsors/SponsorBanner"));
import InstallSuccessOverlay from "./components/pwa/InstallSuccessOverlay";



const CLUB_LOGO_URL = `https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg?t=${Date.now()}`;

const getCurrentSeason = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (currentMonth >= 9) {
    return `${currentYear}/${currentYear + 1}`;
  }
  return `${currentYear - 1}/${currentYear}`;
};

const getPeriodType = () => {
  // Bloqueos de temporada desactivados — todos los usuarios acceden normal
  return "active";
};

// Pantallas especiales extraídas a components/layout/SeasonScreens.jsx
import { ClosedSeasonScreen, InscriptionPeriodScreen, VacationPeriodScreen, RestrictedAccessScreen } from "./components/layout/SeasonScreens";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentSeason = getCurrentSeason();
  // Rate limit, chunk recovery, PWA detection — hooks extraídos
  const rateLimited = useRateLimit();
  useChunkRecovery();
  const [onboardingView, setOnboardingView] = useState('loading');

  const {
    user, isAdmin, isCoach, isCoordinator, isTreasurer, isJunta, isPlayer, isMinor, minorPlayerData,
    hasPlayers, playerName, isLoading, showSpecialScreen, activeSeasonConfig, isMemberPaid,
    loteriaVisible, sponsorBannerVisible, onlyComplementary, authChecked, isPublicPageRef,
    executeFetch
  } = useFetchUser(location);
  const clothingStoreUrl = activeSeasonConfig?.tienda_ropa_url || null;
  const merchStoreUrl = activeSeasonConfig?.tienda_merch_url || null;

  // fetchSeasonConfig ya se carga dentro de useFetchUser - solo refrescar al volver a la app
  const fetchSeasonConfig = () => { executeFetch(); };
  
  // SISTEMA UNIFICADO DE NOTIFICACIONES (real-time)
  // Pausa las notificaciones en tiempo real si estamos en rate limit
  const pauseRealtime = rateLimited || window.__BASE44_PAUSE_REALTIME__;
  const { notifications } = useUnifiedNotifications(user, pauseRealtime);
  
  // SISTEMA DE CHATS - estado local sincronizado via ChatCountsBridge dentro del Provider
  // Inicializar desde cache de localStorage para que el badge del icono sea inmediato
  const [chatCounts, setChatCounts] = useState(() => {
    try {
      const cached = localStorage.getItem('chat_unread_counts');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.team_chats) {
          const teamTotal = Object.values(parsed.team_chats || {}).reduce((s, v) => s + (v || 0), 0);
          return { ...parsed, total: teamTotal + (parsed.coordinator || 0) + (parsed.admin || 0) + (parsed.staff || 0) + (parsed.system || 0) };
        }
      }
    } catch {}
    return { team_chats: {}, coordinator: 0, admin: 0, staff: 0, system: 0, total: 0 };
  });
  const teamChatsTotal = Object.values(chatCounts.team_chats || {}).reduce((s, v) => s + v, 0);
  const chatMenuCounts = {
    staffCount: chatCounts.staff || 0,
    coordinatorCount: chatCounts.coordinator || 0,
    coachCount: teamChatsTotal,
    coordinatorForFamilyCount: chatCounts.coordinator || 0,
    coachForFamilyCount: teamChatsTotal,
    systemMessagesCount: chatCounts.system || 0,
    adminCount: chatCounts.admin || 0,
  };
  
  // Mapear a variables legacy para compatibilidad (filtrando ruido para Admin)
  const sanitize = (v) => (isAdmin ? 0 : (v || 0));
  const pendingCallupsCount = sanitize(notifications.pendingCallups);
  const pendingSignaturesCount = sanitize(notifications.pendingSignatures);
  const pendingCallupResponses = sanitize(notifications.pendingCallupResponses);
  const unreadAnnouncementsCount = notifications.unreadAnnouncements || 0;
  // hasActiveAdminConversation eliminado - AdminChat borrado
  const pendingMatchObservations = 0; // Registro post-partido eliminado
  const unresolvedAdminChats = notifications.unresolvedAdminChats || 0;
  const paymentsInReview = notifications.paymentsInReview || 0;
  const playersNeedingReview = notifications.playersNeedingReview || 0;
  const pendingSignaturesAdmin = notifications.pendingSignatures || 0;
  const pendingInvitations = notifications.pendingInvitations || 0;
  const pendingClothingOrders = notifications.pendingClothingOrders || 0;
  const pendingLotteryOrders = notifications.pendingLotteryOrders || 0;
  const pendingMemberRequests = notifications.pendingMemberRequests || 0;

  // Feedback pendiente (sólo admin)
  const [pendingFeedback, setPendingFeedback] = useState(0);
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const load = async () => {
      try {
        const items = await base44.entities.Feedback.filter({ estado: 'nuevo' });
        if (!cancelled) setPendingFeedback(items.length);
      } catch {}
    };
    load();
    const interval = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isAdmin]);

  // Chat counters eliminados - se recrearán desde cero
  // Propagar rol al PendingTasksBar para mantener visible cuando contadores están a 0
  const enrichedNotifications = {
    ...notifications,
    role: user?.role,
    isCoordinator,
    isCoach,
    isPlayer,
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('es');
  const [showMemberCard, setShowMemberCard] = useState(false);
  const [memberCardActive, setMemberCardActive] = useState(false);
  const programaSociosActivo = activeSeasonConfig?.programa_socios_activo || false;
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [showFirstTimeRegistration, setShowFirstTimeRegistration] = useState(false);
  const [showInstallSuccess, setShowInstallSuccess] = useState(false);
  const showPaymentSuccess = useStripeReturn(/* setExtraChargeVisible not needed here — handled in useFetchUser */);
  
  const { showUpdateNotification, hasNewVersion, applyUpdate, BUILD_VERSION } = useAppUpdater();
  // Mercadillo badge
  const { marketCount, marketNewCount } = useMarketBadge(location.pathname);

  // Badge numérico en el icono de la PWA (Android/Desktop)
  const badgeTotal = (pendingCallupsCount || 0) + (unreadAnnouncementsCount || 0) + (pendingSignaturesCount || 0) + (chatCounts.total || 0) + (pendingCallupResponses || 0);
  useAppBadge(badgeTotal);

  const [installContext, setInstallContext] = useState('manual');

  const { isAppInstalled, showFirstLaunchInvite, setShowFirstLaunchInvite, markInstalled, dismissFirstLaunch } = usePwaDetection(user);
  const { enginesReady, enginesStage2Ready, enginesStage3Ready } = useEngineStages(isLoading, user);

  const [showWelcome, setShowWelcome] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  // Forzar nombre consistente de la app (iOS usa <title> y meta tags)
  useEffect(() => {
    const appName = 'CD Bustarviejo';
    try {
      if (typeof document !== 'undefined') {
        if (document.title !== appName) document.title = appName;
        const ensureMeta = (name, content) => {
          let tag = document.querySelector(`meta[name="${name}"]`);
          if (!tag) {
            tag = document.createElement('meta');
            tag.setAttribute('name', name);
            document.head.appendChild(tag);
          }
          tag.setAttribute('content', content);
        };
        ensureMeta('application-name', appName);
        ensureMeta('apple-mobile-web-app-title', appName);
      }
    } catch {}
  }, []);

  // Modo silencioso por mantenimiento (pausa notificaciones/polling ruidoso)
  // maintenance mode removed
  
  const [installDismissed, setInstallDismissed] = useState(false);
  // isIOS/isAndroid definidos arriba para evitar TDZ
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

      // Detección de PWA gestionada por usePwaDetection hook

        // Modo silencioso por mantenimiento eliminado

        // Temporizador de mantenimiento eliminado

      // Recordatorios de instalación COMPLETAMENTE DESACTIVADOS
      // Los usuarios pueden ver las instrucciones manualmente desde el menú lateral

  const handleLanguageChange = (newLang) => {
    setCurrentLang(newLang);
    localStorage.setItem('appLanguage', newLang);
  };

  // Cargar idioma desde localStorage después del montaje
  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage');
    if (savedLang) setCurrentLang(savedLang);
  }, []);

    // Actualizaciones y detección de nuevas versiones gestionadas por useAppUpdater hook

    // Rate limit gestionado por useRateLimit hook

    // Configuración de temporada se carga dentro de fetchUser para evitar llamadas duplicadas
  // Badge Mercadillo gestionado por useMarketBadge hook

  // Redirigir alias de PWA a la ruta canónica
  useEffect(() => {
    const p = window.location.pathname.toLowerCase();
    if (p === '/pwaentry' || p === '/pwa-entry') {
      window.location.replace(createPageUrl('PwaEntry'));
    }
  }, []);

  // Retorno de Stripe gestionado por useStripeReturn hook

  // Carga inicial de datos del usuario (solo una vez)
  useEffect(() => {
    executeFetch();
  }, []);

  // Solo refrescar datos del usuario al volver a la app (no en cada navegación)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        executeFetch();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);


  // useEffect de redirección ELIMINADO - causaba loops infinitos de React #310





  // useEffect checkPendingCallups DESACTIVADO temporalmente para debug #310

    // useEffect checkUnreadAnnouncements DESACTIVADO temporalmente para debug #310

    // useEffect checkPendingSignatures DESACTIVADO temporalmente para debug #310



  // Admin: only allow critical chat; redirect from other chat pages
  useEffect(() => {
    // Navigation check removed - AdminChat eliminado
  }, [isAdmin, location.pathname, navigate]);

  const shouldShowRestricted = !showInstallInstructions && !showInstallSuccess && !showFirstLaunchInvite && showSpecialScreen === "restricted";
  // Bloqueos de temporada DESACTIVADOS — nunca se muestran las pantallas de cierre/inscripciones/vacaciones
  const shouldShowClosed = false;
  const shouldShowInscriptions = false;
  const shouldShowVacation = false;



  const navigationItems = useNavigation({
    user, isAdmin, isCoach, isCoordinator, isTreasurer, isPlayer, isMinor, hasPlayers,
    loteriaVisible, isMemberPaid, programaSociosActivo, onlyComplementary,
    playersNeedingReview, pendingSignaturesAdmin, pendingInvitations, pendingCallupResponses,
    chatMenuCounts, unreadAnnouncementsCount, pendingCallupsCount, pendingSignaturesCount,
    pendingLotteryOrders, pendingMemberRequests, pendingClothingOrders, marketNewCount,
    unresolvedAdminChats, paymentsInReview, pendingFeedback,
  });



  const handleLogout = () => {
    base44.auth.logout();
  };

  const checkForUpdates = async () => {
    const toastId = toast.loading('Buscando actualizaciones...');
    try {
      if (!('serviceWorker' in navigator)) {
        toast.dismiss(toastId);
        return toast.info('Verificación no disponible en este modo');
      }
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        toast.dismiss(toastId);
        return toast.info('App no instalada o en modo desarrollo');
      }
      await reg.update();
      if (reg.waiting) {
        toast.dismiss(toastId);
        toast.success('¡Nueva versión disponible!');
      } else {
        toast.dismiss(toastId);
        toast.success('Tu app está actualizada ✅');
      }
    } catch (e) {
      toast.dismiss(toastId);
      console.error('Update check failed:', e);
      toast.error('Error al buscar actualizaciones');
    }
  };

  // Intento fuerte de cierre de ventana/pestaña (puede que el navegador no lo permita)
  const forceCloseWindow = () => {
    try { window.opener = null; } catch {}
    try { window.open('', '_self'); } catch {}
    try { window.top.close(); } catch {}
    try { forceCloseWindow(); } catch {}

    // Último recurso: limpiar la página y sugerir cierre manual, e intentar about:blank
    setTimeout(() => {
      try {
        document.body.style.margin = '0';
        document.body.style.background = 'linear-gradient(135deg,#111827,#0b1220)';
        document.body.innerHTML = `
          <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;color:#fff;text-align:center;padding:24px;font-family:system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif">
            <div>
              <div style="font-size:56px;line-height:1">✅</div>
              <h1 style="font-size:28px;margin:12px 0 8px;font-weight:800">Ya puedes cerrar esta pestaña</h1>
              <p style="opacity:.9;margin:0 0 16px">Si no se cierra automáticamente, ciérrala manualmente y abre la app desde su icono.</p>
            </div>
          </div>`;
        document.title = 'Puedes cerrar esta pestaña';
      } catch {}
      try { window.location.replace('about:blank'); } catch {}
    }, 250);
  };

  // TODOS los useEffect DEBEN estar aquí ANTES de cualquier return
  useEffect(() => {
      if (!user) return;

      // Roles especiales NO pasan por onboarding
      if (user.role === "admin" || user.es_entrenador || user.es_coordinador || user.es_tesorero) {
                      setOnboardingView('none');
                      return;
                    }

                    // Menor: onboarding propio (no usa el selector normal)
                    if (isMinor || user.tipo_panel === 'jugador_menor' || user.es_menor === true) {
                      // Si no aceptó normas → mostrar onboarding del menor
                      if (!user.minor_normas_aceptadas) {
                        setOnboardingView('minor_onboarding');
                        return;
                      }
                      setOnboardingView('none');
                      return;
                    }

                    // Segundo progenitor: permitir guía de instalación, pero sin selector (se controla abajo)

                    // 0) Verificación de código de acceso
                    // Usuarios que ya tienen tipo_panel (onboarding anterior al sistema de códigos)
                    // se consideran validados automáticamente — no bloquear a usuarios existentes
                    if (!user.codigo_acceso_validado) {
                      // Si el usuario ya tiene tipo_panel asignado, es un usuario antiguo legítimo
                      // Marcar como validado automáticamente para no volver a preguntar
                      if (user.tipo_panel) {
                        try {
                          base44.auth.updateMe({ codigo_acceso_validado: true, fecha_validacion_codigo: new Date().toISOString() });
                        } catch {}
                      } else {
                        setOnboardingView('access_code');
                        return;
                      }
                    }

      // La instalación ya NO es bloqueante - se muestra como banner sugerido dentro de la app
      // Limpiar flags legacy de instalación obligatoria
      localStorage.removeItem('installPromptAfterOnboarding');

      // Normal - sin onboarding
      setOnboardingView('none');
    }, [user]);

    // Engine stages gestionados por useEngineStages hook

    // Escalonar carga de motores en 5 oleadas para reducir presión en RAM
    // Engine stages 2-5 gestionados por useEngineStages hook

    // First launch invite gestionado por usePwaDetection hook

  // Flags para manejar páginas públicas sin returns antes de hooks
  const isPublicPage = isPublicPageRef.current;
  const isPublicAnon = isPublicPage && !isLoading && !user;
  const isPublicLoading = isPublicPage && isLoading;

  // Rol tablet → mostrar solo la página sin layout
  if (user?.role === 'tablet') {
    return <div className="min-h-screen">{children}</div>;
  }

  // AHORA SÍ - todos los returns condicionales DESPUÉS de TODOS los hooks
  if (isLoading && !isPublicPageRef.current) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100dvh', background: 'linear-gradient(to bottom right, #ea580c, #c2410c, #15803d)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto"></div>
          <p className="text-white mt-4 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }



  // Reubicación de returns: después de declarar todos los hooks
  if (isPublicLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (isPublicAnon) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {children}
      </div>
    );
  }

  if (shouldShowRestricted) {
    return <RestrictedAccessScreen user={user} restriction={user} />;
  }
  if (shouldShowClosed) {
    return <ClosedSeasonScreen user={user} isAdmin={isAdmin} />;
  }
  if (shouldShowInscriptions) {
    return <InscriptionPeriodScreen user={user} isAdmin={isAdmin} clothingStoreUrl={activeSeasonConfig?.tienda_ropa_url} merchStoreUrl={activeSeasonConfig?.tienda_merch_url} />;
  }
  if (shouldShowVacation) {
    return <VacationPeriodScreen user={user} isAdmin={isAdmin} />;
  }

  const onboardingComponent = onboardingView !== 'none' ? (
    <Suspense fallback={null}>
      <OnboardingController
        onboardingView={onboardingView}
        user={user}
        minorPlayerData={minorPlayerData}
      />
    </Suspense>
  ) : null;

  if (onboardingComponent) {
    return onboardingComponent;
  }


    // Mostrar WelcomeScreen si es primera vez
    if (showWelcome) {
      return (
        <Suspense fallback={null}>
          <WelcomeScreen 
            onEnter={() => {
              setShowWelcome(false);
              localStorage.setItem('hasSeenWelcome', 'true');
            }} 
          />
        </Suspense>
      );
    }

    return (
            <SeasonProvider externalConfig={activeSeasonConfig}>
            <ChatUnreadProvider user={user}>
            <>
              <GlobalErrorHandler />
              <ChatCountsBridge onCounts={setChatCounts} />
              <AutoPushSubscriber user={user} />
              <style>{`html, body { overscroll-behavior-y: none; }`}</style>

              <InstallInstructionsModal
                show={showInstallInstructions}
                context={installContext}
                isIOS={isIOS}
                isAndroid={isAndroid}
                onInstalled={() => {
                  localStorage.setItem('installCompleted', 'true');
                  markInstalled();
                  setShowInstallInstructions(false);
                  if (installContext === 'onboarding') setShowInstallSuccess(true);
                }}
                onClose={() => {
                  setShowInstallInstructions(false);
                  setInstallDismissed(true);
                  localStorage.setItem('installPromptDismissed', 'true');
                }}
              />

                {showInstallSuccess && <InstallSuccessOverlayFull />}

                {showFirstLaunchInvite && (
                  <FirstLaunchInviteOverlay
                    user={user}
                    onDismiss={dismissFirstLaunch}
                    onNavigate={() => {
                      dismissFirstLaunch();
                      const target = user?.tipo_panel === 'familia' ? createPageUrl('ParentPlayers') : createPageUrl('PlayerProfile');
                      window.location.href = target;
                    }}
                  />
                )}

                <EngineLoaders
                  user={user}
                  isAdmin={isAdmin}
                  enginesReady={enginesReady}
                  enginesStage2Ready={enginesStage2Ready}
                  enginesStage3Ready={enginesStage3Ready}
                />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        
        <MobileHeader
          user={user}
          isAdmin={isAdmin}
          isCoordinator={isCoordinator}
          isTreasurer={isTreasurer}
          isCoach={isCoach}
          isPlayer={isPlayer}
          playerName={playerName}
          chatMenuCounts={chatMenuCounts}
          enginesReady={enginesReady}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          onShowInstall={() => { setInstallContext('manual'); setShowInstallInstructions(true); }}
        />

        <div className="lg:ml-72 fixed top-[56px] lg:top-0 left-0 right-0 z-[45]">
          <PushPermissionBanner user={user} />
        </div>

        {mobileMenuOpen && (
          <Suspense fallback={null}>
            <MobileMenu
              isAdmin={isAdmin}
              isAppInstalled={isAppInstalled}
              navigationItems={navigationItems}
              location={location}
              hasNewVersion={hasNewVersion}
              onClose={() => setMobileMenuOpen(false)}
              onShowDeleteAccount={() => { setMobileMenuOpen(false); setShowDeleteAccount(true); }}
              onShowFeedback={() => { setMobileMenuOpen(false); setShowFeedback(true); }}
              onShowInstall={() => { setMobileMenuOpen(false); setInstallContext('manual'); setShowInstallInstructions(true); }}
              onLogout={handleLogout}
              BUILD_VERSION={BUILD_VERSION}
            />
          </Suspense>
        )}

        <Suspense fallback={null}>
          <DesktopSidebar
            user={user}
            isAdmin={isAdmin}
            isCoordinator={isCoordinator}
            isTreasurer={isTreasurer}
            isCoach={isCoach}
            isPlayer={isPlayer}
            isAppInstalled={isAppInstalled}
            navigationItems={navigationItems}
            currentSeason={currentSeason}
            enginesReady={enginesReady}
            currentLang={currentLang}
            onLanguageChange={handleLanguageChange}
            onLogout={handleLogout}
            onShowInstall={() => { setInstallContext('manual'); setShowInstallInstructions(true); }}
            onCheckUpdates={checkForUpdates}
            onShowFeedback={() => setShowFeedback(true)}
            onShowDeleteAccount={() => setShowDeleteAccount(true)}
            playerName={playerName}
            hasNewVersion={hasNewVersion}
          />
        </Suspense>

        {showUpdateNotification && (
          <UpdateNotificationBar onUpdate={applyUpdate} />
        )}

        {rateLimited && <RateLimitBanner />}

        <main className={`lg:ml-72 pt-[100px] lg:pt-0 ${sponsorBannerVisible ? 'pb-[132px] lg:pb-20' : 'pb-20 lg:pb-4'}`} style={{ minHeight: '-webkit-fill-available' }}>

          {/* Widget de cumpleaños hoy */}


        <ActiveBanner position="top" user={user} />

          <PullToRefresh>
            <ErrorBoundary label="la página actual" onReset={() => window.location.reload()}>
              <div className="page-transition-wrapper">
                {children}
              </div>
            </ErrorBoundary>
          </PullToRefresh>
          <SponsorRecruitBanner user={user} />
          <ActiveBanner position="bottom" user={user} />

          {showPaymentSuccess && <PaymentSuccessOverlay />}

          {/* Modal de felicitación de cumpleaños */}


                  {/* Modal Feedback */}
                  <FeedbackModal
                    open={showFeedback}
                    onOpenChange={setShowFeedback}
                    user={user}
                    currentPage={currentPageName}
                  />
          </main>


        {/* Sponsor Banner — sits ABOVE the bottom bar on mobile, hidden in chat pages */}
        {sponsorBannerVisible && !['ParentCoachChat', 'CoachParentChat', 'ParentCoordinatorChat', 'CoordinatorChat', 'AdminCoordinatorChats', 'StaffChat', 'ParentSystemMessages', 'FamilyChatsHub', 'CoachChatsHub', 'CoordinatorChatsHub', 'AdminChatsHub'].includes(currentPageName) && (
          <div className="lg:hidden fixed left-0 right-0 z-[49]" style={{ bottom: 56 + (typeof CSS !== 'undefined' && CSS.supports?.('padding-bottom', 'env(safe-area-inset-bottom)') ? 0 : 0) }}>
            <Suspense fallback={null}><SponsorBanner /></Suspense>
          </div>
        )}

        {/* Mobile Bottom Bar */}
        <MobileBottomBar 
          location={location} 
          chatBadges={chatMenuCounts}
          isAdmin={isAdmin}
          isCoach={isCoach}
          isCoordinator={isCoordinator}
          isTreasurer={isTreasurer}
          isPlayer={isPlayer}
          isMinor={isMinor}
          currentPageName={currentPageName}
        />

        {/* Delete Account Dialog */}
        {user && (
          <Suspense fallback={null}>
            <DeleteAccountDialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount} />
          </Suspense>
        )}

        {/* Desktop sponsor banner - bottom of sidebar area */}
        {sponsorBannerVisible && (
          <div className="hidden lg:block lg:ml-72 fixed left-0 right-0 z-40 bottom-0">
            <Suspense fallback={null}><SponsorBanner /></Suspense>
          </div>
        )}
        </div>
        </>
        </ChatUnreadProvider>
        </SeasonProvider>
        );

}