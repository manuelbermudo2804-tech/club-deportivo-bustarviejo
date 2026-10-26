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
    if (!accountId || !activeSeason?.temporada || movements.length === 0) {
      toast.error("Selecciona una cuenta y una temporada antes de importar");
      return;
    }

    setExtracting(true);
    try {
      const [payments, existingMovements] = await Promise.all([
        base44.entities.Payment.filter({ temporada: activeSeason.temporada }),
        base44.entities.BankMovement.filter({ cuenta_id: accountId })
      ]);

      // Compara fecha, concepto, importe y tipo. Mantiene recuentos para no
      // confundir dos operaciones legítimas iguales dentro del mismo extracto.
      const signature = (mov) => [
        String(mov.fecha || "").trim().toLowerCase(),
        String(mov.concepto || "").replace(/\s+/g, " ").trim().toLowerCase(),
        Number(mov.cantidad || 0).toFixed(2),
        mov.tipo || (Number(mov.cantidad) >= 0 ? "Ingreso" : "Gasto")
      ].join("|");

      const importedCounts = new Map();
      existingMovements.forEach((mov) => {
        const key = signature(mov);
        importedCounts.set(key, (importedCounts.get(key) || 0) + 1);
      });

      const incomingCounts = new Map();
      const usedPaymentIds = new Set();
      let imported = 0;
      let skipped = 0;
      let matchedCount = 0;

      for (const mov of movements) {
        const key = signature({
          ...mov,
          tipo: Number(mov.cantidad) >= 0 ? "Ingreso" : "Gasto"
        });
        const occurrence = (incomingCounts.get(key) || 0) + 1;
        incomingCounts.set(key, occurrence);

        if (occurrence <= (importedCounts.get(key) || 0)) {
          skipped++;
          continue;
        }

        const concept = String(mov.concepto || "").toLowerCase();
        const matching = payments.find((p) => {
          const playerName = String(p.jugador_nombre || "").trim().toLowerCase();
          const amountMatch = Math.abs(Number(p.cantidad || 0) - Math.abs(Number(mov.cantidad || 0))) < 1;
          const conceptMatch = playerName.length > 2 && concept.includes(playerName);
          return amountMatch && conceptMatch && !p.reconciliado_banco && !usedPaymentIds.has(p.id);
        });

        const bankMovement = {
          cuenta_id: accountId,
          fecha: mov.fecha,
          concepto: mov.concepto,
          cantidad: mov.cantidad,
          tipo: Number(mov.cantidad) >= 0 ? "Ingreso" : "Gasto",
          conciliado: !!matching,
          payment_id: matching?.id || null,
          conciliado_automaticamente: !!matching,
          confianza_conciliacion: matching ? 95 : 0,
          origen_importacion: fileName,
          fecha_importacion: new Date().toISOString(),
          temporada: activeSeason.temporada
        };

        await base44.entities.BankMovement.create(bankMovement);
        imported++;
        importedCounts.set(key, (importedCounts.get(key) || 0) + 1);

        if (matching) {
          usedPaymentIds.add(matching.id);
          await base44.entities.Payment.update(matching.id, {
            reconciliado_banco: true,
            fecha_reconciliacion: new Date().toISOString()
          });
          matchedCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['bankMovements'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });

      toast.success(`Importados ${imported} movimientos; ${matchedCount} conciliados automáticamente; ${skipped} duplicados omitidos.`);
      setMovements([]);
      setFileName("");
    } catch (error) {
      console.error("Error importando movimientos:", error);
      toast.error("Error importando movimientos. Revisa la cuenta y vuelve a intentarlo.");
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