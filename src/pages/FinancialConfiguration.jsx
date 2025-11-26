import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, Calendar, CreditCard } from "lucide-react";

// Importamos los componentes de cada sección
import SeasonManagementContent from "../components/financial/SeasonManagementContent";
import CategoryManagementContent from "../components/financial/CategoryManagementContent";

export default function FinancialConfiguration() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTreasurer, setIsTreasurer] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === "admin");
        setIsTreasurer(currentUser.es_tesorero === true);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // Solo admin o tesorero pueden acceder
  if (user && !isAdmin && !isTreasurer) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Acceso Restringido</h2>
          <p className="text-slate-500">Solo administradores y tesoreros pueden acceder a esta configuración.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-8 h-8 text-orange-600" />
          Configuración Financiera
        </h1>
        <p className="text-slate-600 mt-1">
          Gestiona temporadas, cuotas y categorías del club
        </p>
      </div>

      {/* Tabs para las dos secciones */}
      <Tabs defaultValue="temporadas" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-auto">
          <TabsTrigger value="temporadas" className="flex items-center gap-2 py-3">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Temporadas</span>
            <span className="sm:hidden">Temp.</span>
          </TabsTrigger>
          <TabsTrigger value="categorias" className="flex items-center gap-2 py-3">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Categorías y Cuotas</span>
            <span className="sm:hidden">Cuotas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="temporadas" className="mt-6">
          <SeasonManagementContent />
        </TabsContent>

        <TabsContent value="categorias" className="mt-6">
          <CategoryManagementContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}