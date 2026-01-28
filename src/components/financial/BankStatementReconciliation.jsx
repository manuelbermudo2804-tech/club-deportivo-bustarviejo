import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, CheckCircle2, Sparkles, TrendingUp, TrendingDown, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function BankStatementReconciliation({ activeSeason }) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [movimientos, setMovimientos] = useState([]);
  const [reconciling, setReconciling] = useState(false);
  const queryClient = useQueryClient();

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setAnalyzing(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      toast.success('Analizando extracto con IA...');

      const { data } = await base44.functions.invoke('importBankStatement', {
        fileUrl: file_url,
        temporada: activeSeason?.temporada
      });

      if (data.success) {
        setMovimientos(data.movimientos || []);
        toast.success(`✅ ${data.total_movimientos} movimientos (${data.ingresos} ingresos, ${data.gastos} gastos)`);
      }
    } catch (error) {
      toast.error('Error al analizar extracto');
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const handleReconcile = async (movimiento, sugerencia) => {
    setReconciling(true);
    try {
      if (sugerencia.tipo === 'cuota_jugador' && sugerencia.pago_id) {
        await base44.entities.Payment.update(sugerencia.pago_id, {
          estado: 'Pagado',
          fecha_pago: movimiento.fecha,
          reconciliado_banco: true,
          fecha_reconciliacion: new Date().toISOString()
        });
        toast.success(`✅ ${sugerencia.jugador}`);
      } else if (sugerencia.tipo === 'ropa' && sugerencia.pedido_id) {
        await base44.entities.ClothingOrder.update(sugerencia.pedido_id, {
          pagado: true,
          estado: 'Confirmado',
          fecha_pago: movimiento.fecha
        });
        toast.success(`✅ Ropa: ${sugerencia.jugador}`);
      } else {
        await base44.entities.FinancialTransaction.create({
          fecha: movimiento.fecha,
          concepto: sugerencia.concepto_sugerido || movimiento.concepto,
          cantidad: Math.abs(movimiento.importe),
          tipo: movimiento.importe > 0 ? 'Ingreso' : 'Gasto',
          categoria: sugerencia.categoria,
          subcategoria: sugerencia.subcategoria,
          reconciliado: true
        });
        toast.success(`✅ Registrado`);
      }

      setMovimientos(prev => prev.filter(m => m !== movimiento));
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['clothingOrders'] });
    } catch (error) {
      toast.error('Error al reconciliar');
    } finally {
      setReconciling(false);
    }
  };

  const handleReconcileAll = async () => {
    const highConfidence = movimientos.filter(m => m.mejor_sugerencia?.confidence === 'alta');
    
    if (highConfidence.length === 0) {
      toast.error('No hay sugerencias de alta confianza');
      return;
    }

    setReconciling(true);
    for (const mov of highConfidence) {
      await handleReconcile(mov, mov.mejor_sugerencia);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    setReconciling(false);
    toast.success(`✅ ${highConfidence.length} movimientos reconciliados`);
  };

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-600" />
          Conciliación Bancaria con IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white rounded-xl p-4 border-2 border-purple-200">
          <p className="text-sm text-purple-900 font-medium mb-2">
            🤖 <strong>Análisis Inteligente:</strong>
          </p>
          <ul className="text-sm text-slate-700 space-y-1 ml-4 list-disc">
            <li>Identifica automáticamente jugadores por nombre</li>
            <li>Relaciona importes con pagos pendientes</li>
            <li>Categoriza gastos con IA</li>
            <li>Reconcilia con 1 clic</li>
          </ul>
        </div>

        {movimientos.length === 0 ? (
          <div className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="bank-upload"
              disabled={uploading}
            />
            <label htmlFor="bank-upload" className={`cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
              {analyzing ? (
                <div className="space-y-3">
                  <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto" />
                  <p className="text-slate-700 font-medium">Analizando con IA...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 text-purple-500 mx-auto" />
                  <p className="font-semibold text-slate-900">Subir extracto bancario</p>
                  <p className="text-sm text-slate-500">CSV o Excel</p>
                </div>
              )}
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-white rounded-lg p-3">
              <div>
                <p className="font-bold text-slate-900">{movimientos.length} movimientos</p>
                <p className="text-sm text-slate-600">
                  {movimientos.filter(m => m.mejor_sugerencia?.confidence === 'alta').length} con alta confianza
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleReconcileAll}
                  disabled={reconciling}
                  className="bg-green-600 hover:bg-green-700"
                >
                  ✅ Reconciliar Alta Confianza
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMovimientos([])}
                >
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {movimientos.map((mov, idx) => {
                const sug = mov.mejor_sugerencia;
                const esIngreso = mov.importe > 0;

                return (
                  <div 
                    key={idx}
                    className={`border-2 rounded-lg p-3 ${
                      sug?.confidence === 'alta' 
                        ? 'border-green-300 bg-white' 
                        : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {esIngreso ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                          <span className="font-medium text-sm">{mov.concepto}</span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
                          <span>{mov.fecha}</span>
                          <span className={`font-bold ${esIngreso ? 'text-green-700' : 'text-red-700'}`}>
                            {esIngreso ? '+' : ''}{mov.importe.toFixed(2)}€
                          </span>
                        </div>

                        {sug && (
                          <div className="bg-purple-50 rounded-lg p-2 text-xs">
                            <div className="flex items-center gap-1 mb-1">
                              <Sparkles className="w-3 h-3 text-purple-600" />
                              <Badge className={
                                sug.confidence === 'alta' ? 'bg-green-500 text-white text-xs' : 'bg-yellow-500 text-white text-xs'
                              }>
                                {sug.confidence}
                              </Badge>
                            </div>
                            <p className="text-slate-800">
                              <strong>{sug.subcategoria}</strong>
                              {sug.jugador && ` - ${sug.jugador}`}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleReconcile(mov, sug)}
                          disabled={!sug || reconciling}
                          className="bg-green-600 hover:bg-green-700 h-8 px-3 text-xs"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          OK
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setMovimientos(prev => prev.filter(m => m !== mov))}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}