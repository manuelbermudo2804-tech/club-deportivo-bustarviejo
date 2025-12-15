import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FamilyChatsWithTabs({ isCoordinator, isCoach, CoordinatorChatPage, CoachParentChatPage }) {
  // Si es coordinador, SIEMPRE mostrar ambas pestañas (coordinador puede ver ambos chats)
  if (isCoordinator) {
    return (
      <Tabs defaultValue="coordinador" className="h-full flex flex-col">
        <div className="flex-shrink-0 bg-white border-b px-2 py-2">
          <TabsList className="w-full">
            <TabsTrigger value="coordinador" className="flex-1">
              🏟️ Coordinador
            </TabsTrigger>
            <TabsTrigger value="entrenador" className="flex-1">
              ⚽ Entrenador
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="coordinador" className="flex-1 mt-0 overflow-hidden">
          <CoordinatorChatPage embedded={true} />
        </TabsContent>
        
        <TabsContent value="entrenador" className="flex-1 mt-0 overflow-hidden">
          <CoachParentChatPage embedded={true} />
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