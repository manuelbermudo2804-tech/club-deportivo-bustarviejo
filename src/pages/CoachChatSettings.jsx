import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, BarChart3, Bot } from "lucide-react";
import CoachChatbotConfig from "../components/coach/CoachChatbotConfig";

export default function CoachChatSettings() {
  const [user, setUser] = useState(null);
  const [isCoach, setIsCoach] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsCoach(currentUser.es_entrenador || currentUser.role === "admin");
    };
    fetchUser();
  }, []);

  const { data: logs = [] } = useQuery({
    queryKey: ['coachLogs'],
    queryFn: () => base44.entities.CoachChatLog.list('-created_date', 100),
    enabled: isCoach,
  });

  if (!isCoach) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Solo entrenadores pueden acceder a esta sección</p>
      </div>
    );
  }

  const currentSeason = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  })();

  const seasonLogs = logs.filter(l => l.temporada === currentSeason);
  const blockedCount = seasonLogs.filter(l => l.accion === "mensaje_bloqueado").length;
  const discussionCount = seasonLogs.filter(l => l.accion === "discusion_detectada").length;
  const limitCount = seasonLogs.filter(l => l.accion === "limite_alcanzado").length;

  const categories = user?.categorias_entrena || [];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-8 h-8 text-green-600" />
          ⚙️ Chat Entrenador - Configuración
        </h1>
        <p className="text-slate-600 mt-1">Chatbot IA y estadísticas de moderación</p>
      </div>

      <Tabs defaultValue="chatbot" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chatbot" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Chatbot IA
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Estadísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chatbot" className="space-y-4">
          {categories.map(categoria => (
            <div key={categoria} className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">{categoria}</h3>
              <CoachChatbotConfig categoria={categoria} entrenadorEmail={user?.email} />
            </div>
          ))}
          {categories.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-slate-500">
                No tienes categorías asignadas
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stats">
          <Card>
        <CardHeader>
          <CardTitle>📊 Estadísticas - Temporada {currentSeason}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-3xl font-bold text-red-700">{blockedCount}</p>
              <p className="text-sm text-red-600 mt-1">Mensajes bloqueados</p>
              <p className="text-xs text-slate-500 mt-1">Lenguaje inapropiado</p>
            </div>

            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
              <p className="text-3xl font-bold text-orange-700">{discussionCount}</p>
              <p className="text-sm text-orange-600 mt-1">Discusiones detectadas</p>
              <p className="text-xs text-slate-500 mt-1">Redirigidas a coordinador</p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-3xl font-bold text-blue-700">{limitCount}</p>
              <p className="text-sm text-blue-600 mt-1">Límites alcanzados</p>
              <p className="text-xs text-slate-500 mt-1">5 mensajes/día</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm font-bold text-slate-700 mb-3">📋 Últimos registros</p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {seasonLogs.slice(0, 20).map(log => (
                <div key={log.id} className="bg-white border rounded p-3 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900">{log.padre_nombre || "Usuario"}</span>
                    <span className="text-slate-500">{new Date(log.created_date).toLocaleString('es-ES')}</span>
                  </div>
                  <p className="text-slate-600">
                    {log.accion === "mensaje_bloqueado" && "🚫 Mensaje bloqueado"}
                    {log.accion === "discusion_detectada" && "⚠️ Discusión detectada"}
                    {log.accion === "limite_alcanzado" && "📏 Límite diario alcanzado"}
                    {log.accion === "mensaje_enviado" && "💬 Mensaje enviado"}
                  </p>
                  {log.detalles && <p className="text-slate-500 mt-1">{log.detalles}</p>}
                  <p className="text-slate-400 text-[10px] mt-1">Categoría: {log.categoria}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}