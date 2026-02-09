import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, ExternalLink, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function BudgetManager() {
  const [syncing, setSyncing] = useState(false);
  const [creatingSheet, setCreatingSheet] = useState(false);

  // Cargar config
  const { data: seasonConfig, refetch: refetchConfig } = useQuery({
    queryKey: ["seasonConfig"],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.filter({ activa: true });
      return configs[0];
    },
  });

  // Cargar presupuesto
  const { data: budget, refetch: refetchBudget } = useQuery({
    queryKey: ["budget"],
    queryFn: async () => {
      const budgets = await base44.entities.Budget.filter({ activo: true });
      return budgets[0];
    },
  });

  // Crear Sheet
  const handleCreateSheet = async () => {
    setCreatingSheet(true);
    const win = window.open('about:blank', '_blank');
    try {
      const { data } = await base44.functions.invoke('budgetSyncRealtime', {
        action: 'createSheet'
      });

      if (data.spreadsheetId && win) {
        await refetchConfig();
        setTimeout(() => {
          win.location.href = `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`;
          toast.success('✅ Google Sheets creado');
        }, 500);
      }
    } catch (error) {
      console.error('Error creando sheet:', error);
      if (win) win.close();
      toast.error('Error al crear Google Sheets');
    } finally {
      setCreatingSheet(false);
    }
  };

  // Sincronizar a Sheet
  const handleSyncToSheet = async () => {
    if (!seasonConfig?.google_sheets_id) {
      toast.error('Primero crea el Google Sheets');
      return;
    }

    setSyncing(true);
    try {
      const { data } = await base44.functions.invoke('budgetSyncRealtime', {
        action: 'syncToSheet',
        sheetId: seasonConfig.google_sheets_id
      });

      if (data.success) {
        toast.success('✅ Datos sincronizados a Google Sheets');
      }
    } catch (error) {
      console.error('Error sincronizando:', error);
      toast.error('Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  // Sincronizar desde Sheet
  const handleSyncFromSheet = async () => {
    if (!seasonConfig?.google_sheets_id) {
      toast.error('No hay Google Sheets vinculado');
      return;
    }

    setSyncing(true);
    try {
      const { data } = await base44.functions.invoke('budgetSyncRealtime', {
        action: 'syncFromSheet',
        sheetId: seasonConfig.google_sheets_id
      });

      if (data.success) {
        await refetchBudget();
        toast.success(`✅ ${data.partidasSincronizadas} partidas traídas desde Sheets`);
      }
    } catch (error) {
      console.error('Error sincronizando:', error);
      toast.error('Error al sincronizar desde Sheets');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900">📊 Presupuestos</h1>
          <p className="text-slate-600 mt-1">Gestiona ingresos y gastos sincronizados con Google Sheets</p>
        </div>

        {/* Estado del Sheet */}
        {seasonConfig?.google_sheets_id ? (
          <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">✅ Google Sheets Conectado</p>
                    <p className="text-sm text-slate-600">Última sincronización: {budget?.fecha_ultima_sync ? new Date(budget.fecha_ultima_sync).toLocaleString('es-ES') : 'Nunca'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-orange-300 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-orange-900">Necesitas crear un Google Sheets</p>
                  <p className="text-sm text-orange-800">Haz clic en el botón de abajo para crear uno automáticamente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Acciones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Crear Sheet */}
          {!seasonConfig?.google_sheets_id && (
            <Button
              onClick={handleCreateSheet}
              disabled={creatingSheet}
              className="bg-green-600 hover:bg-green-700 h-20 text-lg font-bold"
            >
              {creatingSheet ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creando...</>
              ) : (
                <><Sheet className="w-5 h-5 mr-2" /> Crear Google Sheets</>
              )}
            </Button>
          )}

          {/* Abrir en Sheets */}
          {seasonConfig?.google_sheets_id && (
            <Button
              onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${seasonConfig.google_sheets_id}/edit`, '_blank')}
              className="bg-blue-600 hover:bg-blue-700 h-20 text-lg font-bold"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Abrir en Sheets
            </Button>
          )}

          {/* Enviar a Sheets */}
          {seasonConfig?.google_sheets_id && (
            <Button
              onClick={handleSyncToSheet}
              disabled={syncing}
              className="bg-purple-600 hover:bg-purple-700 h-20 text-lg font-bold"
            >
              {syncing ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sincronizando...</>
              ) : (
                <><RefreshCw className="w-5 h-5 mr-2" /> Enviar Datos a Sheets</>
              )}
            </Button>
          )}

          {/* Traer desde Sheets */}
          {seasonConfig?.google_sheets_id && (
            <Button
              onClick={handleSyncFromSheet}
              disabled={syncing}
              className="bg-indigo-600 hover:bg-indigo-700 h-20 text-lg font-bold"
            >
              {syncing ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sincronizando...</>
              ) : (
                <><RefreshCw className="w-5 h-5 mr-2" /> Traer de Sheets</>
              )}
            </Button>
          )}
        </div>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Cómo funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div>
              <p className="font-semibold mb-2">🟢 Hoja "Presupuestos":</p>
              <p>Gastos que esperáis (Seguro, Dominio, Tasas, etc.). Vosotros rellenáis esto manualmente en Sheets.</p>
            </div>
            <div>
              <p className="font-semibold mb-2">🔵 Hoja "Ingresos":</p>
              <p>Se actualiza automáticamente según los jugadores inscritos y pagos en la app. Vosotros no tocáis esto.</p>
            </div>
            <div>
              <p className="font-semibold mb-2">⚪ Hoja "Resumen":</p>
              <p>Balance final automático: Total Ingresos - Total Gastos.</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <p className="text-blue-900"><strong>💡 Tip:</strong> Los cambios en "Presupuestos" (gastos) que hagáis en Sheets se traen a la app con "Traer de Sheets". Todo lo demás es automático.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}