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
    <div className="h-screen lg:h-screen">
      <Tabs defaultValue="coordinador" className="h-full flex flex-col">
        <div className="bg-white border-b px-4 py-2 flex-shrink-0 lg:mt-0 mt-[100px]">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="coordinador" className="text-sm">
              🏟️ Como Coordinador
            </TabsTrigger>
            <TabsTrigger value="entrenador" className="text-sm">
              ⚽ Como Entrenador
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="flex-1 overflow-hidden min-h-0">
          <TabsContent value="coordinador" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <div className="h-full overflow-hidden">
              <CoordinatorChatPage />
            </div>
          </TabsContent>
          
          <TabsContent value="entrenador" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <div className="h-full overflow-hidden">
              <CoachParentChatPage />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}