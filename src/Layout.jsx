import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";


import { Home, Users, CreditCard, ShoppingBag, Menu, Bell, LogOut, Calendar, Megaphone, Mail, Archive, Settings, MessageCircle, Clock, Image, X, User as UserIcon, CheckCircle2, ClipboardCheck, Star, Award, FileText, Clover, UserCircle, FileSignature, Gift, Smartphone, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import NotificationBadge from "./components/NotificationBadge";
import SessionManager from "./components/SessionManager";
import GlobalSearch from "./components/GlobalSearch";
import ThemeToggle from "./components/ThemeToggle";
import NotificationCenter from "./components/NotificationCenter";
import LanguageSelector from "./components/LanguageSelector";
import ChatNotificationListener from "./components/push/ChatNotificationListener";
import AppNotificationListener from "./components/push/AppNotificationListener";
import WelcomeScreen from "./components/WelcomeScreen.jsx";
import { TutorialProvider } from "./components/tutorials/TutorialProvider";
import NotificationManager from "./components/notifications/NotificationManager";
import AutomaticNotificationEngine from "./components/notifications/AutomaticNotificationEngine";
import EmailNotificationTrigger from "./components/notifications/EmailNotificationTrigger";
// ToastContainer eliminado - causaba spam de notificaciones
import EventReminderEngine from "./components/events/EventReminderEngine";
import DocumentReminderEngine from "./components/documents/DocumentReminderEngine";
import ParentOnboarding from "@/components/onboarding/ParentOnboarding";
import AdminOnboarding from "@/components/onboarding/AdminOnboarding";
import CoachOnboarding from "@/components/onboarding/CoachOnboarding";
import CoordinatorOnboarding from "@/components/onboarding/CoordinatorOnboarding";
import TreasurerOnboarding from "@/components/onboarding/TreasurerOnboarding";
import SponsorBanner from "./components/sponsors/SponsorBanner";
import PWAInstallPrompt from "./components/pwa/PWAInstallPrompt";

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

  const [pendingCallupsCount, setPendingCallupsCount] = useState(0);
  const [pendingDocumentsCount, setPendingDocumentsCount] = useState(0);
  const [pendingSignaturesCount, setPendingSignaturesCount] = useState(0);
  const [pendingCallupResponses, setPendingCallupResponses] = useState(0); // Para entrenadores: respuestas sin confirmar

  const [showSpecialScreen, setShowSpecialScreen] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('es');
  const [loteriaVisible, setLoteriaVisible] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [sponsorBannerVisible, setSponsorBannerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
      const [isAppInstalled, setIsAppInstalled] = useState(false);
      const [installDismissed, setInstallDismissed] = useState(() => {
        if (typeof window !== 'undefined') {
          return localStorage.getItem('installPromptDismissed') === 'true';
        }
        return false;
      });

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
    const savedLang = localStorage.getItem('appLanguage');
    if (savedLang) setCurrentLang(savedLang);
  }, []);

  // Cargar configuración de temporada solo una vez al montar
  const [seasonConfigLoaded, setSeasonConfigLoaded] = useState(false);
  
  useEffect(() => {
    if (seasonConfigLoaded) return;
    
    const fetchSeasonConfig = async () => {
      try {
        const configs = await base44.entities.SeasonConfig.list();
        const activeConfig = configs.find(c => c.activa === true);
        setLoteriaVisible(activeConfig?.loteria_navidad_abierta === true);
        setSponsorBannerVisible(activeConfig?.mostrar_patrocinadores === true);
        setSeasonConfigLoaded(true);
      } catch (error) {
        console.error("Error fetching season config:", error);
      }
    };
    fetchSeasonConfig();
  }, [seasonConfigLoaded]);

  // Detectar si estamos en página pública (ClubMembership)
  const isPublicPage = location.pathname.includes('ClubMembership');
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
                      console.log('🔐 [LAYOUT DEBUG] Iniciando fetchUser...');
                      try {
                      // Fix para PWA: detectar si estamos en standalone mode
                      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                                   window.navigator.standalone === true;
                      console.log('📱 [LAYOUT] Modo standalone (PWA):', isStandalone);

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
        setIsLoading(false);
                  console.log('✅ [LAYOUT DEBUG] isLoading = false, debería mostrar contenido');
                  setIsAdmin(currentUser.role === "admin");
                  setIsCoach(currentUser.es_entrenador === true && !currentUser.es_coordinador);
        setIsCoordinator(currentUser.es_coordinador === true);
        setIsTreasurer(currentUser.es_tesorero === true);

        // DETECCIÓN AUTOMÁTICA DE JUGADOR +18 AUTORIZADO
        // Si el usuario no tiene es_jugador=true, verificar si hay un jugador +18 vinculado a su email
        let playerDetected = currentUser.es_jugador === true;
        if (!playerDetected && currentUser.role !== "admin" && !currentUser.es_entrenador && !currentUser.es_coordinador && !currentUser.es_tesorero) {
          try {
            const allPlayers = await base44.entities.Player.list();
            const linkedPlayer = allPlayers.find(p => 
              p.email_jugador === currentUser.email && 
              p.acceso_jugador_autorizado === true &&
              p.activo === true
            );

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
                  player_id: linkedPlayer.id
                });
                playerDetected = true;
                console.log('✅ [LAYOUT] Usuario actualizado como Jugador +18 automáticamente');
              }
            }
          } catch (error) {
            console.error('Error detectando jugador +18:', error);
          }
        }

        setIsPlayer(playerDetected);

        console.log('🔍 ROLES DETECTADOS:', {
                        email: currentUser.email,
                        isAdmin: currentUser.role === "admin",
                        isCoach: currentUser.es_entrenador === true && !currentUser.es_coordinador,
                        isCoordinator: currentUser.es_coordinador === true,
                        isTreasurer: currentUser.es_tesorero === true,
                        es_tesorero_RAW: currentUser.es_tesorero,
                        role_RAW: currentUser.role
                      });

                      // Check if user needs onboarding
                      if (!currentUser.onboarding_completado) {
                        setShowOnboarding(true);
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
        } else {
          // Para padres normales, verificar en la base de datos
          const allPlayers = await base44.entities.Player.list();
          const myPlayers = allPlayers.filter(p => 
            p.email_padre === currentUser.email || 
            p.email_tutor_2 === currentUser.email
          );
          console.log('Padre normal - jugadores encontrados:', myPlayers.length);
          setHasPlayers(myPlayers.length > 0);
        }
        
        if (currentUser.acceso_activo === false && currentUser.role !== "admin") {
          setShowSpecialScreen("restricted");
          return;
        }

        // Solo aplicar pantallas especiales a padres sin roles (NO a entrenadores, coordinadores o tesoreros)
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

          useEffect(() => {
            if (!user || isLoading) return;

            const isRootPath = location.pathname === '/' || location.pathname === '';
            if (!isRootPath) return;

            // Redirección inmediata sin async
            console.log('🎯 Redirigiendo:', { isAdmin, isCoach, isCoordinator, isTreasurer, isPlayer });

            if (isAdmin || isCoach || isCoordinator || isTreasurer) {
              navigate(createPageUrl('Home'), { replace: true });
            } else if (isPlayer) {
              navigate(createPageUrl('PlayerDashboard'), { replace: true });
            } else {
              navigate(createPageUrl('ParentDashboard'), { replace: true });
            }
          }, [user, isLoading, isAdmin, isCoach, isCoordinator, isTreasurer, isPlayer, location.pathname, navigate]);





  useEffect(() => {
    if (!user) return;
    
    const checkPendingCallups = async () => {
      try {
        const allCallups = await base44.entities.Convocatoria.list();
        const today = new Date().toISOString().split('T')[0];

        let pending = 0;

        if (!isAdmin && !isCoach) {
          const allPlayers = await base44.entities.Player.list();
          const myPlayers = allPlayers.filter(p => 
            p.email_padre === user.email || 
            p.email_tutor_2 === user.email
          );
          
          allCallups.forEach(callup => {
            if (callup.publicada && 
                callup.fecha_partido >= today && 
                !callup.cerrada) {
              callup.jugadores_convocados?.forEach(jugador => {
                const isMyPlayer = myPlayers.some(p => p.id === jugador.jugador_id);
                if (isMyPlayer && jugador.confirmacion === "pendiente") {
                  pending++;
                }
              });
            }
          });
        } else if ((isAdmin || isCoach) && hasPlayers) {
          const allPlayers = await base44.entities.Player.list();
          const myPlayers = allPlayers.filter(p => 
            p.email_padre === user.email || 
            p.email_tutor_2 === user.email
          );
          
          allCallups.forEach(callup => {
            if (callup.publicada && 
                callup.fecha_partido >= today && 
                !callup.cerrada) {
              callup.jugadores_convocados?.forEach(jugador => {
                const isMyPlayer = myPlayers.some(p => p.id === jugador.jugador_id);
                if (isMyPlayer && jugador.confirmacion === "pendiente") {
                  pending++;
                }
              });
            }
          });
        }
        
        setPendingCallupsCount(pending);
        
        // Contar respuestas pendientes para entrenadores/coordinadores
        if (isAdmin || isCoach || isCoordinator) {
          let coachPending = 0;
          const coachCategories = user.categorias_entrena || [];
          
          allCallups.forEach(callup => {
            if (callup.publicada && callup.fecha_partido >= today && !callup.cerrada) {
              // Solo contar convocatorias de las categorías del entrenador
              const isMyCategory = isAdmin || coachCategories.includes(callup.categoria);
              if (isMyCategory) {
                callup.jugadores_convocados?.forEach(jugador => {
                  if (jugador.confirmacion === "pendiente") {
                    coachPending++;
                  }
                });
              }
            }
          });
          setPendingCallupResponses(coachPending);
        }
        } catch (error) {
        console.error("Error checking pending callups:", error);
        }
        };

        checkPendingCallups();
        }, [user, isAdmin, isCoach, isCoordinator, hasPlayers]);

    useEffect(() => {
      if (!user || isAdmin) return;

      const checkPendingSignatures = async () => {
        try {
          const allPlayers = await base44.entities.Player.list();
          const myPlayers = allPlayers.filter(p => 
            p.email_padre === user.email || p.email_tutor_2 === user.email
          );

          if (myPlayers.length === 0) {
            setPendingSignaturesCount(0);
            return;
          }

          let pending = 0;

          const calcularEdad = (fechaNac) => {
            if (!fechaNac) return null;
            const hoy = new Date();
            const nacimiento = new Date(fechaNac);
            let edad = hoy.getFullYear() - nacimiento.getFullYear();
            const m = hoy.getMonth() - nacimiento.getMonth();
            if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
            return edad;
          };

          myPlayers.forEach(player => {
            const hasEnlaceJugador = !!player.enlace_firma_jugador;
            const hasEnlaceTutor = !!player.enlace_firma_tutor;
            const firmaJugadorOk = player.firma_jugador_completada === true;
            const firmaTutorOk = player.firma_tutor_completada === true;
            const esMayorDeEdad = calcularEdad(player.fecha_nacimiento) >= 18;

            if (hasEnlaceJugador && !firmaJugadorOk) pending++;
            if (hasEnlaceTutor && !firmaTutorOk && !esMayorDeEdad) pending++;
          });

          setPendingSignaturesCount(pending);
        } catch (error) {
          console.error("Error checking pending signatures:", error);
        }
      };

      checkPendingSignatures();
      
      // Refrescar cada 5 segundos para detectar cambios en firmas
      const interval = setInterval(checkPendingSignatures, 5000);
      return () => clearInterval(interval);
    }, [user, isAdmin]);



  if (showSpecialScreen === "restricted") {
    return <RestrictedAccessScreen user={user} restriction={user} />;
  }
  if (showSpecialScreen === "closed") {
    return <ClosedSeasonScreen user={user} isAdmin={isAdmin} />;
  }
  if (showSpecialScreen === "inscriptions") {
    return <InscriptionPeriodScreen user={user} isAdmin={isAdmin} />;
  }
  if (showSpecialScreen === "vacation") {
    return <VacationPeriodScreen user={user} isAdmin={isAdmin} />;
  }

  const adminNavigationItems = [
    // 📊 INICIO Y FINANZAS
    { title: "🏠 Inicio", url: createPageUrl("Home"), icon: Home },
    { title: "📊 Panel Financiero", url: createPageUrl("TreasurerDashboard"), icon: CreditCard },
    { title: "💳 Pagos", url: createPageUrl("Payments"), icon: CreditCard },
    { title: "🔔 Recordatorios", url: createPageUrl("Reminders"), icon: Bell },
    { title: "📁 Histórico", url: createPageUrl("PaymentHistory"), icon: Archive },

    // 👥 GESTIÓN DE PERSONAS
    { title: "👥 Jugadores", url: createPageUrl("Players"), icon: Users },
    { title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignaturesAdmin"), icon: FileSignature },
    { title: "👤 Usuarios", url: createPageUrl("UserManagement"), icon: Users },

    // ⚽ DEPORTIVO
    { title: "🎓 Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell, badge: pendingCallupResponses > 0 ? pendingCallupResponses : null, urgentBadge: pendingCallupResponses > 0 },
    { title: "📋 Asistencia y Evaluación", url: createPageUrl("TeamAttendanceEvaluation"), icon: CheckCircle2 },
    { title: "📊 Reportes Entrenadores", url: createPageUrl("CoachEvaluationReports"), icon: Star },
    { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    ...(hasPlayers ? [{ title: "👨‍👩‍👧 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null }] : []),

    // 💬 COMUNICACIÓN
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "📄 Documentos", url: createPageUrl("DocumentManagement"), icon: FileText },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },

    // 🛍️ PEDIDOS Y EXTRAS
    { title: "🛍️ Pedidos Ropa", url: createPageUrl("ClothingOrders"), icon: ShoppingBag },
    ...(loteriaVisible ? [{ title: "🍀 Lotería Navidad", url: createPageUrl("LotteryManagement"), icon: Clover }] : []),
    { title: "🎫 Gestión Socios", url: createPageUrl("ClubMembersManagement"), icon: Users },
            { title: "💰 Patrocinios", url: createPageUrl("Sponsorships"), icon: CreditCard },
            { title: "🎁 Trae un Socio Amigo", url: createPageUrl("ReferralManagement"), icon: Gift },
        { title: "⚽👧 Fútbol Femenino", url: createPageUrl("FemeninoInterests"), icon: Users },

            // 🎉 CONTENIDO
    { title: "🎉 Gestión Eventos", url: createPageUrl("EventManagement"), icon: Calendar },
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },

    // ⚙️ CONFIGURACIÓN
    { title: "⚙️ Temporadas y Categorías", url: createPageUrl("SeasonManagement"), icon: Settings },
    { title: "🔔 Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
    { title: "📲 Enviar Push", url: createPageUrl("PushNotifications"), icon: Bell },
    { title: "📧 Invitaciones Email", url: createPageUrl("EmailInvitations"), icon: Mail },
    ];

  const coachNavigationItems = [
      // 🏠 INICIO
      { title: "🏠 Inicio", url: createPageUrl("Home"), icon: Home },

      // 💬 COMUNICACIÓN (uso diario)

      // ⚽ GESTIÓN DEPORTIVA (trabajo principal)
      { title: "🎓 Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell, badge: pendingCallupResponses > 0 ? pendingCallupResponses : null, urgentBadge: pendingCallupResponses > 0 },
      { title: "📋 Asistencia y Evaluación", url: createPageUrl("TeamAttendanceEvaluation"), icon: CheckCircle2 },
      { title: "🎓 Plantillas", url: createPageUrl("TeamRosters"), icon: Users },
      { title: "📚 Biblioteca Ejercicios", url: createPageUrl("ExerciseLibrary"), icon: FileText },
      { title: "🎯 Pizarra Táctica", url: createPageUrl("TacticsBoard"), icon: Calendar },

      // 📅 CALENDARIO
      { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },

      // 📊 REPORTES
      { title: "📊 Reportes Entrenadores", url: createPageUrl("CoachEvaluationReports"), icon: Star },

      // 👤 PERFIL
      { title: "👤 Mi Perfil Entrenador", url: createPageUrl("CoachProfile"), icon: UserCircle },
      ...(user?.puede_gestionar_firmas ? [{ title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignaturesAdmin"), icon: FileSignature }] : []),

      // 📢 INFORMACIÓN
      { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
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

  const treasurerNavigationItems = [
    // 🏠 INICIO
    { title: "🏠 Inicio", url: createPageUrl("Home"), icon: Home },

    // 💰 FINANZAS (trabajo principal)
    { title: "📊 Panel Financiero", url: createPageUrl("TreasurerDashboard"), icon: CreditCard },
    { title: "💳 Pagos", url: createPageUrl("Payments"), icon: CreditCard },
    { title: "🔔 Recordatorios", url: createPageUrl("Reminders"), icon: Bell },
    { title: "📁 Histórico Pagos", url: createPageUrl("PaymentHistory"), icon: Archive },

    // 👥 GESTIÓN
    { title: "👥 Jugadores", url: createPageUrl("Players"), icon: Users },
    ...(user?.puede_gestionar_firmas ? [{ title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignaturesAdmin"), icon: FileSignature }] : []),
    { title: "🛍️ Pedidos Ropa", url: createPageUrl("ClothingOrders"), icon: ShoppingBag },
    ...(loteriaVisible ? [{ title: "🍀 Gestión Lotería", url: createPageUrl("LotteryManagement"), icon: Clover }] : []),
    { title: "🎫 Gestión Socios", url: createPageUrl("ClubMembersManagement"), icon: Users },
    { title: "💰 Patrocinios", url: createPageUrl("Sponsorships"), icon: CreditCard },

    // ⚙️ CONFIGURACIÓN
    { title: "⚙️ Temporadas y Categorías", url: createPageUrl("SeasonManagement"), icon: Settings },

    // 📅 CALENDARIO E INFO
    { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },

    // 👨‍👩‍👧 SECCIÓN FAMILIA (si tiene hijos)
    ...(hasPlayers ? [{ title: "👨‍👩‍👧 Mis Hijos", url: createPageUrl("ParentPlayers"), icon: Users }] : []),
    ...(hasPlayers ? [{ title: "💳 Pagos Mis Hijos", url: createPageUrl("ParentPayments"), icon: CreditCard }] : []),
    ...(hasPlayers ? [{ title: "🏆 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null }] : []),
    ...(hasPlayers ? [{ title: "🖊️ Firmas Mis Hijos", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 }] : []),
    ...(hasPlayers ? [{ title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText, badge: pendingDocumentsCount > 0 ? pendingDocumentsCount : null, urgentBadge: pendingDocumentsCount > 0 }] : []),

    ...(loteriaVisible && hasPlayers ? [{ title: "🍀 Mi Lotería", url: createPageUrl("ParentLottery"), icon: Clover }] : []),

    // 🎫 SOCIO
    { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },

    // ⚙️ PREFERENCIAS
    { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
  ];

  const coordinatorNavigationItems = [
    // 🏠 INICIO
    { title: "🏠 Inicio", url: createPageUrl("Home"), icon: Home },

    // 💬 CHAT COORDINADOR
    { title: "💬 Chat con Familias", url: createPageUrl("CoordinatorChat"), icon: MessageCircle },

      // 💬 COMUNICACIÓN (uso diario)

      // ⚽ GESTIÓN DEPORTIVA (trabajo principal)
      { title: user?.es_entrenador ? "🎓 Convocatorias" : "🎓 Ver Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell, badge: pendingCallupResponses > 0 ? pendingCallupResponses : null, urgentBadge: pendingCallupResponses > 0 },
      { title: "📋 Asistencia y Evaluación", url: createPageUrl("TeamAttendanceEvaluation"), icon: CheckCircle2 },
      { title: "🎓 Plantillas", url: createPageUrl("TeamRosters"), icon: Users },
      { title: "📚 Biblioteca Ejercicios", url: createPageUrl("ExerciseLibrary"), icon: FileText },
      { title: "🎯 Pizarra Táctica", url: createPageUrl("TacticsBoard"), icon: Calendar },
      ...(user?.puede_gestionar_firmas ? [{ title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignaturesAdmin"), icon: FileSignature }] : []),

      // 📊 REPORTES
      { title: "📊 Reportes Entrenadores", url: createPageUrl("CoachEvaluationReports"), icon: Star },

      // 📅 CALENDARIO
      { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },

      // 👤 PERFIL
      { title: "👤 Mi Perfil Entrenador", url: createPageUrl("CoachProfile"), icon: UserCircle },

      // 📢 INFORMACIÓN
      { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
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
    // 🏠 INICIO
    { title: "🏠 Inicio", url: createPageUrl("ParentDashboard"), icon: Home },

    // 💬 CHAT CON COORDINADOR
    { title: "💬 Chat Coordinador", url: createPageUrl("ParentCoordinatorChat"), icon: MessageCircle },

    // ⚽ ACCIONES URGENTES
    { title: "🏆 Convocatorias", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
    { title: "🖊️ Firmas Federación", url: createPageUrl("FederationSignatures"), icon: FileSignature, badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : null, urgentBadge: pendingSignaturesCount > 0 },

    // 💰 PAGOS Y JUGADORES
    { title: "💳 Pagos", url: createPageUrl("ParentPayments"), icon: CreditCard },
    { title: "👥 Mis Jugadores", url: createPageUrl("ParentPlayers"), icon: Users },

    // 📅 CALENDARIO Y EVENTOS
    { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },

    // 📢 INFORMACIÓN
    { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText },

    // 🛍️ PEDIDOS
    { title: "🛍️ Pedidos Ropa", url: createPageUrl("ClothingOrders"), icon: ShoppingBag },
    ...(loteriaVisible ? [{ title: "🍀 Lotería Navidad", url: createPageUrl("ParentLottery"), icon: Clover }] : []),

    // 🖼️ CONTENIDO
    { title: "🖼️ Galería", url: createPageUrl("Gallery"), icon: Image },

    // 📋 EXTRAS
    { title: "📜 Certificados y Carnets", url: createPageUrl("PlayerDocumentsAndCards"), icon: FileText },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },
  ];

  const playerNavigationItems = [
    { title: "Inicio", url: createPageUrl("PlayerDashboard"), icon: Home },
    { title: "Mi Perfil", url: createPageUrl("PlayerProfile"), icon: UserIcon },
    { title: "📅 Calendario y Horarios", url: createPageUrl("CalendarAndSchedules"), icon: Calendar },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "Galería", url: createPageUrl("Gallery"), icon: Image },
    { title: "🏆 Convocatorias", url: createPageUrl("PlayerCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },

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

  

      // Mostrar loading mientras se carga el usuario (spinner simple, sin logo)
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

      // Mostrar pantalla de bienvenida DESPUÉS del loading (cuando ya hay usuario)
      if (showWelcomeScreen && !isPublicPage && user) {
        return <WelcomeScreen onComplete={() => setShowWelcomeScreen(false)} />;
      }

  // Render onboarding based on role
  const renderOnboarding = () => {
    if (!showOnboarding) return null;

    const handleOnboardingComplete = () => setShowOnboarding(false);

    if (isAdmin) {
      return <AdminOnboarding open={showOnboarding} onComplete={handleOnboardingComplete} />;
    } else if (isCoordinator) {
      return <CoordinatorOnboarding open={showOnboarding} onComplete={handleOnboardingComplete} />;
    } else if (isTreasurer) {
      return <TreasurerOnboarding open={showOnboarding} onComplete={handleOnboardingComplete} />;
    } else if (isCoach) {
      return <CoachOnboarding open={showOnboarding} onComplete={handleOnboardingComplete} />;
    } else {
      return <ParentOnboarding open={showOnboarding} onComplete={handleOnboardingComplete} />;
    }
    return null;
  };

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

    return (
            <>
              <TutorialProvider>
              {renderOnboarding()}
                    <PWAInstallPrompt />

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
                                                                  onClick={async () => {
                                                                    setShowInstallInstructions(false);
                                                                    setIsAppInstalled(true);
                                                                    localStorage.setItem('pwaInstalled', 'true');
                                                                    // Guardar en la base de datos también
                                                                    try {
                                                                      await base44.auth.updateMe({
                                                                        app_instalada: true,
                                                                        fecha_instalacion_app: new Date().toISOString()
                                                                      });
                                                                      console.log('✅ App marcada como instalada en BD');
                                                                    } catch (err) {
                                                                      console.log('Error guardando estado:', err);
                                                                    }
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
                                        }} 
                                        variant="outline"
                                        className="w-full mt-2 py-3"
                                      >
                                        Cerrar
                                      </Button>
                  </div>
                </div>
              )}

              <SessionManager />
              <NotificationBadge />
              {user && <ChatNotificationListener user={user} />}
              {user && <AppNotificationListener user={user} />}
              {user && <DocumentReminderEngine user={user} />}
      {user && <NotificationManager user={user} />}
        {/* ToastContainer eliminado */}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-600 to-orange-700 shadow-lg safe-area-top">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2">
              <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-9 h-9 rounded-lg shadow-lg object-cover" />
              <div className="text-white">
                <h1 className="font-bold text-base leading-tight">CD Bustarviejo</h1>
                <p className="text-xs text-orange-100 truncate max-w-[140px]" title={user?.email}>
                  {user?.full_name || (isAdmin ? "Admin" : isCoordinator ? "Coordinador" : isTreasurer ? "Tesorero" : isCoach ? "Entrenador" : isPlayer ? "Jugador" : "Familia")}
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
              {!isAdmin && !isCoach && <NotificationCenter />}
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
          <GlobalSearch isAdmin={isAdmin} isCoach={isCoach} isTreasurer={isTreasurer} />
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
                      location.pathname === item.url
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
                <GlobalSearch isAdmin={isAdmin} isCoach={isCoach} isTreasurer={isTreasurer} />
              </div>
            )}
            <div className="flex items-center gap-1">
              {!isAdmin && !isCoach && !isTreasurer && <NotificationCenter />}
              <ThemeToggle />
              <LanguageSelector currentLang={currentLang} onLanguageChange={handleLanguageChange} />
            </div>
            </div>
          </div>

          <div className="p-4 space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.title}
                to={item.url}
                className={`flex items-center justify-center gap-4 p-4 rounded-2xl transition-all group ${
                  location.pathname === item.url
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
                <p className="font-medium">{user.full_name}</p>
                <p className="text-green-400 text-xs">{user.email}</p>
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

        <main className={`lg:ml-72 min-h-screen pt-[100px] lg:pt-0 ${sponsorBannerVisible ? 'pb-20 lg:pb-16' : ''}`}>
          {/* Ya no usamos bloqueo de pantalla - usamos recordatorios amigables cada 24h */}
          {children}
        </main>

        {/* Banner de Patrocinadores - Footer fijo */}
        {sponsorBannerVisible && (
          <div className="lg:ml-72 fixed bottom-0 left-0 right-0 z-40">
            <SponsorBanner />
          </div>
        )}
        </div>
        </TutorialProvider>
        </>
        );
}