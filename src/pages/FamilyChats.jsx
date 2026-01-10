import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CoordinatorChat from "./CoordinatorChat";
import CoachParentChat from "./CoachParentChat";

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

  // Carga sin retorno temprano: mostramos loader dentro del contenido
  const loading = !user;

  return (
    <div className="fixed inset-0 lg:inset-auto lg:absolute lg:top-0 lg:left-0 lg:right-0 lg:bottom-0 flex flex-col overflow-hidden pt-[100px] lg:pt-0 pb-0">
      <Tabs defaultValue={isCoordinator ? "coordinador" : "entrenador"} className="h-full flex flex-col">
        <div className="flex-shrink-0 bg-white border-b px-2 py-2">
          <TabsList className="w-full">
            <TabsTrigger value="coordinador" className="flex-1">🏟️ Coordinador</TabsTrigger>
            <TabsTrigger value="entrenador" className="flex-1">⚽ Entrenador</TabsTrigger>
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