import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FamilyChatsWithTabs({ isCoordinator, isCoach, CoordinatorChatPage, CoachParentChatPage }) {
  // Si solo es coordinador O solo es entrenador, mostrar directamente sin tabs
  if (isCoordinator && !isCoach) {
    return <CoordinatorChatPage />;
  }
  
  if (isCoach && !isCoordinator) {
    return <CoachParentChatPage />;
  }
  
  // Si es ambos, mostrar con tabs - usar estructura de 2 divs como StaffChat
  return (
    <div className="h-[calc(100vh-100px)] lg:h-[calc(100vh-110px)]">
      <Tabs defaultValue="coordinador" className="h-full flex flex-col">
        <TabsList className="mx-4 mt-3 flex-shrink-0">
          <TabsTrigger value="coordinador" className="flex-1">
            🏟️ Coordinador
          </TabsTrigger>
          <TabsTrigger value="entrenador" className="flex-1">
            ⚽ Entrenador
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="coordinador" className="flex-1 mt-0 h-full">
          <CoordinatorChatPage />
        </TabsContent>
        
        <TabsContent value="entrenador" className="flex-1 mt-0 h-full">
          <CoachParentChatPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}