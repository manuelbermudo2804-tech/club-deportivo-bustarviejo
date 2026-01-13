import React, { useState, useEffect, Suspense } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";


import { Home, Users, CreditCard, ShoppingBag, Menu, Bell, LogOut, Calendar, Megaphone, Mail, Archive, Settings, MessageCircle, Clock, Image, X, User as UserIcon, ClipboardCheck, Star, Award, FileText, Clover, UserCircle, FileSignature, Gift, Smartphone, Download, BarChart3, ShieldAlert, UserX, RotateCw, CheckCircle2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const NotificationBadge = React.lazy(() => import("./components/NotificationBadge"));
const SessionManager = React.lazy(() => import("./components/SessionManager"));
const GlobalSearch = React.lazy(() => import("./components/GlobalSearch"));
import ThemeToggle from "./components/ThemeToggle";
import NotificationCenter from "./components/NotificationCenter";
import LanguageSelector from "./components/LanguageSelector";
const AppNotificationListener = React.lazy(() => import("./components/push/AppNotificationListener"));
const RegistrationTypeSelector = React.lazy(() => import("./components/players/RegistrationTypeSelector"));
const WelcomeScreen = React.lazy(() => import("./components/WelcomeScreen"));
import { Dialog, DialogContent } from "@/components/ui/dialog";
const NotificationManager = React.lazy(() => import("./components/notifications/NotificationManager"));
const AutomaticNotificationEngine = React.lazy(() => import("./components/notifications/AutomaticNotificationEngine"));
const EmailNotificationTrigger = React.lazy(() => import("./components/notifications/EmailNotificationTrigger"));
const AutomaticPaymentReminders = React.lazy(() => import("./components/reminders/AutomaticPaymentReminders"));
const PlanPaymentReminders = React.lazy(() => import("./components/reminders/PlanPaymentReminders"));
import AutomaticRenewalReminders from "./components/reminders/AutomaticRenewalReminders";
const AutomaticRenewalClosure = React.lazy(() => import("./components/renewals/AutomaticRenewalClosure.jsx"));
const RenewalNotificationEngine = React.lazy(() => import("./components/renewals/RenewalNotificationEngine.jsx"));
const PostRenewalPaymentReminder = React.lazy(() => import("./components/renewals/PostRenewalPaymentReminder.jsx"));
const PaymentApprovalNotifier = React.lazy(() => import("./components/payments/PaymentApprovalNotifier"));


// ToastContainer eliminado - causaba spam de notificaciones
const EventReminderEngine = React.lazy(() => import("./components/events/EventReminderEngine"));
const DocumentReminderEngine = React.lazy(() => import("./components/documents/DocumentReminderEngine"));
const SponsorBanner = React.lazy(() => import("./components/sponsors/SponsorBanner"));
const PWAInstallPrompt = React.lazy(() => import("./components/pwa/PWAInstallPrompt"));


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

function ClosedSeasonScreen({ user, isAdmin }) {
  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-green-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-12 text-center space-y-6">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <img 
                  src={CLUB_LOGO_URL} 
                  alt="CD Bustarviejo"
                  className="w-32 h-32 object-contain drop-shadow-2xl"
                />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl md::text-5xl font-bold text-slate-900">
                🔒 Cierre de Temporada
              </h1>
              <p className="text-2xl text-orange-600 font-semibold">
                CD Bustarviejo
              </p>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl p-8 space-y-4 border-2 border-orange-200">
              <p className="text-xl text-slate-800 leading-relaxed">
                La aplicación está cerrada durante el mes de <strong className="text-orange-700">Mayo</strong> por cierre de temporada.
              </p>
              <p className="text-lg text-slate-700">
                Estamos preparando todo para las <strong className="text-orange-700">inscripciones de Junio</strong> y la nueva temporada que comenzará en <strong className="text-green-700">Septiembre</strong>.
              </p>
            </div>
            <div className="text-8xl">
              📋
            </div>
            <div className="space-y-3 pt-4">
              <div className="bg-gradient-to-r from-slate-900 to-black border-2 border-green-500 rounded-xl p-6">
                <p className="text-xl font-bold text-orange-500 mb-3">
                  📅 Calendario Importante
                </p>
                <div className="text-left space-y-2">
                  <p className="text-white">
                    <strong className="text-orange-400">Mayo:</strong> Cierre de temporada (aplicación cerrada)
                  </p>
                  <p className="text-white">
                    <strong className="text-green-400">Junio-Julio:</strong> Inscripciones abiertas + Pedidos de ropa
                  </p>
                  <p className="text-white">
                    <strong className="text-orange-400">Agosto:</strong> Vacaciones de verano
                  </p>
                  <p className="text-white">
                    <strong className="text-green-400">Septiembre:</strong> Inicio de la nueva temporada
                  </p>
                </div>
              </div>
            </div>
            {user && (
              <div className="pt-6 border-t-2 border-slate-200 space-y-3">
                <div className="text-sm text-slate-600">
                  <p className="font-medium text-slate-900">{user.full_name}</p>
                  <p>{user.email}</p>
                  {isAdmin && (
                    <Badge className="mt-2 bg-orange-600">
                      Administrador
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="hover:bg-slate-100"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>
            )}
            <div className="pt-6 border-t-2 border-slate-200">
              <p className="text-sm text-slate-600 mb-2">
                Para cualquier consulta:
              </p>
              <div className="space-y-1">
                <a 
                  href="mailto:C.D.BUSTARVIEJO@HOTMAIL.ES"
                  className="text-sm text-orange-600 hover:text-orange-700 block font-medium"
                >
                  C.D.BUSTARVIEJO@HOTMAIL.ES
                </a>
                <a 
                  href="mailto:CDBUSTARVIEJO@GMAIL.COM"
                  className="text-sm text-orange-600 hover:text-orange-700 block font-medium"
                >
                  CDBUSTARVIEJO@GMAIL.COM
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InscriptionPeriodScreen({ user, isAdmin }) {
  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-900 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-12 text-center space-y-6">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <img 
                  src={CLUB_LOGO_URL} 
                  alt="CD Bustarviejo"
                  className="w-32 h-32 object-contain drop-shadow-2xl"
                />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
                📝 Periodo de Inscripciones
              </h1>
              <p className="text-2xl text-green-700 font-semibold">
                CD Bustarviejo - Junio y Julio
              </p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-8 space-y-4 border-2 border-green-300">
              <p className="text-xl text-slate-800 leading-relaxed">
                ¡Bienvenidos al periodo de <strong className="text-green-700">inscripciones de Junio y Julio</strong>!
              </p>
              <p className="text-lg text-slate-700">
                Durante estos meses puedes <strong className="text-green-700">registrar a tus jugadores</strong> y <strong className="text-orange-600">pedir equipación</strong> para la próxima temporada que comenzará en <strong className="text-green-700">Septiembre</strong>.
              </p>
            </div>
            <div className="text-8xl animate-bounce">
              ✍️
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-xl p-6">
                <p className="text-lg font-bold text-green-900 mb-3">
                  📋 Inscripciones
                </p>
                <div className="text-left space-y-2 text-sm">
                  <p className="text-slate-700">
                    ✅ <strong>Registro de nuevos jugadores</strong>
                  </p>
                  <p className="text-slate-700">
                    ✅ <strong>Renovación de jugadores</strong>
                  </p>
                  <p className="text-slate-700">
                    ✅ <strong>Actualización de datos</strong>
                  </p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-xl p-6">
                <p className="text-lg font-bold text-orange-900 mb-3">
                  🛍️ Equipación
                </p>
                <div className="text-left space-y-2 text-sm">
                  <p className="text-slate-700">
                    ✅ <strong>Chaqueta de partidos</strong>
                  </p>
                  <p className="text-slate-700">
                    ✅ <strong>Pack de entrenamiento</strong>
                  </p>
                  <p className="text-slate-700">
                    ✅ <strong>Pedidos para septiembre</strong>
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl p-6 space-y-3 border-2 border-orange-300">
              <p className="text-xl font-bold text-orange-900 flex items-center justify-center gap-2">
                🛍️ Pedidos de Equipación
              </p>
              <p className="text-slate-700 leading-relaxed">
                <strong className="text-orange-700">Aprovecha Junio y Julio</strong> para pedir la equipación de tus jugadores. 
                Los pedidos se cerrarán en Agosto.
              </p>
              <div className="bg-white rounded-lg p-4 text-left">
                <p className="text-sm text-slate-600 mb-2">📍 <strong>Recogida:</strong></p>
                <p className="text-sm text-slate-700">
                  Los pedidos se entregarán en las instalaciones del club durante la primera semana de Septiembre.
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 pt-4">
              <Link to={isAdmin ? createPageUrl("Players") : createPageUrl("ParentPlayers")} className="w-full">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg shadow-xl">
                  <Users className="w-5 h-5 mr-2" />
                  {isAdmin ? "Gestionar Jugadores" : "Mis Jugadores"}
                </Button>
              </Link>
              
              <Link to={createPageUrl("ClothingOrders")} className="w-full">
                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-6 text-lg shadow-xl">
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Pedidos de Equipación
                </Button>
              </Link>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
              <p>⏸️ <strong>Resto de funciones</strong> (pagos cuotas, calendario, etc.) estarán disponibles en <strong>Septiembre</strong> con el inicio de la temporada.</p>
            </div>
            {user && (
              <div className="pt-6 border-t-2 border-slate-200 space-y-3">
                <div className="text-sm text-slate-600">
                  <p className="font-medium text-slate-900">{user.full_name}</p>
                  <p>{user.email}</p>
                  {isAdmin && (
                    <Badge className="mt-2 bg-green-600">
                      Administrador
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="hover:bg-slate-100"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>
            )}
            <div className="pt-6 border-t-2 border-slate-200">
              <p className="text-sm text-slate-600 mb-2">
                ¿Necesitas ayuda?
              </p>
              <a 
                href="mailto:CDBUSTARVIEJO@GMAIL.COM"
                className="text-sm text-green-600 hover:text-green-700 block font-medium"
              >
                CDBUSTARVIEJO@GMAIL.COM
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VacationPeriodScreen({ user, isAdmin }) {
  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-green-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-12 text-center space-y-6">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <img 
                  src={CLUB_LOGO_URL} 
                  alt="CD Bustarviejo"
                  className="w-32 h-32 object-contain drop-shadow-2xl"
                />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
                🏖️ Vacaciones de Verano
              </h1>
              <p className="text-2xl text-orange-600 font-semibold">
                CD Bustarviejo
              </p>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-green-50 rounded-2xl p-8 space-y-4 border-2 border-orange-200">
              <p className="text-xl text-slate-800 leading-relaxed">
                La aplicación del club está cerrada durante el mes de <strong className="text-orange-700">Agosto</strong>.
              </p>
              <p className="text-lg text-slate-700">
                Estamos de vacaciones. La aplicación volverá a estar disponible el <strong className="text-green-700">1 de Septiembre</strong> con el inicio de la nueva temporada.
              </p>
            </div>
            <div className="text-8xl animate-bounce">
              ☀️
            </div>
            <div className="space-y-3 pt-4">
              <p className="text-2xl font-bold text-slate-900">
                ¡Disfruta del verano!
              </p>
              <p className="text-lg text-slate-600">
                Nos vemos en septiembre con muchas ganas e ilusión para la nueva temporada
              </p>
              <p className="text-3xl mt-4">
                ⚽ 🏀 💪
              </p>
            </div>
            {user && (
              <div className="pt-6 border-t-2 border-slate-200 space-y-3">
                <div className="text-sm text-slate-600">
                  <p className="font-medium text-slate-900">{user.full_name}</p>
                  <p>{user.email}</p>
                  {isAdmin && (
                    <Badge className="mt-2 bg-orange-600">
                      Administrador
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="hover:bg-slate-100"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>
            )}
            <div className="pt-6 border-t-2 border-slate-200">
              <p className="text-sm text-slate-600 mb-2">
                Para consultas urgentes:
              </p>
              <a 
                href="mailto:CDBUSTARVIEJO@GMAIL.COM"
                className="text-sm text-orange-600 hover:text-orange-700 block font-medium"
              >
                CDBUSTARVIEJO@GMAIL.COM
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RestrictedAccessScreen({ user, restriction }) {
  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm border-2 border-orange-500">
          <CardContent className="p-12 text-center space-y-6">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <img 
                  src={CLUB_LOGO_URL} 
                  alt="CD Bustarviejo"
                  className="w-32 h-32 object-cover drop-shadow-2xl opacity-50 rounded-2xl"
                />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
                Acceso Restringido
              </h1>
              <p className="text-2xl text-orange-600 font-semibold">
                CD Bustarviejo
              </p>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl p-8 space-y-4 border-2 border-orange-300">
              <p className="text-xl text-slate-800 leading-relaxed">
                Tu acceso a la aplicación ha sido <strong className="text-orange-700">restringido</strong>.
              </p>
              {restriction?.motivo_restriccion && (
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-1">Motivo:</p>
                  <p className="text-lg text-slate-900 font-medium">
                    {restriction.motivo_restriccion}
                  </p>
                </div>
              )}
            </div>
            <div className="text-8xl">
              😔
            </div>
            <div className="space-y-3 pt-4">
              <p className="text-xl font-bold text-slate-900">
                ¿Necesitas ayuda?
              </p>
              <p className="text-lg text-slate-600">
                Si crees que esto es un error o deseas más información, por favor contacta con el club
              </p>
            </div>
            {user && (
              <div className="pt-6 border-t-2 border-slate-200 space-y-3">
                <div className="text-sm text-slate-600">
                  <p className="font-medium text-slate-900">{user.full_name}</p>
                  <p>{user.email}</p>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="hover:bg-slate-100"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>
            )}
            <div className="pt-6 border-t-2 border-slate-200">
              <p className="text-sm text-slate-600 mb-2">
                Contacto del club:
              </p>
              <div className="space-y-1">
                <a 
                  href="mailto:C.D.BUSTARVIEJO@HOTMAIL.ES"
                  className="text-sm text-orange-600 hover:text-orange-700 block font-medium"
                >
                  C.D.BUSTARVIEJO@HOTMAIL.ES
                </a>
                <a 
                  href="mailto:CDBUSTARVIEJO@GMAIL.COM"
                  className="text-sm text-orange-600 hover:text-orange-700 block font-medium"
                >
                  CDBUSTARVIEJO@GMAIL.COM
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  console.log('🏗️ [LAYOUT] Layout montado con:', { 
    currentPageName, 
    pathname: window.location.pathname,
    childrenType: typeof children,
    childrenExists: !!children 
  });
  
  const location = useLocation();
  const navigate = useNavigate();
  const currentSeason = getCurrentSeason();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [isTreasurer, setIsTreasurer] = useState(false);
  const [isPlayer, setIsPlayer] = useState(false);
  const [hasPlayers, setHasPlayers] = useState(false);
  const [playerName, setPlayerName] = useState(null);
  const [onboardingView, setOnboardingView] = useState('loading');

  const [pendingCallupsCount, setPendingCallupsCount] = useState(0);
  const [pendingSignaturesCount, setPendingSignaturesCount] = useState(0);
  const [pendingCallupResponses, setPendingCallupResponses] = useState(0);
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);
  const [hasActiveAdminConversation, setHasActiveAdminConversation] = useState(false);
  const [pendingMatchObservations, setPendingMatchObservations] = useState(0);
  const [isJunta, setIsJunta] = useState(false);
  
  // Badges para admin
  const [unresolvedAdminChats, setUnresolvedAdminChats] = useState(0);
  const [paymentsInReview, setPaymentsInReview] = useState(0);
  const [playersNeedingReview, setPlayersNeedingReview] = useState(0);
  const [pendingSignaturesAdmin, setPendingSignaturesAdmin] = useState(0);
  const [pendingInvitations, setPendingInvitations] = useState(0);
  const [pendingClothingOrders, setPendingClothingOrders] = useState(0);
  const [pendingLotteryOrders, setPendingLotteryOrders] = useState(0);
  const [pendingMemberRequests, setPendingMemberRequests] = useState(0);

  const [showSpecialScreen, setShowSpecialScreen] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('es');
  const [loteriaVisible, setLoteriaVisible] = useState(false);
  const [sponsorBannerVisible, setSponsorBannerVisible] = useState(false);
  const [showMemberCard, setShowMemberCard] = useState(false);
  const [memberCardActive, setMemberCardActive] = useState(false);
  const [isMemberPaid, setIsMemberPaid] = useState(false);
  const [programaSociosActivo, setProgramaSociosActivo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [showFirstTimeRegistration, setShowFirstTimeRegistration] = useState(false);
  const [showInstallSuccess, setShowInstallSuccess] = useState(false);
  const [showFirstLaunchInvite, setShowFirstLaunchInvite] = useState(false);

  const [isAppInstalled, setIsAppInstalled] = useState(false);

  const [showWelcome, setShowWelcome] = useState(false);
  
  const [installDismissed, setInstallDismissed] = useState(false);
  // isIOS/isAndroid definidos arriba para evitar TDZ
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

      // Detectar si la app está instalada - solo por localStorage (marcado manual)
                  useEffect(() => {
                    const userMarkedInstalled = localStorage.getItem('pwaInstalled') === 'true';
                    setIsAppInstalled(userMarkedInstalled);
                  }, []);

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

  // Cargar configuración de temporada solo una vez al montar
  const [seasonConfigLoaded, setSeasonConfigLoaded] = useState(false);
  
  useEffect(() => {
    if (seasonConfigLoaded) return;
    
    const fetchSeasonConfig = async () => {
      try {
        const configs = await base44.entities.SeasonConfig.filter({ activa: true });
        const activeConfig = configs[0];
        setLoteriaVisible(activeConfig?.loteria_navidad_abierta === true);
        setSponsorBannerVisible(activeConfig?.mostrar_patrocinadores === true);
        setProgramaSociosActivo(activeConfig?.programa_socios_activo === true);
        setSeasonConfigLoaded(true);
      } catch (error) {
        console.error("Error fetching season config:", error);
      }
    };
    fetchSeasonConfig();
  }, [seasonConfigLoaded]);

  // Detectar si estamos en página pública (ClubMembership, ValidateSecondParent, ValidateAdminInvitation)
  const isPublicPage = location.pathname.includes('ClubMembership') || 
                       location.pathname.includes('ValidateSecondParent') ||
                       location.pathname.includes('ValidateAdminInvitation');
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
                        console.log('🔐 [LAYOUT DEBUG] Iniciando fetchUser...');
                        try {
                        // Fix para PWA: detectar si estamos en standalone mode
                        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                                     window.navigator.standalone === true;
                        console.log('📱 [LAYOUT] Modo standalone (PWA):', isStandalone);

                        // Verificar si es primera vez del usuario (mostrar WelcomeScreen)
                        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
                        if (!hasSeenWelcome && !isPublicPage) {
                          setShowWelcome(true);
                        }

                        // Procesar token de invitación si existe
                        const urlParams = new URLSearchParams(window.location.search);
                        const invitationToken = urlParams.get('invitation_token');
                        const invitationType = urlParams.get('type');

                        if (invitationToken && invitationType) {
                          try {
                            const isAuth = await base44.auth.isAuthenticated();
                            if (!isAuth) {
                              // Usuario NO logueado - guardar token y redirigir manualmente
                              console.log('🔐 Usuario no logueado - guardando token y redirigiendo a login');

                              // Guardar token en localStorage para recuperarlo después del login
                              localStorage.setItem('pending_invitation_token', invitationToken);
                              localStorage.setItem('pending_invitation_type', invitationType);

                              // Redirigir MANUALMENTE al login de Base44 con nextUrl explícito
                              const loginUrl = 'https://app.base44.com/login';
                              const returnUrl = encodeURIComponent('https://app.cdbustarviejo.com');
                              window.location.href = `${loginUrl}?nextUrl=${returnUrl}`;
                              return;
                            }

                            // Usuario ya logueado, procesar token
                            console.log('✅ Procesando token de invitación...');
                            const entityName = invitationType === 'second_parent' ? 'SecondParentInvitation' : 'AdminInvitation';
                            const invitations = await base44.entities[entityName].filter({ token: invitationToken });

                            if (invitations.length > 0 && invitations[0].estado === 'pendiente') {
                              await base44.entities[entityName].update(invitations[0].id, {
                                estado: 'aceptada',
                                fecha_aceptacion: new Date().toISOString()
                              });
                              console.log('✅ Invitación aceptada');
                            }

                            // Limpiar URL y localStorage
                            window.history.replaceState({}, '', window.location.pathname);
                            localStorage.removeItem('pending_invitation_token');
                            localStorage.removeItem('pending_invitation_type');
                          } catch (err) {
                            console.log('Error procesando token:', err);
                          }
                        } else {
                          // Verificar si hay token guardado en localStorage (después de login)
                          const savedToken = localStorage.getItem('pending_invitation_token');
                          const savedType = localStorage.getItem('pending_invitation_type');

                          if (savedToken && savedType) {
                            try {
                              console.log('🔄 Recuperando token de invitación desde localStorage...');
                              const isAuth = await base44.auth.isAuthenticated();

                              if (isAuth) {
                                // Procesar token guardado
                                const entityName = savedType === 'second_parent' ? 'SecondParentInvitation' : 'AdminInvitation';
                                const invitations = await base44.entities[entityName].filter({ token: savedToken });

                                if (invitations.length > 0 && invitations[0].estado === 'pendiente') {
                                  await base44.entities[entityName].update(invitations[0].id, {
                                    estado: 'aceptada',
                                    fecha_aceptacion: new Date().toISOString()
                                  });
                                  console.log('✅ Invitación aceptada desde localStorage');
                                }

                                // Limpiar localStorage
                                localStorage.removeItem('pending_invitation_token');
                                localStorage.removeItem('pending_invitation_type');
                              }
                            } catch (err) {
                              console.log('Error procesando token guardado:', err);
                              // Limpiar localStorage en caso de error
                              localStorage.removeItem('pending_invitation_token');
                              localStorage.removeItem('pending_invitation_type');
                            }
                          }
                        }

                        // Si es página pública, verificar si hay usuario autenticado sin forzar login
                        if (isPublicPage) {
          try {
            const isAuthenticated = await base44.auth.isAuthenticated();
            if (!isAuthenticated) {
              // Usuario no autenticado en página pública - permitir acceso sin login
              setUser(null);
              setAuthChecked(true);
              return;
            }
            // Intentar obtener usuario, pero si falla, permitir acceso anónimo
            try {
              const currentUser = await base44.auth.me();
              setUser(currentUser);
              setAuthChecked(true);
            } catch (userError) {
              // Usuario autenticado pero no existe en la BD - permitir acceso anónimo
              console.log("Usuario no encontrado en BD, acceso anónimo permitido");
              setUser(null);
              setAuthChecked(true);
              return;
            }
            return;
          } catch (authError) {
            // Error al verificar autenticación - permitir acceso anónimo
            setUser(null);
            setAuthChecked(true);
            return;
          }
        }

        let currentUser;
        try {
          currentUser = await base44.auth.me();
          console.log('✅ [LAYOUT DEBUG] Usuario cargado:', currentUser.email);
        } catch (authError) {
          console.error('❌ [LAYOUT] Error auth.me():', authError);
          setIsLoading(false);
          // Si falla la autenticación, redirigir al login
          base44.auth.redirectToLogin();
          return;
        }

        setUser(currentUser);
        setIsAdmin(currentUser.role === "admin");
        setIsCoach(currentUser.es_entrenador === true && !currentUser.es_coordinador);
        setIsCoordinator(currentUser.es_coordinador === true);
        setIsTreasurer(currentUser.es_tesorero === true);
        setIsJunta(currentUser.es_junta === true);

        // DETECCIÓN DE JUGADOR +18
        // 1. Si el usuario tiene tipo_panel = 'jugador_adulto' O es_jugador = true, ES JUGADOR (aunque no tenga ficha aún)
        // 2. Si no tiene esos campos, buscar si hay una ficha de Player vinculada
        let playerDetected = currentUser.tipo_panel === 'jugador_adulto' || currentUser.es_jugador === true;

        console.log('🔍 [LAYOUT] Verificación inicial jugador:', {
          email: currentUser.email,
          tipo_panel: currentUser.tipo_panel,
          es_jugador: currentUser.es_jugador,
          playerDetected
        });

        if (!playerDetected && currentUser.role !== "admin" && !currentUser.es_entrenador && !currentUser.es_coordinador && !currentUser.es_tesorero) {
          try {
            const linkedCandidates = await base44.entities.Player.filter({ 
              email_jugador: currentUser.email, 
              acceso_jugador_autorizado: true, 
              activo: true 
            });
            const linkedPlayer = linkedCandidates[0];

            if (linkedPlayer) {
              // Verificar si es mayor de 18
              const calcularEdad = (fechaNac) => {
                if (!fechaNac) return null;
                const hoy = new Date();
                const nacimiento = new Date(fechaNac);
                let edad = hoy.getFullYear() - nacimiento.getFullYear();
                const m = hoy.getMonth() - nacimiento.getMonth();
                if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
                return edad;
              };

              const edad = calcularEdad(linkedPlayer.fecha_nacimiento);
              const esMayorDe18 = edad >= 18 || linkedPlayer.es_mayor_edad === true;

              if (esMayorDe18) {
                console.log('🎯 [LAYOUT] Detectado jugador +18 autorizado:', linkedPlayer.nombre);
                // Actualizar automáticamente el usuario como jugador
                await base44.auth.updateMe({
                  es_jugador: true,
                  player_id: linkedPlayer.id,
                  tipo_panel: 'jugador_adulto'
                });
                playerDetected = true;
                setPlayerName(linkedPlayer.nombre);
                console.log('✅ [LAYOUT] Usuario actualizado como Jugador +18 automáticamente');
              }
            }
          } catch (error) {
            console.error('Error detectando jugador +18:', error);
          }
        } else if (playerDetected) {
          // Si ya está marcado como jugador, intentar cargar el nombre si existe ficha
          try {
            const linkedCandidates2 = await base44.entities.Player.filter({ 
              email_jugador: currentUser.email, 
              acceso_jugador_autorizado: true, 
              activo: true 
            });
            const linkedPlayer = linkedCandidates2[0];
            if (linkedPlayer) {
              setPlayerName(linkedPlayer.nombre);
              console.log('✅ [LAYOUT] Nombre de jugador cargado:', linkedPlayer.nombre);
            } else {
              console.log('⚠️ [LAYOUT] Jugador sin ficha de Player vinculada (normal en primera carga)');
            }
          } catch (error) {
            console.log('⚠️ [LAYOUT] Error al cargar nombre de jugador:', error);
          }
        }

        setIsPlayer(playerDetected);
        // Fast path: render UI immediately while background data loads
        setIsLoading(false);

        console.log('🔍 ROLES DETECTADOS:', {
          email: currentUser.email,
          isAdmin: currentUser.role === "admin",
          isCoach: currentUser.es_entrenador === true && !currentUser.es_coordinador,
          isCoordinator: currentUser.es_coordinador === true,
          role_RAW: currentUser.role
        });

        // Cargar configuración de temporada AQUÍ (dentro del fetchUser)
        try {
          const configs = await base44.entities.SeasonConfig.filter({ activa: true });
          const activeConfig = configs[0];
          setLoteriaVisible(activeConfig?.loteria_navidad_abierta === true);
          setSponsorBannerVisible(activeConfig?.mostrar_patrocinadores === true);
          const sociosActivo = activeConfig?.programa_socios_activo === true;
          setProgramaSociosActivo(sociosActivo);
          console.log('[LAYOUT] 🎫 Config cargada - programa_socios_activo:', sociosActivo);

          // Verificar si el usuario es socio pagado (para TODOS los usuarios)
          if (sociosActivo) {
            const members = await base44.entities.ClubMember.filter({ 
              email: currentUser.email,
              estado_pago: "Pagado"
            });
            const isPaid = members.length > 0;
            console.log('[LAYOUT] 🎫 Verificación socio pagado:', {
              email: currentUser.email,
              socios_encontrados: members.length,
              isPaid,
              programa_socios_activo: sociosActivo
            });
            setIsMemberPaid(isPaid);
          }
        } catch (error) {
          console.error("Error fetching season config:", error);
        }

        // Para admin/entrenadores/coordinadores/tesoreros, SOLO usar el campo manual (no verificar BD)
                if (currentUser.role === "admin" || currentUser.es_entrenador || currentUser.es_coordinador || currentUser.es_tesorero) {
                  const tienehijos = currentUser.tiene_hijos_jugando === true;
                  console.log('🔍 DEPURACIÓN:', {
                    email: currentUser.email,
                    role: currentUser.role,
                    es_entrenador: currentUser.es_entrenador,
                    es_coordinador: currentUser.es_coordinador,
                    tiene_hijos_jugando_RAW: currentUser.tiene_hijos_jugando,
                    tiene_hijos_jugando_TYPE: typeof currentUser.tiene_hijos_jugando,
                    resultado_hasPlayers: tienehijos
                  });
                  setHasPlayers(tienehijos);
                  setIsLoading(false);
                } else if (playerDetected) {
                  // Si es un jugador +18, redirigir a PlayerDashboard
                  console.log('⚽ [LAYOUT] Usuario detectado como JUGADOR +18');
                  setHasPlayers(false);
                  setIsLoading(false);

                  const hasInitialRedirect = sessionStorage.getItem('initialRedirectDone');
                  const currentPath = window.location.pathname.toLowerCase();

                  if (!hasInitialRedirect && currentPath !== '/playerdashboard') {
                    console.log('🔄 [LAYOUT] Primera carga JUGADOR +18 - redirigiendo a PlayerDashboard');
                    sessionStorage.setItem('initialRedirectDone', 'true');
                    window.location.href = createPageUrl('PlayerDashboard');
                    return;
                  }
                } else {
                  // Para padres normales, verificar en la base de datos
                  const myPlayers = await base44.entities.Player.filter({ 
                    $or: [
                      { email_padre: currentUser.email },
                      { email_tutor_2: currentUser.email }
                    ]
                  });
                  console.log('👨‍👩‍👧 [LAYOUT] Padre normal - jugadores encontrados:', myPlayers.length);
                  setHasPlayers(myPlayers.length > 0);



                  setIsLoading(false);

                  // REDIRECCIÓN AUTOMÁTICA AL DASHBOARD PRINCIPAL (primera carga)
                  // Solo si ya tiene tipo_panel definido y app_instalada
                  if (currentUser.tipo_panel === 'familia' && currentUser.app_instalada === true) {
                    const hasInitialRedirect = sessionStorage.getItem('initialRedirectDone');
                    const currentPath = window.location.pathname.toLowerCase();

                    if (!hasInitialRedirect && currentPath !== '/parentdashboard') {
                      console.log('🔄 [LAYOUT] Primera carga PADRE - redirigiendo a ParentDashboard');
                      sessionStorage.setItem('initialRedirectDone', 'true');
                      window.location.href = createPageUrl('ParentDashboard');
                      return;
                    }
                  }
                  }

                  // REDIRECCIÓN AUTOMÁTICA PARA TESORERO (primera carga)
                  if (currentUser.es_tesorero === true && !currentUser.es_coordinador && currentUser.role !== "admin") {
                  setIsLoading(false);
                  const hasInitialRedirect = sessionStorage.getItem('initialRedirectDone');
                  const currentPath = window.location.pathname.toLowerCase();

                  if (!hasInitialRedirect && currentPath !== '/treasurerdashboard') {
                  console.log('🔄 [LAYOUT] Primera carga TESORERO - redirigiendo a TreasurerDashboard');
                  sessionStorage.setItem('initialRedirectDone', 'true');
                  window.location.href = createPageUrl('TreasurerDashboard');
                  return;
                  }
                  }

                  // Verificar si tiene conversación activa con admin (para TODOS los usuarios excepto admins)
                  if (currentUser.role !== "admin") {
                  try {
                  const adminConvs = await base44.entities.AdminConversation.filter({ 
                  padre_email: currentUser.email,
                  resuelta: false
                  });
                  setHasActiveAdminConversation(adminConvs.length > 0);
                  } catch (error) {
                  console.log('Error checking admin conversation:', error);
                  }
                  }

                  

        // Verificar partidos pendientes de observación (para entrenadores/coordinadores)
        if (currentUser.es_entrenador || currentUser.es_coordinador) {
          try {
            const allCallups = await base44.entities.Convocatoria.filter({ entrenador_email: currentUser.email, publicada: true });
            const allObservations = await base44.entities.MatchObservation.list('-updated_date', 500);
            
            const now = new Date();
            
            const myCallups = allCallups.filter(c => {
              if (c.entrenador_email !== currentUser.email || !c.publicada) return false;
              
              // Calcular hora estimada de finalización del partido
              const matchDate = new Date(c.fecha_partido);
              if (matchDate > now) return false; // Partido no ha empezado aún
              
              // Si tiene hora_partido, calcular fin estimado (2h + 15min)
              if (c.hora_partido) {
                const [hours, minutes] = c.hora_partido.split(':').map(Number);
                const matchStart = new Date(matchDate);
                matchStart.setHours(hours, minutes, 0, 0);
                
                // Duración partido (2h) + margen (15min) = 135 minutos
                const matchEnd = new Date(matchStart.getTime() + 135 * 60000);
                
                return now >= matchEnd;
              }
              
              // Si no tiene hora, esperar al día siguiente
              const nextDay = new Date(matchDate);
              nextDay.setDate(nextDay.getDate() + 1);
              return now >= nextDay;
            });

            const pendingCount = myCallups.filter(callup => {
              const hasObservation = allObservations.some(obs =>
                obs.categoria === callup.categoria &&
                obs.rival === callup.rival &&
                obs.fecha_partido === callup.fecha_partido
              );
              return !hasObservation;
            }).length;

            setPendingMatchObservations(pendingCount);
          } catch (error) {
            console.log('Error checking pending observations:', error);
          }
        }

        // Cargar badges de notificación para admin

        if (currentUser.role === "admin") {
              try {
                const [
                  adminChats,
                  payments,
                  players,
                  allPlayers,
                  invitations,
                  clothingOrders,
                  lotteryOrders,
                  members
                ] = await Promise.all([
                  base44.entities.AdminConversation.filter({ resuelta: false }, '-updated_date', 200),
                  base44.entities.Payment.filter({ estado: "En revisión" }),
                  base44.entities.Player.filter({ categoria_requiere_revision: true }),
                  base44.entities.Player.list(),
                  base44.entities.InvitationRequest.filter({ estado: "Pendiente" }),
                  base44.entities.ClothingOrder.list(),
                  base44.entities.LotteryOrder.filter({ estado: "Solicitado", pagado: false }),
                  base44.entities.ClubMember.filter({ estado_pago: "Pendiente" })
                ]);

                setUnresolvedAdminChats(adminChats.length);
                setPaymentsInReview(payments.length);
                setPlayersNeedingReview(players.length);

                const needSignatures = allPlayers.filter(p => 
                  (p.enlace_firma_jugador && !p.firma_jugador_completada) ||
                  (p.enlace_firma_tutor && !p.firma_tutor_completada)
                );
                setPendingSignaturesAdmin(needSignatures.length);

                const pendingClothing = clothingOrders.filter(o => 
                  o.estado === "Pendiente" || o.estado === "En revisión"
                );
                setPendingClothingOrders(pendingClothing.length);

                setPendingLotteryOrders(lotteryOrders.length);
                setPendingMemberRequests(members.length);
              } catch (error) {
                console.log('Error loading admin badges:', error);
              }
            }

          if (currentUser.acceso_activo === false && currentUser.role !== "admin") {
          setShowSpecialScreen("restricted");
          return;
          }

        // Solo aplicar pantallas especiales a padres sin roles (NO a entrenadores, coordinadores, tesoreros)
        if (currentUser.role !== "admin" && 
          !currentUser.es_entrenador && 
          !currentUser.es_coordinador &&
          !currentUser.es_tesorero) {
          const period = getPeriodType();
          if (period === "closed") {
            setShowSpecialScreen("closed");
          } else if (period === "inscriptions") {
            setShowSpecialScreen("inscriptions");
          } else if (period === "vacation") {
            setShowSpecialScreen("vacation");
          }
          }
          } catch (error) {
                      console.error("❌ [LAYOUT DEBUG] Error fetching user:", error);
                      setIsLoading(false);
                      // Si es página pública y hay error, permitir acceso anónimo
                      if (isPublicPage) {
                        setUser(null);
                        setAuthChecked(true);
                      }
                    }
                  };
                  fetchUser();
                }, [isPublicPage]);

  // useEffect de redirección ELIMINADO - causaba loops infinitos de React #310





  // useEffect checkPendingCallups DESACTIVADO temporalmente para debug #310

    // useEffect checkUnreadAnnouncements DESACTIVADO temporalmente para debug #310

    // useEffect checkPendingSignatures DESACTIVADO temporalmente para debug #310



  if (!showInstallInstructions && !showInstallSuccess && !showFirstLaunchInvite && showSpecialScreen === "restricted") {
    return <RestrictedAccessScreen user={user} restriction={user} />;
  }
  if (!showInstallInstructions && !showInstallSuccess && !showFirstLaunchInvite && showSpecialScreen === "closed") {
    return <ClosedSeasonScreen user={user} isAdmin={isAdmin} />;
  }
  if (!showInstallInstructions && !showInstallSuccess && !showFirstLaunchInvite && showSpecialScreen === "inscriptions") {
    return <InscriptionPeriodScreen user={user} isAdmin={isAdmin} />;
  }
  if (!showInstallInstructions && !showInstallSuccess && !showFirstLaunchInvite && showSpecialScreen === "vacation") {
    return <VacationPeriodScreen user={user} isAdmin={isAdmin} />;
  }



  const adminNavigationItems = [
    // 📊 INICIO Y FINANZAS
    { title: "🏠 Inicio", url: createPageUrl("Home"), icon: Home },
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },
    { title: "🛡️ Conversaciones Críticas", url: createPageUrl("AdminChat"), icon: ShieldAlert, badge: unresolvedAdminChats > 0 ? unresolvedAdminChats : null, urgentBadge: unresolvedAdminChats > 0 },
    { title: "💳 Pagos", url: createPageUrl("Payments"), icon: CreditCard },
    { title: "🔔 Recordatorios Simples", url: createPageUrl("PaymentReminders"), icon: Bell },
    { title: "📁 Histórico", url: createPageUrl("PaymentHistory"), icon: Archive },

    // 👥 GESTIÓN DE PERSONAS
    { title: "👥 Jugadores", url: createPageUrl("Players"), icon: Users, badge: playersNeedingReview > 0 ? playersNeedingReview : null },
    { title: "🔄 Dashboard Renovaciones", url: createPageUrl("RenewalDashboard"), icon: RotateCw },
    { title: "🏃 Entrenadores", url: createPageUrl("CoachProfiles"), icon: Users },
    { title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignaturesAdmin"), icon: FileSignature, badge: pendingSignaturesAdmin > 0 ? pendingSignaturesAdmin : null, urgentBadge: pendingSignaturesAdmin > 0 },
    { title: "📧 Solicitudes Invitación", url: createPageUrl("InvitationRequests"), icon: Mail, badge: pendingInvitations > 0 ? pendingInvitations : null },
    { title: "👤 Usuarios", url: createPageUrl("UserManagement"), icon: Users },

    // ⚽ DEPORTIVO
    { title: "🎓 Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell, badge: pendingCallupResponses > 0 ? pendingCallupResponses : null, urgentBadge: pendingCallupResponses > 0 },
    { title: "📊 Reportes Entrenadores", url: createPageUrl("CoachEvaluationReports"), icon: Star },
    { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    ...(hasPlayers ? [{ title: "👨‍👩‍👧 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null }] : []),

    // 💬 COMUNICACIÓN
    { title: "💬 Chat Coordinador", url: createPageUrl("CoordinatorChat"), icon: MessageCircle },
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "📄 Documentos", url: createPageUrl("DocumentManagement"), icon: FileText },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },

    // 🛍️ PEDIDOS Y EXTRAS
    { title: "🛍️ Pedidos Ropa", url: createPageUrl("ClothingOrders"), icon: ShoppingBag, badge: pendingClothingOrders > 0 ? pendingClothingOrders : null },
    ...(loteriaVisible ? [{ title: "🍀 Lotería Navidad", url: createPageUrl("LotteryManagement"), icon: Clover, badge: pendingLotteryOrders > 0 ? pendingLotteryOrders : null }] : []),
    { title: "🎫 Gestión Socios", url: createPageUrl("ClubMembersManagement"), icon: Users, badge: pendingMemberRequests > 0 ? pendingMemberRequests : null },
            { title: "💰 Patrocinios", url: createPageUrl("Sponsorships"), icon: CreditCard },
            { title: "🎁 Trae un Socio Amigo", url: createPageUrl("ReferralManagement"), icon: Gift },
        { title: "⚽👧 Fútbol Femenino", url: createPageUrl("FemeninoInterests"), icon: Users },

                // 🎉 CONTENIDO
        { title: "🎉 Gestión Eventos", url: createPageUrl("EventManagement"), icon: Calendar },
                      { title: "🏆 Competición", url: createPageUrl("CentroCompeticion"), icon: Trophy },
                      

    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },

    // ⚙️ CONFIGURACIÓN
    { title: "⚙️ Temporadas y Categorías", url: createPageUrl("SeasonManagement"), icon: Settings },
    { title: "🔔 Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
    // Eliminado: Clasificaciones (migrado a Centro de Competición)
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
      { title: "💬 Chat con Familias", url: createPageUrl("CoachParentChat"), icon: MessageCircle },
      { title: "💼 Chat Staff", url: createPageUrl("StaffChat"), icon: MessageCircle },

      // ⚽ GESTIÓN DEPORTIVA (trabajo principal)
      { title: "🎓 Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell, badge: pendingCallupResponses > 0 ? pendingCallupResponses : null, urgentBadge: pendingCallupResponses > 0 },
      { title: "📋 Asistencia y Evaluación", url: createPageUrl("TeamAttendanceEvaluation"), icon: CheckCircle2 },
      { title: "🎓 Plantillas", url: createPageUrl("TeamRosters"), icon: Users },
      { title: "📚 Biblioteca Ejercicios", url: createPageUrl("ExerciseLibrary"), icon: FileText },
      { title: "🎯 Pizarra Táctica", url: createPageUrl("TacticsBoard"), icon: Calendar },
      { title: "📊 Competición (Técnicos)", url: createPageUrl("CentroCompeticionTecnico"), icon: BarChart3, badge: pendingMatchObservations > 0 ? pendingMatchObservations : null, urgentBadge: pendingMatchObservations > 0 },

      // 📅 CALENDARIO
      { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },

      // 📊 REPORTES
      { title: "📊 Reportes Entrenadores", url: createPageUrl("CoachEvaluationReports"), icon: Star },

      // 👤 PERFIL
      { title: "👤 Mi Perfil Entrenador", url: createPageUrl("CoachProfile"), icon: UserCircle },
      ...(user?.puede_gestionar_firmas ? [{ title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignaturesAdmin"), icon: FileSignature }] : []),

      // 📢 INFORMACIÓN
      { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone, badge: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : null },
      { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
      { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
      { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },

      // 👨‍👩‍👧 SECCIÓN FAMILIA (si tiene hijos)
      ...(hasPlayers ? [{ title: "👨‍👩‍👧 Mis Hijos", url: createPageUrl("ParentPlayers"), icon: Users }] : []),
      ...(hasPlayers ? [{ title: "💳 Pagos Mis Hijos", url: createPageUrl("ParentPayments"), icon: CreditCard }] : []),
      ...(hasPlayers ? [{ title: "🏆 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null }] : []),
      ...(hasPlayers ? [{ title: "🖊️ Firmas Mis Hijos", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 }] : []),
      ...(hasPlayers ? [{ title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText }] : []),
      ...(hasPlayers ? [{ title: "🛍️ Pedidos Ropa", url: createPageUrl("ClothingOrders"), icon: ShoppingBag }] : []),
      ...(loteriaVisible && hasPlayers ? [{ title: "🍀 Mi Lotería", url: createPageUrl("ParentLottery"), icon: Clover }] : []),

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
    { title: "💬 Chat Familias", url: createPageUrl("FamilyChats"), icon: MessageCircle },
    { title: "💼 Chat Staff", url: createPageUrl("StaffChat"), icon: MessageCircle },

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

      // 👤 PERFIL
      { title: "👤 Mi Perfil Entrenador", url: createPageUrl("CoachProfile"), icon: UserCircle },

      // 📢 INFORMACIÓN
      { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone, badge: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : null },
      { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
      { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
      { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },

      // 👨‍👩‍👧 SECCIÓN FAMILIA (si tiene hijos)
      ...(hasPlayers ? [{ title: "👨‍👩‍👧 Mis Hijos", url: createPageUrl("ParentPlayers"), icon: Users }] : []),
      ...(hasPlayers ? [{ title: "💳 Pagos Mis Hijos", url: createPageUrl("ParentPayments"), icon: CreditCard }] : []),
      ...(hasPlayers ? [{ title: "🏆 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null }] : []),
      ...(hasPlayers ? [{ title: "🖊️ Firmas Mis Hijos", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 }] : []),
      ...(hasPlayers ? [{ title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText }] : []),
      ...(hasPlayers ? [{ title: "🛍️ Pedidos Ropa", url: createPageUrl("ClothingOrders"), icon: ShoppingBag }] : []),
      ...(loteriaVisible && hasPlayers ? [{ title: "🍀 Mi Lotería", url: createPageUrl("ParentLottery"), icon: Clover }] : []),

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

        // 🏠 INICIO
        { title: "🏠 Inicio", url: createPageUrl("ParentDashboard"), icon: Home },

    // 💬 CHATS
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },
    { title: "🔔 Mensajes del Club", url: createPageUrl("ParentSystemMessages"), icon: Bell },
    { title: "💬 Chat Coordinador", url: createPageUrl("ParentCoordinatorChat"), icon: MessageCircle },
    { title: "⚽ Chat Entrenador", url: createPageUrl("ParentCoachChat"), icon: MessageCircle },
    ...(hasActiveAdminConversation ? [{ title: "🛡️ Chat Administrador", url: createPageUrl("ParentAdminChat"), icon: ShieldAlert }] : []),

    // ⚽ ACCIONES URGENTES
    { title: "🏆 Convocatorias", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
    { title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },

    // 💰 PAGOS Y JUGADORES
    { title: "💳 Pagos", url: createPageUrl("ParentPayments"), icon: CreditCard },
    { title: "👥 Mis Jugadores", url: createPageUrl("ParentPlayers"), icon: Users },

    // 📅 CALENDARIO Y EVENTOS
    { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "🏆 Competición", url: createPageUrl("CentroCompeticion"), icon: Trophy },
    

    // 📢 INFORMACIÓN
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText },

    // 🛍️ PEDIDOS
    { title: "🛍️ Pedidos Ropa", url: createPageUrl("ClothingOrders"), icon: ShoppingBag },
    ...(loteriaVisible ? [{ title: "🍀 Lotería Navidad", url: createPageUrl("ParentLottery"), icon: Clover }] : []),

    // 🖼️ CONTENIDO
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },

    // 📋 EXTRAS
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },
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

    // 💬 CHATS
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },
    { title: "💬 Chat Coordinador", url: createPageUrl("ParentCoordinatorChat"), icon: MessageCircle },
    { title: "⚽ Chat Entrenador", url: createPageUrl("ParentCoachChat"), icon: MessageCircle },
    ...(hasActiveAdminConversation ? [{ title: "🛡️ Chat Administrador", url: createPageUrl("ParentAdminChat"), icon: ShieldAlert }] : []),

    // ⚽ DEPORTIVO
    { title: "🏆 Convocatorias", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
    { title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },
    { title: "💳 Mis Pagos", url: createPageUrl("ParentPayments"), icon: CreditCard },

    // 📅 CALENDARIO E INFO
    { title: "📅 Calendario", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "🏆 Competición", url: createPageUrl("CentroCompeticion"), icon: Trophy },
    
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },

    // 🎫 EXTRAS
    { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },
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
    { title: "🔔 Recordatorios", url: createPageUrl("PaymentReminders"), icon: Bell },
    { title: "📁 Histórico", url: createPageUrl("PaymentHistory"), icon: Archive },
    { title: "🛍️ Pedidos Ropa", url: createPageUrl("ClothingOrders"), icon: ShoppingBag },
    { title: "🎫 Socios", url: createPageUrl("ClubMembersManagement"), icon: Users },
    { title: "📅 Calendario", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone, badge: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : null },
    { title: "👨‍👩‍👧 Mis Hijos", url: createPageUrl("ParentPlayers"), icon: Users },
    { title: "💳 Pagos Mis Hijos", url: createPageUrl("ParentPayments"), icon: CreditCard },
    { title: "🏆 Convocatorias", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
    { title: "🖊️ Firmas Hijos", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },
  ];

  let navigationItems;
    if (isAdmin) {
      navigationItems = adminNavigationItems;
    } else if (isCoordinator) {
      navigationItems = coordinatorNavigationItems;
    } else if (isTreasurer) {
      navigationItems = treasurerNavigationItems;
    } else if (isCoach) {
      navigationItems = coachNavigationItems;
    } else if (isPlayer) {
        navigationItems = [
          { title: "🏠 Mi Dashboard", url: createPageUrl("PlayerDashboard"), icon: Home },
          { title: "👤 Mi Perfil", url: createPageUrl("PlayerProfile"), icon: UserCircle },
        { title: "🏆 Convocatorias", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
        { title: "💳 Mis Pagos", url: createPageUrl("ParentPayments"), icon: CreditCard },

        { title: "📅 Calendario", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
        { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
        { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
        { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },
        { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
        { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },
      ];
    } else {
      // Usuario normal de familia (padre/madre sin roles especiales)
      navigationItems = parentNavigationItems;
    }



  const handleLogout = () => {
    base44.auth.logout();
  };

  // Si es página pública y ya se verificó la autenticación pero no hay usuario, mostrar contenido sin layout
  if (isPublicPage && authChecked && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {children}
      </div>
    );
  }

  // Si es página pública y aún se está verificando la autenticación, mostrar loading
  if (isPublicPage && !authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  

    useEffect(() => {
        if (!user) return;

        // Roles especiales NO pasan por onboarding
        if (user.role === "admin" || user.es_entrenador || user.es_coordinador || user.es_tesorero) {
          setOnboardingView('none');
          return;
        }

        // 1) Elegir panel (familia o jugador)
        if (!user.tipo_panel) {
          setOnboardingView('selector');
          return;
        }

        // 2) Mostrar instrucciones de instalación (sin detección), una sola vez hasta que el usuario confirme
        if (!localStorage.getItem('installCompleted')) {
          setShowInstallInstructions(true);
        }

        // 3) Normal - sin onboarding
        setOnboardingView('none');
      }, [user]);

      if (isLoading && !isPublicPage) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto"></div>
              <p className="text-white mt-4 text-sm">Cargando...</p>
            </div>
          </div>
        );
      }

      console.log('🎨 [LAYOUT] Pasó loading, isLoading:', isLoading, 'isPublicPage:', isPublicPage, 'user:', user?.email);
      
      const renderOnboarding = () => {
        switch (onboardingView) {
          case 'selector':
            return (
              <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
                <Suspense fallback={null}>
                  <RegistrationTypeSelector
                    onSelectFamily={async () => {
                      await base44.auth.updateMe({ tipo_panel: 'familia' });
                      window.location.reload();
                    }}
                    onSelectAdultPlayer={async () => {
                      await base44.auth.updateMe({ tipo_panel: 'jugador_adulto', es_jugador: true });
                      window.location.reload();
                    }}
                  />
                </Suspense>
              </div>
            );
          default:
            return null;
        }
      };

      const onboardingComponent = renderOnboarding();
      if (onboardingComponent) {
        return onboardingComponent;
      }


    console.log('✅ [LAYOUT] Renderizando contenido principal con children');

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
            <>

              {/* Modal de instrucciones de instalación */}
              {showInstallInstructions && (
               <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowInstallInstructions(false)}>
                 <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                   <div className="text-center mb-4">
                                           <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                             <Smartphone className="w-8 h-8 text-green-600" />
                                           </div>
                                           <h2 className="text-2xl font-bold text-green-700">📲 Instala la App del Club</h2>
                                           <p className="text-slate-600 mt-1 text-sm">¡Es muy sencillo! Solo 4 pasos y tardarás menos de 1 minuto</p>
                                         </div>

                                         {/* Botón para saltar y continuar registro inmediatamente (failsafe) */}
                                         <Button
                                           variant="outline"
                                           className="w-full mb-3"
                                           onClick={async () => {
                                             setShowInstallInstructions(false);
                                             setIsAppInstalled(true);
                                             localStorage.setItem('pwaInstalled', 'true');
                                             try {
                                               await base44.auth.updateMe({ app_instalada: true });
                                             } catch {}
                                             // familia: mostrar diálogo de registro simple
                                             if (user?.tipo_panel === 'familia') {
                                               setShowFirstTimeRegistration(true);
                                             }
                                           }}
                                         >
                                           Saltar e ir al registro →
                                         </Button>

                                          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3 mb-4">
                                            <p className="text-green-800 text-sm text-center font-medium">
                                              ✨ <strong>Con la app instalada podrás:</strong>
                                            </p>
                                            <ul className="text-green-700 text-xs mt-2 space-y-1 text-center">
                                              <li>✅ Recibir convocatorias de partidos al instante</li>
                                              <li>✅ Ver pagos, documentos y calendario</li>
                                              <li>✅ Comunicarte con los entrenadores</li>
                                              <li>✅ Acceso rápido desde tu pantalla de inicio</li>
                                            </ul>
                                          </div>

                    {isIOS ? (
                                            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                                              <div className="flex items-center justify-center gap-2 mb-2">
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple" className="w-6 h-6" />
                                                <p className="font-bold text-slate-900">iPhone / iPad</p>
                                              </div>

                                              <div className="space-y-3">
                                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                                                  <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">1</span>
                                                  <div className="flex-1">
                                                    <p className="text-sm text-slate-700">Abre esta web en <strong>Safari</strong></p>
                                                    <p className="text-xs text-slate-500">(No funciona en Chrome ni otros navegadores)</p>
                                                  </div>
                                                  <img src="https://upload.wikimedia.org/wikipedia/commons/5/52/Safari_browser_logo.svg" alt="Safari" className="w-10 h-10" />
                                                </div>
                                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                                                  <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">2</span>
                                                  <div className="flex-1">
                                                    <p className="text-sm text-slate-700">Pulsa el botón <strong>Compartir</strong></p>
                                                    <p className="text-xs text-slate-500">Está abajo en la barra de Safari</p>
                                                  </div>
                                                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                                    <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                                                  <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">3</span>
                                                  <div className="flex-1">
                                                    <p className="text-sm text-slate-700">Busca y pulsa <strong>"Añadir a pantalla de inicio"</strong></p>
                                                    <p className="text-xs text-slate-500">Desliza hacia abajo para encontrarlo</p>
                                                  </div>
                                                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                                                    <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                                                  <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">4</span>
                                                  <div className="flex-1">
                                                    <p className="text-sm text-slate-700">Pulsa <strong>"Añadir"</strong> arriba a la derecha</p>
                                                  </div>
                                                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                                                    <span className="text-white font-bold text-sm">Añadir</span>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-3 bg-green-100 p-3 rounded-xl border-2 border-green-300">
                                                  <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg">✓</span>
                                                  <p className="text-sm text-green-800 font-medium">¡Listo! Ya tienes el icono del club en tu móvil 🎉</p>
                                                </div>
                                              </div>
                                            </div>
                                          ) : isAndroid ? (
                                            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                                              <div className="flex items-center justify-center gap-2 mb-2">
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg" alt="Android" className="w-6 h-6" />
                                                <p className="font-bold text-slate-900">Android</p>
                                              </div>

                                              <div className="space-y-3">
                                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                                                  <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">1</span>
                                                  <div className="flex-1">
                                                    <p className="text-sm text-slate-700">Abre esta web en <strong>Chrome</strong></p>
                                                    <p className="text-xs text-slate-500">(También funciona en otros navegadores)</p>
                                                  </div>
                                                  <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg" alt="Chrome" className="w-10 h-10" />
                                                </div>
                                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                                                  <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">2</span>
                                                  <div className="flex-1">
                                                    <p className="text-sm text-slate-700">Pulsa el <strong>menú</strong> (3 puntos verticales)</p>
                                                    <p className="text-xs text-slate-500">Está arriba a la derecha</p>
                                                  </div>
                                                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                                                    <svg className="w-7 h-7 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                                                      <circle cx="12" cy="5" r="2" />
                                                      <circle cx="12" cy="12" r="2" />
                                                      <circle cx="12" cy="19" r="2" />
                                                    </svg>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                                                  <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">3</span>
                                                  <div className="flex-1">
                                                    <p className="text-sm text-slate-700">Pulsa <strong>"Instalar aplicación"</strong></p>
                                                    <p className="text-xs text-slate-500">O "Añadir a pantalla de inicio"</p>
                                                  </div>
                                                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                                    <Download className="w-7 h-7 text-green-600" />
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                                                  <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">4</span>
                                                  <div className="flex-1">
                                                    <p className="text-sm text-slate-700">Confirma pulsando <strong>"Instalar"</strong></p>
                                                  </div>
                                                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                                                    <span className="text-white font-bold text-sm">Instalar</span>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-3 bg-green-100 p-3 rounded-xl border-2 border-green-300">
                                                  <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg">✓</span>
                                                  <p className="text-sm text-green-800 font-medium">¡Listo! Ya tienes el icono del club en tu móvil 🎉</p>
                                                </div>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="space-y-4">
                                              <div className="bg-blue-50 rounded-2xl p-4">
                                                <p className="font-bold text-slate-900 mb-2">📱 iPhone / iPad</p>
                                                <p className="text-sm text-slate-700">Safari → Compartir (↑) → "Añadir a pantalla de inicio"</p>
                                              </div>
                                              <div className="bg-green-50 rounded-2xl p-4">
                                                <p className="font-bold text-slate-900 mb-2">📱 Android</p>
                                                <p className="text-sm text-slate-700">Chrome → Menú (⋮) → "Instalar app" o "Añadir a inicio"</p>
                                              </div>
                                            </div>
                                          )}

                    <div className="mt-4 p-3 bg-blue-50 border-2 border-blue-300 rounded-xl">
                                            <p className="text-xs text-blue-800 text-center font-medium">
                                              💡 <strong>Puedes volver a ver estas instrucciones</strong> desde el menú lateral pulsando "📲 Ver cómo instalar"
                                            </p>
                                          </div>

                                          <div className="mt-3 p-3 bg-green-50 border-2 border-green-300 rounded-xl">
                                            <p className="text-xs text-green-800 text-center font-medium">
                                              ✅ <strong>Una vez instalada:</strong> Tendrás acceso completo a todas las funciones del club y recibirás notificaciones importantes
                                            </p>
                                          </div>

                    <Button 
                                                                                  onClick={() => {
                                                                                    setShowInstallInstructions(false);
                                                                                    setShowInstallSuccess(true);
                                                                                    localStorage.setItem('installCompleted', 'true');
                                                                                  }} 
                                                                                  className="w-full mt-4 bg-green-600 hover:bg-green-700 py-4 text-lg font-bold"
                                                                                >
                                                                                  ✅ Ya la tengo instalada
                                                                                </Button>
                                      <Button 
                                        onClick={() => {
                                          setShowInstallInstructions(false);
                                          setInstallDismissed(true);
                                          localStorage.setItem('installPromptDismissed', 'true');
                                          // Fallback: si es familia y aún no marcó instalada, continuar al registro igualmente
                                          if (user?.tipo_panel === 'familia' && !isAppInstalled) {
                                            setShowFirstTimeRegistration(true);
                                          }
                                        }} 
                                        variant="outline"
                                        className="w-full mt-2 py-3"
                                      >
                                        Cerrar
                                      </Button>
                  </div>
                </div>
                )}

                {/* Modal de éxito tras pulsar "Ya la tengo instalada" */}
                {showInstallSuccess && (
                <div className="fixed inset-0 z-[210] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowInstallSuccess(false)}>
                  <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <div className="text-center space-y-3">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900">¡Instalación lista!</h3>
                      <p className="text-slate-600 text-sm">Cierra esta pestaña del navegador y abre la app desde el icono que ya tienes en tu móvil para continuar.</p>
                      <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setShowInstallSuccess(false)}>Entendido</Button>
                    </div>
                  </div>
                </div>
                )}

                {/* Invitación primer arranque desde el icono PWA */}
                {showFirstLaunchInvite && (
                <div className="fixed inset-0 z-[210] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowFirstLaunchInvite(false)}>
                  <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <div className="text-center space-y-3">
                      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                        <Smartphone className="w-8 h-8 text-orange-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900">Bienvenido a la app</h3>
                      <p className="text-slate-600 text-sm">
                        Para empezar, {user?.tipo_panel === 'familia' ? 'da de alta a tus jugadores' : 'completa tu perfil de jugador'}.
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => { setShowFirstLaunchInvite(false); localStorage.setItem('firstLaunchDone', 'true'); }}>Ahora no</Button>
                        <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={() => {
                          localStorage.setItem('firstLaunchDone', 'true');
                          setShowFirstLaunchInvite(false);
                          if (user?.tipo_panel === 'familia') {
                            navigate(createPageUrl('ParentPlayers'));
                          } else {
                            navigate(createPageUrl('PlayerProfile'));
                          }
                        }}>Ir ahora</Button>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                <Suspense fallback={null}>
                                  <SessionManager />
                                  <NotificationBadge />
                                  <PaymentApprovalNotifier isAdmin={isAdmin} />
                                  <PlanPaymentReminders user={user} />
                                  <AutomaticRenewalReminders />
                                  <AutomaticRenewalClosure />
                                  <RenewalNotificationEngine />
                                  <PostRenewalPaymentReminder />
                                  </Suspense>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-600 to-orange-700 shadow-lg safe-area-top">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2">
              <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-9 h-9 rounded-lg shadow-lg object-cover" />
              <div className="text-white">
                <h1 className="font-bold text-base leading-tight">CD Bustarviejo</h1>
                <p className="text-xs text-orange-100 truncate max-w-[140px]" title={user?.email}>
                  {isAdmin ? "Admin" : isCoordinator ? "Coordinador" : isTreasurer ? "Tesorero" : isCoach ? "Entrenador" : isPlayer ? (playerName || "Jugador") : user?.email?.split('@')[0] || "Familia"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isAppInstalled && (
                                    <button
                                      onClick={() => setShowInstallInstructions(true)}
                                      className="p-2 bg-green-500 text-white rounded-xl animate-pulse shadow-lg"
                                      title="Ver cómo instalar"
                                    >
                                      <Smartphone className="w-5 h-5" />
                                    </button>
                                  )}
              <Suspense fallback={null}><NotificationCenter /></Suspense>
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
          <Suspense fallback={null}><GlobalSearch isAdmin={isAdmin} isCoach={isCoach} /></Suspense>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-600 to-orange-700">
                <div className="text-white">
                  <h2 className="font-bold text-lg">Menú</h2>
                  <p className="text-xs text-orange-100">CD Bustarviejo</p>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-white hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {/* Botón Instalar App al principio del menú móvil - solo si no está instalada */}
                {!isAppInstalled && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowInstallInstructions(true);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg mb-4"
                  >
                    <Smartphone className="w-6 h-6 flex-shrink-0" />
                    <span className="font-bold text-base flex-1">📲 Ver cómo instalar la App</span>
                  </button>
                )}

                {navigationItems.map((item) => (
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
                ))}
              </div>
              <div className="p-4 bg-slate-900 border-t border-white/10 space-y-2">
                                                  {!isAppInstalled && (
                                                                                        <button
                                                                                          onClick={() => {
                                                                                            setMobileMenuOpen(false);
                                                                                            setShowInstallInstructions(true);
                                                                                          }}
                                                                                          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-green-500/20 text-white hover:bg-green-500/30 transition-all"
                                                                                        >
                                                                                          <Smartphone className="w-6 h-6" />
                                                                                          <span className="font-semibold text-lg">📲 Ver cómo instalar</span>
                                                                                        </button>
                                                                                      )}
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

        <nav className="hidden lg:block fixed left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl overflow-y-auto">
          <div className="p-6 border-b border-green-500/30">
            <div className="flex items-center gap-3 mb-6">
              <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-14 h-14 rounded-xl shadow-xl ring-4 ring-green-500/50 object-cover" />
              <div className="text-white">
                <h2 className="font-bold text-xl">CD Bustarviejo</h2>
                <p className="text-xs text-green-400">
                  {isAdmin ? "Panel Admin" : isCoordinator ? "Panel Coordinador" : isTreasurer ? "Panel Tesorero" : isCoach ? "Panel Entrenador" : isPlayer ? "Panel Jugador" : "Panel Familia"}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
            {user && (
              <div className="w-full">
                <Suspense fallback={null}><GlobalSearch isAdmin={isAdmin} isCoach={isCoach} /></Suspense>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Suspense fallback={null}><NotificationCenter /></Suspense>
              <ThemeToggle />
              <Suspense fallback={null}><Suspense fallback={null}><LanguageSelector currentLang={currentLang} onLanguageChange={handleLanguageChange} /></Suspense></Suspense>
            </div>
            </div>
          </div>

          <div className="p-4 space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.title}
                to={item.url}
                className={`flex items-center justify-center gap-4 p-4 rounded-2xl transition-all group ${
                  item.highlight
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-600/50 ring-2 ring-green-400 animate-pulse'
                    : location.pathname === item.url
                    ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-600/50'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-semibold flex-1 text-center">{item.title}</span>
                {item.badge && (
                  <Badge className={`${item.urgentBadge ? 'bg-red-500 text-white animate-pulse ring-2 ring-green-400' : 'bg-green-500 text-white'}`}>
                    {item.urgentBadge && '🔴'} {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </div>

          <div className="p-6 mt-auto border-t border-green-500/30">
            <div className="bg-gradient-to-r from-slate-800 to-black rounded-2xl p-4 mb-4 border-2 border-orange-500/50">
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-green-400 mb-1">Contacto</p>
                  <a href="mailto:CDBUSTARVIEJO@GMAIL.COM" className="text-xs text-orange-400 hover:text-orange-300 break-all block">
                    CDBUSTARVIEJO@GMAIL.COM
                  </a>
                </div>
              </div>
            </div>

            {user && (
              <div className="text-center text-xs text-white mb-4">
                <p className="font-medium">{isPlayer && playerName ? playerName : user.email?.split('@')[0]}</p>
                <p className="text-green-400 text-xs">{user.email}</p>
                {isPlayer && (
                  <Badge className="mt-2 bg-orange-600 text-white text-xs">
                    ⚽ Jugador
                  </Badge>
                )}
                {isCoordinator && (
                  <Badge className="mt-2 bg-cyan-600 text-white text-xs">
                    🎓 Coordinador Deportivo
                  </Badge>
                )}
                {isTreasurer && (
                  <Badge className="mt-2 bg-green-600 text-white text-xs">
                    💰 Tesorero
                  </Badge>
                )}
                {user?.es_entrenador && !isAdmin && (
                  <Badge className="mt-2 bg-blue-600 text-white text-xs">
                    🏃 Entrenador{user?.categorias_entrena?.length > 0 ? ` (${user.categorias_entrena.length})` : ''}
                  </Badge>
                )}
              </div>
            )}

            <Button onClick={handleLogout} className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 rounded-xl shadow-lg">
                                <LogOut className="w-4 h-4 mr-2" />
                                Cerrar Sesión
                              </Button>

                              <Button 
                                                                onClick={() => setShowInstallInstructions(true)} 
                                                                variant="outline" 
                                                                className="w-full mt-3 border-green-500 text-green-400 hover:bg-green-500/20 font-semibold py-3 rounded-xl"
                                                              >
                                                                <Smartphone className="w-4 h-4 mr-2" />
                                                                {isAppInstalled ? "✅ App instalada" : "📲 Ver cómo instalar"}
                                                              </Button>

                              <div className="text-center text-xs text-green-400 mt-4 pt-4 border-t border-green-500/30">
                <p className="font-medium">Temporada {currentSeason}</p>
                <p className="text-orange-400 mt-1">© CD Bustarviejo</p>
                <p className="text-slate-500 mt-2 text-[10px]">🔒 Tus datos están protegidos según RGPD</p>
              </div>
          </div>
        </nav>

        <main className={`lg:ml-72 min-h-screen pt-[100px] lg:pt-0 ${sponsorBannerVisible ? 'pb-24 lg:pb-20' : 'pb-4'}`}>
          {children}
          </main>

        {/* Banner de Patrocinadores - Footer fijo */}
        {sponsorBannerVisible && (
          <div className="lg:ml-72 fixed bottom-0 left-0 right-0 z-40">
            <Suspense fallback={null}><SponsorBanner /></Suspense>
          </div>
        )}
        </div>
        </>
        );
}