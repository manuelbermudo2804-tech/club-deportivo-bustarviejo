import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, DollarSign, Calendar, AlertTriangle } from "lucide-react";

import SeasonManager from "../components/financial/SeasonManager";
import CategoryManager from "../components/financial/CategoryManager";

export default function FinancialConfiguration() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        setIsAdmin(user.role === "admin" || user.es_tesorero === true);
      } catch (error) {
        console.error("Error checking user:", error);
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, []);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <AlertTriangle className="w-16 h-16 text-red-600 mx-auto" />
              <h2 className="text-2xl font-bold text-red-900">Acceso Restringido</h2>
              <p className="text-red-700">Solo los administradores y tesoreros pueden acceder a la configuración financiera.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-7 h-7 text-orange-600" />
          Configuración Financiera
        </h1>
        <p className="text-slate-600 mt-1">Gestión de temporadas, categorías y cuotas del club</p>
      </div>

      <Tabs defaultValue="temporadas" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-auto">
          <TabsTrigger value="temporadas" className="flex items-center gap-2 py-3">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Temporadas</span>
            <span className="sm:hidden">Temp.</span>
          </TabsTrigger>
          <TabsTrigger value="categorias" className="flex items-center gap-2 py-3">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Categorías y Cuotas</span>
            <span className="sm:hidden">Cuotas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="temporadas" className="mt-6">
          <SeasonManager />
        </TabsContent>

        <TabsContent value="categorias" className="mt-6">
          <CategoryManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}