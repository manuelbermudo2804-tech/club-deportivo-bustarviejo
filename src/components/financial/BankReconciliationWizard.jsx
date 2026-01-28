import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, Loader2, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, FileText, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";

export default function BankReconciliationWizard({ open, onClose, temporada }) {
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
      // Subir archivo
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      toast.success('Archivo subido, analizando con IA...');

      // Analizar con IA
      const { data } = await base44.functions.invoke('importBankStatement', {
        fileUrl: file_url,
        temporada
      });

      if (data.success) {
        setMovimientos(data.movimientos || []);
        toast.success(`✅ ${data.total_movimientos} movimientos encontrados`);
      } else {
        toast.error('No se pudieron extraer movimientos del archivo');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al analizar el extracto bancario');
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const handleReconcile = async (movimiento, sugerencia) => {
    setReconciling(true);
    try {
      // Si es una cuota de jugador identificada
      if (sugerencia.tipo === 'cuota_jugador' && sugerencia.pago_id) {
        await base44.entities.Payment.update(sugerencia.pago_id, {
          estado: 'Pagado',
          fecha_pago: movimiento.fecha,
          reconciliado_banco: true,
          fecha_reconciliacion: new Date().toISOString(),
          notas: `Reconciliado automáticamente desde extracto bancario: ${movimiento.concepto}`
        });
        
        toast.success(`✅ Pago reconciliado: ${sugerencia.jugador}`);
      } 
      // Si es ropa
      else if (sugerencia.tipo === 'ropa' && sugerencia.pedido_id) {
        await base44.entities.ClothingOrder.update(sugerencia.pedido_id, {
          pagado: true,
          estado: 'Confirmado',
          fecha_pago: movimiento.fecha
        });
        
        toast.success(`✅ Pedido ropa reconciliado: ${sugerencia.jugador}`);
      }
      // Crear transacción genérica
      else {
        await base44.entities.FinancialTransaction.create({
          fecha: movimiento.fecha,
          concepto: sugerencia.concepto_sugerido || movimiento.concepto,
          cantidad: Math.abs(movimiento.importe),
          tipo: movimiento.importe > 0 ? 'Ingreso' : 'Gasto',
          categoria: sugerencia.categoria,
          subcategoria: sugerencia.subcategoria,
          reconciliado: true,
          notas: `Importado desde extracto bancario`
        });
        
        toast.success(`✅ Transacción registrada`);
      }

      // Marcar movimiento como procesado
      setMovimientos(prev => prev.filter(m => m !== movimiento));
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['clothingOrders'] });
      
    } catch (error) {
      console.error('Error reconciliando:', error);
      toast.error('Error al reconciliar');
    } finally {
      setReconciling(false);
    }
  };

  const handleReconcileAll = async () => {
    setReconciling(true);
    try {
      for (const mov of movimientos) {
        if (mov.mejor_sugerencia) {
          await handleReconcile(mov, mov.mejor_sugerencia);
          await new Promise(resolve => setTimeout(resolve, 200)); // Evitar saturar
        }
      }
      toast.success('✅ Todas las transacciones reconciliadas');
      onClose();
    } catch (error) {
      toast.error('Error en reconciliación masiva');
    } finally {
      setReconciling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Conciliación Bancaria Inteligente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Instrucciones */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">
              📋 <strong>Cómo funciona:</strong>
            </p>
            <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
              <li>Descarga el extracto bancario de tu banco (CSV o Excel)</li>
              <li>Súbelo aquí y la IA analizará automáticamente</li>
              <li>Revisa las sugerencias y confirma con 1 clic</li>
              <li>Los pagos se marcan automáticamente como reconciliados</li>
            </ol>
          </div>

          {/* Upload Area */}
          {movimientos.length === 0 && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
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
                    <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto" />
                    <p className="text-slate-700 font-medium">Analizando extracto con IA...</p>
                    <p className="text-xs text-slate-500">Esto puede tardar 10-30 segundos</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-16 h-16 text-slate-400 mx-auto" />
                    <p className="text-lg font-semibold text-slate-700">
                      Arrastra o haz clic para subir extracto bancario
                    </p>
                    <p className="text-sm text-slate-500">
                      Formatos: CSV, Excel (.xlsx, .xls)
                    </p>
                  </div>
                )}
              </label>
            </div>
          )}

          {/* Movimientos analizados */}
          {movimientos.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">
                    {movimientos.length} movimientos encontrados
                  </h3>
                  <p className="text-sm text-slate-600">
                    {movimientos.filter(m => m.importe > 0).length} ingresos · {movimientos.filter(m => m.importe < 0).length} gastos
                  </p>
                </div>
                <Button
                  onClick={handleReconcileAll}
                  disabled={reconciling}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {reconciling ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                  ) : (
                    <>✅ Reconciliar Todos</>
                  )}
                </Button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {movimientos.map((mov, idx) => {
                  const sug = mov.mejor_sugerencia;
                  const esIngreso = mov.importe > 0;

                  return (
                    <div 
                      key={idx}
                      className={`border-2 rounded-lg p-4 ${
                        sug?.confidence === 'alta' 
                          ? 'border-green-300 bg-green-50' 
                          : sug?.confidence === 'media'
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-slate-300 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {esIngreso ? (
                              <TrendingUp className="w-5 h-5 text-green-600" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-red-600" />
                            )}
                            <span className="font-medium text-slate-900">{mov.concepto}</span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-sm text-slate-600 mb-2">
                            <span>📅 {mov.fecha}</span>
                            <span className={`font-bold ${esIngreso ? 'text-green-700' : 'text-red-700'}`}>
                              {esIngreso ? '+' : ''}{mov.importe.toFixed(2)}€
                            </span>
                          </div>

                          {sug && (
                            <div className="bg-white rounded-lg p-3 mt-2 border">
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-purple-600" />
                                <span className="text-sm font-semibold text-slate-900">Sugerencia IA:</span>
                                <Badge className={
                                  sug.confidence === 'alta' 
                                    ? 'bg-green-100 text-green-700'
                                    : sug.confidence === 'media'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-slate-100 text-slate-700'
                                }>
                                  {sug.confidence === 'alta' ? '✅ Alta' : sug.confidence === 'media' ? '⚠️ Media' : '❓ Baja'}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-700">
                                <strong>Categoría:</strong> {sug.categoria} → {sug.subcategoria}
                              </p>
                              {sug.jugador && (
                                <p className="text-sm text-slate-700">
                                  <strong>Jugador:</strong> {sug.jugador}
                                </p>
                              )}
                              <p className="text-sm text-slate-700">
                                <strong>Concepto:</strong> {sug.concepto_sugerido}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleReconcile(mov, sug)}
                            disabled={!sug || reconciling}
                            className={sug?.confidence === 'alta' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setMovimientos(prev => prev.filter(m => m !== mov))}
                          >
                            Omitir
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}