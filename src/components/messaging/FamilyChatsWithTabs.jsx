import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FamilyChatsWithTabs({ isCoordinator, isCoach, CoordinatorChatPage, CoachParentChatPage }) {
  // Si solo es coordinador O solo es entrenador, mostrar directamente sin tabs
  if (isCoordinator && !isCoach) {
    return <CoordinatorChatPage />;
  }
  
  if (isCoach && !isCoordinator) {
    return <CoachParentChatPage />;
  }
  
  // Si es ambos, mostrar con tabs
  return (
    <Tabs defaultValue="coordinador" className="h-[calc(100vh-100px)] lg:h-[calc(100vh-110px)] flex flex-col">
      <div className="bg-white border-b px-4 py-2 flex-shrink-0">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="coordinador" className="text-sm">
            🏟️ Como Coordinador
          </TabsTrigger>
          <TabsTrigger value="entrenador" className="text-sm">
            ⚽ Como Entrenador
          </TabsTrigger>
        </TabsList>
      </div>
      
      <TabsContent value="coordinador" className="flex-1 m-0 overflow-hidden">
        <CoordinatorChatPage />
      </TabsContent>
      
      <TabsContent value="entrenador" className="flex-1 m-0 overflow-hidden">
        <CoachParentChatPage />
      </TabsContent>
    </Tabs>
  );
}