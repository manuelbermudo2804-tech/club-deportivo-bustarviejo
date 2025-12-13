import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FamilyChatsWithTabs({ isCoordinator, isCoach, CoordinatorChatPage, CoachParentChatPage }) {
  // Si es coordinador, SIEMPRE mostrar ambas pestañas (coordinador puede ver ambos chats)
  if (isCoordinator) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-white border-b px-4 py-3">
          <Tabs defaultValue="coordinador" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="coordinador" className="flex-1">
                🏟️ Coordinador
              </TabsTrigger>
              <TabsTrigger value="entrenador" className="flex-1">
                ⚽ Entrenador
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="coordinador" className="mt-0">
              <div className="h-[calc(100vh-200px)] lg:h-[calc(100vh-160px)] overflow-hidden">
                <CoordinatorChatPage />
              </div>
            </TabsContent>
            
            <TabsContent value="entrenador" className="mt-0">
              <div className="h-[calc(100vh-200px)] lg:h-[calc(100vh-160px)] overflow-hidden">
                <CoachParentChatPage />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
  
  // Si solo es entrenador (no coordinador), mostrar solo chat entrenador sin tabs
  if (isCoach && !isCoordinator) {
    return <CoachParentChatPage />;
  }
  
  // Fallback
  return <CoordinatorChatPage />;
}