import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function BankStatementImporter({ activeSeason, accountId }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [movements, setMovements] = useState([]);
  const [fileName, setFileName] = useState("");

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setUploading(true);

    try {
      // Subir archivo
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setUploading(false);
      setExtracting(true);

      // Extraer datos con IA
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            movimientos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  fecha: { type: "string" },
                  concepto: { type: "string" },
                  cantidad: { type: "number" },
                  tipo: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.status === "success") {
        setMovements(result.output.movimientos || []);
        toast.success(`${result.output.movimientos.length} movimientos extraídos`);
      } else {
        toast.error("Error extrayendo datos del archivo");
      }
    } catch (error) {
      toast.error("Error procesando archivo");
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  const handleImport = async () => {
    setExtracting(true);
    try {
      // Obtener pagos para conciliación automática
      const payments = await base44.entities.Payment.filter({ temporada: activeSeason.temporada });
      
      // Usar IA para conciliar movimientos
      const conciliationPromises = movements.map(async (mov) => {
        // Intentar matching automático
        const matching = payments.find(p => {
          const amountMatch = Math.abs(p.cantidad - Math.abs(mov.cantidad)) < 1;
          const conceptMatch = mov.concepto?.toLowerCase().includes(p.jugador_nombre?.toLowerCase());
          return amountMatch && conceptMatch && !p.reconciliado_banco;
        });

        const bankMovement = {
          cuenta_id: accountId,
          fecha: mov.fecha,
          concepto: mov.concepto,
          cantidad: mov.cantidad,
          tipo: mov.cantidad >= 0 ? "Ingreso" : "Gasto",
          conciliado: !!matching,
          payment_id: matching?.id || null,
          conciliado_automaticamente: !!matching,
          confianza_conciliacion: matching ? 95 : 0,
          origen_importacion: fileName,
          fecha_importacion: new Date().toISOString(),
          temporada: activeSeason.temporada
        };

        await base44.entities.BankMovement.create(bankMovement);

        // Si se concilió, marcar pago como reconciliado
        if (matching) {
          await base44.entities.Payment.update(matching.id, {
            reconciliado_banco: true,
            fecha_reconciliacion: new Date().toISOString()
          });
        }

        return { movement: mov, matched: !!matching };
      });

      const results = await Promise.all(conciliationPromises);
      const matched = results.filter(r => r.matched).length;

      queryClient.invalidateQueries(['bankMovements']);
      queryClient.invalidateQueries(['payments']);
      
      toast.success(`Importados ${movements.length} movimientos. ${matched} conciliados automáticamente.`);
      setMovements([]);
      setFileName("");
    } catch (error) {
      toast.error("Error importando movimientos");
    } finally {
      setExtracting(false);
    }
  };

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          Importar Extracto Bancario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input 
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            disabled={uploading || extracting}
          />
          <p className="text-xs text-slate-500 mt-1">Sube el extracto bancario en formato CSV</p>
        </div>

        {(uploading || extracting) && (
          <div className="text-center py-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-slate-600">
              {uploading ? "Subiendo archivo..." : "Extrayendo movimientos con IA..."}
            </p>
          </div>
        )}

        {movements.length > 0 && (
          <>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-medium mb-2">
                📋 {movements.length} movimientos listos para importar
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {movements.slice(0, 10).map((mov, idx) => (
                  <div key={idx} className="bg-white rounded p-2 text-xs flex justify-between">
                    <span className="font-medium">{mov.concepto}</span>
                    <span className={mov.cantidad >= 0 ? "text-green-600" : "text-red-600"}>
                      {mov.cantidad >= 0 ? '+' : ''}{mov.cantidad}€
                    </span>
                  </div>
                ))}
                {movements.length > 10 && (
                  <p className="text-xs text-slate-500 text-center">
                    Y {movements.length - 10} movimientos más...
                  </p>
                )}
              </div>
            </div>
            <Button 
              onClick={handleImport}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={extracting}
            >
              {extracting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando y Conciliando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Importar y Conciliar Automáticamente
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}