import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import CoordinatorChat from "./CoordinatorChat";
import CoachParentChat from "./CoachParentChat";
import useUnreadChats from "../components/notifications/useUnreadChats";

export default function FamilyChats() {
  const [user, setUser] = useState(null);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [isCoach, setIsCoach] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsCoordinator(currentUser.es_coordinador === true);
        setIsCoach(currentUser.es_entrenador === true);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    fetchUser();
  }, []);

  // Obtener contadores unificados desde useUnreadChats
  const { items: chatItems } = useUnreadChats(true);

  // Extraer contadores específicos
  const coordUnreadCount = chatItems.find(item => item.source === "coordinator")?.count || 0;
  const coachUnreadCount = chatItems.find(item => item.source === "coach")?.count || 0;
  const adminUnreadCount = chatItems.find(item => item.source === "admin")?.count || 0;
  const staffUnreadCount = chatItems.find(item => item.source === "staff")?.count || 0;
  const privateUnreadCount = chatItems.find(item => item.source === "private")?.count || 0;

  // Carga sin retorno temprano: mostramos loader dentro del contenido
  const loading = !user;

  // Determinar tab por defecto solo una vez
  const [defaultTab] = useState(() => isCoordinator ? "coordinador" : "entrenador");

  return (
    <div className="fixed inset-0 lg:inset-auto lg:absolute lg:top-0 lg:left-0 lg:right-0 lg:bottom-0 flex flex-col overflow-hidden pt-[100px] lg:pt-0 pb-0">
      <Tabs defaultValue={defaultTab} className="h-full flex flex-col">
        <div className="flex-shrink-0 bg-white border-b px-2 py-2">
          <TabsList className="w-full flex-wrap justify-start gap-1">
            {/* Tab Asistente (si hay futura integración) */}
            <TabsTrigger value="asistente" className="flex-1 relative min-w-24">
              🤖 Asistente
            </TabsTrigger>

            {/* Tab Familias/Coordinador */}
            <TabsTrigger value="coordinador" className="flex-1 relative min-w-24">
              👨‍👩‍👧 Familias
              {coordUnreadCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs animate-pulse">{coordUnreadCount}</Badge>
              )}
            </TabsTrigger>

            {/* Tab Coordinador */}
            {isCoordinator && (
              <TabsTrigger value="coordinador-admin" className="flex-1 relative min-w-24">
                🏟️ Coordinador
                {coordUnreadCount > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white text-xs animate-pulse">{coordUnreadCount}</Badge>
                )}
              </TabsTrigger>
            )}

            {/* Tab Entrenador */}
            <TabsTrigger value="entrenador" className="flex-1 relative min-w-24">
              ⚽ Entrenador
              {coachUnreadCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs animate-pulse">{coachUnreadCount}</Badge>
              )}
            </TabsTrigger>

            {/* Tab Admin */}
            {adminUnreadCount > 0 && (
              <TabsTrigger value="admin" className="flex-1 relative min-w-24">
                🛡️ Admin
                <Badge className="ml-2 bg-red-500 text-white text-xs animate-pulse">{adminUnreadCount}</Badge>
              </TabsTrigger>
            )}

            {/* Tab Staff */}
            {staffUnreadCount > 0 && (
              <TabsTrigger value="staff" className="flex-1 relative min-w-24">
                💼 Staff
                <Badge className="ml-2 bg-red-500 text-white text-xs animate-pulse">{staffUnreadCount}</Badge>
              </TabsTrigger>
            )}

            {/* Tab Privados */}
            {privateUnreadCount > 0 && (
              <TabsTrigger value="private" className="flex-1 relative min-w-24">
                💬 Privados
                <Badge className="ml-2 bg-red-500 text-white text-xs animate-pulse">{privateUnreadCount}</Badge>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="coordinador" className="flex-1 mt-0 overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : isCoordinator ? (
            <CoordinatorChat embedded={true} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">No disponible</div>
          )}
        </TabsContent>

        <TabsContent value="entrenador" className="flex-1 mt-0 overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : isCoach ? (
            <CoachParentChat embedded={true} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">No disponible</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}