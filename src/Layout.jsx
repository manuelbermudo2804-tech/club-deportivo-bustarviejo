import React, { useState, useEffect, Suspense, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useFetchUser } from "./components/layout/useFetchUser";


import { Home, Users, CreditCard, ShoppingBag, Menu, Bell, LogOut, Calendar, Megaphone, Mail, Archive, Settings, MessageCircle, Clock, Image, X, User as UserIcon, ClipboardCheck, Star, Award, FileText, Clover, UserCircle, FileSignature, Gift, Smartphone, Download, BarChart3, ShieldAlert, UserX, RotateCw, CheckCircle2, Trophy, ChevronLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import NotificationBadge from "./components/NotificationBadge";
import SessionManager from "./components/SessionManager";
const GlobalSearch = React.lazy(() => import("./components/GlobalSearch"));
import ThemeToggle from "./components/ThemeToggle";
import ActiveBanner from "./components/announcements/ActiveBanner";
import ExtraChargeBanner from "./components/charges/ExtraChargeBanner";
import NotificationCenter from "./components/NotificationCenter";
import MobileBottomBar from "./components/mobile/MobileBottomBar";
import MobileBackButton from "./components/mobile/MobileBackButton";
import PullToRefresh from "./components/mobile/PullToRefresh";
import DeleteAccountDialog from "./components/DeleteAccountDialog";
import FeedbackModal from "./components/feedback/FeedbackModal";
import GlobalErrorHandler from "./components/utils/GlobalErrorHandler";

import LanguageSelector from "./components/LanguageSelector";
import { useUnifiedNotifications } from "./components/notifications/useUnifiedNotifications";
import { ChatUnreadProvider } from "./components/chat/ChatUnreadProvider";
import ChatCountsBridge from "./components/chat/ChatCountsBridge";
import { SeasonProvider } from "./components/season/SeasonProvider";
import ExtraChargePayModal from "./components/charges/ExtraChargePayModal";



const OnboardingController = React.lazy(() => import("./components/layout/OnboardingController"));
const InstallInstructionsModal = React.lazy(() => import("./components/layout/InstallInstructionsModal"));
const DesktopSidebar = React.lazy(() => import("./components/layout/DesktopSidebar"));
import { Dialog, DialogContent } from "@/components/ui/dialog";
const NotificationManager = React.lazy(() => import("./components/notifications/NotificationManager"));
const AutomaticNotificationEngine = React.lazy(() => import("./components/notifications/AutomaticNotificationEngine"));
const EmailNotificationTrigger = React.lazy(() => import("./components/notifications/EmailNotificationTrigger"));
const AutomaticPaymentReminders = React.lazy(() => import("./components/reminders/AutomaticPaymentReminders"));
import PlanPaymentReminders from "./components/reminders/PlanPaymentReminders";
import AutomaticRenewalReminders from "./components/reminders/AutomaticRenewalReminders";
import AutomaticRenewalClosure from "./components/renewals/AutomaticRenewalClosure.jsx";
import RenewalNotificationEngine from "./components/renewals/RenewalNotificationEngine";
import PostRenewalPaymentReminder from "./components/renewals/PostRenewalPaymentReminder.jsx";
const PaymentApprovalNotifier = React.lazy(() => import("./components/payments/PaymentApprovalNotifier"));
const ClothingApprovalNotifier = React.lazy(() => import("./components/payments/ClothingApprovalNotifier"));

import CallupSoundNotifier from "./components/notifications/CallupSoundNotifier";
import AnnouncementSoundNotifier from "./components/notifications/AnnouncementSoundNotifier";
import PaymentSoundNotifier from "./components/notifications/PaymentSoundNotifier";


// ToastContainer eliminado - causaba spam de notificaciones
const EventReminderEngine = React.lazy(() => import("./components/events/EventReminderEngine"));
const DocumentReminderEngine = React.lazy(() => import("./components/documents/DocumentReminderEngine"));
const SponsorBanner = React.lazy(() => import("./components/sponsors/SponsorBanner"));
import InstallSuccessOverlay from "./components/pwa/InstallSuccessOverlay";



const CLUB_LOGO_URL = `https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg?t=${Date.now()}`;

// BUILD VERSION - se actualiza automáticamente con cada deploy/publicación
const BUILD_VERSION = "2026-02-23T18:00:00";

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

  const fetchSeasonConfig = async () => {
    try {
      const configs = await base44.entities.SeasonConfig.filter({ activa: true });
      const activeConfig = configs[0];
      if (activeConfig) {
        console.log('🔄 [LAYOUT] Configuración de temporada actualizada');
      }
    } catch (error) {
      console.error("Error refreshing season config:", error);
    }
  };

  // Polling de configuración: Al montar, al cambiar visibilidad y cada 5 minutos (en lugar de 60s)
  useEffect(() => {
    fetchSeasonConfig(); // Carga inicial
    const intervalId = setInterval(fetchSeasonConfig, 300000); // Cada 5 minutos (en lugar de 60s)
    return () => clearInterval(intervalId);
  }, []);
  
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
  const pendingMatchObservations = sanitize(notifications.pendingMatchObservations);
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
  const [programaSociosActivo, setProgramaSociosActivo] = useState(false);
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
  const [enginesReady, setEnginesReady] = useState(false);
  const [enginesStage2Ready, setEnginesStage2Ready] = useState(false);
  const [enginesStage3Ready, setEnginesStage3Ready] = useState(false);

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
          fetchSeasonConfig(); // Recargar configuración al volver
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
    useEffect(() => {
      const onRateLimit = (e) => {
        try {
          const msg = (e?.reason?.message || e?.message || '').toString();
          if (/rate limit/i.test(msg)) {
            if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
            window.__BASE44_PAUSE_REALTIME__ = true;
            setRateLimited(true);
            rateLimitTimerRef.current = setTimeout(() => {
              window.__BASE44_PAUSE_REALTIME__ = false;
              setRateLimited(false);
            }, 20000);
          }
        } catch {}
      };
      window.addEventListener('unhandledrejection', onRateLimit);
      return () => window.removeEventListener('unhandledrejection', onRateLimit);
    }, []);

    // Configuración de temporada se carga dentro de fetchUser para evitar llamadas duplicadas
  // Badge Mercadillo: cargar conteo y calcular nuevos
  useEffect(() => {
    const load = async () => {
      try {
        const data = await base44.entities.MarketListing.filter({ estado: 'activo' });
        const count = (data || []).length;
        setMarketCount(count);
        const lastSeen = Number(localStorage.getItem('marketLastSeenCount') || 0);
        setMarketNewCount(count > lastSeen ? count - lastSeen : 0);
      } catch {}
    };
    load();
  }, []);

  // Actualizar al volver a la app
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        (async () => {
          try {
            const data = await base44.entities.MarketListing.filter({ estado: 'activo' });
            const count = (data || []).length;
            setMarketCount(count);
            const lastSeen = Number(localStorage.getItem('marketLastSeenCount') || 0);
            setMarketNewCount(count > lastSeen ? count - lastSeen : 0);
          } catch {}
        })();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Marcar como visto al entrar en Mercadillo
  useEffect(() => {
    const p = location.pathname.toLowerCase();
    if (p.includes('mercadillo') && marketCount > 0) {
      localStorage.setItem('marketLastSeenCount', String(marketCount));
      setMarketNewCount(0);
    }
  }, [location.pathname, marketCount]);

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

  useEffect(() => {
    executeFetch();
  }, [location.pathname]);


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



  const adminNavigationItems = [
    // 🏠 INICIO
    { title: "🏠 Inicio", url: createPageUrl("Home"), icon: Home },
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },

    // 👥 GESTIÓN DE PERSONAS
    { title: "─ GESTIÓN DE PERSONAS ─", section: true },
    { title: "👥 Jugadores", url: createPageUrl("Players"), icon: Users, badge: playersNeedingReview > 0 ? playersNeedingReview : null },
    { title: "🔄 Renovaciones", url: createPageUrl("RenewalDashboard"), icon: RotateCw },
    { title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignaturesAdmin"), icon: FileSignature, badge: pendingSignaturesAdmin > 0 ? pendingSignaturesAdmin : null, urgentBadge: pendingSignaturesAdmin > 0 },
    { title: "🏃 Entrenadores", url: createPageUrl("CoachProfiles"), icon: Users },
    { title: "👤 Usuarios", url: createPageUrl("UserManagement"), icon: Users },
    { title: "🔑 Códigos de Acceso", url: createPageUrl("AdminAccessCodes"), icon: KeyRound, badge: pendingInvitations > 0 ? pendingInvitations : null },

    // 💰 FINANZAS
    { title: "─ FINANZAS ─", section: true },
    { title: "💳 Pagos", url: createPageUrl("Payments"), icon: CreditCard },
    { title: "📊 Panel Financiero", url: createPageUrl("TreasurerFinancialPanel"), icon: BarChart3 },
    { title: "💸 Cobros Extra", url: createPageUrl("ExtraCharges"), icon: CreditCard },
    { title: "🔔 Recordatorios", url: createPageUrl("PaymentReminders"), icon: Bell },
    { title: "📁 Histórico", url: createPageUrl("PaymentHistory"), icon: Archive },

    // ⚽ DEPORTIVO
    { title: "─ DEPORTIVO ─", section: true },
    { title: "🎓 Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell, badge: pendingCallupResponses > 0 ? pendingCallupResponses : null, urgentBadge: pendingCallupResponses > 0 },
    { title: "📊 Reportes Entrenadores", url: createPageUrl("CoachEvaluationReports"), icon: Star },
    { title: "🏆 Competición", url: createPageUrl("CentroCompeticion"), icon: Trophy },

    // 📅 CALENDARIO Y EVENTOS
    { title: "─ CALENDARIO Y EVENTOS ─", section: true },
    { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🎉 Gestión Eventos", url: createPageUrl("EventManagement"), icon: Calendar },
    { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },

    // 💬 COMUNICACIÓN
    { title: "─ COMUNICACIÓN ─", section: true },
    { title: "💼 Chat Staff", url: createPageUrl("StaffChat"), icon: MessageCircle, badge: chatMenuCounts.staffCount },
    { title: "💬 Chat Coordinador-Familias", url: createPageUrl("CoordinatorChat"), icon: MessageCircle, badge: chatMenuCounts.coordinatorCount },
    { title: "⚽ Chat Entrenador-Familias", url: createPageUrl("CoachParentChat"), icon: MessageCircle, badge: chatMenuCounts.coachCount },
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "📄 Documentos", url: createPageUrl("DocumentManagement"), icon: FileText },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "🗂️ Tareas Junta", url: createPageUrl("BoardTasks"), icon: ClipboardCheck },
    { title: "💬 Feedback Usuarios", url: createPageUrl("FeedbackManagement"), icon: MessageCircle },
    { title: "✉️ Buzón Juvenil", url: createPageUrl("JuniorMailboxAdmin"), icon: MessageCircle },

    // 🛍️ TIENDA Y SERVICIOS
    { title: "─ TIENDA Y SERVICIOS ─", section: true },
    { title: "🛍️ Tienda", url: createPageUrl("Tienda"), icon: ShoppingBag },
    { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },
    ...(loteriaVisible ? [{ title: "🍀 Lotería Navidad", url: createPageUrl("LotteryManagement"), icon: Clover, badge: pendingLotteryOrders > 0 ? pendingLotteryOrders : null }] : []),
    { title: "🎫 Gestión Socios", url: createPageUrl("ClubMembersManagement"), icon: Users, badge: pendingMemberRequests > 0 ? pendingMemberRequests : null },
    { title: "💰 Patrocinios", url: createPageUrl("Sponsorships"), icon: CreditCard },
    { title: "🎁 Trae un Socio Amigo", url: createPageUrl("ReferralManagement"), icon: Gift },
    { title: "⚽👧 Fútbol Femenino", url: createPageUrl("FemeninoInterests"), icon: Users },

    // 🖼️ CONTENIDO
    { title: "─ CONTENIDO ─", section: true },
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },

    // 👨‍👩‍👧 MIS HIJOS (si tiene hijos)
    ...(hasPlayers ? [
      { title: "─ MIS HIJOS ─", section: true },
      { title: "👨‍👩‍👧 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null },
    ] : []),

    // ⚙️ CONFIGURACIÓN
    { title: "─ CONFIGURACIÓN ─", section: true },
    { title: "⚙️ Temporadas y Categorías", url: createPageUrl("SeasonManagement"), icon: Settings },
    { title: "🔔 Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
    { title: "📊 Estadísticas Chat", url: createPageUrl("ChatAnalyticsDashboard"), icon: BarChart3 },
    { title: "📊 Sistema de Análisis", url: createPageUrl("AppAnalytics"), icon: BarChart3 },

    // 🧪 DESARROLLO
    { title: "─ DESARROLLO ─", section: true },
    { title: "📖 Manual de Acceso", url: createPageUrl("ManualAcceso"), icon: FileText },
    { title: "📊 Preview Stats Jugador", url: createPageUrl("PlayerStatsPreview"), icon: BarChart3 },
    { title: "🧪 Test Chats", url: createPageUrl("ChatTestConsole"), icon: BarChart3 },
    { title: "🧪 Vista Post-Instalación", url: createPageUrl("InstallSuccessPreview"), icon: Download },
    { title: "👁️ Preview Flujo Alta", url: createPageUrl("OnboardingPreview"), icon: UserIcon },
    ];

  const coachNavigationItems = [
                // 🎫 CARNET DE SOCIO (si es socio pagado - con o sin hijos)
                ...(programaSociosActivo && isMemberPaid ? [{ 
                  title: "🎫 MI CARNET DE SOCIO", 
                  url: createPageUrl("MemberCardDisplay"), 
                  icon: Users,
                  highlight: true
                }] : []),

                // 🏠 INICIO
                { title: "🏠 Inicio", url: createPageUrl("CoachDashboard"), icon: Home },

      // 💬 COMUNICACIÓN (uso diario)
      { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },
      { title: "💬 Chat con Familias", url: createPageUrl("CoachParentChat"), icon: MessageCircle, badge: chatMenuCounts.coachCount },
      { title: "💼 Chat Staff", url: createPageUrl("StaffChat"), icon: MessageCircle, badge: chatMenuCounts.staffCount },

      // ⚽ GESTIÓN DEPORTIVA (trabajo principal)
      { title: "🎓 Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell, badge: pendingCallupResponses > 0 ? pendingCallupResponses : null, urgentBadge: pendingCallupResponses > 0 },
      { title: "📋 Asistencia y Evaluación", url: createPageUrl("TeamAttendanceEvaluation"), icon: CheckCircle2 },
      { title: "🎓 Plantillas", url: createPageUrl("TeamRosters"), icon: Users },
      { title: "📚 Biblioteca Ejercicios", url: createPageUrl("ExerciseLibrary"), icon: FileText },
      { title: "🎯 Pizarra Táctica", url: createPageUrl("TacticsBoard"), icon: Calendar },
      { title: "📊 Competición (Técnicos)", url: createPageUrl("CentroCompeticionTecnico"), icon: BarChart3, badge: pendingMatchObservations > 0 ? pendingMatchObservations : null, urgentBadge: pendingMatchObservations > 0 },

      // 📅 CALENDARIO
      { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
            { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
            { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },

      // 📊 REPORTES
      { title: "📊 Reportes Entrenadores", url: createPageUrl("CoachEvaluationReports"), icon: Star },

      // 👤 PERFIL
      { title: "👤 Mi Perfil Entrenador", url: createPageUrl("CoachProfile"), icon: UserCircle },
      ...(user?.puede_gestionar_firmas ? [{ title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignaturesAdmin"), icon: FileSignature }] : []),

      // ⚽ SOY JUGADOR +18 (si también es jugador)
      ...(isPlayer ? [
        { title: "─ MI PERFIL JUGADOR ─", section: true },
        { title: "⚽ Mi Perfil Jugador", url: createPageUrl("PlayerProfile"), icon: UserCircle },
        { title: "🏆 Mis Convocatorias (Jugador)", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
        { title: "💳 Mis Pagos (Jugador)", url: createPageUrl("ParentPayments"), icon: CreditCard },
        { title: "🖊️ Mis Firmas (Jugador)", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },
        { title: "📄 Mis Documentos (Jugador)", url: createPageUrl("ParentDocuments"), icon: FileText },
      ] : []),

      // 📢 INFORMACIÓN
      { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone, badge: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : null },
      { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
      { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
      { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },

      // 👨‍👩‍👧 SECCIÓN FAMILIA (si tiene hijos)
      ...(hasPlayers ? [
        { title: "─ MIS HIJOS ─", section: true },
        { title: "👨‍👩‍👧 Mis Hijos", url: createPageUrl("ParentPlayers"), icon: Users },
        { title: "💳 Pagos Mis Hijos", url: createPageUrl("ParentPayments"), icon: CreditCard },
        { title: "🏆 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null },
        { title: "🖊️ Firmas Mis Hijos", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },
        { title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText },
      ] : []),
      { title: "🛍️ Tienda", url: createPageUrl("Tienda"), icon: ShoppingBag },
      ...(loteriaVisible ? [{ title: "🍀 Mi Lotería", url: createPageUrl("ParentLottery"), icon: Clover }] : []),

      // 🎫 SOCIO
      { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },

      // ⚙️ CONFIGURACIÓN
      { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
      ...(loteriaVisible ? [{ title: "🍀 Gestión Lotería", url: createPageUrl("LotteryManagement"), icon: Clover }] : []),
    ];



  const coordinatorNavigationItems = [
                // 🎫 CARNET DE SOCIO (si es socio pagado - con o sin hijos)
                ...(programaSociosActivo && isMemberPaid ? [{ 
                  title: "🎫 MI CARNET DE SOCIO", 
                  url: createPageUrl("MemberCardDisplay"), 
                  icon: Users,
                  highlight: true
                }] : []),

                // 🏠 INICIO
                { title: "🏠 Inicio", url: createPageUrl("CoordinatorDashboard"), icon: Home },

    // 💬 CHATS
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },
    { title: "💬 Familias - Coordinador", url: createPageUrl("CoordinatorChat"), icon: MessageCircle, badge: chatMenuCounts.coordinatorCount },
    ...(user?.es_entrenador ? [{ title: "⚽ Familias - Entrenador", url: createPageUrl("CoachParentChat"), icon: MessageCircle, badge: chatMenuCounts.coachCount }] : []),
    { title: "💼 Chat Staff", url: createPageUrl("StaffChat"), icon: MessageCircle, badge: chatMenuCounts.staffCount },

      // ⚽ GESTIÓN DEPORTIVA (trabajo principal)
      { title: user?.es_entrenador ? "🎓 Convocatorias" : "🎓 Ver Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell, badge: pendingCallupResponses > 0 ? pendingCallupResponses : null, urgentBadge: pendingCallupResponses > 0 },
      { title: "📋 Asistencia y Evaluación", url: createPageUrl("TeamAttendanceEvaluation"), icon: CheckCircle2 },
      { title: "🎓 Plantillas", url: createPageUrl("TeamRosters"), icon: Users },
      { title: "📚 Biblioteca Ejercicios", url: createPageUrl("ExerciseLibrary"), icon: FileText },
      { title: "🎯 Pizarra Táctica", url: createPageUrl("TacticsBoard"), icon: Calendar },
      { title: "📊 Competición (Técnicos)", url: createPageUrl("CentroCompeticionTecnico"), icon: BarChart3, badge: pendingMatchObservations > 0 ? pendingMatchObservations : null, urgentBadge: pendingMatchObservations > 0 },
      ...(user?.puede_gestionar_firmas ? [{ title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignaturesAdmin"), icon: FileSignature }] : []),

      // 📊 REPORTES
      { title: "📊 Reportes Entrenadores", url: createPageUrl("CoachEvaluationReports"), icon: Star },

      // 📅 CALENDARIO
      { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
            { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
            { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },

      // 👤 PERFIL
      { title: "👤 Mi Perfil Entrenador", url: createPageUrl("CoachProfile"), icon: UserCircle },

      // ⚽ SOY JUGADOR +18 (si también es jugador)
      ...(isPlayer ? [
        { title: "─ MI PERFIL JUGADOR ─", section: true },
        { title: "⚽ Mi Perfil Jugador", url: createPageUrl("PlayerProfile"), icon: UserCircle },
        { title: "🏆 Mis Convocatorias (Jugador)", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
        { title: "💳 Mis Pagos (Jugador)", url: createPageUrl("ParentPayments"), icon: CreditCard },
        { title: "🖊️ Mis Firmas (Jugador)", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },
        { title: "📄 Mis Documentos (Jugador)", url: createPageUrl("ParentDocuments"), icon: FileText },
      ] : []),

      // 📢 INFORMACIÓN
      { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone, badge: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : null },
      { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
      { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
      { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },

      // 👨‍👩‍👧 SECCIÓN FAMILIA (si tiene hijos)
      ...(hasPlayers ? [
        { title: "─ MIS HIJOS ─", section: true },
        { title: "👨‍👩‍👧 Mis Hijos", url: createPageUrl("ParentPlayers"), icon: Users },
        { title: "💳 Pagos Mis Hijos", url: createPageUrl("ParentPayments"), icon: CreditCard },
        { title: "🏆 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null },
        { title: "🖊️ Firmas Mis Hijos", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },
        { title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText },
      ] : []),
      { title: "🛍️ Tienda", url: createPageUrl("Tienda"), icon: ShoppingBag },
      ...(loteriaVisible ? [{ title: "🍀 Mi Lotería", url: createPageUrl("ParentLottery"), icon: Clover }] : []),

      // 🎫 SOCIO
      { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },

      // ⚙️ CONFIGURACIÓN
      { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
      ...(loteriaVisible ? [{ title: "🍀 Gestión Lotería", url: createPageUrl("LotteryManagement"), icon: Clover }] : []),
    ];

  const parentNavigationItems = [
                // 🎫 CARNET DE SOCIO (primera posición si es socio pagado - con o sin hijos)
                ...(programaSociosActivo && isMemberPaid ? [{ 
                  title: "🎫 MI CARNET DE SOCIO", 
                  url: createPageUrl("MemberCardDisplay"), 
                  icon: Users,
                  highlight: true
                }] : []),
                ...(isJunta ? [{ title: "🗂️ Tareas Junta", url: createPageUrl("BoardTasks"), icon: ClipboardCheck, highlight: true }] : []),

        // 🏠 INICIO
        { title: "🏠 Inicio", url: createPageUrl("ParentDashboard"), icon: Home },

    // 💬 CHATS
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },
    { title: "🔔 Mensajes del Club", url: createPageUrl("ParentSystemMessages"), icon: Bell, badge: chatMenuCounts.systemMessagesCount },
    { title: "🎓 Chat Coordinador (1-a-1)", url: createPageUrl("ParentCoordinatorChat"), icon: MessageCircle, badge: chatMenuCounts.coordinatorForFamilyCount },
    { title: "⚽ Chat Equipo (Grupal)", url: createPageUrl("ParentCoachChat"), icon: MessageCircle, badge: chatMenuCounts.coachForFamilyCount },

    // ⚽ ACCIONES URGENTES
    { title: "🏆 Convocatorias", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
    { title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },

    // 💰 PAGOS Y JUGADORES
    { title: "💳 Pagos", url: createPageUrl("ParentPayments"), icon: CreditCard },
    { title: "👥 Mis Jugadores", url: createPageUrl("ParentPlayers"), icon: Users },

    // 📅 CALENDARIO Y EVENTOS
    { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
            { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
            { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "🏆 Competición", url: createPageUrl("CentroCompeticion"), icon: Trophy },
    

    // 📢 INFORMACIÓN
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText },

    // 🛍️ PEDIDOS
    { title: "🛍️ Tienda", url: createPageUrl("Tienda"), icon: ShoppingBag },
    ...(loteriaVisible ? [{ title: "🍀 Lotería Navidad", url: createPageUrl("ParentLottery"), icon: Clover }] : []),

    // 🖼️ CONTENIDO
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },

              // 📋 EXTRAS
              { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
              { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },

              // ⚙️ CONFIGURACIÓN
              { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
              ];

  const playerNavigationItems = [
          // 🎫 CARNET DE SOCIO (primera posición si es socio pagado)
          ...(programaSociosActivo && isMemberPaid ? [{ 
            title: "🎫 MI CARNET DE SOCIO", 
            url: createPageUrl("MemberCardDisplay"), 
            icon: Users,
            highlight: true
          }] : []),

          // 🏠 INICIO
          { title: "🏠 Inicio", url: createPageUrl("PlayerDashboard"), icon: Home },
          { title: "👤 Mi Perfil", url: createPageUrl("PlayerProfile"), icon: UserCircle },

    // 💬 CHATS
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },
    { title: "🔔 Mensajes del Club", url: createPageUrl("ParentSystemMessages"), icon: Bell, badge: chatMenuCounts.systemMessagesCount },
    { title: "🎓 Chat Coordinador (1-a-1)", url: createPageUrl("ParentCoordinatorChat"), icon: MessageCircle, badge: chatMenuCounts.coordinatorForFamilyCount },
    { title: "⚽ Chat Equipo (Grupal)", url: createPageUrl("ParentCoachChat"), icon: MessageCircle, badge: chatMenuCounts.coachForFamilyCount },

    // ⚽ DEPORTIVO
    { title: "🏆 Convocatorias", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
    { title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },
    { title: "💳 Mis Pagos", url: createPageUrl("ParentPayments"), icon: CreditCard },

    // 📅 CALENDARIO E INFO
    { title: "📅 Calendario", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
          { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
          { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "🏆 Competición", url: createPageUrl("CentroCompeticion"), icon: Trophy },
    
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
              { title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText },
              { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },
              { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },

              // 🛍️ PEDIDOS
              { title: "🛍️ Tienda", url: createPageUrl("Tienda"), icon: ShoppingBag },
              ...(loteriaVisible ? [{ title: "🍀 Lotería Navidad", url: createPageUrl("ParentLottery"), icon: Clover }] : []),

              // 🎫 EXTRAS
              { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },

              // ⚙️ CONFIGURACIÓN
              { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
  ];

  const treasurerNavigationItems = [
    // 🎫 CARNET DE SOCIO (si es socio pagado - con o sin hijos)
    ...(programaSociosActivo && isMemberPaid ? [{ 
      title: "🎫 MI CARNET DE SOCIO", 
      url: createPageUrl("MemberCardDisplay"), 
      icon: Users,
      highlight: true
    }] : []),

    { title: "🏠 Inicio", url: createPageUrl("TreasurerDashboard"), icon: Home },
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },
    { title: "💳 Pagos Club", url: createPageUrl("Payments"), icon: CreditCard },
    { title: "📊 Panel Financiero", url: createPageUrl("TreasurerFinancialPanel"), icon: BarChart3 },
    { title: "💸 Cobros Extra", url: createPageUrl("ExtraCharges"), icon: CreditCard },
    { title: "🔔 Recordatorios", url: createPageUrl("PaymentReminders"), icon: Bell },
    { title: "📁 Histórico", url: createPageUrl("PaymentHistory"), icon: Archive },
    { title: "🛍️ Tienda", url: createPageUrl("Tienda"), icon: ShoppingBag },
    { title: "🎫 Socios", url: createPageUrl("ClubMembersManagement"), icon: Users },

    // 💬 CHATS FAMILIA (si tiene hijos jugando)
    ...(hasPlayers ? [{ title: "🔔 Mensajes del Club", url: createPageUrl("ParentSystemMessages"), icon: Bell, badge: chatMenuCounts.systemMessagesCount }] : []),
    ...(hasPlayers ? [{ title: "🎓 Chat Coordinador", url: createPageUrl("ParentCoordinatorChat"), icon: MessageCircle, badge: chatMenuCounts.coordinatorForFamilyCount }] : []),
    ...(hasPlayers ? [{ title: "⚽ Chat Equipo", url: createPageUrl("ParentCoachChat"), icon: MessageCircle, badge: chatMenuCounts.coachForFamilyCount }] : []),

    { title: "📅 Calendario", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
          { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
          { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone, badge: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : null },
    ...(hasPlayers ? [{ title: "👨‍👩‍👧 Mis Hijos", url: createPageUrl("ParentPlayers"), icon: Users }] : []),
    ...(hasPlayers ? [{ title: "💳 Pagos Mis Hijos", url: createPageUrl("ParentPayments"), icon: CreditCard }] : []),
    ...(hasPlayers ? [{ title: "🏆 Convocatorias", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 }] : []),
    ...(hasPlayers ? [{ title: "🖊️ Firmas Hijos", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 }] : []),
    ...(hasPlayers ? [{ title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText }] : []),
    ...(loteriaVisible ? [{ title: "🍀 Mi Lotería", url: createPageUrl("ParentLottery"), icon: Clover }] : []),
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },
    { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
  ];

  const minorNavigationItems = [
    { title: "🏠 Inicio", url: createPageUrl("MinorDashboard"), icon: Home },
    { title: "📋 Convocatorias", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
    { title: "📅 Calendario", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🏆 Competición", url: createPageUrl("CentroCompeticion"), icon: Trophy },
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "🎉 Eventos", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "📊 Mis Evaluaciones", url: createPageUrl("PlayerEvaluations"), icon: Star },
    { title: "✉️ Mi Buzón", url: createPageUrl("JuniorMailbox"), icon: MessageCircle },
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
  ];

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

                    // 0) Verificación de código de acceso - TODOS los usuarios sin código validado
                    // Incluye segundos progenitores, juveniles, padres nuevos, jugadores adultos
                    // SEGURIDAD: Solo se puede saltar si el código fue validado explícitamente
                    if (!user.codigo_acceso_validado) {
                      setOnboardingView('access_code');
                      return;
                    }

      // La instalación ya NO es bloqueante - se muestra como banner sugerido dentro de la app
      // Limpiar flags legacy de instalación obligatoria
      localStorage.removeItem('installPromptAfterOnboarding');

      // Normal - sin onboarding
      setOnboardingView('none');
    }, [user]);

    // Activar motores en diferido para evitar ráfaga de llamadas
    useEffect(() => {
      if (!isLoading && user) {
        const id = setTimeout(() => setEnginesReady(true), 1200);
        return () => clearTimeout(id);
      }
    }, [isLoading, user]);

    // Escalonar carga de motores para reducir llamadas concurrentes
    useEffect(() => {
      if (!enginesReady) return;
      const t2 = setTimeout(() => setEnginesStage2Ready(true), 1200);
      const t3 = setTimeout(() => setEnginesStage3Ready(true), 2500);
      return () => { clearTimeout(t2); clearTimeout(t3); };
    }, [enginesReady]);

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
  const isPublicAnon = isPublicPage && authChecked && !user;
  const isPublicLoading = isPublicPage && !authChecked;

  // AHORA SÍ - todos los returns condicionales DESPUÉS de TODOS los hooks
  if (isLoading && !isPublicPage) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh', minHeight: '-webkit-fill-available', minHeight: '100dvh', background: 'linear-gradient(to bottom right, #ea580c, #c2410c, #15803d)' }}>
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

                {/* Pantalla de éxito - totalmente diferente a la app, parece otra web */}
                {showInstallSuccess && (
                <div className="fixed inset-0 z-[999999] bg-gradient-to-br from-green-50 via-sky-50 to-blue-50">
                  <div className="h-full flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center space-y-4">
                      <div className="text-6xl">✅</div>
                      <h1 className="text-2xl font-extrabold text-slate-900">App instalada correctamente</h1>
                      <p className="text-slate-700">Para continuar, no sigas en este navegador.</p>
                      <p className="text-slate-700">Cierra esta ventana y abre la app desde el icono “CD Bustarviejo” que acabas de instalar.</p>
                      <div className="grid gap-3 text-left">
                        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                          <span className="text-green-700 font-bold">1</span>
                          <span className="text-green-800 text-sm">Cierra esta ventana del navegador</span>
                        </div>
                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                          <span className="text-blue-700 font-bold">2</span>
                          <span className="text-blue-800 text-sm">Toca el icono “CD Bustarviejo” en tu pantalla de inicio</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">Si no se cierra automáticamente, ciérrala manualmente.</p>
                    </div>
                  </div>
                </div>
                )}

                {/* Invitación primer arranque desde el icono PWA */}
                {showFirstLaunchInvite && (
                <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
                    <div className="space-y-5">
                      <div className="text-7xl mb-2">👋</div>
                      <h2 className="text-3xl font-black text-slate-900">¡Bienvenido!</h2>
                      <p className="text-lg text-slate-700">
                        Para comenzar a usar la app, necesitas {user?.tipo_panel === 'familia' ? 'dar de alta a tus jugadores' : 'completar tu perfil de jugador'}.
                      </p>
                      <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
                        <p className="text-sm text-orange-900 font-bold">
                          {user?.tipo_panel === 'familia' ? '👨‍👩‍👧 Registra a tus hijos ahora' : '⚽ Completa tu ficha de jugador'}
                        </p>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 py-6 text-base" 
                          onClick={() => { 
                            setShowFirstLaunchInvite(false); 
                            localStorage.setItem('firstLaunchDone', 'true'); 
                          }}
                        >
                          Ahora no
                        </Button>
                        <Button 
                          className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white py-6 text-base font-bold" 
                          onClick={() => {
                            localStorage.setItem('firstLaunchDone', 'true');
                            setShowFirstLaunchInvite(false);
                            const target = user?.tipo_panel === 'familia' 
                              ? createPageUrl('ParentPlayers') 
                              : createPageUrl('PlayerProfile');
                            window.location.href = target;
                          }}
                        >
                          {user?.tipo_panel === 'familia' ? 'Registrar jugadores' : 'Completar perfil'} →
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {enginesReady && (
                  <Suspense fallback={null}>
                    <SessionManager />
                  </Suspense>
                )}

                {enginesStage2Ready && (
                                        <Suspense fallback={null}>
                                          <NotificationBadge />
                                          <PaymentApprovalNotifier isAdmin={isAdmin} />
                                          {/* ClothingApprovalNotifier desactivado - equipación gestionada por proveedor externo */}
                                        </Suspense>
                                      )}

                {enginesStage3Ready && (
                                        <Suspense fallback={null}>
                                          <PlanPaymentReminders user={user} />
                                          <AutomaticRenewalReminders />
                                          <AutomaticRenewalClosure />
                                          <RenewalNotificationEngine />
                                          <PostRenewalPaymentReminder />
                                          {/* ChatSoundNotifier eliminado - se reimplementará */}
                                          <CallupSoundNotifier user={user} />
                                          <AnnouncementSoundNotifier user={user} />
                                          <PaymentSoundNotifier user={user} />
                                        </Suspense>
                                      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 shadow-lg safe-area-top" style={{ background: 'linear-gradient(to right, #ea580c, #c2410c)' }}>
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2">
              <MobileBackButton />
              <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-9 h-9 rounded-lg shadow-lg object-cover" />
              <div className="text-white">
                <h1 className="font-bold text-base leading-tight">CD Bustarviejo</h1>
                <p className="text-xs text-orange-100 truncate max-w-[140px]" title={user?.email}>
                  {isAdmin ? "Admin" : isCoordinator ? "Coordinador" : isTreasurer ? "Tesorero" : isCoach ? "Entrenador" : isPlayer ? (playerName || "Jugador") : user?.email?.split('@')[0] || "Familia"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
               <button
                 onClick={() => { setInstallContext('manual'); setShowInstallInstructions(true); }}
                 className="p-2 bg-green-500 text-white rounded-xl animate-pulse shadow-lg"
                 title="Ver cómo instalar"
               >
                 <Smartphone className="w-5 h-5" />
               </button>

               {/* Badges adicionales para chats en móvil (coordinador y entrenador) */}
               {!isAdmin && chatMenuCounts.coordinatorForFamilyCount > 0 && (
                 <div className="px-2 py-1 bg-cyan-500 text-white text-xs rounded-lg font-bold">
                   💬 {chatMenuCounts.coordinatorForFamilyCount}
                 </div>
               )}
               {!isAdmin && chatMenuCounts.coachForFamilyCount > 0 && (
                 <div className="px-2 py-1 bg-blue-500 text-white text-xs rounded-lg font-bold">
                   ⚽ {chatMenuCounts.coachForFamilyCount}
                 </div>
               )}
               {!isAdmin && chatMenuCounts.systemMessagesCount > 0 && (
                 <div className="px-2 py-1 bg-orange-500 text-white text-xs rounded-lg font-bold">
                   🔔 {chatMenuCounts.systemMessagesCount}
                 </div>
               )}
               {isCoordinator && chatMenuCounts.coordinatorCount > 0 && (
                 <div className="px-2 py-1 bg-cyan-500 text-white text-xs rounded-lg font-bold">
                   👨‍👩‍👧 {chatMenuCounts.coordinatorCount}
                 </div>
               )}
               {isCoach && chatMenuCounts.coachCount > 0 && (
                 <div className="px-2 py-1 bg-blue-500 text-white text-xs rounded-lg font-bold">
                   ⚽ {chatMenuCounts.coachCount}
                 </div>
               )}
               {(isCoordinator || isCoach || isAdmin) && chatMenuCounts.staffCount > 0 && (
                 <div className="px-2 py-1 bg-purple-500 text-white text-xs rounded-lg font-bold">
                   💼 {chatMenuCounts.staffCount}
                 </div>
               )}

               {enginesReady && (<Suspense fallback={null}><NotificationCenter /></Suspense>)}
               <ThemeToggle />
               <button
                 onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                 className="p-3 text-white hover:bg-white/20 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center relative"
               >
                 {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}

               </button>
             </div>
          </div>
        </header>

        {/* Mobile Search Bar */}
        <div className="lg:hidden fixed top-[52px] left-0 right-0 z-40 bg-white border-b shadow-sm p-2">
          {enginesReady && (<Suspense fallback={null}><GlobalSearch isAdmin={isAdmin} isCoach={isCoach} /></Suspense>)}
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-[100]" style={{ backgroundColor: 'rgba(15, 23, 42, 0.97)' }}>
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-600 to-orange-700">
                <div className="text-white">
                  <h2 className="font-bold text-lg">Menú</h2>
                  <p className="text-xs text-orange-100">CD Bustarviejo</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowDeleteAccount(true);
                    }}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-xl transition-colors"
                    title="Eliminar cuenta"
                  >
                    <UserX className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-white hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {/* Botón Feedback móvil - para TODOS */}
                {isAdmin ? (
                  <Link
                    to={createPageUrl("FeedbackManagement")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg mb-4"
                  >
                    <MessageCircle className="w-6 h-6 flex-shrink-0" />
                    <span className="font-bold text-base flex-1">💬 Ver Feedback Usuarios</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowFeedback(true);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg mb-4"
                  >
                    <MessageCircle className="w-6 h-6 flex-shrink-0" />
                    <span className="font-bold text-base flex-1">💬 Suggerencias y Bugs</span>
                  </button>
                )}

                {/* Botón Instalar App al principio del menú móvil - solo si no está instalada */}
                {!isAppInstalled && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setInstallContext('manual');
                      setShowInstallInstructions(true);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg mb-4"
                  >
                    <Smartphone className="w-6 h-6 flex-shrink-0" />
                    <span className="font-bold text-base flex-1">📲 Ver cómo instalar la App</span>
                  </button>
                )}

                {navigationItems.map((item) => {
                  if (item.section) {
                    return (
                      <div key={item.title} className="px-2 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">
                        {item.title}
                      </div>
                    );
                  }
                  return item.externalUrl ? (
                    <a
                      key={item.title}
                      href={item.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                        item.highlight
                          ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg ring-2 ring-green-400 animate-pulse'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <item.icon className="w-6 h-6 flex-shrink-0" />
                      <span className="font-semibold text-base flex-1">{item.title}</span>
                    </a>
                  ) : (
                    <Link
                      key={item.title}
                      to={item.url}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                        item.highlight
                          ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg ring-2 ring-green-400 animate-pulse'
                          : location.pathname === item.url
                          ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <item.icon className="w-6 h-6 flex-shrink-0" />
                      <span className="font-semibold text-base flex-1">{item.title}</span>
                      {item.badge && (
                        <Badge className={`${item.urgentBadge ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}>
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
              <div className="p-4 bg-slate-900 border-t border-white/10 space-y-2">
                                                  {!isAppInstalled && (
                                                    <button
                                                      onClick={() => {
                                                        setMobileMenuOpen(false);
                                                        setInstallContext('manual');
                                                        setShowInstallInstructions(true);
                                                      }}
                                                                                          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-green-500/20 text-white hover:bg-green-500/30 transition-all"
                                                                                        >
                                                                                          <Smartphone className="w-6 h-6" />
                                                                                          <span className="font-semibold text-lg">📲 Ver cómo instalar</span>
                                                                                        </button>
                                                                                      )}

                                                    <button
                                                    onClick={() => window.location.reload()}
                                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all mb-2 ${hasNewVersion ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg animate-pulse' : 'bg-blue-500/20 text-white hover:bg-blue-500/30'}`}
                                                    >
                                                    <RotateCw className="w-6 h-6" />
                                                    <span className="font-semibold text-lg">{hasNewVersion ? '🆕 Nueva versión disponible' : 'Actualizar Datos'}</span>
                                                    </button>

                                                    <button
                                                                                     onClick={() => { setMobileMenuOpen(false); setShowDeleteAccount(true); }}
                                                                                     className="w-full flex items-center gap-4 p-4 rounded-2xl bg-yellow-500/20 text-white hover:bg-yellow-500/30 transition-all"
                                                                                     >
                                                    <UserX className="w-6 h-6" />
                                                    <span className="font-semibold text-lg">Eliminar Cuenta</span>
                                                    </button>

                                                    <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/20 text-white hover:bg-red-500/30 transition-all"
                                                    >
                                                    <LogOut className="w-6 h-6" />
                                                    <span className="font-semibold text-lg">Cerrar Sesión</span>
                                                    </button>
                                                    </div>
            </div>
          </div>
        )}

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

        {/* Notificación de nueva versión disponible */}
        {showUpdateNotification && (
          <div className="fixed top-[52px] lg:top-0 left-0 right-0 z-[150] bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xl">🎉</span>
                <div>
                  <p className="font-bold">¡Actualización disponible!</p>
                  <p className="text-xs opacity-90">Una nueva versión de la app está lista para instalar</p>
                </div>
              </div>
              <Button
                onClick={() => {
                  localStorage.setItem('app_build_version', BUILD_VERSION);
                  setShowUpdateNotification(false);
                  window.location.reload();
                }}
                className="bg-white text-green-600 hover:bg-gray-100 font-bold whitespace-nowrap"
                size="sm"
              >
                Actualizar ahora
              </Button>
            </div>
          </div>
        )}

        {rateLimited && (
          <div className="fixed top-[84px] lg:top-10 left-0 right-0 z-[150] bg-yellow-500 text-white px-4 py-2 text-center shadow">
            Se ha alcanzado el límite de peticiones. Reintentamos en unos segundos…
          </div>
        )}

        <main className={`lg:ml-72 pt-[100px] lg:pt-0 ${sponsorBannerVisible ? 'pb-24 lg:pb-20' : 'pb-20 lg:pb-4'}`} style={{ minHeight: '100vh', minHeight: '-webkit-fill-available' }}>

          {/* Widget de cumpleaños hoy */}


        <ActiveBanner position="top" user={user} />

          {extraChargeVisible && (
            <ExtraChargeBanner charge={extraChargeVisible} onOpen={() => setExtraChargeModalOpen(true)} />
          )}
          <PullToRefresh>
            <div className="page-transition-wrapper">
              {children}
            </div>
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
          {showPaymentSuccess && (
            <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-6">
              <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
                <div className="text-6xl mb-2">✅</div>
                <h2 className="text-2xl font-bold">Pago realizado con éxito</h2>
                <p className="text-slate-600 mt-1">Hemos registrado tu pago correctamente.</p>
              </div>
            </div>
          )}

          {/* Modal de felicitación de cumpleaños */}


                  {/* Modal Feedback */}
                  <FeedbackModal
                    open={showFeedback}
                    onOpenChange={setShowFeedback}
                    user={user}
                    currentPage={currentPageName}
                  />
          </main>


        {/* Banner de Patrocinadores - Footer fijo */}
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

        {sponsorBannerVisible && (
                        <div className={`lg:ml-72 fixed left-0 right-0 z-40 bottom-0`}>
                          <Suspense fallback={null}><SponsorBanner /></Suspense>
                        </div>
                      )}
        </div>
        </>
        </ChatUnreadProvider>
        </SeasonProvider>
        );

}