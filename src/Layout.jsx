
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Home, Users, CreditCard, ShoppingBag, Menu, Bell, LogOut, Calendar, Megaphone, Mail, Archive, Settings, MessageCircle, Clock, Image, X, User as UserIcon, CheckCircle2, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import NotificationBadge from "./components/NotificationBadge";
import SessionManager from "./components/SessionManager";

const CLUB_LOGO_URL = "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png";

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
                  className="w-32 h-32 object-contain drop-shadow-2xl opacity-50"
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
  const [hasPlayers, setHasPlayers] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [urgentMessagesCount, setUrgentMessagesCount] = useState(0);
  const [pendingCallupsCount, setPendingCallupsCount] = useState(0);
  const [showSpecialScreen, setShowSpecialScreen] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === "admin");
        setIsPlayer(currentUser.role === "jugador");
        setIsCoach(currentUser.es_entrenador === true);
        
        // Check if admin/coach has players (to show ParentCallups)
        // This is for admins/coaches who are also parents and need to confirm callups for their kids
        if (currentUser.role === "admin" || currentUser.es_entrenador) {
          const allPlayers = await base44.entities.Player.list();
          const myPlayers = allPlayers.filter(p => 
            p.email_padre === currentUser.email || 
            p.email_tutor_2 === currentUser.email
          );
          setHasPlayers(myPlayers.length > 0);
        }
        
        if (currentUser.acceso_activo === false && currentUser.role !== "admin") {
          setShowSpecialScreen("restricted");
          return;
        }
        
        // IMPORTANT: Coaches should NOT see special screens, only parents (non-admin, non-jugador, non-coach)
        if (currentUser.role !== "admin" && currentUser.role !== "jugador" && !currentUser.es_entrenador) {
          const period = getPeriodType();
          if (period === "closed") {
            setShowSpecialScreen("closed");
          } else if (period === "inscriptions") {
            setShowSpecialScreen("inscriptions");
          } else if (period === "vacation") {
            setShowSpecialScreen("vacation");
          }
        }

        // REDIRECT ONLY PARENTS (not coaches, not admins, not players) TO THEIR DASHBOARD IF THEY'RE ON HOME PAGE
        if (currentUser.role !== "admin" && currentUser.role !== "jugador" && !currentUser.es_entrenador && location.pathname === createPageUrl("Home")) {
          navigate(createPageUrl("ParentDashboard"), { replace: true });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, [location.pathname, navigate]);

  useEffect(() => {
    const checkUnreadMessages = async () => {
      if (!user) return;
      
      try {
        const allMessages = await base44.entities.ChatMessage.list();
        let unread = 0;
        let urgent = 0;
        
        if (isAdmin) {
          // Admin: count parent messages
          allMessages.forEach(msg => {
            if (!msg.leido && (msg.tipo === "padre_a_grupo" || msg.tipo === "jugador_a_equipo")) {
              unread++;
              if (msg.prioridad === "Urgente") {
                urgent++;
              }
            }
          });
        } else if (isCoach) {
          // Coach: count parent messages from coached teams
          const categoriesCoached = user.categorias_entrena || [];
          allMessages.forEach(msg => {
            if (!msg.leido && msg.tipo === "padre_a_grupo") {
              // Check if message is from a coached team
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
        } else { // Parents
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
    const interval = setInterval(checkUnreadMessages, 5000);
    
    return () => clearInterval(interval);
  }, [user, isAdmin, isPlayer, isCoach]); // Added isCoach to dependencies

  useEffect(() => {
    const checkPendingCallups = async () => {
      if (!user) return;
      
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
        } else if (!isAdmin && !isCoach) { // Only for parents (not admins, not coaches)
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
        } else if ((isAdmin || isCoach) && hasPlayers) { // Admins or Coaches who also have players associated
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
    const interval = setInterval(checkPendingCallups, 10000);
    
    return () => clearInterval(interval);
  }, [user, isAdmin, isPlayer, isCoach, hasPlayers]); // Added isCoach to dependencies

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
    { title: "Jugadores", url: createPageUrl("Players"), icon: Users },
    { title: "Horarios", url: createPageUrl("TrainingSchedules"), icon: Clock },
    { title: "Calendario", url: createPageUrl("Calendar"), icon: Calendar },
    { title: "Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "Galería", url: createPageUrl("AdminGallery"), icon: Image },
    { title: "🎓 Crear Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell },
    ...(hasPlayers ? [{ title: "👨‍👩‍👧 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null }] : []),
    { title: "Pagos", url: createPageUrl("Payments"), icon: CreditCard },
    { title: "Recordatorios", url: createPageUrl("Reminders"), icon: Bell },
    { title: "Pedidos Ropa", url: createPageUrl("ClothingOrders"), icon: ShoppingBag },
    { title: "Chat Grupos", url: createPageUrl("AdminChat"), icon: MessageCircle, badge: unreadMessagesCount > 0 ? unreadMessagesCount : null, urgentBadge: urgentMessagesCount > 0 },
    { title: "Histórico", url: createPageUrl("PaymentHistory"), icon: Archive },
    { title: "Temporadas", url: createPageUrl("SeasonManagement"), icon: Settings },
    { title: "Usuarios", url: createPageUrl("UserManagement"), icon: Users },
  ];

  const coachNavigationItems = [
    { title: "Inicio", url: createPageUrl("Home"), icon: Home },
    { title: "Mis Hijos", url: createPageUrl("Players"), icon: Users },
    { title: "🎓 Plantillas", url: createPageUrl("TeamRosters"), icon: Users },
    { title: "✅ Asistencia", url: createPageUrl("CoachAttendance"), icon: CheckCircle2 },
    { title: "Horarios", url: createPageUrl("TrainingSchedules"), icon: Clock },
    { title: "Calendario", url: createPageUrl("Calendar"), icon: Calendar },
    { title: "Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "Galería", url: createPageUrl("AdminGallery"), icon: Image },
    { title: "🎓 Crear Convocatorias", url: createPageUrl("CoachCallups"), icon: Bell },
    ...(hasPlayers ? [{ title: "👨‍👩‍👧 Confirmar Mis Hijos", url: createPageUrl("ParentCallups"), icon: ClipboardCheck, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null }] : []),
    { title: "Pagos", url: createPageUrl("Payments"), icon: CreditCard },
    { title: "Pedidos Ropa", url: createPageUrl("ClothingOrders"), icon: ShoppingBag },
    { title: "🎓 Chat Equipos", url: createPageUrl("CoachChat"), icon: MessageCircle, badge: unreadMessagesCount > 0 ? unreadMessagesCount : null, urgentBadge: urgentMessagesCount > 0 },
  ];

  const parentNavigationItems = [
    { title: "Inicio", url: createPageUrl("ParentDashboard"), icon: Home },
    { title: "Jugadores", url: createPageUrl("ParentPlayers"), icon: Users },
    { title: "Horarios", url: createPageUrl("ParentTrainingSchedules"), icon: Clock },
    { title: "Calendario", url: createPageUrl("Calendar"), icon: Calendar },
    { title: "Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "Galería", url: createPageUrl("ParentGallery"), icon: Image },
    { title: "🏆 Convocatorias", url: createPageUrl("ParentCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
    { title: "Pagos", url: createPageUrl("ParentPayments"), icon: CreditCard },
    { title: "Pedidos Ropa", url: createPageUrl("ClothingOrders"), icon: ShoppingBag },
    { title: "Chat", url: createPageUrl("ParentChat"), icon: MessageCircle, badge: unreadMessagesCount > 0 ? unreadMessagesCount : null, urgentBadge: urgentMessagesCount > 0 },
  ];

  const playerNavigationItems = [
    { title: "Inicio", url: createPageUrl("PlayerDashboard"), icon: Home },
    { title: "Mi Perfil", url: createPageUrl("PlayerProfile"), icon: UserIcon },
    { title: "Horarios", url: createPageUrl("PlayerSchedules"), icon: Clock },
    { title: "Calendario", url: createPageUrl("Calendar"), icon: Calendar },
    { title: "Anuncios", url: createPageUrl("Announcements"), icon: Megaphone },
    { title: "Galería", url: createPageUrl("PlayerGallery"), icon: Image },
    { title: "🏆 Convocatorias", url: createPageUrl("PlayerCallups"), icon: Bell, badge: pendingCallupsCount > 0 ? pendingCallupsCount : null, urgentBadge: pendingCallupsCount > 0 },
    { title: "Chat Equipo", url: createPageUrl("PlayerChat"), icon: MessageCircle, badge: unreadMessagesCount > 0 ? unreadMessagesCount : null, urgentBadge: unreadMessagesCount > 0 },
  ];

  let navigationItems;
  if (isAdmin) {
    navigationItems = adminNavigationItems;
  } else if (isPlayer) {
    navigationItems = playerNavigationItems;
  } else if (isCoach) {
    navigationItems = coachNavigationItems;
  } else {
    navigationItems = parentNavigationItems;
  }

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <>
      <SessionManager />
      <NotificationBadge />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        
        {/* Header móvil */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-600 to-orange-700 shadow-lg">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-10 h-10 rounded-xl shadow-lg" />
              <div className="text-white">
                <h1 className="font-bold text-lg leading-tight">CD Bustarviejo</h1>
                <p className="text-xs text-orange-100">
                  {isAdmin ? "Admin" : isPlayer ? "Jugador" : isCoach ? "Entrenador" : "Familia"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white hover:bg-white/20 rounded-xl transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </header>

        {/* Menú móvil */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/95 backdrop-blur-sm pt-20">
            <div className="h-full overflow-y-auto p-4 space-y-2">
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
                  <item.icon className="w-6 h-6" />
                  <span className="font-semibold text-lg">{item.title}</span>
                  {item.badge && (
                    <Badge className={`ml-auto ${item.urgentBadge ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}>
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/20 text-white hover:bg-red-500/30 transition-all mt-6"
              >
                <LogOut className="w-6 h-6" />
                <span className="font-semibold text-lg">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}

        {/* Navegación desktop */}
        <nav className="hidden lg:block fixed left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl overflow-y-auto">
          <div className="p-6 border-b border-green-500/30">
            <div className="flex items-center gap-3 mb-6">
              <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-14 h-14 rounded-2xl shadow-xl ring-4 ring-green-500/50" />
              <div className="text-white">
                <h2 className="font-bold text-xl">CD Bustarviejo</h2>
                <p className="text-xs text-green-400">
                  {isAdmin ? "Panel Admin" : isPlayer ? "Panel Jugador" : isCoach ? "Panel Entrenador" : "Panel Familia"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.title}
                to={item.url}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all group ${
                  location.pathname === item.url
                    ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-600/50'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-semibold flex-1">{item.title}</span>
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
                {isCoach && !isAdmin && (
                  <Badge className="mt-2 bg-blue-600 text-white text-xs">
                    🎓 Entrenador
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

        {/* Contenido principal */}
        <main className="lg:ml-72 min-h-screen pt-20 lg:pt-0">
          {children}
        </main>
      </div>
    </>
  );
}
