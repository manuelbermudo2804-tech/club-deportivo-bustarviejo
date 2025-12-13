import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FamilyChatsWithTabs({ isCoordinator, isCoach, CoordinatorChatPage, CoachParentChatPage }) {
  // Si es coordinador, SIEMPRE mostrar ambas pestañas (coordinador puede ver ambos chats)
  if (isCoordinator) {
    return (
      <Tabs defaultValue="coordinador" className="h-full flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 flex-shrink-0">
          <TabsTrigger value="coordinador" className="flex-1">
            🏟️ Coordinador
          </TabsTrigger>
          <TabsTrigger value="entrenador" className="flex-1">
            ⚽ Entrenador
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="coordinador" className="flex-1 mt-0 overflow-hidden h-full">
          <CoordinatorChatPage />
        </TabsContent>
        
        <TabsContent value="entrenador" className="flex-1 mt-0 overflow-hidden h-full">
          <CoachParentChatPage />
        </TabsContent>
      </Tabs>
    );
  }
  
  // Si solo es entrenador (no coordinador), mostrar solo chat entrenador sin tabs
  if (isCoach && !isCoordinator) {
    return <CoachParentChatPage />;
  }
  
  // Fallback
  return <CoordinatorChatPage />;
}