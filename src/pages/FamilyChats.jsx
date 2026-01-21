import React, { useState, useEffect, Suspense, lazy } from "react";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import BubbleBadge from "../components/notifications/BubbleBadge";

const CoordinatorChat = lazy(() => import("./CoordinatorChat"));
const CoachParentChat = lazy(() => import("./CoachParentChat"));

export default function FamilyChats() {
  const [user, setUser] = useState(null);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsCoordinator(currentUser?.es_coordinador === true);
        setIsCoach(currentUser?.es_entrenador === true);
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const [activeTab, setActiveTab] = useState('coordinador');
  const [coordinatorKey, setCoordinatorKey] = useState(0);
  const [coachKey, setCoachKey] = useState(0);

  return (
    <div className="fixed inset-0 lg:inset-auto lg:absolute lg:top-0 lg:left-0 lg:right-0 lg:bottom-0 flex flex-col overflow-hidden pt-[100px] lg:pt-0 pb-0">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex-shrink-0 bg-white border-b px-2 py-2">
          <TabsList className="w-full">
            <TabsTrigger value="coordinador" className="flex-1 relative">
              🏟️ Coordinador
            </TabsTrigger>

            <TabsTrigger value="entrenador" className="flex-1 relative">
              ⚽ Entrenador
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="coordinador" className="relative flex-1 mt-0 overflow-hidden">
          {activeTab === 'coordinador' ? (
            loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              </div>
            ) : isCoordinator ? (
              <Suspense fallback={<div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div></div>}>
                <ErrorBoundary onReset={() => setCoordinatorKey((k) => k + 1)}>
                  <CoordinatorChat key={`coordinator-${coordinatorKey}`} embedded={true} />
                </ErrorBoundary>
              </Suspense>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No disponible</div>
            )
          ) : null}
        </TabsContent>

         <TabsContent value="entrenador" className="relative flex-1 mt-0 overflow-hidden">
           {activeTab === 'entrenador' ? (
             <>
               {loading ? (
                 <div className="h-full flex items-center justify-center">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                 </div>
               ) : isCoach ? (
                 <Suspense fallback={<div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div></div>}>
                   <ErrorBoundary onReset={() => setCoachKey((k) => k + 1)}>
                     <CoachParentChat key={`coach-${coachKey}`} embedded={true} />
                   </ErrorBoundary>
                 </Suspense>
               ) : (
                 <div className="h-full flex items-center justify-center text-slate-400">No disponible</div>
               )}
             </>
           ) : null}
         </TabsContent>
      </Tabs>
    </div>
  );
}