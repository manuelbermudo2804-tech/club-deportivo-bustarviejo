import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Download, CheckCircle, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ImportResultsDialog({ open, onOpenChange, onSuccess }) {
  const [importing, setImporting] = useState(false);
  const [source, setSource] = useState("rffm");
  const [url, setUrl] = useState("");
  const [categoria, setCategoria] = useState("");
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    if (!categoria) {
      alert("Por favor selecciona una categoría");
      return;
    }

    if ((source === "rss" || source === "manual_url") && !url) {
      alert("Por favor introduce una URL");
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const response = await base44.functions.importMatchResults({
        source,
        url: url || undefined,
        categoria,
        temporada: "2024-2025"
      });

      setResult(response);

      if (response.success && response.total_created > 0) {
        setTimeout(() => {
          onSuccess();
          onOpenChange(false);
        }, 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        errors: [error.message]
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-orange-600" />
            Importar Resultados Automáticamente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Fuente de Datos</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rffm">Real Federación de Fútbol de Madrid (RFFM)</SelectItem>
                <SelectItem value="rss">Feed RSS personalizado</SelectItem>
                <SelectItem value="manual_url">URL manual (web scraping)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(source === "rss" || source === "manual_url") && (
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                placeholder="https://ejemplo.com/resultados.rss"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Categoría *</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fútbol Pre-Benjamín (Mixto)">Pre-Benjamín</SelectItem>
                <SelectItem value="Fútbol Benjamín (Mixto)">Benjamín</SelectItem>
                <SelectItem value="Fútbol Alevín (Mixto)">Alevín</SelectItem>
                <SelectItem value="Fútbol Infantil (Mixto)">Infantil</SelectItem>
                <SelectItem value="Fútbol Cadete">Cadete</SelectItem>
                <SelectItem value="Fútbol Juvenil">Juvenil</SelectItem>
                <SelectItem value="Fútbol Aficionado">Aficionado</SelectItem>
                <SelectItem value="Fútbol Femenino">Femenino</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {result && (
            <Alert className={result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <AlertDescription>
                  {result.success ? (
                    <div>
                      <p className="font-semibold text-green-900">
                        ✅ Importación completada
                      </p>
                      <p className="text-sm text-green-800 mt-1">
                        Se encontraron {result.total_found} partidos, se crearon {result.total_created} nuevos
                      </p>
                      {result.errors?.length > 0 && (
                        <div className="mt-2 text-xs">
                          <p className="font-semibold">Avisos:</p>
                          <ul className="list-disc list-inside">
                            {result.errors.slice(0, 3).map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-red-900">❌ Error en la importación</p>
                      <ul className="list-disc list-inside text-sm text-red-800 mt-1">
                        {result.errors?.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm text-blue-900">
              <strong>💡 Cómo funciona:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>RFFM:</strong> Busca automáticamente resultados en la web de la federación</li>
                <li><strong>RSS:</strong> Importa desde un feed RSS personalizado</li>
                <li><strong>URL manual:</strong> Extrae resultados de cualquier página web usando IA</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || !categoria}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Importar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}