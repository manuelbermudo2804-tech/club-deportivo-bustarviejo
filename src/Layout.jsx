import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Home, Users, CreditCard, ShoppingBag, Menu, Bell, LogOut, Calendar, Megaphone, Mail, Archive, Settings, MessageCircle } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Función para obtener la temporada actual
const getCurrentSeason = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (currentMonth <= 8) {
    return `${currentYear - 1}/${currentYear}`;
  }
  return `${currentYear}/${currentYear + 1}`;
};

// Verificar si estamos en periodo de cierre (Julio/Agosto)
const isClosedPeriod = () => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1 = enero, 7 = julio, 8 = agosto
  return currentMonth === 7 || currentMonth === 8;
};

// Pantalla de cierre de temporada
function ClosedSeasonScreen({ user, isAdmin }) {
  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-12 text-center space-y-6">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-700 rounded-3xl flex items-center justify-center shadow-xl">
                <span className="text-5xl font-bold text-white">CF</span>
              </div>
            </div>

            {/* Título */}
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
                🏖️ Vacaciones de Verano
              </h1>
              <p className="text-2xl text-orange-600 font-semibold">
                CF Bustarviejo
              </p>
            </div>

            {/* Mensaje principal */}
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl p-8 space-y-4 border-2 border-orange-200">
              <p className="text-xl text-slate-800 leading-relaxed">
                La aplicación del club está cerrada durante los meses de <strong className="text-orange-700">Julio y Agosto</strong>.
              </p>
              <p className="text-lg text-slate-700">
                Estamos preparando todo para la nueva temporada que comenzará el <strong className="text-orange-700">1 de Septiembre</strong>.
              </p>
            </div>

            {/* Icono decorativo */}
            <div className="text-8xl animate-bounce">
              ☀️
            </div>

            {/* Mensaje de despedida */}
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

            {/* Información de usuario y logout */}
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

            {/* Contacto */}
            <div className="pt-6 border-t-2 border-slate-200">
              <p className="text-sm text-slate-600 mb-2">
                Para cualquier consulta urgente:
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
  const currentSeason = getCurrentSeason();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [urgentMessagesCount, setUrgentMessagesCount] = useState(0);
  const [showClosedScreen, setShowClosedScreen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === "admin");
        
        // Verificar si debemos mostrar pantalla de cierre
        // Los administradores pueden acceder siempre
        if (isClosedPeriod() && currentUser.role !== "admin") {
          setShowClosedScreen(true);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // Verificar mensajes no leídos
  useEffect(() => {
    const checkUnreadMessages = async () => {
      if (!user) return;
      
      try {
        const allMessages = await base44.entities.ChatMessage.list();
        let unread = 0;
        let urgent = 0;
        
        if (isAdmin) {
          // Para admin: contar mensajes de padres no leídos
          allMessages.forEach(msg => {
            if (!msg.leido && msg.tipo === "padre_a_grupo") {
              unread++;
              if (msg.prioridad === "Urgente") {
                urgent++;
              }
            }
          });
        } else {
          // Para padres: obtener grupos de sus jugadores y contar mensajes del admin no leídos
          const allPlayers = await base44.entities.Player.list();
          const myPlayers = allPlayers.filter(p => 
            p.email_padre === user.email || p.email === user.email
          );
          const myGroupIds = myPlayers.map(p => `${p.deporte}_${p.categoria}`);
          
          allMessages.forEach(msg => {
            if (!msg.leido && 
                msg.tipo === "admin_a_grupo" && 
                myGroupIds.includes(msg.grupo_id)) {
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
    const interval = setInterval(checkUnreadMessages, 5000); // Actualizar cada 5 segundos
    
    return () => clearInterval(interval);
  }, [user, isAdmin]);

  // Mostrar pantalla de cierre si estamos en julio/agosto y no es admin
  if (showClosedScreen) {
    return <ClosedSeasonScreen user={user} isAdmin={isAdmin} />;
  }

  const adminNavigationItems = [
    {
      title: "Inicio",
      url: createPageUrl("Home"),
      icon: Home,
    },
    {
      title: "Jugadores",
      url: createPageUrl("Players"),
      icon: Users,
    },
    {
      title: "Calendario",
      url: createPageUrl("Calendar"),
      icon: Calendar,
    },
    {
      title: "Anuncios",
      url: createPageUrl("Announcements"),
      icon: Megaphone,
    },
    {
      title: "Pagos",
      url: createPageUrl("Payments"),
      icon: CreditCard,
    },
    {
      title: "Recordatorios",
      url: createPageUrl("Reminders"),
      icon: Bell,
    },
    {
      title: "Tienda",
      url: createPageUrl("Store"),
      icon: ShoppingBag,
    },
    {
      title: "Chat Grupos",
      url: createPageUrl("AdminChat"),
      icon: MessageCircle,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
      urgentBadge: urgentMessagesCount > 0,
    },
    {
      title: "Histórico",
      url: createPageUrl("PaymentHistory"),
      icon: Archive,
    },
    {
      title: "Temporadas",
      url: createPageUrl("SeasonManagement"),
      icon: Settings,
    },
  ];

  const parentNavigationItems = [
    {
      title: "Inicio",
      url: createPageUrl("ParentDashboard"),
      icon: Home,
    },
    {
      title: "Mis Jugadores",
      url: createPageUrl("ParentPlayers"),
      icon: Users,
    },
    {
      title: "Calendario",
      url: createPageUrl("Calendar"),
      icon: Calendar,
    },
    {
      title: "Anuncios",
      url: createPageUrl("Announcements"),
      icon: Megaphone,
    },
    {
      title: "Mis Pagos",
      url: createPageUrl("ParentPayments"),
      icon: CreditCard,
    },
    {
      title: "Chat Grupo",
      url: createPageUrl("ParentChat"),
      icon: MessageCircle,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
      urgentBadge: urgentMessagesCount > 0,
    },
  ];

  const navigationItems = isAdmin ? adminNavigationItems : parentNavigationItems;

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-white to-orange-50">
        <Sidebar className="border-r border-slate-200/60 backdrop-blur-sm">
          <SidebarHeader className="border-b border-slate-200/60 p-6 bg-gradient-to-r from-orange-600 to-orange-700">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-orange-500">CF</span>
                </div>
                <div className="text-white">
                  <h2 className="font-bold text-lg leading-tight">CF Bustarviejo</h2>
                  <p className="text-xs text-orange-100">
                    {isAdmin ? "Panel Administrador" : "Panel Padre/Tutor"}
                  </p>
                </div>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-orange-50 hover:text-orange-700 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url ? 'bg-orange-100 text-orange-700 shadow-sm' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3 relative">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                          {item.badge && (
                            <div className="ml-auto flex items-center gap-1">
                              {item.urgentBadge && (
                                <Badge className="bg-red-500 text-white h-6 min-w-6 flex items-center justify-center px-2 animate-pulse shadow-lg shadow-red-500/50">
                                  🔴 {item.badge}
                                </Badge>
                              )}
                              {!item.urgentBadge && (
                                <Badge className="bg-orange-500 text-white h-6 min-w-6 flex items-center justify-center px-2 shadow-md">
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200/60 p-4 bg-slate-50/50 space-y-3">
            {/* Contact Section */}
            <div className="px-2 py-3 bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 mb-1">Contacto</p>
                  <a 
                    href="mailto:C.D.BUSTARVIEJO@HOTMAIL.ES"
                    className="text-xs text-orange-600 hover:text-orange-700 break-all block mb-1"
                  >
                    C.D.BUSTARVIEJO@HOTMAIL.ES
                  </a>
                  <a 
                    href="mailto:CDBUSTARVIEJO@GMAIL.COM"
                    className="text-xs text-orange-600 hover:text-orange-700 break-all block"
                  >
                    CDBUSTARVIEJO@GMAIL.COM
                  </a>
                </div>
              </div>
            </div>

            {user && (
              <div className="text-center text-xs">
                <p className="font-medium text-slate-700">{user.full_name}</p>
                <p className="text-slate-500">{user.email}</p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full hover:bg-red-50 hover:text-red-600 hover:border-red-300"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
            <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-200">
              <p className="font-medium">Temporada {currentSeason}</p>
              <p className="text-slate-400 mt-1">© CF Bustarviejo</p>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200">
                  <Menu className="w-5 h-5" />
                </SidebarTrigger>
                <h1 className="text-xl font-bold text-orange-700">CF Bustarviejo</h1>
              </div>
              {/* Badge de notificaciones en el header móvil */}
              {(unreadMessagesCount > 0 || urgentMessagesCount > 0) && (
                <Link to={createPageUrl(isAdmin ? "AdminChat" : "ParentChat")}>
                  <div className="relative">
                    <MessageCircle className="w-6 h-6 text-orange-600" />
                    {urgentMessagesCount > 0 ? (
                      <Badge className="absolute -top-2 -right-2 bg-red-500 text-white h-5 min-w-5 flex items-center justify-center px-1.5 text-xs animate-pulse shadow-lg shadow-red-500/50">
                        🔴 {unreadMessagesCount}
                      </Badge>
                    ) : (
                      <Badge className="absolute -top-2 -right-2 bg-orange-500 text-white h-5 min-w-5 flex items-center justify-center px-1.5 text-xs shadow-md">
                        {unreadMessagesCount}
                      </Badge>
                    )}
                  </div>
                </Link>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}