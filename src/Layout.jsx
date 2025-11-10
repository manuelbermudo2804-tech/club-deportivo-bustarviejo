import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Home, Users, CreditCard, ShoppingBag, Menu, Bell, LogOut, Calendar, Megaphone, Mail } from "lucide-react";
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
import LanguageSelector from "@/components/LanguageSelector";
import { getTranslation, isRTL } from "@/utils/i18n";

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

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const currentSeason = getCurrentSeason();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [language, setLanguage] = useState('es');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === "admin");
        
        // Load saved language preference
        const savedLang = localStorage.getItem('app_language') || 'es';
        setLanguage(savedLang);
        
        // Apply RTL if Arabic
        if (isRTL(savedLang)) {
          document.documentElement.dir = 'rtl';
        } else {
          document.documentElement.dir = 'ltr';
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    localStorage.setItem('app_language', newLang);
    
    // Update text direction for RTL languages
    if (isRTL(newLang)) {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
    
    // Reload page to apply language changes
    window.location.reload();
  };

  const t = (key) => getTranslation(language, key);

  const adminNavigationItems = [
    {
      title: t('nav_home'),
      url: createPageUrl("Home"),
      icon: Home,
    },
    {
      title: t('nav_players'),
      url: createPageUrl("Players"),
      icon: Users,
    },
    {
      title: t('nav_calendar'),
      url: createPageUrl("Calendar"),
      icon: Calendar,
    },
    {
      title: t('nav_announcements'),
      url: createPageUrl("Announcements"),
      icon: Megaphone,
    },
    {
      title: t('nav_payments'),
      url: createPageUrl("Payments"),
      icon: CreditCard,
    },
    {
      title: t('nav_reminders'),
      url: createPageUrl("Reminders"),
      icon: Bell,
    },
    {
      title: t('nav_store'),
      url: createPageUrl("Store"),
      icon: ShoppingBag,
    },
  ];

  const parentNavigationItems = [
    {
      title: t('nav_home'),
      url: createPageUrl("ParentDashboard"),
      icon: Home,
    },
    {
      title: t('nav_my_players'),
      url: createPageUrl("ParentPlayers"),
      icon: Users,
    },
    {
      title: t('nav_calendar'),
      url: createPageUrl("Calendar"),
      icon: Calendar,
    },
    {
      title: t('nav_announcements'),
      url: createPageUrl("Announcements"),
      icon: Megaphone,
    },
    {
      title: t('nav_my_payments'),
      url: createPageUrl("ParentPayments"),
      icon: CreditCard,
    },
  ];

  const navigationItems = isAdmin ? adminNavigationItems : parentNavigationItems;

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <SidebarProvider>
      <div className={`min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-white to-orange-50 ${isRTL(language) ? 'rtl' : 'ltr'}`}>
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
                    {isAdmin ? t('role_admin') : t('role_parent')}
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
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200/60 p-4 bg-slate-50/50 space-y-3">
            <div className="px-2">
              <LanguageSelector 
                currentLang={language} 
                onLanguageChange={handleLanguageChange} 
              />
            </div>
            
            {/* Contact Section */}
            <div className="px-2 py-3 bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 mb-1">Contacto</p>
                  <a 
                    href="mailto:C.D.BUSTARVIEJO@HOTMAIL.ES"
                    className="text-xs text-orange-600 hover:text-orange-700 break-all block"
                  >
                    C.D.BUSTARVIEJO@HOTMAIL.ES
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
              {t('nav_logout')}
            </Button>
            <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-200">
              <p className="font-medium">{t('season')} {currentSeason}</p>
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
              <div className="block sm:hidden">
                <LanguageSelector 
                  currentLang={language} 
                  onLanguageChange={handleLanguageChange} 
                />
              </div>
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