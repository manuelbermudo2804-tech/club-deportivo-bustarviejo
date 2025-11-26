import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";


import { Home, Users, CreditCard, ShoppingBag, Menu, Bell, LogOut, Calendar, Megaphone, Mail, Archive, Settings, MessageCircle, Clock, Image, X, User as UserIcon, CheckCircle2, ClipboardCheck, Star, Award, FileText, Clover, UserCircle } from "lucide-react";
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
import WelcomeScreen from "./components/WelcomeScreen";
import NotificationManager from "./components/notifications/NotificationManager";
import AutomaticNotificationEngine from "./components/notifications/AutomaticNotificationEngine";
import EmailNotificationTrigger from "./components/notifications/EmailNotificationTrigger";
import ToastContainer from "./components/notifications/ToastContainer";
import EventReminderEngine from "./components/events/EventReminderEngine";
import DocumentReminderEngine from "./components/documents/DocumentReminderEngine";
import ParentOnboarding from "@/components/onboarding/ParentOnboarding";
import AdminOnboarding from "@/components/onboarding/AdminOnboarding";
import CoachOnboarding from "@/components/onboarding/CoachOnboarding";
import CoordinatorOnboarding from "@/components/onboarding/CoordinatorOnboarding";
import TreasurerOnboarding from "@/components/onboarding/TreasurerOnboarding";
import SponsorBanner from "./components/sponsors/SponsorBanner";

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
  const [isPlayer, setIsPlayer] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [isTreasurer, setIsTreasurer] = useState(false);
  const [hasPlayers, setHasPlayers] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [urgentMessagesCount, setUrgentMessagesCount] = useState(0);
  const [pendingCallupsCount, setPendingCallupsCount] = useState(0);
  const [pendingDocumentsCount, setPendingDocumentsCount] = useState(0);
  const [showSpecialScreen, setShowSpecialScreen] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(() => {
    return localStorage.getItem('appLanguage') || 'es';
  });
  const [showWelcome, setShowWelcome] = useState(() => {
    // Solo mostrar una vez por sesión
    return sessionStorage.getItem('welcomeShown') === 'true';
  });
  const [loteriaVisible, setLoteriaVisible] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
      const [isRedirecting, setIsRedirecting] = useState(false);
      const [sponsorBannerVisible, setSponsorBannerVisible] = useState(false);

  const handleLanguageChange = (newLang) => {
    setCurrentLang(newLang);
    localStorage.setItem('appLanguage', newLang);
  };

  useEffect(() => {
        const fetchSeasonConfig = async () => {
          try {
            const configs = await base44.entities.SeasonConfig.list();
            const activeConfig = configs.find(c => c.activa === true);
            setLoteriaVisible(activeConfig?.loteria_navidad_abierta === true);
            setSponsorBannerVisible(activeConfig?.mostrar_patrocinadores === true);
          } catch (error) {
            console.error("Error fetching season config:", error);
          }
        };
        fetchSeasonConfig();
      }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        console.log('👤 USUARIO CARGADO:', currentUser.email);
        setUser(currentUser);
        setIsAdmin(currentUser.role === "admin");
        setIsPlayer(currentUser.role === "jugador");
        setIsCoach(currentUser.es_entrenador === true && !currentUser.es_coordinador);
        setIsCoordinator(currentUser.es_coordinador === true);
        setIsTreasurer(currentUser.es_tesorero === true);

        console.log('🔍 ROLES DETECTADOS:', {
                        email: currentUser.email,
                        isAdmin: currentUser.role === "admin",
                        isPlayer: currentUser.role === "jugador",
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
            currentUser.role !== "jugador" && 
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
          console.error("Error fetching user:", error);
          }
          };
          fetchUser();
          }, []);

          useEffect(() => {
            if (!user) return;
            
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
          }, [user, isAdmin, isCoach, isCoordinator, isTreasurer, isPlayer, location.pathname, navigate]);

  useEffect(() => {
    if (!user) return;
    
    const checkUnreadMessages = async () => {
      try {
        const allMessages = await base44.entities.ChatMessage.list();
        let unread = 0;
        let urgent = 0;
        
        if (isAdmin) {
          allMessages.forEach(msg => {
            if (!msg.leido && (msg.tipo === "padre_a_grupo" || msg.tipo === "jugador_a_equipo")) {
              unread++;
              if (msg.prioridad === "Urgente") {
                urgent++;
              }
            }
          });
        } else if (isCoach) {
          const categoriesCoached = user.categorias_entrena || [];
          allMessages.forEach(msg => {
            if (!msg.leido && msg.tipo === "padre_a_grupo") {
              const msgDeporte = msg.grupo_id || msg.deporte;
              if (categoriesCoached.includes(msgDeporte)) {
                unread++;
                if (msg.prioridad === "Urgente") {
                  urgent++;
                }
              }
            }
          });
        } else if (isPlayer) {
          const allPlayers = await base44.entities.Player.list();
          const myPlayer = allPlayers.find(p => p.email_jugador === user.email);
          
          if (myPlayer) {
            allMessages.forEach(msg => {
              if (!msg.leido && 
                  msg.tipo === "admin_a_grupo" && 
                  (msg.grupo_id === myPlayer.deporte || msg.deporte === myPlayer.deporte)) {
                unread++;
                if (msg.prioridad === "Urgente") {
                  urgent++;
                }
              }
            });
          }
        } else {
          const allPlayers = await base44.entities.Player.list();
          const myPlayers = allPlayers.filter(p => 
            p.email_padre === user.email || p.email_tutor_2 === user.email
          );
          const myGroupSports = [...new Set(myPlayers.map(p => p.deporte))];
          
          allMessages.forEach(msg => {
            if (!msg.leido && 
                msg.tipo === "admin_a_grupo" && 
                myGroupSports.includes(msg.grupo_id || msg.deporte)) {
              unread++;
              if (msg.prioridad === "Urgente") {
                urgent++;
              }
            }
          });
        }
        
        setUnreadMessagesCount(unread);
        setUrgentMessagesCount(urgent);
      } catch (error) {
        console.error("Error checking unread messages:", error);
      }
    };

    checkUnreadMessages();
  }, [user, isAdmin, isPlayer, isCoach]);

  useEffect(() => {
    if (!user) return;
    
    const checkPendingCallups = async () => {
      try {
        const allCallups = await base44.entities.Convocatoria.list();
        const today = new Date().toISOString().split('T')[0];
        
        let pending = 0;
        
        if (isPlayer) {
          const allPlayers = await base44.entities.Player.list();
          const myPlayer = allPlayers.find(p => p.email_jugador === user.email);
          
          if (myPlayer) {
            allCallups.forEach(callup => {
              if (callup.publicada && 
                  callup.fecha_partido >= today && 
                  !callup.cerrada) {
                const myConfirmation = callup.jugadores_convocados?.find(j => j.jugador_id === myPlayer.id);
                if (myConfirmation && myConfirmation.confirmacion === "pendiente") {
                  pending++;
                }
              }
            });
          }
        } else if (!isAdmin && !isCoach) {
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
      } catch (error) {
        console.error("Error checking pending callups:", error);
      }
    };

    checkPendingCallups();
    }, [user, isAdmin, isPlayer, isCoach, hasPlayers]);

    useEffect(() => {
      if (!user || isAdmin) return;

      const checkPendingDocuments = async () => {
        try {
          const allDocuments = await base44.entities.Document.list();
          const allPlayers = await base44.entities.Player.list();
          const myPlayers = allPlayers.filter(p => 
            p.email_padre === user.email || p.email_tutor_2 === user.email
          );

          if (myPlayers.length === 0) {
            setPendingDocumentsCount(0);
            return;
          }

          let pending = 0;

          allDocuments.forEach(doc => {
            if (!doc.publicado || !doc.requiere_firma) return;

            const isRelevant = doc.tipo_destinatario === "individual" 
              ? myPlayers.some(p => doc.jugadores_destino?.includes(p.id))
              : (doc.categoria_destino === "Todos" || myPlayers.some(p => p.deporte === doc.categoria_destino));

            if (isRelevant) {
              myPlayers.forEach(player => {
                const isRelevantForPlayer = doc.tipo_destinatario === "individual" 
                  ? doc.jugadores_destino?.includes(player.id)
                  : (doc.categoria_destino === "Todos" || player.deporte === doc.categoria_destino);

                if (isRelevantForPlayer) {
                  const firma = doc.firmas?.find(f => f.jugador_id === player.id);
                  if (!firma || (!firma.firmado && !firma.confirmado_firma_externa)) {
                    pending++;
                  }
                }
              });
            }
          });

          setPendingDocumentsCount(pending);
        } catch (error) {
          console.error("Error checking pending documents:", error);
        }
      };

      checkPendingDocuments();
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
    { title: "Inicio", url: createPageUrl("Home"), icon: Home },
    { title: "📊 Panel Financiero", url: createPageUrl("TreasurerDashboard"), icon: CreditCard },
    { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
    { title: "Chat Grupos", url: createPageUrl("AdminChat"), icon: MessageCircle, badge: unreadMessagesCount > 0 ? unreadMessagesCount : null, urgentBadge: urgentMessagesCount > 0 },
    { title: "Jugadores", url: createPageUrl("Players"), icon: Users },
    { title: "Pagos", url: createPageUrl("Payments"), icon: CreditCard },
    { title: "🎓 Crear Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell },
    { title: "Calendario", url: createPageUrl("Calendar"), icon: Calendar },
    { title: "Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "📄 Documentos", url: createPageUrl("DocumentManagement"), icon: FileText },
    { title: "📋 Asistencia y Evaluación", url: createPageUrl("TeamAttendanceEvaluation"), icon: CheckCircle2 },
    { title: "📊 Reportes Entrenadores", url: createPageUrl("CoachEvaluationReports"), icon: Star },
    ...(hasPlayers ? [{ title: "👨‍👩‍👧 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null }] : []),
    { title: "Horarios", url: createPageUrl("TrainingSchedules"), icon: Clock },
    { title: "Galería", url: createPageUrl("AdminGallery"), icon: Image },
    { title: "Recordatorios", url: createPageUrl("Reminders"), icon: Bell },
    { title: "Pedidos Ropa", url: createPageUrl("ClothingOrders"), icon: ShoppingBag },
    ...(loteriaVisible ? [{ title: "🍀 Lotería Navidad", url: createPageUrl("LotteryManagement"), icon: Clover }] : []),
    { title: "🎉 Gestión Eventos", url: createPageUrl("EventManagement"), icon: Calendar },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "Histórico", url: createPageUrl("PaymentHistory"), icon: Archive },
    { title: "⚙️ Configuración", url: createPageUrl("SeasonManagement"), icon: Settings },
    { title: "⚙️ Categorías y Cuotas", url: createPageUrl("CategoryManagement"), icon: Settings },
    { title: "💰 Patrocinios", url: createPageUrl("Sponsorships"), icon: CreditCard },
    { title: "📱 Configurar PWA", url: createPageUrl("PWASetup"), icon: Settings },
    { title: "Usuarios", url: createPageUrl("UserManagement"), icon: Users },
    ];

  const coachNavigationItems = [
      { title: "🏠 Inicio", url: createPageUrl("Home"), icon: Home },
      { title: "👤 Mi Perfil Entrenador", url: createPageUrl("CoachProfile"), icon: UserCircle },
      { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
      { title: "Chat Equipos", url: createPageUrl("CoachChat"), icon: MessageCircle, badge: unreadMessagesCount > 0 ? unreadMessagesCount : null, urgentBadge: urgentMessagesCount > 0 },
      { title: "🎓 Plantillas", url: createPageUrl("TeamRosters"), icon: Users },
      { title: "📋 Asistencia y Evaluación", url: createPageUrl("TeamAttendanceEvaluation"), icon: CheckCircle2 },
      { title: "🎓 Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell },
      { title: "Calendario", url: createPageUrl("Calendar"), icon: Calendar },
      { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
      { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
      { title: "📊 Reportes Entrenadores", url: createPageUrl("CoachEvaluationReports"), icon: Star },
      ...(hasPlayers ? [{ title: "👨‍👩‍👧 Mis Hijos", url: createPageUrl("ParentPlayers"), icon: Users }] : []),
      { title: "⏰ Horarios", url: createPageUrl("TrainingSchedules"), icon: Clock },
      { title: "Galería", url: createPageUrl("AdminGallery"), icon: Image },
      { title: "Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
      ...(hasPlayers ? [{ title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText, badge: pendingDocumentsCount > 0 ? pendingDocumentsCount : null, urgentBadge: pendingDocumentsCount > 0 }] : []),
      ...(hasPlayers ? [{ title: "Pedidos Ropa", url: createPageUrl("ClothingOrders"), icon: ShoppingBag }] : []),
      ...(hasPlayers ? [{ title: "👨‍👩‍👧 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null }] : []),
      ...(loteriaVisible && hasPlayers ? [{ title: "🍀 Mi Lotería", url: createPageUrl("ParentLottery"), icon: Clover }] : []),
      ...(loteriaVisible ? [{ title: "🍀 Gestión Lotería", url: createPageUrl("LotteryManagement"), icon: Clover }] : []),
    ];

  const treasurerNavigationItems = [
              { title: "🏠 Inicio", url: createPageUrl("Home"), icon: Home },
              { title: "📊 Panel Financiero", url: createPageUrl("TreasurerDashboard"), icon: CreditCard },
              { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
              ...(hasPlayers ? [{ title: "👨‍👩‍👧 Mis Hijos", url: createPageUrl("ParentPlayers"), icon: Users }] : []),
              { title: "💰 Pagos", url: createPageUrl("Payments"), icon: CreditCard },
              ...(hasPlayers ? [{ title: "💳 Pagos Mis Hijos", url: createPageUrl("ParentPayments"), icon: CreditCard }] : []),
              { title: "🔔 Recordatorios", url: createPageUrl("Reminders"), icon: Bell },
              { title: "📋 Histórico Pagos", url: createPageUrl("PaymentHistory"), icon: Archive },
              { title: "🛍️ Pedidos Ropa", url: createPageUrl("ClothingOrders"), icon: ShoppingBag },
              { title: "💰 Patrocinios", url: createPageUrl("Sponsorships"), icon: CreditCard },
              { title: "⚙️ Temporadas", url: createPageUrl("SeasonManagement"), icon: Settings },
              { title: "📅 Calendario", url: createPageUrl("Calendar"), icon: Calendar },
              { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
              { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
              { title: "📢 Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
              ...(hasPlayers ? [{ title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText, badge: pendingDocumentsCount > 0 ? pendingDocumentsCount : null, urgentBadge: pendingDocumentsCount > 0 }] : []),
              ...(hasPlayers ? [{ title: "👨‍👩‍👧 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null }] : []),
              ...(loteriaVisible && hasPlayers ? [{ title: "🍀 Mi Lotería", url: createPageUrl("ParentLottery"), icon: Clover }] : []),
              ...(hasPlayers ? [{ title: "💬 Chat Familiar", url: createPageUrl("ParentChat"), icon: MessageCircle, badge: unreadMessagesCount > 0 ? unreadMessagesCount : null, urgentBadge: urgentMessagesCount > 0 }] : []),
            ];

  const coordinatorNavigationItems = [
      { title: "🏠 Inicio", url: createPageUrl("Home"), icon: Home },
      { title: "👤 Mi Perfil Entrenador", url: createPageUrl("CoachProfile"), icon: UserCircle },
      { title: "⚙️ Preferencias Notif.", url: createPageUrl("NotificationPreferences"), icon: Settings },
      { title: "Chat Coordinación", url: createPageUrl("CoachChat"), icon: MessageCircle, badge: unreadMessagesCount > 0 ? unreadMessagesCount : null, urgentBadge: urgentMessagesCount > 0 },
      { title: "🎓 Plantillas", url: createPageUrl("TeamRosters"), icon: Users },
      { title: "📋 Asistencia y Evaluación", url: createPageUrl("TeamAttendanceEvaluation"), icon: CheckCircle2 },
      { title: user?.es_entrenador ? "🎓 Crear Convocatorias" : "🎓 Ver Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell },
      { title: "Calendario", url: createPageUrl("Calendar"), icon: Calendar },
      { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
      { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
      { title: "📊 Reportes Entrenadores", url: createPageUrl("CoachEvaluationReports"), icon: Star },
      ...(hasPlayers ? [{ title: "👨‍👩‍👧 Mis Hijos", url: createPageUrl("ParentPlayers"), icon: Users }] : []),
      { title: "⏰ Horarios", url: createPageUrl("TrainingSchedules"), icon: Clock },
      { title: "Galería", url: createPageUrl("AdminGallery"), icon: Image },
      { title: "Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
      ...(hasPlayers ? [{ title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText, badge: pendingDocumentsCount > 0 ? pendingDocumentsCount : null, urgentBadge: pendingDocumentsCount > 0 }] : []),
      ...(hasPlayers ? [{ title: "Pedidos Ropa", url: createPageUrl("ClothingOrders"), icon: ShoppingBag }] : []),
      ...(hasPlayers ? [{ title: "👨‍👩‍👧 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null }] : []),
      ...(loteriaVisible && hasPlayers ? [{ title: "🍀 Mi Lotería", url: createPageUrl("ParentLottery"), icon: Clover }] : []),
      ...(loteriaVisible ? [{ title: "🍀 Gestión Lotería", url: createPageUrl("LotteryManagement"), icon: Clover }] : []),
    ];

  const parentNavigationItems = [
    { title: "Inicio", url: createPageUrl("ParentDashboard"), icon: Home },
    { title: "Chat", url: createPageUrl("ParentChat"), icon: MessageCircle, badge: unreadMessagesCount > 0 ? unreadMessagesCount : null, urgentBadge: unreadMessagesCount > 0 },
    { title: "Jugadores", url: createPageUrl("ParentPlayers"), icon: Users },
    { title: "Pagos", url: createPageUrl("ParentPayments"), icon: CreditCard },
    { title: "🏆 Convocatorias", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
    { title: "Calendario", url: createPageUrl("Calendar"), icon: Calendar },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "📄 Documentos", url: createPageUrl("ParentDocuments"), icon: FileText, badge: pendingDocumentsCount > 0 ? pendingDocumentsCount : null, urgentBadge: pendingDocumentsCount > 0 },
    { title: "Pedidos Ropa", url: createPageUrl("ClothingOrders"), icon: ShoppingBag },
    ...(loteriaVisible ? [{ title: "🍀 Lotería Navidad", url: createPageUrl("ParentLottery"), icon: Clover }] : []),
    { title: "Horarios", url: createPageUrl("ParentTrainingSchedules"), icon: Clock },
    { title: "Galería", url: createPageUrl("ParentGallery"), icon: Image },
    { title: "🆔 Carnets", url: createPageUrl("PlayerCards"), icon: Award },
    { title: "📜 Certificados", url: createPageUrl("Certificates"), icon: FileText },
    { title: "🎫 Hacerse Socio", url: createPageUrl("ClubMembership"), icon: Users },
  ];

  const playerNavigationItems = [
    { title: "Inicio", url: createPageUrl("PlayerDashboard"), icon: Home },
    { title: "Mi Perfil", url: createPageUrl("PlayerProfile"), icon: UserIcon },
    { title: "Horarios", url: createPageUrl("PlayerSchedules"), icon: Clock },
    { title: "Calendario", url: createPageUrl("Calendar"), icon: Calendar },
    { title: "🎉 Eventos Club", url: createPageUrl("ParentEventRSVP"), icon: Calendar },
    { title: "📋 Encuestas", url: createPageUrl("Surveys"), icon: FileText },
    { title: "Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "Galería", url: createPageUrl("PlayerGallery"), icon: Image },
    { title: "🏆 Convocatorias", url: createPageUrl("PlayerCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
    { title: "Chat Equipo", url: createPageUrl("PlayerChat"), icon: MessageCircle, badge: unreadMessagesCount > 0 ? unreadMessagesCount : null, urgentBadge: unreadMessagesCount > 0 },
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
    } else {
      // Usuario normal de familia (padre/madre sin roles especiales)
      navigationItems = parentNavigationItems;
    }

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (!showWelcome) {
        return <WelcomeScreen onComplete={() => {
          sessionStorage.setItem('welcomeShown', 'true');
          setShowWelcome(true);
        }} />;
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
        } else if (!isPlayer) {
          return <ParentOnboarding open={showOnboarding} onComplete={handleOnboardingComplete} />;
        }
        return null;
      };

      return (
        <>
          {renderOnboarding()}
          <SessionManager />
      <NotificationBadge />
      {user && <ChatNotificationListener user={user} />}
      {user && <DocumentReminderEngine user={user} />}
      {user && <NotificationManager user={user} />}
        {user && <ToastContainer user={user} isAdmin={isAdmin} isCoach={isCoach} />}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-600 to-orange-700 shadow-lg">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-9 h-9 rounded-lg shadow-lg object-cover" />
              <div className="text-white">
                <h1 className="font-bold text-base leading-tight">CD Bustarviejo</h1>
                <p className="text-xs text-orange-100">
                  {isAdmin ? "Admin" : isPlayer ? "Jugador" : isCoordinator ? "Coordinador" : isTreasurer ? "Tesorero" : isCoach ? "Entrenador" : "Familia"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isAdmin && !isCoach && <NotificationCenter />}
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-3 text-white hover:bg-white/20 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Search Bar */}
        <div className="lg:hidden fixed top-[60px] left-0 right-0 z-40 bg-white border-b shadow-sm p-2">
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
              <div className="p-4 bg-slate-900 border-t border-white/10">
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
                  {isAdmin ? "Panel Admin" : isPlayer ? "Panel Jugador" : isCoordinator ? "Panel Coordinador" : isTreasurer ? "Panel Tesorero" : isCoach ? "Panel Entrenador" : "Panel Familia"}
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

            <div className="text-center text-xs text-green-400 mt-4 pt-4 border-t border-green-500/30">
              <p className="font-medium">Temporada {currentSeason}</p>
              <p className="text-orange-400 mt-1">© CD Bustarviejo</p>
            </div>
          </div>
        </nav>

        <main className={`lg:ml-72 min-h-screen pt-[120px] lg:pt-0 ${sponsorBannerVisible ? 'pb-20 lg:pb-16' : ''}`}>
          {children}
        </main>

        {/* Banner de Patrocinadores - Footer fijo */}
        {sponsorBannerVisible && (
          <div className="lg:ml-72 fixed bottom-0 left-0 right-0 z-40">
            <SponsorBanner />
          </div>
        )}
      </div>
    </>
  );
}