import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

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
    <div className="h-[calc(100vh-100px)] lg:h-[calc(100vh-110px)]">
      <Tabs defaultValue="coordinador" className="h-full flex flex-col">
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
        
        <div className="flex-1 overflow-hidden">
          <TabsContent value="coordinador" className="h-full m-0">
            <CoordinatorChatPage />
          </TabsContent>
          
          <TabsContent value="entrenador" className="h-full m-0">
            <CoachParentChatPage />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}