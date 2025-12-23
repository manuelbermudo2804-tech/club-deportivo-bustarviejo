import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Image as ImageIcon, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function UploadScorersForm({ categoria, onDataExtracted, onCancel }) {
  const [temporada, setTemporada] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return m >= 9 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = (file) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          toast.success("✅ Imagen pegada desde el portapapeles");
        }
        break;
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoria) { toast.error("Selecciona una categoría"); return; }
    if (!imageFile) { toast.error("Sube una imagen"); return; }

    setIsProcessing(true);
    try {
      const upload = await base44.integrations.Core.UploadFile({ file: imageFile });
      const file_url = upload.file_url;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extrae una tabla de goleadores (nombre jugador, equipo, goles) de esta IMAGEN de la RFFM. Devuelve SOLO lo visible (no inventes).`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            players: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  jugador_nombre: { type: 'string' },
                  equipo: { type: 'string' },
                  goles: { type: 'number' }
                },
                required: ['jugador_nombre', 'equipo', 'goles']
              }
            }
          }
        }
      });

      const players = (result.players || []).filter(p => p.jugador_nombre && p.equipo && Number.isFinite(Number(p.goles)));
      if (players.length === 0) { toast.error('No se detectaron goleadores'); return; }

      onDataExtracted({ temporada, categoria, players });
      toast.success(`✅ Detectados ${players.length} goleadores`);
    } catch (err) {
      console.error(err);
      toast.error("Error al procesar la imagen");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-2 border-orange-500">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-orange-600" />
          Subir Goleadores (Imagen)
        </CardTitle>
        <Button type="button" variant="outline" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
            <p className="text-sm text-green-900">
              Categoría: <strong>{categoria || '—'}</strong>
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Label>Temporada</Label>
              <Input value={temporada} onChange={(e) => setTemporada(e.target.value)} className="max-w-[180px]" />
            </div>
          </div>

          <div>
            <Label>Imagen</Label>
            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-orange-500 transition-colors"
              onPaste={handlePaste}
              tabIndex={0}
            >
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="scorers-image-upload" />
              <label htmlFor="scorers-image-upload" className="cursor-pointer">
                {imagePreview ? (
                  <div className="space-y-2">
                    <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                    <p className="text-sm text-slate-600">Clic para cambiar</p>
                  </div>
                ) : (
                  <div>
                    <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-600 font-medium">Clic para subir o Ctrl+V para pegar</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>Cancelar</Button>
            <Button type="submit" disabled={isProcessing || !imageFile} className="bg-orange-600 hover:bg-orange-700">
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" /> Extraer Datos
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}