import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, BarChart3, Moon } from "lucide-react";
import CoordinatorAwayMode from "../components/coordinator/CoordinatorAwayMode";

export default function CoordinatorSettings() {
  const [user, setUser] = useState(null);
  const [isCoordinator, setIsCoordinator] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsCoordinator(currentUser.es_coordinador || currentUser.role === "admin");
    };
    fetchUser();
  }, []);

  const { data: logs = [] } = useQuery({
    queryKey: ['coordinatorLogs'],
    queryFn: () => base44.entities.CoordinatorChatLog.list('-created_date', 100),
    enabled: isCoordinator,
  });

  if (!isCoordinator) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Solo coordinadores pueden acceder a esta sección</p>
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
  const urgentCount = seasonLogs.filter(l => l.accion === "palabra_urgente_detectada").length;
  const reportedCount = seasonLogs.filter(l => l.accion === "reportada_admin").length;

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-8 h-8 text-cyan-600" />
          ⚙️ Configuración Chat Coordinador
        </h1>
        <p className="text-slate-600 mt-1">Gestiona respuestas automáticas y horarios</p>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">
            <Moon className="w-4 h-4 mr-2" />
            Configuración
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="w-4 h-4 mr-2" />
            Estadísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          {user && <CoordinatorAwayMode user={user} />}
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>📊 Estadísticas de Uso - Temporada {currentSeason}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <p className="text-3xl font-bold text-red-700">{blockedCount}</p>
                  <p className="text-sm text-red-600 mt-1">Mensajes bloqueados</p>
                  <p className="text-xs text-slate-500 mt-1">Por lenguaje inapropiado</p>
                </div>

                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                  <p className="text-3xl font-bold text-orange-700">{urgentCount}</p>
                  <p className="text-sm text-orange-600 mt-1">Palabras urgentes</p>
                  <p className="text-xs text-slate-500 mt-1">Lesión, grave, urgente...</p>
                </div>

                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                  <p className="text-3xl font-bold text-purple-700">{reportedCount}</p>
                  <p className="text-sm text-purple-600 mt-1">Conversaciones reportadas</p>
                  <p className="text-xs text-slate-500 mt-1">A administración</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm font-bold text-slate-700 mb-3">📋 Últimos registros</p>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {seasonLogs.slice(0, 20).map(log => (
                    <div key={log.id} className="bg-white border rounded p-3 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900">{log.padre_nombre}</span>
                        <span className="text-slate-500">{new Date(log.created_date).toLocaleString('es-ES')}</span>
                      </div>
                      <p className="text-slate-600">
                        {log.accion === "mensaje_bloqueado" && "🚫 Mensaje bloqueado"}
                        {log.accion === "palabra_urgente_detectada" && "⚠️ Palabra urgente detectada"}
                        {log.accion === "reportada_admin" && "🔴 Conversación reportada"}
                        {log.accion === "mensaje_enviado" && "💬 Mensaje enviado"}
                      </p>
                      {log.detalles && <p className="text-slate-500 mt-1">{log.detalles}</p>}
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