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
    </div>
  );
}