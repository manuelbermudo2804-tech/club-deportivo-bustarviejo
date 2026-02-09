import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, RefreshCw, ExternalLink, AlertCircle } from "lucide-react";

export default function Budget() {
  const [config, setConfig] = useState(null);
  const [newSheetsId, setNewSheetsId] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Cargar config
  const { data: seasonConfig } = useQuery({
    queryKey: ["seasonConfig"],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.filter({ activa: true });
      return configs[0];
    },
  });

  useEffect(() => {
    if (seasonConfig) {
      setConfig(seasonConfig);
      setNewSheetsId(seasonConfig.google_sheets_id || "");
    }
  }, [seasonConfig]);

  // Actualizar Sheets ID
  const updateSheetsMutation = useMutation({
    mutationFn: async (sheetsId) => {
      await base44.entities.SeasonConfig.update(config.id, {
        google_sheets_id: sheetsId,
      });
    },
    onSuccess: () => {
      setConfig({ ...config, google_sheets_id: newSheetsId });
    },
  });

  // Sincronizar ingresos
  const syncIncomesMutation = useMutation({
    mutationFn: async () => {
      setSyncing(true);
      const result = await base44.functions.invoke("syncBudgetToSheets", {
        sheetsId: config.google_sheets_id,
      });
      setSyncing(false);
      return result;
    },
  });

  if (!config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">📊 Presupuestos</h1>
          <p className="text-slate-600">Gestiona ingresos y gastos del club sincronizados con Google Sheets</p>
        </div>

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config">⚙️ Configuración</TabsTrigger>
            <TabsTrigger value="sync">🔄 Sincronizar</TabsTrigger>
            <TabsTrigger value="info">ℹ️ Información</TabsTrigger>
            <TabsTrigger value="help">❓ Ayuda</TabsTrigger>
          </TabsList>

          {/* Configuración */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configurar Google Sheets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ID del Google Sheets
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={newSheetsId}
                      onChange={(e) => setNewSheetsId(e.target.value)}
                      placeholder="1xDYfPZ2EljUpZYaTyEHkCYVatqzQKD1s4HDTpFeBMAc"
                      className="flex-1"
                    />
                    <Button
                      onClick={() => updateSheetsMutation.mutate(newSheetsId)}
                      disabled={updateSheetsMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {updateSheetsMutation.isPending ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Puedes cambiar esto en cualquier momento desde aquí
                  </p>
                </div>

                {config.google_sheets_id && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 font-medium mb-2">✅ Sheets conectado</p>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${config.google_sheets_id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-2"
                    >
                      Abrir en Google Sheets <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sincronizar */}
          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Sincronizar Datos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!config.google_sheets_id && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        Necesitas configurar el Google Sheets primero
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Ve a la pestaña "Configuración" y añade el ID del Sheets
                      </p>
                    </div>
                  </div>
                )}

                {config.google_sheets_id && (
                  <Button
                    onClick={() => syncIncomesMutation.mutate()}
                    disabled={syncing || syncIncomesMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg font-bold"
                  >
                    {syncing || syncIncomesMutation.isPending ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2" />
                        Sincronizar Ingresos Ahora
                      </>
                    )}
                  </Button>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">📋 Lo que se sincroniza:</p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>✅ Ingresos Previstos (basados en jugadores por categoría)</li>
                    <li>✅ Ingresos Reales (cuotas, socios, loterías, cobros extra)</li>
                    <li>✅ Ingresos Otros (que rellenéis manualmente)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Información */}
          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Estructura del Presupuesto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">📌 Pestañas en Google Sheets:</h3>
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="font-medium text-slate-900">1. Presupuestos</p>
                      <p className="text-sm text-slate-600">Gastos que esperáis (rellenáis vosotros)</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="font-medium text-slate-900">2. Ingresos Previstos</p>
                      <p className="text-sm text-slate-600">Ingresos que deberían llegar (calcula automático)</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="font-medium text-slate-900">3. Ingresos Reales APP</p>
                      <p className="text-sm text-slate-600">Dinero que entra realmente de la app (actualiza automático)</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="font-medium text-slate-900">4. Ingresos Otros</p>
                      <p className="text-sm text-slate-600">Dinero externo/donaciones (rellenáis vosotros)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ayuda */}
          <TabsContent value="help" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>¿Cómo funciona?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-700">
                <p>
                  <strong>1. Configura el Google Sheets:</strong> Ve a "Configuración" y pega el ID de tu Sheets
                </p>
                <p>
                  <strong>2. Los ingresos se sincronizan automáticamente:</strong>
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Ingresos Previstos:</strong> Se calculan basándose en el número de jugadores × cuota configurada, más socios previstos</li>
                  <li><strong>Ingresos Reales:</strong> Se actualizan cada vez que hay un pago en la app</li>
                </ul>
                <p>
                  <strong>3. Vosotros rellenáis lo demás:</strong>
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Los gastos en la pestaña "Presupuestos"</li>
                  <li>Los ingresos externos en "Ingresos Otros"</li>
                </ul>
                <p className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <strong>Sincroniza manualmente</strong> desde aquí cuando quieras actualizar los datos. También se sincroniza automáticamente cada vez que hay un pago nuevo.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}