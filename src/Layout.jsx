import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Users, CreditCard, ShoppingBag, Menu, Bell } from "lucide-react";
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

const navigationItems = [
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
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const currentSeason = getCurrentSeason();

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
                  <p className="text-xs text-orange-100">Club de Fútbol</p>
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

          <SidebarFooter className="border-t border-slate-200/60 p-4 bg-slate-50/50">
            <div className="text-center text-xs text-slate-500">
              <p className="font-medium">Temporada {currentSeason}</p>
              <p className="text-slate-400 mt-1">© CF Bustarviejo</p>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 lg:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <h1 className="text-xl font-bold text-orange-700">CF Bustarviejo</h1>
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