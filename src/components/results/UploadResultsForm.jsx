import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Image as ImageIcon, Loader2, X } from "lucide-react";
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
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            id="results-image-upload"
          />
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="max-h-96 mx-auto rounded-lg shadow-lg" />
              <Button
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <label htmlFor="results-image-upload" className="cursor-pointer">
              <ImageIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 font-semibold mb-2">Haz clic para seleccionar o pega una imagen</p>
              <p className="text-sm text-slate-500">Captura de pantalla de la tabla de resultados</p>
            </label>
          )}
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