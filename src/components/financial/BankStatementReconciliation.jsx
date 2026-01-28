import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, CheckCircle2, XCircle, AlertCircle, FileSpreadsheet, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export default function BankStatementReconciliation({ activeSeason }) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transacciones, setTransacciones] = useState([]);
  const [editingCategoria, setEditingCategoria] = useState({});
  const queryClient = useQueryClient();

  const CATEGORIAS_DISPONIBLES = [
    "Cuota Jugador", "Pedido Ropa", "Lotería", "Cuota Socio", "Patrocinio", "Donación", "Otros Ingresos",
    "Gasto Personal", "Gasto Federación", "Gasto Arbitraje", "Gasto Material", "Gasto Suministros", 
    "Gasto Seguros", "Gasto Instalaciones", "Otros Gastos"
  ];

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf'
    ];

    if (!validTypes.includes(file.type)) {
      toast.error('Formato no válido. Usa CSV, Excel o PDF');
      return;
    }

    setUploading(true);
    try {
      // Subir archivo
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setProcessing(true);
      // Procesar con IA
      const { data } = await base44.functions.invoke('processBankStatement', {
        file_url,
        temporada: activeSeason?.temporada
      });

      if (data.success) {
        setTransacciones(data.transacciones);
        toast.success(`✅ ${data.total_extraidas} transacciones extraídas. ${data.con_coincidencia_alta} con alta confianza.`);
      } else {
        toast.error('Error al procesar el extracto');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al procesar el archivo');
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const reconcileMutation = useMutation({
    mutationFn: async (transaccionesConfirmadas) => {
      const created = [];
      
      for (const tx of transaccionesConfirmadas) {
        // Si está vinculada a un pago, marcarlo como Pagado
        if (tx.entidad_vinculada?.tipo === 'Payment') {
          await base44.entities.Payment.update(tx.entidad_vinculada.id, {
            estado: 'Pagado',
            fecha_pago: tx.fecha,
            reconciliado_banco: true,
            fecha_reconciliacion: new Date().toISOString()
          });
        }

        // Crear transacción financiera
        const nuevaTx = await base44.entities.FinancialTransaction.create({
          fecha: tx.fecha,
          concepto: tx.concepto,
          categoria: tx.categoria_sugerida,
          tipo: tx.importe > 0 ? 'Ingreso' : 'Gasto',
          cantidad: Math.abs(tx.importe),
          metodo: 'Transferencia Bancaria',
          reconciliado: true,
          importado_de_banco: true,
          temporada: activeSeason?.temporada,
          entidad_vinculada_tipo: tx.entidad_vinculada?.tipo,
          entidad_vinculada_id: tx.entidad_vinculada?.id
        });

        created.push(nuevaTx);
      }

      return created;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success(`✅ ${created.length} transacciones reconciliadas`);
      setTransacciones([]);
    }
  });

  const handleConfirmarTodas = () => {
    const confirmadas = transacciones.map(tx => ({
      ...tx,
      categoria_sugerida: editingCategoria[tx.concepto] || tx.categoria_sugerida
    }));
    reconcileMutation.mutate(confirmadas);
  };

  const handleConfirmarSeleccionadas = (indices) => {
    const seleccionadas = indices.map(i => ({
      ...transacciones[i],
      categoria_sugerida: editingCategoria[transacciones[i].concepto] || transacciones[i].categoria_sugerida
    }));
    reconcileMutation.mutate(seleccionadas);
  };

  const totalIngresos = transacciones.filter(t => t.importe > 0).reduce((sum, t) => sum + t.importe, 0);
  const totalGastos = transacciones.filter(t => t.importe < 0).reduce((sum, t) => sum + Math.abs(t.importe), 0);

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            Importar Extracto Bancario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-xl p-4 border-2 border-dashed border-blue-300">
            <div className="text-center">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="bank-statement-upload"
                disabled={uploading || processing}
              />
              <label htmlFor="bank-statement-upload" className="cursor-pointer">
                {uploading || processing ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                    <p className="font-medium text-slate-700">
                      {processing ? '🤖 Analizando con IA...' : '📤 Subiendo archivo...'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Upload className="h-12 w-12 text-blue-400" />
                    <div>
                      <p className="font-semibold text-slate-900">Arrastra o haz clic para subir</p>
                      <p className="text-sm text-slate-600 mt-1">
                        CSV, Excel o PDF de tu banco
                      </p>
                    </div>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              ¿Cómo funciona?
            </p>
            <ol className="text-xs text-blue-800 space-y-1 ml-4">
              <li>1️⃣ Descarga el extracto de tu banco (cualquier formato)</li>
              <li>2️⃣ Súbelo aquí - la IA extrae automáticamente las transacciones</li>
              <li>3️⃣ Revisa las categorías sugeridas y ajusta si es necesario</li>
              <li>4️⃣ Confirma - se reconcilian los pagos automáticamente</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {transacciones.length > 0 && (
        <Card className="border-2 border-green-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                {transacciones.length} Transacciones Detectadas
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={() => setTransacciones([])}
                  variant="outline"
                  size="sm"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmarTodas}
                  disabled={reconcileMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {reconcileMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reconciliando...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar Todas</>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Resumen */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Ingresos</span>
                </div>
                <p className="text-2xl font-bold text-green-700">+{totalIngresos.toFixed(2)}€</p>
                <p className="text-xs text-green-600 mt-1">
                  {transacciones.filter(t => t.importe > 0).length} operaciones
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Gastos</span>
                </div>
                <p className="text-2xl font-bold text-red-700">-{totalGastos.toFixed(2)}€</p>
                <p className="text-xs text-red-600 mt-1">
                  {transacciones.filter(t => t.importe < 0).length} operaciones
                </p>
              </div>
            </div>

            {/* Lista de transacciones */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {transacciones.map((tx, idx) => (
                <div 
                  key={idx} 
                  className={`border rounded-lg p-4 ${
                    tx.confianza >= 80 ? 'border-green-300 bg-green-50' :
                    tx.confianza >= 60 ? 'border-yellow-300 bg-yellow-50' :
                    'border-orange-300 bg-orange-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-slate-600">{tx.fecha}</span>
                        {tx.entidad_vinculada && (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                            🔗 Vinculado
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            tx.confianza >= 80 ? 'border-green-500 text-green-700' :
                            tx.confianza >= 60 ? 'border-yellow-500 text-yellow-700' :
                            'border-orange-500 text-orange-700'
                          }`}
                        >
                          {tx.confianza}% confianza
                        </Badge>
                      </div>
                      <p className="font-medium text-slate-900">{tx.concepto}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        💡 Sugerencia: <span className="font-semibold">{tx.sugerencia}</span>
                      </p>
                      
                      {/* Selector de categoría */}
                      <div className="mt-3">
                        <Select
                          value={editingCategoria[tx.concepto] || tx.categoria_sugerida}
                          onValueChange={(val) => setEditingCategoria({
                            ...editingCategoria,
                            [tx.concepto]: val
                          })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIAS_DISPONIBLES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-2xl font-bold ${
                        tx.importe > 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {tx.importe > 0 ? '+' : ''}{tx.importe.toFixed(2)}€
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Leyenda de colores */}
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-300"></div>
                <span className="text-slate-600">Alta confianza (80%+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-300"></div>
                <span className="text-slate-600">Media confianza (60-79%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-300"></div>
                <span className="text-slate-600">Baja confianza (&lt;60%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}