import React, { useState, useEffect, Suspense, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";


import { Home, Users, CreditCard, ShoppingBag, Menu, Bell, LogOut, Calendar, Megaphone, Mail, Archive, Settings, MessageCircle, Clock, Image, X, User as UserIcon, ClipboardCheck, Star, Award, FileText, Clover, UserCircle, FileSignature, Gift, Smartphone, Download, BarChart3, ShieldAlert, UserX, RotateCw, CheckCircle2, Trophy, ChevronLeft } from "lucide-react";
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

import LanguageSelector from "./components/LanguageSelector";
import { useUnifiedNotifications } from "./components/notifications/useUnifiedNotifications";
import { SeasonProvider } from "./components/season/SeasonProvider";
import ExtraChargePayModal from "./components/charges/ExtraChargePayModal";
import { ChatNotificationSync } from "./components/notifications/ChatNotificationSync";
import ChatNotificationBubbles from "./components/notifications/ChatNotificationBubbles";
import { useChatNotificationMenuSidebar } from "./components/notifications/useChatNotificationMenuSidebar";

const RegistrationTypeSelector = React.lazy(() => import("./components/players/RegistrationTypeSelector"));
const WelcomeScreen = React.lazy(() => import("./components/WelcomeScreen"));
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
import ChatSoundNotifier from "./components/notifications/ChatSoundNotifier";
import CallupSoundNotifier from "./components/notifications/CallupSoundNotifier";
import AnnouncementSoundNotifier from "./components/notifications/AnnouncementSoundNotifier";
import PaymentSoundNotifier from "./components/notifications/PaymentSoundNotifier";


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

function InscriptionPeriodScreen({ user, isAdmin, clothingStoreUrl, merchStoreUrl }) {
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
              
              {clothingStoreUrl ? (
                <a href={clothingStoreUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-6 text-lg shadow-xl">
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    Pedidos de Equipación
                  </Button>
                </a>
              ) : (
                <Button disabled className="w-full bg-gray-300 text-gray-600 font-bold py-6 text-lg shadow-xl">
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Pedidos de Equipación (Próximamente)
                </Button>
              )}
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
  const [rateLimited, setRateLimited] = useState(false);
  const rateLimitTimerRef = useRef(null);

  const [isJunta, setIsJunta] = useState(false);
  const [activeSeasonConfig, setActiveSeasonConfig] = useState(null);
  const clothingStoreUrl = activeSeasonConfig?.tienda_ropa_url || null;
  const merchStoreUrl = activeSeasonConfig?.tienda_merch_url || null;

  // Función para recargar la configuración (usada por polling y eventos de visibilidad)
  const fetchSeasonConfig = async () => {
    try {
      // Intentar obtener la configuración activa
      const configs = await base44.entities.SeasonConfig.filter({ activa: true });
      const activeConfig = configs[0];
      
      if (activeConfig) {
        setActiveSeasonConfig(activeConfig);
        setLoteriaVisible(activeConfig.loteria_navidad_abierta === true);
        setSponsorBannerVisible(activeConfig.mostrar_patrocinadores === true);
        setProgramaSociosActivo(activeConfig.programa_socios_activo === true);
        
        console.log('🔄 [LAYOUT] Configuración de temporada actualizada', {
          referidos: activeConfig.programa_referidos_activo,
          socios: activeConfig.programa_socios_activo
        });
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
  
  // SISTEMA UNIFICADO DE CHATS (misma fuente que burbujas)
  const chatMenuCounts = useChatNotificationMenuSidebar(user);
  
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
  };

  const [showSpecialScreen, setShowSpecialScreen] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('es');
  const [loteriaVisible, setLoteriaVisible] = useState(false);
  const [sponsorBannerVisible, setSponsorBannerVisible] = useState(false);
  const [showMemberCard, setShowMemberCard] = useState(false);
  const [extraChargeVisible, setExtraChargeVisible] = useState(null);
  const [extraChargeModalOpen, setExtraChargeModalOpen] = useState(false);
  const [memberCardActive, setMemberCardActive] = useState(false);
  const [isMemberPaid, setIsMemberPaid] = useState(false);
  const [programaSociosActivo, setProgramaSociosActivo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [showFirstTimeRegistration, setShowFirstTimeRegistration] = useState(false);
  const [showInstallSuccess, setShowInstallSuccess] = useState(false);
  const [navDirection, setNavDirection] = useState('forward');
  const queryClient = useQueryClient();
  const SOFT_PTR_PAGES = new Set(['Home','ParentDashboard','CoachDashboard','TreasurerDashboard','CoordinatorDashboard','PlayerDashboard']);
  const DISABLED_PTR_PAGES = new Set(['StaffChat','CoachParentChat','ParentCoachChat','CoordinatorChat','ParentSystemMessages','ParentCoordinatorChat']);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showFirstLaunchInvite, setShowFirstLaunchInvite] = useState(false);
  
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
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
  const isMobile = isIOS || isAndroid;

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
          if (reg.waiting) setShowUpdateNotification(true);
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

  // Detectar si estamos en página pública (ClubMembership, ValidateAdminInvitation, PWA aliases)
  const [authChecked, setAuthChecked] = useState(false);
  const fetchUserOnceRef = useRef(false);
  const isPublicPageRef = useRef(false);

  // Dirección de navegación
  const onPop = () => setNavDirection('back');
  window.addEventListener('popstate', onPop);
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
    if (fetchUserOnceRef.current) return;
    fetchUserOnceRef.current = true;
    
    // Calcular isPublicPage UNA SOLA VEZ y guardar en ref
    const lowerPath = location.pathname.toLowerCase();
    const isPublicPage = lowerPath.includes('clubmembership') || 
                         lowerPath.includes('validateadmininvitation') ||
                         lowerPath.includes('pwaentry') ||
                         lowerPath.includes('joinreferral') ||
                         lowerPath.includes('joinfemenino');
    isPublicPageRef.current = isPublicPage;
    
    const fetchUser = async () => {
                        console.log('🔐 [LAYOUT DEBUG] Iniciando fetchUser...');
                        try {
                        // Fix para PWA: detectar si estamos en standalone mode
                        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                                     window.navigator.standalone === true;
                        console.log('📱 [LAYOUT] Modo standalone (PWA):', isStandalone);

                        // Verificar si es primera vez del usuario (mostrar WelcomeScreen)
                        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
                        const installTrigger = localStorage.getItem('installPromptAfterOnboarding') === 'true';
                        if (!hasSeenWelcome && !isPublicPage && !installTrigger) {
                          setShowWelcome(true);
                        }

                        // Procesar invitación de ADMIN si existe (flujo de segundo progenitor eliminado)
                        const urlParams = new URLSearchParams(window.location.search);
                        const invitationToken = urlParams.get('invitation_token');
                        const invitationType = urlParams.get('type');

                        if (invitationToken && invitationType && invitationType !== 'second_parent') {
                          try {
                            const isAuth = await base44.auth.isAuthenticated();
                            if (!isAuth) {
                              // Guardar token y redirigir a login
                              localStorage.setItem('pending_invitation_token', invitationToken);
                              localStorage.setItem('pending_invitation_type', invitationType);
                              const loginUrl = 'https://app.base44.com/login';
                              const returnUrl = encodeURIComponent('https://app.cdbustarviejo.com');
                              window.location.href = `${loginUrl}?nextUrl=${returnUrl}`;
                              return;
                            }

                            // Procesar token de ADMIN
                            const invitations = await base44.entities.AdminInvitation.filter({ token: invitationToken });
                            if (invitations.length > 0 && invitations[0].estado === 'pendiente') {
                              await base44.entities.AdminInvitation.update(invitations[0].id, {
                                estado: 'aceptada',
                                fecha_aceptacion: new Date().toISOString()
                              });
                              window.history.replaceState({}, '', window.location.pathname);
                              localStorage.removeItem('pending_invitation_token');
                              localStorage.removeItem('pending_invitation_type');
                            }
                          } catch (err) {
                            console.log('Error procesando invitación admin:', err);
                          }
                        } else {
                          // Verificar si hay token guardado en localStorage (solo admin)
                          const savedToken = localStorage.getItem('pending_invitation_token');
                          const savedType = localStorage.getItem('pending_invitation_type');

                          if (savedToken && savedType && savedType !== 'second_parent') {
                            try {
                              const isAuth = await base44.auth.isAuthenticated();
                              if (isAuth) {
                                const invitations = await base44.entities.AdminInvitation.filter({ token: savedToken });
                                if (invitations.length > 0 && invitations[0].estado === 'pendiente') {
                                  await base44.entities.AdminInvitation.update(invitations[0].id, {
                                    estado: 'aceptada',
                                    fecha_aceptacion: new Date().toISOString()
                                  });
                                  localStorage.removeItem('pending_invitation_token');
                                  localStorage.removeItem('pending_invitation_type');
                                }
                              }
                            } catch (err) {
                              console.log('Error procesando invitación admin guardada:', err);
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
        setIsCoach(currentUser.es_entrenador === true);
        setIsCoordinator(currentUser.es_coordinador === true);
        setIsTreasurer(currentUser.es_tesorero === true);
        setIsJunta(currentUser.es_junta === true);

        // Auto-catalogar segundo progenitor por email en fichas de jugadores
        try {
          if (currentUser.es_segundo_progenitor !== true) {
            const linkedAsSecond = await base44.entities.Player.filter({ email_tutor_2: currentUser.email });
            if (linkedAsSecond.length > 0) {
                                await base44.auth.updateMe({ es_segundo_progenitor: true, tipo_panel: 'familia' });
                                // Reflejarlo inmediatamente en el estado local para evitar ver el selector
                                setUser((prev) => ({ ...(prev || {}), es_segundo_progenitor: true, tipo_panel: 'familia' }));
                                console.log('✅ [LAYOUT] Marcado como segundo progenitor');
                              }
          }
        } catch (e) {
          console.log('ℹ️ [LAYOUT] Verificación segundo progenitor fallida:', e);
        }

        // Desactivar analytics temporalmente por errores de CORS
        // Comentado para evitar spam de errores en consola

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

        // ===== CARGA INICIAL INMEDIATA DE CONTADORES DE CHAT =====
        // CRÍTICO: Cargar ANTES de mostrar UI para que los badges aparezcan inmediatamente
        try {
          const { UnifiedChatNotificationStore } = await import("./components/notifications/UnifiedChatNotificationStore");
          
          // 1. Staff chat
          if (currentUser.es_coordinador || currentUser.es_entrenador || currentUser.role === 'admin') {
            const staffConvs = await base44.entities.StaffConversation.filter({});
            const staffUnread = staffConvs.reduce((sum, conv) => {
              const reads = conv.last_read_by || [];
              const myRead = reads.find(r => r.email === currentUser.email);
              if (!myRead || !conv.ultimo_mensaje_fecha) return sum;
              const lastReadTime = new Date(myRead.fecha).getTime();
              const lastMsgTime = new Date(conv.ultimo_mensaje_fecha).getTime();
              return sum + (lastMsgTime > lastReadTime ? 1 : 0);
            }, 0);
            UnifiedChatNotificationStore.updateCount(currentUser.email, 'staff', staffUnread);
          }

          // 2. Admin - conversaciones escaladas
          if (currentUser.role === 'admin') {
            const adminConvs = await base44.entities.AdminConversation.filter({});
            const adminUnread = adminConvs.reduce((sum, c) => sum + (c.no_leidos_admin || 0), 0);
            UnifiedChatNotificationStore.updateCount(currentUser.email, 'admin', adminUnread);
          }

          // 3. Coordinador - familias
          if (currentUser.es_coordinador) {
            const coordConvs = await base44.entities.CoordinatorConversation.filter({});
            const coordUnread = coordConvs.reduce((sum, c) => sum + (c.no_leidos_coordinador || 0), 0);
            UnifiedChatNotificationStore.updateCount(currentUser.email, 'coordinator', coordUnread);
          }

          // 4. Entrenador - familias (1-a-1 + grupo)
          if (currentUser.es_entrenador) {
            // 3a. Conversaciones 1-a-1 - DESACTIVADO por entity no encontrada
               // const coachConvs = await base44.entities.CoachConversation.filter({ entrenador_email: currentUser.email });
               let coachUnread = 0; // Temporalmente 0 hasta que entity exista
            
            // 3b. Mensajes de grupo - DESACTIVADO temporalmente por rate limits
               const myCoachCategories = currentUser.categorias_entrena || [];
               // TODO: Re-habilitar cuando API esté optimizado
               // for (const cat of myCoachCategories) { ... }
            
            UnifiedChatNotificationStore.updateCount(currentUser.email, 'coach', coachUnread);
          }

          // 5. Familias - todos sus chats
          if (!currentUser.es_entrenador && !currentUser.es_coordinador && currentUser.role !== 'admin') {
            // 5a. Coordinador
            const coordConvs = await base44.entities.CoordinatorConversation.filter({ padre_email: currentUser.email });
            const coordUnread = coordConvs.reduce((sum, c) => sum + (c.no_leidos_padre || 0), 0);
            UnifiedChatNotificationStore.updateCount(currentUser.email, 'coordinatorForFamily', coordUnread);

            // 5b. Mensajes del club
            const privateConvs = await base44.entities.PrivateConversation.filter({ participante_familia_email: currentUser.email });
            const privateUnread = privateConvs.reduce((sum, c) => sum + (c.no_leidos_familia || 0), 0);
            UnifiedChatNotificationStore.updateCount(currentUser.email, 'systemMessages', privateUnread);

            // 5c. Entrenador (grupo)
            const myPlayers = await base44.entities.Player.filter({
              $or: [
                { email_padre: currentUser.email },
                { email_tutor_2: currentUser.email },
                { email_jugador: currentUser.email }
              ],
              activo: true
            });

            const myCategories = [...new Set(myPlayers.map(p => p.categoria_principal || p.deporte).filter(Boolean))];
            let coachUnread = 0;

            // Desactivado temporalmente por rate limits
            // for (const cat of myCategories) { ... }

            UnifiedChatNotificationStore.updateCount(currentUser.email, 'coachForFamily', coachUnread);
          }

          console.log('✅ [LAYOUT] Contadores de chat cargados inmediatamente');
        } catch (e) {
          console.error('❌ [LAYOUT] Error cargando contadores:', e);
        }

        // Fast path: render UI immediately while background data loads
        setIsLoading(false);

        console.log('🔍 ROLES DETECTADOS:', {
          email: currentUser.email,
          isAdmin: currentUser.role === "admin",
          isCoach: currentUser.es_entrenador === true && !currentUser.es_coordinador,
          isCoordinator: currentUser.es_coordinador === true,
          role_RAW: currentUser.role
        });

        // Cargar configuración de temporada AQUÍ (dentro del fetchUser) - PRIMERA CARGA
        // NOTA: El useEffect de polling ya se encarga de mantener esto actualizado, 
        // pero lo mantenemos aquí para la carga inicial rápida junto con el usuario y los cobros extra.
        try {
          // Usamos la función compartida si es posible, o duplicamos para asegurar sincronía inicial
          const configs = await base44.entities.SeasonConfig.filter({ activa: true });
          const activeConfig = configs[0];
          setActiveSeasonConfig(activeConfig); // Actualizar estado local
          setLoteriaVisible(activeConfig?.loteria_navidad_abierta === true);
          setSponsorBannerVisible(activeConfig?.mostrar_patrocinadores === true);
          const sociosActivo = activeConfig?.programa_socios_activo === true;
          setProgramaSociosActivo(sociosActivo);
          console.log('[LAYOUT] 🎫 Config cargada - programa_socios_activo:', sociosActivo);

        // Cargar Cobros Extra activos asignados al usuario (filtrado por destinatarios)
        try {
          if (currentUser?.email) {
            const charges = await base44.entities.ExtraCharge.filter({ publicado: true, estado: 'activo' });

            // Jugadores vinculados a este usuario (padre, tutor2 o jugador adulto)
            let myPlayers = [];
            try {
              myPlayers = await base44.entities.Player.filter({
                $or: [
                  { email_padre: currentUser.email },
                  { email_tutor_2: currentUser.email },
                  { email_jugador: currentUser.email }
                ],
                activo: true
              });
            } catch {}

            const isCoach = currentUser.es_entrenador === true;
            const isCoordinator = currentUser.es_coordinador === true;
            const isTreasurer = currentUser.es_tesorero === true;
            const isAdminUser = currentUser.role === 'admin';

            const categoryNames = new Set([
              ...(myPlayers || []).map(p => p.categoria_principal).filter(Boolean),
              ...((myPlayers || []).flatMap(p => p.categorias || []))
            ]);
            const playerIds = new Set((myPlayers || []).map(p => p.id));

            const matchesUser = (charge) => {
              const dests = charge.destinatarios || [];
              if (dests.length === 0) return true; // sin filtro => todos

              if (dests.some(d => d.tipo === 'categoria' && categoryNames.has(d.valor))) return true;
              if (dests.some(d => d.tipo === 'jugador' && playerIds.has(d.valor))) return true;

              if (dests.some(d => d.tipo === 'equipo' && d.valor === 'staff:entrenadores') && isCoach) return true;
              if (dests.some(d => d.tipo === 'equipo' && d.valor === 'staff:coordinadores') && isCoordinator) return true;
              if (dests.some(d => d.tipo === 'equipo' && d.valor === 'staff:tesoreria') && isTreasurer) return true;
              if (dests.some(d => d.tipo === 'equipo' && d.valor === 'staff:admins') && isAdminUser) return true;
              return false;
            };

            const suppressed = (() => { try { return JSON.parse(localStorage.getItem('extraChargeSuppress') || '[]'); } catch { return []; } })();
            const candidates = (charges || []).filter(matchesUser).filter(c => !suppressed.includes(c.id));
            // Minimizar llamadas: obtener todos mis pagos una sola vez
            const myPayments = await base44.entities.ExtraChargePayment.filter({
              usuario_email: currentUser.email,
              $or: [{ estado: 'Pagado' }, { estado: 'En revisión' }]
            });
            let visibleCharge = null;
            for (const c of candidates) {
              try {
                const requiredSum = (c.items || [])
                  .filter(i => i.obligatorio)
                  .reduce((sum, i) => sum + Number(i.precio || 0) * 1, 0);
                const paymentsForCharge = (myPayments || []).filter(p => p.extra_charge_id === c.id);
                let hasPaidRequired = false;
                if ((paymentsForCharge || []).length > 0) {
                  for (const p of paymentsForCharge) {
                    const sel = p.seleccion || [];
                    const mandatoryNames = new Set((c.items || []).filter(i => i.obligatorio).map(i => i.nombre));
                    const paidMandatorySum = sel
                      .filter(s => mandatoryNames.has(s.item_nombre))
                      .reduce((sum, s) => sum + Number(s.cantidad || 0) * Number(s.precio_unitario || 0), 0);
                    if ((requiredSum > 0 && paidMandatorySum >= requiredSum) || (requiredSum === 0 && Number(p.total || 0) > 0)) {
                      hasPaidRequired = true;
                      break;
                    }
                  }
                }
                if (!hasPaidRequired) { visibleCharge = c; break; }
              } catch (e) {
                visibleCharge = c; break;
              }
            }
            setExtraChargeVisible(visibleCharge);
          }
        } catch (e) { console.log('⚠️ No hay cobros extra activos:', e); }

        // Verificar si el usuario es socio pagado (para TODOS los usuarios, incluso sin hijos)
        try {
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
        } catch (e) { console.log('⚠️ Error verificando socio pagado:', e); }
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
                  if (currentUser.tipo_panel === 'familia' && (currentUser.app_instalada === true || currentUser.es_segundo_progenitor === true)) {
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

                  // Sistema unificado maneja esto ahora

                  

        // Sistema unificado maneja observaciones ahora

        // Sistema unificado maneja todos los badges ahora

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



  const adminNavigationItems = [
    // 📊 INICIO Y FINANZAS
    { title: "🏠 Inicio", url: createPageUrl("Home"), icon: Home },
    { title: "🤖 Asistente Virtual", url: createPageUrl("Chatbot"), icon: MessageCircle },
    
    // 💬 CHATS (destacado al inicio)
    { title: "💼 Chat Staff", url: createPageUrl("StaffChat"), icon: MessageCircle, badge: chatMenuCounts.staffCount },

    { title: "📧 Emails y Notificaciones", url: createPageUrl("EmailTemplates"), icon: Mail },

    // 💬 CHATS Y ESTADÍSTICAS
    { title: "─ CHATS Y ESTADÍSTICAS ─", section: true },
    { title: "🚨 Chats Escalados (Admin)", url: createPageUrl("AdminCoordinatorChats"), icon: MessageCircle, badge: chatMenuCounts.adminCount },
    { title: "💬 Chat Familias (Coordinador)", url: createPageUrl("CoordinatorChat"), icon: MessageCircle, badge: chatMenuCounts.coordinatorCount },
    { title: "⚽ Chat Entrenador-Familias", url: createPageUrl("CoachParentChat"), icon: MessageCircle, badge: chatMenuCounts.coachCount },
    { title: "📊 Estadísticas de Chat", url: createPageUrl("ChatAnalyticsDashboard"), icon: BarChart3 },
    { title: "🧪 Test Chats", url: createPageUrl("ChatTestConsole"), icon: BarChart3 },
    { title: "📊 Sistema de Análisis", url: createPageUrl("AppAnalytics"), icon: BarChart3 },
    // 💰 FINANZAS
    { title: "─ FINANZAS ─", section: true },
    { title: "💳 Pagos", url: createPageUrl("Payments"), icon: CreditCard },
    { title: "📊 Presupuestos", url: createPageUrl("TreasurerFinancialPanel?tab=presupuestos"), icon: BarChart3 },
    { title: "📊 Panel Financiero", url: createPageUrl("TreasurerFinancialPanel"), icon: BarChart3 },
    { title: "💸 Cobros Extra", url: createPageUrl("ExtraCharges"), icon: CreditCard },
    { title: "🔔 Recordatorios Simples", url: createPageUrl("PaymentReminders"), icon: Bell },
    { title: "📁 Histórico", url: createPageUrl("PaymentHistory"), icon: Archive },
    // Presupuestos movido a pestaña dentro de Panel Financiero

    // 👥 GESTIÓN DE PERSONAS
    { title: "─ GESTIÓN DE PERSONAS ─", section: true },
    { title: "👥 Jugadores", url: createPageUrl("Players"), icon: Users, badge: playersNeedingReview > 0 ? playersNeedingReview : null },
    { title: "🔄 Dashboard Renovaciones", url: createPageUrl("RenewalDashboard"), icon: RotateCw },
    { title: "🏃 Entrenadores", url: createPageUrl("CoachProfiles"), icon: Users },
    { title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignaturesAdmin"), icon: FileSignature, badge: pendingSignaturesAdmin > 0 ? pendingSignaturesAdmin : null, urgentBadge: pendingSignaturesAdmin > 0 },
    { title: "📧 Solicitudes Invitación", url: createPageUrl("InvitationRequests"), icon: Mail, badge: pendingInvitations > 0 ? pendingInvitations : null },
    { title: "👤 Usuarios", url: createPageUrl("UserManagement"), icon: Users },

    // ⚽ DEPORTIVO
    { title: "─ DEPORTIVO ─", section: true },
    { title: "🎓 Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell, badge: pendingCallupResponses > 0 ? pendingCallupResponses : null, urgentBadge: pendingCallupResponses > 0 },
    { title: "📊 Reportes Entrenadores", url: createPageUrl("CoachEvaluationReports"), icon: Star },
    { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
            { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
            { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },
    ...(hasPlayers ? [{ title: "👨‍👩‍👧 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null }] : []),

    // 📢 COMUNICACIÓN
    { title: "─ COMUNICACIÓN ─", section: true },
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    ...(isAdmin ? [{ title: "💬 Feedback Usuarios", url: createPageUrl("FeedbackManagement"), icon: MessageCircle }] : []),
    { title: "📄 Documentos", url: createPageUrl("DocumentManagement"), icon: FileText },
    { title: "🗂️ Tareas Junta", url: createPageUrl("BoardTasks"), icon: ClipboardCheck },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },

    // 🛍️ PEDIDOS Y EXTRAS
    { title: "─ PEDIDOS Y EXTRAS ─", section: true },
    ...(clothingStoreUrl ? [{ title: "🛍️ Tienda Equipación", externalUrl: clothingStoreUrl, icon: ShoppingBag }] : []),
    ...(merchStoreUrl ? [{ title: "🛒 Merchandising", externalUrl: merchStoreUrl, icon: ShoppingBag }] : []),
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
    { title: "─ CONFIGURACIÓN ─", section: true },
    { title: "📚 Manuales y Guías", url: createPageUrl("ManualsDownload"), icon: FileText },
    { title: "⚙️ Temporadas y Categorías", url: createPageUrl("SeasonManagement"), icon: Settings },
    { title: "🔔 Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
    { title: "🧪 Vista Post-Instalación", url: createPageUrl("InstallSuccessPreview"), icon: Download },
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
      ...(hasPlayers && clothingStoreUrl ? [{ title: "🛍️ Tienda Equipación", externalUrl: clothingStoreUrl, icon: ShoppingBag }] : []),
      ...(merchStoreUrl ? [{ title: "🛒 Merchandising", externalUrl: merchStoreUrl, icon: ShoppingBag }] : []),
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
      ...(hasPlayers && clothingStoreUrl ? [{ title: "🛍️ Tienda Equipación", externalUrl: clothingStoreUrl, icon: ShoppingBag }] : []),
      ...(merchStoreUrl ? [{ title: "🛒 Merchandising", externalUrl: merchStoreUrl, icon: ShoppingBag }] : []),
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
    ...(clothingStoreUrl ? [{ title: "🛍️ Tienda Equipación", externalUrl: clothingStoreUrl, icon: ShoppingBag }] : []),
    ...(merchStoreUrl ? [{ title: "🛒 Merchandising", externalUrl: merchStoreUrl, icon: ShoppingBag }] : []),
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
    ...(clothingStoreUrl ? [{ title: "🛍️ Tienda Equipación", externalUrl: clothingStoreUrl, icon: ShoppingBag }] : []),
    ...(merchStoreUrl ? [{ title: "🛒 Merchandising", externalUrl: merchStoreUrl, icon: ShoppingBag }] : []),
    { title: "🎫 Socios", url: createPageUrl("ClubMembersManagement"), icon: Users },
    { title: "📅 Calendario", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
          { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
          { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },
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
        { title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },
        { title: "💳 Mis Pagos", url: createPageUrl("ParentPayments"), icon: CreditCard },

        { title: "📅 Calendario", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
          { title: "🤝 Voluntariado", url: createPageUrl("Voluntariado"), icon: Users },
          { title: "🛍️ Mercadillo", url: createPageUrl("Mercadillo"), icon: Gift, badge: marketNewCount > 0 ? marketNewCount : null },
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

                    // Segundo progenitor: permitir guía de instalación, pero sin selector (se controla abajo)

                    // 1) Elegir panel (familia o jugador) - NO mostrar al segundo progenitor
                    if (!user.tipo_panel && user.es_segundo_progenitor !== true) {
                      setOnboardingView('selector');
                      return;
                    }

      // 2) Verificar cumpleaños - eliminado temporalmente por problemas de rendimiento

        // 3) Mostrar instrucciones de instalación (tras onboarding o si no se ha completado)
        const triggerInstall = localStorage.getItem('installPromptAfterOnboarding') === 'true';
        if (triggerInstall) {
          setInstallContext('onboarding');
          setShowInstallInstructions(true);
          localStorage.removeItem('installPromptAfterOnboarding');
        } else if (!localStorage.getItem('installCompleted')) {
          setInstallContext('onboarding');
          setShowInstallInstructions(true);
        }

      // 3) Normal - sin onboarding
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

  // Restaurar scroll por ruta y capturar dirección (adelante/atrás)
  useEffect(() => {
    if (window.__NAV_DIR__) {
      setNavDirection(window.__NAV_DIR__);
      try { delete window.__NAV_DIR__; } catch {}
    }
    try {
      const key = 'scroll:' + window.location.pathname;
      const y = Number(sessionStorage.getItem(key) || '0');
      if (y > 0) setTimeout(() => window.scrollTo({ top: y, behavior: 'instant' }), 0);
    } catch {}
  }, [location.pathname]);

  // AHORA SÍ - todos los returns condicionales DESPUÉS de TODOS los hooks
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

  const renderOnboarding = () => {
        switch (onboardingView) {
          case 'selector':
            return (
              <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
                <Suspense fallback={null}>
                  <RegistrationTypeSelector
                    onSelectFamily={async () => {
                      localStorage.setItem('installPromptAfterOnboarding', 'true');
                      localStorage.setItem('hasSeenWelcome', 'true');
                      // Disparar ventana de instalación tras elegir panel
                      localStorage.setItem('installPromptAfterOnboarding', 'true');
                      localStorage.setItem('hasSeenWelcome', 'true');
                      await base44.auth.updateMe({ tipo_panel: 'familia' });
                      window.location.reload();
                    }}
                    onSelectAdultPlayer={async () => {
                      localStorage.setItem('installPromptAfterOnboarding', 'true');
                      localStorage.setItem('hasSeenWelcome', 'true');
                      // Disparar ventana de instalación tras elegir panel
                      localStorage.setItem('installPromptAfterOnboarding', 'true');
                      localStorage.setItem('hasSeenWelcome', 'true');
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
            <SeasonProvider externalConfig={activeSeasonConfig}>
            <>
              <style>{`html, body { overscroll-behavior-y: none; }`}</style>
              <ChatNotificationSync user={user} />
              <ChatNotificationBubbles 
                user={user} 
                isCoordinator={isCoordinator}
                isCoach={isCoach}
                isFamily={!isAdmin && !isCoach && !isCoordinator && !isTreasurer && !isPlayer}
                isAdmin={isAdmin}
              />

              {/* Modal de instrucciones de instalación */}
              {showInstallInstructions && (
               <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={() => { if (installContext !== 'onboarding') setShowInstallInstructions(false); }}>
                 <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                   <div className="text-center mb-4">
                                           <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                             <Smartphone className="w-8 h-8 text-green-600" />
                                           </div>
                                           <h2 className="text-2xl font-bold text-green-700">📲 Instala la App del Club</h2>
                                           <p className="text-slate-600 mt-1 text-sm">¡Es muy sencillo! Solo 4 pasos y tardarás menos de 1 minuto</p>
                                         </div>



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
                        localStorage.setItem('installCompleted', 'true');
                        localStorage.setItem('pwaInstalled', 'true');
                        setIsAppInstalled(true);
                        setShowInstallInstructions(false);
                        if (installContext === 'onboarding') {
                          setShowInstallSuccess(true);
                        }
                      }} 
                      className="w-full mt-4 bg-green-600 hover:bg-green-700 py-4 text-lg font-bold"
                    >
                      ✅ Ya la tengo instalada
                    </Button>
                                      {installContext !== 'onboarding' && (
                                        <Button 
                                          onClick={() => {
                                            setShowInstallInstructions(false);
                                            setInstallDismissed(true);
                                            localStorage.setItem('installPromptDismissed', 'true');
                                          }} 
                                          variant="outline"
                                          className="w-full mt-2 py-3"
                                        >
                                          Cerrar
                                        </Button>
                                      )}
                  </div>
                </div>
                )}

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
                                          <ClothingApprovalNotifier isAdmin={isAdmin} />
                                        </Suspense>
                                      )}

                {enginesStage3Ready && (
                                        <Suspense fallback={null}>
                                          <PlanPaymentReminders user={user} />
                                          <AutomaticRenewalReminders />
                                          <AutomaticRenewalClosure />
                                          <RenewalNotificationEngine />
                                          <PostRenewalPaymentReminder />
                                          <ChatSoundNotifier user={user} chatType="all" />
                                          <CallupSoundNotifier user={user} />
                                          <AnnouncementSoundNotifier user={user} />
                                          <PaymentSoundNotifier user={user} />
                                        </Suspense>
                                      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-600 to-orange-700 shadow-lg safe-area-top">
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
          <div className="lg:hidden fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm">
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
                                                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-blue-500/20 text-white hover:bg-blue-500/30 transition-all mb-2"
                                                    >
                                                    <RotateCw className="w-6 h-6" />
                                                    <span className="font-semibold text-lg">Actualizar Datos</span>
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
                {enginesReady && (<Suspense fallback={null}><GlobalSearch isAdmin={isAdmin} isCoach={isCoach} /></Suspense>)}
              </div>
            )}
            <div className="flex items-center gap-1">
              
              {enginesReady && (<Suspense fallback={null}><NotificationCenter /></Suspense>)}
              <ThemeToggle />
              <Suspense fallback={null}><Suspense fallback={null}><LanguageSelector currentLang={currentLang} onLanguageChange={handleLanguageChange} /></Suspense></Suspense>
            </div>
            </div>
          </div>

          <div className="p-4 space-y-2">
                    {/* Botón de Feedback - para TODOS */}
                    {isAdmin ? (
                      <Link
                        to={createPageUrl("FeedbackManagement")}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 transition-all shadow-md mb-2"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="font-bold text-sm">💬 Ver Feedback Usuarios</span>
                      </Link>
                    ) : (
                      <button
                        onClick={() => setShowFeedback(true)}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 transition-all shadow-md mb-2"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="font-bold text-sm">💬 Suggerencias y Bugs</span>
                      </button>
                    )}

                    {navigationItems.map((item) => {
                      if (item.section) {
                        return (
                          <div key={item.title} className="px-2 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-t border-slate-700/50">
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
                  className={`flex items-center justify-center gap-4 p-4 rounded-2xl transition-all group ${
                    item.highlight
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-600/50 ring-2 ring-green-400 animate-pulse'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-semibold flex-1 text-center">{item.title}</span>
                </a>
              ) : (
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
              );
            })}
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
                onClick={() => { setInstallContext('manual'); setShowInstallInstructions(true); }} 
                variant="outline" 
                className="w-full mt-3 border-green-500 text-green-400 hover:bg-green-500/20 font-semibold py-3 rounded-xl"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                {isAppInstalled ? "✅ App instalada" : "📲 Ver cómo instalar"}
              </Button>

                              <div className="text-center text-xs text-green-400 mt-4 pt-4 border-t border-green-500/30">
                <p className="font-medium">Temporada {currentSeason}</p>
                
                {/* Botón explícito de actualización en desktop */}
                <Button 
                  onClick={checkForUpdates}
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 text-xs h-8"
                >
                  <RotateCw className="w-3 h-3 mr-2" />
                  Buscar Actualizaciones
                </Button>

                <p className="text-slate-500 mt-3 text-[10px]">© CD Bustarviejo (v1.0)</p>
                <p className="text-slate-500 text-[10px]">🔒 Tus datos están protegidos según RGPD</p>
              </div>
          </div>
        </nav>

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

        <main className={`lg:ml-72 min-h-screen pt-[100px] lg:pt-0 ${sponsorBannerVisible ? 'pb-24 lg:pb-20' : 'pb-4'}`}>

          {/* Widget de cumpleaños hoy */}


        <ActiveBanner position="top" user={user} />

          {extraChargeVisible && (
            <ExtraChargeBanner charge={extraChargeVisible} onOpen={() => setExtraChargeModalOpen(true)} />
          )}
          <PullToRefresh
            enabled={isMobile && SOFT_PTR_PAGES.has(currentPageName) && !DISABLED_PTR_PAGES.has(currentPageName)}
            onRefresh={async () => {
              try {
                await queryClient.invalidateQueries();
                await queryClient.refetchQueries({ type: 'active' });
              } catch (e) {
                window.location.reload();
              }
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ x: navDirection === 'back' ? -80 : 80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: navDirection === 'back' ? 80 : -80, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 30, duration: 0.25 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
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
                    titulo: extraChargeVisible.titulo
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
        />

        {/* Delete Account Dialog */}
        {user && (
          <Suspense fallback={null}>
            <DeleteAccountDialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount} />
          </Suspense>
        )}

        {sponsorBannerVisible && (
                        <div className={`lg:ml-72 fixed left-0 right-0 z-40 bottom-0 safe-area-bottom`}>
                          <Suspense fallback={null}><SponsorBanner /></Suspense>
                        </div>
                      )}
        </div>
        </>
        </SeasonProvider>
        );
}