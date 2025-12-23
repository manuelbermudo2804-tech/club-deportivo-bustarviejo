import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function UploadResultsForm({ categoria, onCancel, onSaved }) {
  const [temporada, setTemporada] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return m >= 9 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
  });
  const [jornada, setJornada] = useState(1);
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
    if (!temporada) { toast.error("Introduce la temporada"); return; }
    if (!jornada || Number.isNaN(Number(jornada))) { toast.error("Introduce una jornada válida"); return; }
    if (!imageFile) { toast.error("Sube una imagen"); return; }

    setIsProcessing(true);
    try {
      const upload = await base44.integrations.Core.UploadFile({ file: imageFile });
      const file_url = upload.file_url;

      const llmRes = await base44.integrations.Core.InvokeLLM({
        prompt: `Lee con máxima precisión una imagen que contiene resultados de partidos de fútbol. Devuelve un JSON con un array de partidos y para cada uno: local, visitante y goles si están (enteros). No inventes datos. Si no se ven los goles, deja los goles vacíos.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  local: { type: "string" },
                  visitante: { type: "string" },
                  goles_local: { anyOf: [{ type: "number" }, { type: "null" }] },
                  goles_visitante: { anyOf: [{ type: "number" }, { type: "null" }] }
                },
                required: ["local", "visitante"]
              }
            }
          }
        }
      });

      const matches = (llmRes.matches || []).map(m => ({
        local: String(m.local || '').trim(),
        visitante: String(m.visitante || '').trim(),
        goles_local: (m.goles_local ?? null),
        goles_visitante: (m.goles_visitante ?? null)
      })).filter(m => m.local && m.visitante);

      if (matches.length === 0) { toast.error("No se detectaron partidos en la imagen"); setIsProcessing(false); return; }

      // Borrar jornada previa y guardar
      const prev = await base44.entities.Resultado.filter({ temporada, categoria, jornada: Number(jornada) });
      await Promise.all(prev.map(r => base44.entities.Resultado.delete(r.id)));
      const nowIso = new Date().toISOString();
      await base44.entities.Resultado.bulkCreate(matches.map(m => ({
        temporada,
        categoria,
        jornada: Number(jornada),
        local: m.local,
        visitante: m.visitante,
        ...(Number.isFinite(Number(m.goles_local)) ? { goles_local: Number(m.goles_local) } : {}),
        ...(Number.isFinite(Number(m.goles_visitante)) ? { goles_visitante: Number(m.goles_visitante) } : {}),
        estado: (Number.isFinite(Number(m.goles_local)) && Number.isFinite(Number(m.goles_visitante))) ? 'finalizado' : 'pendiente',
        fecha_actualizacion: nowIso,
      })));

      toast.success(`✅ Resultados guardados (${matches.length})`);
      onSaved && onSaved();
    } catch (err) {
      console.error("Error al procesar resultados:", err);
      toast.error("Error al procesar la imagen");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-2 border-orange-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-orange-600" />
          Subir Resultados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Temporada</Label>
              <Input value={temporada} onChange={(e) => setTemporada(e.target.value)} placeholder="2024/2025" />
            </div>
            <div>
              <Label>Jornada</Label>
              <Input type="number" value={jornada} onChange={(e) => setJornada(e.target.value)} min={1} />
            </div>
            <div>
              <Label>Categoría</Label>
              <Input value={categoria || ''} disabled />
            </div>
          </div>

          <div>
            <Label>Subir Imagen</Label>
            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-orange-500 transition-colors"
              onPaste={handlePaste}
              tabIndex={0}
            >
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="results-image-upload" />
              <label htmlFor="results-image-upload" className="cursor-pointer">
                {imagePreview ? (
                  <div className="space-y-2">
                    <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
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
            <Button type="submit" disabled={isProcessing || !imageFile} className="bg-orange-600 hover:bg-orange-700 flex-1">
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
                  Procesando imagen...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Extraer y Guardar
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}