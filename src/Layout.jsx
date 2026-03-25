import React, { useState, useEffect, Suspense, useRef, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useFetchUser } from "./components/layout/useFetchUser";
import useEngineStages from "./hooks/useEngineStages";


import { Menu, X, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { buildAdminNavigation, buildCoachNavigation, buildCoordinatorNavigation, buildParentNavigation, buildPlayerNavigation, buildTreasurerNavigation, buildMinorNavigation } from "./components/layout/navigationItems";
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
import ExtraChargePayModal from "./components/charges/ExtraChargePayModal";
import ActiveBanner from "./components/announcements/ActiveBanner";
import ExtraChargeBanner from "./components/charges/ExtraChargeBanner";
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

// BUILD VERSION - cambia automáticamente con cada publicación porque se genera al compilar
const BUILD_VERSION = "build_1708714800001";

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
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  
  if (currentMonth === 5) {
    return "closed";
  } else if (currentMonth === 6 || currentMonth === 7) {
    return "inscriptions";
  } else if (currentMonth === 8) {
    return "vacation";
  }
  return "active";
};

// Pantallas especiales extraídas a components/layout/SeasonScreens.jsx
import { ClosedSeasonScreen, InscriptionPeriodScreen, VacationPeriodScreen, RestrictedAccessScreen } from "./components/layout/SeasonScreens";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentSeason = getCurrentSeason();
  const [rateLimited, setRateLimited] = useState(false);
  const rateLimitTimerRef = useRef(null);
  const [onboardingView, setOnboardingView] = useState('loading');

  const {
    user, isAdmin, isCoach, isCoordinator, isTreasurer, isJunta, isPlayer, isMinor, minorPlayerData,
    hasPlayers, playerName, isLoading, showSpecialScreen, activeSeasonConfig, isMemberPaid,
    loteriaVisible, sponsorBannerVisible, extraChargeVisible, authChecked, isPublicPageRef,
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
  const [chatCounts, setChatCounts] = useState({ team_chats: {}, coordinator: 0, admin: 0, staff: 0, system: 0, total: 0 });
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
  const [extraChargeModalOpen, setExtraChargeModalOpen] = useState(false);
  const [memberCardActive, setMemberCardActive] = useState(false);
  const programaSociosActivo = activeSeasonConfig?.programa_socios_activo || false;
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [showFirstTimeRegistration, setShowFirstTimeRegistration] = useState(false);
  const [showInstallSuccess, setShowInstallSuccess] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showFirstLaunchInvite, setShowFirstLaunchInvite] = useState(false);
  
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [hasNewVersion, setHasNewVersion] = useState(() => {
    // Check immediately on mount if there's a new build version
    try {
      const savedVersion = localStorage.getItem('app_build_version');
      if (savedVersion && savedVersion !== BUILD_VERSION) {
        return true; // New version detected!
      }
      // First visit or same version - save current
      localStorage.setItem('app_build_version', BUILD_VERSION);
      return false;
    } catch { return false; }
  });
  // Mercadillo badge
  const [marketCount, setMarketCount] = useState(0);
  const [marketNewCount, setMarketNewCount] = useState(0);

  const [installContext, setInstallContext] = useState('manual');

  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const { enginesReady, enginesStage2Ready, enginesStage3Ready, enginesStage4Ready, enginesStage5Ready } = useEngineStages(isLoading, user);

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

      // Detectar si la app está instalada - solo por localStorage (marcado manual)
                  useEffect(() => {
                    const userMarkedInstalled = localStorage.getItem('pwaInstalled') === 'true';
                    setIsAppInstalled(userMarkedInstalled);
                  }, []);

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
    // Recuperación automática ante errores de carga de chunks (404/ChunkLoadError)
    const chunkErrorHandler = (e) => {
      const msg = (e?.reason?.message || e?.message || '').toString();
      if (/(Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module)/i.test(msg)) {
        try { if (window.caches) { caches.keys().then(keys => keys.forEach(k => caches.delete(k))); } } catch {}
        try { if (navigator.serviceWorker) { navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())); } } catch {}
        window.location.reload();
      }
    };
    window.addEventListener('unhandledrejection', chunkErrorHandler);

     const savedLang = localStorage.getItem('appLanguage');
    if (savedLang) setCurrentLang(savedLang);
    return () => {
      // Quitar manejadores de recuperación de chunks
      try {
        window.removeEventListener('unhandledrejection', chunkErrorHandler);
      } catch {}
    };
    }, []);

    // Actualización automática MEJORADA (cada 1 min + al volver a la app)
    useEffect(() => {
      if (!('serviceWorker' in navigator)) return;

      const checkForNewVersion = async () => {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (!reg) return;
          // Forzar búsqueda en el servidor
          await reg.update();
          // Si hay una versión esperando, mostrar aviso
          if (reg.waiting) { setShowUpdateNotification(true); setHasNewVersion(true); }
        } catch (e) { 
          console.error('Error verificando actualizaciones:', e); 
        }
      };

      // 1. Chequeo inicial y periódico (5 minutos)
      checkForNewVersion();
      const intervalId = setInterval(checkForNewVersion, 300 * 1000);

      // 2. Chequeo inteligente al volver a la app (visibilidad)
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log('👁️ [LAYOUT] App visible - actualizando datos...');
          checkForNewVersion();
          // Forzar actualización del Service Worker si hay uno esperando
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(reg => {
              if (reg?.waiting) {
                              setShowUpdateNotification(true);
                              setHasNewVersion(true);
                            }
            });
          }
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      // 3. Listener estándar de instalación en segundo plano
      (async () => {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && reg.waiting) {
                                    setShowUpdateNotification(true);
                                    setHasNewVersion(true);
                                  }
                });
              }
            });
          }
        } catch {}
      })();

      // 4. Recarga automática si el controlador cambia (ej. otra pestaña actualizó)
      const onCtrlChange = () => window.location.reload();
      navigator.serviceWorker.addEventListener('controllerchange', onCtrlChange);

      return () => {
        clearInterval(intervalId);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        navigator.serviceWorker.removeEventListener('controllerchange', onCtrlChange);
      };
    }, []);

    // Build version check - detect new deploys without SW dependency
    useEffect(() => {
      const savedVersion = localStorage.getItem('app_build_version');
      if (savedVersion && savedVersion !== BUILD_VERSION) {
        setHasNewVersion(true);
        setShowUpdateNotification(true);
      } else {
        localStorage.setItem('app_build_version', BUILD_VERSION);
      }
    }, []);

    // Rate limit guard - pausa consultas si recibimos 429
    // También detecta errores de red/WebSocket comunes en navegadores antiguos
    useEffect(() => {
      const onRateLimit = (e) => {
        try {
          const msg = (e?.reason?.message || e?.message || '').toString();
          if (/rate limit|429|too many requests/i.test(msg)) {
            if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
            window.__BASE44_PAUSE_REALTIME__ = true;
            setRateLimited(true);
            rateLimitTimerRef.current = setTimeout(() => {
              window.__BASE44_PAUSE_REALTIME__ = false;
              setRateLimited(false);
            }, 25000);
          }
        } catch {}
      };
      window.addEventListener('unhandledrejection', onRateLimit);
      return () => window.removeEventListener('unhandledrejection', onRateLimit);
    }, []);

    // Configuración de temporada se carga dentro de fetchUser para evitar llamadas duplicadas
  // Badge Mercadillo: solo cargar cuando se visita la página del Mercadillo
  // El conteo se carga de localStorage para el badge (sin query a BD)
  useEffect(() => {
    const lastSeen = Number(localStorage.getItem('marketLastSeenCount') || 0);
    // Sin query — el badge solo muestra "nuevo" si la página Mercadillo actualizó el count
    const cachedCount = Number(localStorage.getItem('marketTotalCount') || 0);
    setMarketCount(cachedCount);
    setMarketNewCount(cachedCount > lastSeen ? cachedCount - lastSeen : 0);
  }, []);

  // Marcar como visto al entrar en Mercadillo y actualizar cache
  useEffect(() => {
    const p = location.pathname.toLowerCase();
    if (p.includes('mercadillo')) {
      // Al entrar en Mercadillo, cargar el conteo real y cachear
      (async () => {
        try {
          const data = await base44.entities.MarketListing.filter({ estado: 'activo' });
          const count = (data || []).length;
          localStorage.setItem('marketTotalCount', String(count));
          localStorage.setItem('marketLastSeenCount', String(count));
          setMarketCount(count);
          setMarketNewCount(0);
        } catch {}
      })();
    }
  }, [location.pathname]);

  // Redirigir alias de PWA a la ruta canónica
  useEffect(() => {
    const p = window.location.pathname.toLowerCase();
    if (p === '/pwaentry' || p === '/pwa-entry') {
      window.location.replace(createPageUrl('PwaEntry'));
    }
  }, []);

  // Detectar retorno de Stripe (éxito de pago)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const payment = url.searchParams.get('payment');
      if (payment === 'ok') {
        setShowPaymentSuccess(true);
        // Ocultar inmediatamente el banner del cobro extra y recordar no mostrarlo
        try {
          const extraId = new URL(window.location.href).searchParams.get('extra_charge_id');
          if (extraId) {
            const arr = (() => { try { return JSON.parse(localStorage.getItem('extraChargeSuppress') || '[]'); } catch { return []; } })();
            if (!arr.includes(extraId)) {
              arr.push(extraId);
              localStorage.setItem('extraChargeSuppress', JSON.stringify(arr));
            }
          }
        } catch {}
        setExtraChargeVisible(null);
        setTimeout(() => setShowPaymentSuccess(false), 3000);
        url.searchParams.delete('payment');
        url.searchParams.delete('type');
        url.searchParams.delete('extra_charge_id');
        url.searchParams.delete('session_id');
        const cleaned = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '');
        window.history.replaceState({}, '', cleaned);
      }
    } catch {}
  }, []);

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
  const shouldShowClosed = !showInstallInstructions && !showInstallSuccess && !showFirstLaunchInvite && showSpecialScreen === "closed";
  const shouldShowInscriptions = !showInstallInstructions && !showInstallSuccess && !showFirstLaunchInvite && showSpecialScreen === "inscriptions";
  const shouldShowVacation = !showInstallInstructions && !showInstallSuccess && !showFirstLaunchInvite && showSpecialScreen === "vacation";



  const navCtx = { playersNeedingReview, pendingSignaturesAdmin, pendingInvitations, pendingCallupResponses, chatMenuCounts, unreadAnnouncementsCount, pendingCallupsCount, pendingSignaturesCount, hasPlayers, loteriaVisible, pendingLotteryOrders, pendingMemberRequests, pendingClothingOrders, marketNewCount, unresolvedAdminChats, paymentsInReview, programaSociosActivo, isMemberPaid, isJunta, isPlayer, user };

  const adminNavigationItems = useMemo(() => buildAdminNavigation(navCtx),
    [playersNeedingReview, pendingSignaturesAdmin, pendingInvitations, pendingCallupResponses, chatMenuCounts, unreadAnnouncementsCount, pendingCallupsCount, pendingSignaturesCount, hasPlayers, loteriaVisible, pendingLotteryOrders, pendingMemberRequests, pendingClothingOrders, marketNewCount, unresolvedAdminChats, paymentsInReview]);

  const coachNavigationItems = useMemo(() => buildCoachNavigation(navCtx),
    [programaSociosActivo, isMemberPaid, pendingCallupResponses, chatMenuCounts, isPlayer, pendingCallupsCount, pendingSignaturesCount, unreadAnnouncementsCount, hasPlayers, loteriaVisible, marketNewCount, user?.puede_gestionar_firmas]);

  const coordinatorNavigationItems = useMemo(() => buildCoordinatorNavigation(navCtx),
    [programaSociosActivo, isMemberPaid, pendingCallupResponses, chatMenuCounts, isPlayer, pendingCallupsCount, pendingSignaturesCount, unreadAnnouncementsCount, hasPlayers, loteriaVisible, marketNewCount, user?.puede_gestionar_firmas, user?.es_entrenador]);

  const parentNavigationItems = useMemo(() => buildParentNavigation(navCtx),
    [programaSociosActivo, isMemberPaid, isJunta, pendingCallupsCount, pendingSignaturesCount, chatMenuCounts, hasPlayers, loteriaVisible, marketNewCount]);

  const playerNavigationItems = useMemo(() => buildPlayerNavigation(navCtx),
    [programaSociosActivo, isMemberPaid, pendingCallupsCount, pendingSignaturesCount, chatMenuCounts, loteriaVisible, marketNewCount]);

  const treasurerNavigationItems = useMemo(() => buildTreasurerNavigation(navCtx),
    [programaSociosActivo, isMemberPaid, pendingCallupsCount, pendingSignaturesCount, chatMenuCounts, hasPlayers, loteriaVisible, unreadAnnouncementsCount, marketNewCount]);

  const minorNavigationItems = useMemo(() => buildMinorNavigation(navCtx),
    [pendingCallupsCount]);

  let navigationItems;
    if (isAdmin) {
      navigationItems = adminNavigationItems;
    } else if (isMinor) {
      navigationItems = minorNavigationItems;
    } else if (isCoordinator) {
      navigationItems = coordinatorNavigationItems;
    } else if (isTreasurer) {
      navigationItems = treasurerNavigationItems;
    } else if (isCoach) {
      navigationItems = coachNavigationItems;
    } else if (isPlayer) {
        navigationItems = playerNavigationItems;
    } else {
      // Usuario normal de familia (padre/madre sin roles especiales)
      navigationItems = parentNavigationItems;
    }



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
        // Intentar registrar de nuevo si no existe
        return toast.info('App no instalada o en modo desarrollo');
      }
      
      await reg.update();
      
      if (reg.waiting) {
        setShowUpdateNotification(true);
        toast.dismiss(toastId);
        toast.success('¡Nueva versión disponible!');
      } else {
        setTimeout(() => {
          if (showUpdateNotification) {
             toast.dismiss(toastId);
          } else {
             toast.dismiss(toastId);
             toast.success('Tu app está actualizada ✅');
          }
        }, 1500);
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

    // Invitar en el primer arranque desde el icono (PWA)
    useEffect(() => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
      if (isStandalone) {
        localStorage.setItem('pwaInstalled', 'true');
        setIsAppInstalled(true);
      }
      if (user?.tipo_panel && isStandalone && !localStorage.getItem('firstLaunchDone') && user?.es_segundo_progenitor !== true) {
        setShowFirstLaunchInvite(true);
      }
    }, [user]);

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
              <style>{`html, body { overscroll-behavior-y: none; }`}</style>

              <InstallInstructionsModal
                show={showInstallInstructions}
                context={installContext}
                isIOS={isIOS}
                isAndroid={isAndroid}
                onInstalled={() => {
                  localStorage.setItem('installCompleted', 'true');
                  localStorage.setItem('pwaInstalled', 'true');
                  setIsAppInstalled(true);
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
                    onDismiss={() => { setShowFirstLaunchInvite(false); localStorage.setItem('firstLaunchDone', 'true'); }}
                    onNavigate={() => {
                      localStorage.setItem('firstLaunchDone', 'true');
                      setShowFirstLaunchInvite(false);
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
                  enginesStage4Ready={enginesStage4Ready}
                  enginesStage5Ready={enginesStage5Ready}
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
          <UpdateNotificationBar onUpdate={() => {
            localStorage.setItem('app_build_version', BUILD_VERSION);
            setShowUpdateNotification(false);
            window.location.reload();
          }} />
        )}

        {rateLimited && <RateLimitBanner />}

        <main className={`lg:ml-72 pt-[100px] lg:pt-0 ${sponsorBannerVisible ? 'pb-[132px] lg:pb-20' : 'pb-20 lg:pb-4'}`} style={{ minHeight: '-webkit-fill-available' }}>

          {/* Widget de cumpleaños hoy */}


        <ActiveBanner position="top" user={user} />

          {extraChargeVisible && (
            <ExtraChargeBanner charge={extraChargeVisible} onOpen={() => setExtraChargeModalOpen(true)} />
          )}
          <PullToRefresh>
            <ErrorBoundary label="la página actual" onReset={() => window.location.reload()}>
              <div className="page-transition-wrapper">
                {children}
              </div>
            </ErrorBoundary>
          </PullToRefresh>
          <ActiveBanner position="bottom" user={user} />

          <ExtraChargePayModal
            open={extraChargeModalOpen}
            charge={extraChargeVisible}
            onClose={() => setExtraChargeModalOpen(false)}
            onPayCard={async (selection) => {
              // Crear registro y mandar a Stripe
              try {
                const chosen = (selection || []).filter(s => Number(s.cantidad) > 0);
                const total = chosen.reduce((sum, s) => {
                  const def = extraChargeVisible.items.find(i => i.nombre === s.nombre);
                  return sum + (Number(s.cantidad)||0) * Number(def?.precio||0);
                }, 0);
                if (window.top !== window.self) { alert('Por seguridad, el pago con tarjeta solo funciona en la app publicada.'); return; }
                const lineItems = chosen.map((s) => {
                  const def = extraChargeVisible.items.find(i => i.nombre === s.nombre);
                  return {
                    price_data: { currency: 'eur', product_data: { name: `${extraChargeVisible.titulo} - ${s.nombre}` }, unit_amount: Math.round(Number(def?.precio||0) * 100) },
                    quantity: Number(s.cantidad||0)
                  };
                });
                // Serializar selección para que el webhook pueda crear el ExtraChargePayment
                const seleccionParaWebhook = chosen.map(s => {
                  const def = extraChargeVisible.items.find(i => i.nombre === s.nombre);
                  return { item_nombre: s.nombre, cantidad: Number(s.cantidad||0), precio_unitario: Number(def?.precio||0) };
                });
                const baseUrl = window.location.href.split('#')[0].split('?')[0];
                const successUrl = `${baseUrl}?payment=ok&type=extra_charge&extra_charge_id=${encodeURIComponent(extraChargeVisible.id)}&session_id={CHECKOUT_SESSION_ID}`;
                const cancelUrl = baseUrl;
                const { data } = await base44.functions.invoke('stripeCheckout', {
                  lineItems,
                  successUrl,
                  cancelUrl,
                  metadata: { 
                    tipo: 'extra_charge', 
                    extra_charge_id: extraChargeVisible.id,
                    titulo: extraChargeVisible.titulo,
                    seleccion: JSON.stringify(seleccionParaWebhook)
                  }
                });
                if (data?.url) window.location.href = data.url;
              } catch (e) { console.error('ExtraCharge Stripe error', e); }
            }}
            onChooseTransfer={async (selection) => {
              // Registrar transferencia + pedir justificante tras subir (familia usará ParentPayments formulario)
              setExtraChargeModalOpen(false);
              alert('Para transferencias: sube el justificante desde Mis Pagos. Añadiremos el detalle al panel de tesorería.');
            }}
          />
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