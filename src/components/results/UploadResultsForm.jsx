import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Image as ImageIcon, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DropzoneWithPreview from "../upload/DropzoneWithPreview";
import { toast } from "sonner";

export default function UploadResultsForm({ categoria, onDataExtracted, onCancel }) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setImagePreview(event.target.result);
    reader.readAsDataURL(file);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          setImageFile(blob);
          const reader = new FileReader();
          reader.onload = (event) => setImagePreview(event.target.result);
          reader.readAsDataURL(blob);
          toast.success('Imagen pegada correctamente');
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (!imageFile) {
      toast.error('Selecciona una imagen primero');
      return;
    }

    setIsProcessing(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });

      const defSeason = (() => { 
        const d = new Date(); 
        const y = d.getFullYear(); 
        const m = d.getMonth() + 1; 
        return m >= 9 ? `${y}/${y+1}` : `${y-1}/${y}`; 
      })();

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analiza esta imagen de resultados de partidos de fútbol. Extrae:
- Jornada (número)
- Partidos: equipo local - equipo visitante (formato: "Local - Visitante")
- Goles local (si está jugado)
- Goles visitante (si está jugado)

Devuelve JSON con: { jornada: number, partidos: [{local, visitante, goles_local?, goles_visitante?}] }`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            jornada: { type: "number" },
            partidos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  local: { type: "string" },
                  visitante: { type: "string" },
                  goles_local: { type: "number" },
                  goles_visitante: { type: "number" }
                },
                required: ["local", "visitante"]
              }
            }
          },
          required: ["jornada", "partidos"]
        }
      });

      onDataExtracted({
        temporada: defSeason,
        categoria: categoria,
        jornada: response.jornada || 1,
        matches: response.partidos || []
      });
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Error al procesar la imagen');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-2 border-orange-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-orange-600" />
          Subir Resultados desde Imagen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4" onPaste={handlePaste}>
        <div>
          <DropzoneWithPreview
            id="results-image-upload"
            preview={imagePreview}
            onFile={(file) => { setImageFile(file); const r=new FileReader(); r.onload=(e)=>setImagePreview(e.target.result); r.readAsDataURL(file); }}
            onClear={() => { setImageFile(null); setImagePreview(null); }}
            onPaste={handlePaste}
          />
          <div className="flex items-center gap-2 text-xs text-slate-600 mt-2">
            <Badge variant="outline">1 · Subir</Badge>
            <span>→</span>
            <Badge variant="outline">2 · Analizar</Badge>
            <span>→</span>
            <Badge variant="outline">3 · Revisar</Badge>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={onCancel} variant="outline" disabled={isProcessing}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!imageFile || isProcessing} className="bg-orange-600 hover:bg-orange-700">
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Procesar Imagen
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}