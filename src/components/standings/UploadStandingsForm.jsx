import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function UploadStandingsForm({ onDataExtracted, onCancel, preselectedCategory, prefillData }) {
  const [temporada, setTemporada] = useState(prefillData?.temporada || "2025/2026");
  const [categoria, setCategoria] = useState(preselectedCategory || prefillData?.categoria || "");
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(() => {
    if (preselectedCategory) {
      return localStorage.getItem(`standings_url_${preselectedCategory}`) || "";
    }
    return "";
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Guardar URL cuando cambie
  useEffect(() => {
    if (imageUrl && preselectedCategory) {
      localStorage.setItem(`standings_url_${preselectedCategory}`, imageUrl);
    }
  }, [imageUrl, preselectedCategory]);

  const processFile = (file) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
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

    if ((!imageFile && !imageUrl) || !categoria) {
      toast.error("Por favor sube una imagen o pega una URL");
      return;
    }

    if (imageFile && imageUrl) {
      toast.error("Usa solo una opción: subir imagen o pegar URL");
      return;
    }

    setIsProcessing(true);

    try {
      let file_url;
      if (imageUrl) {
        file_url = imageUrl;
      } else {
        const upload = await base44.integrations.Core.UploadFile({ file: imageFile });
        file_url = upload.file_url;
      }

      // 2. Extraer datos usando InvokeLLM con visión
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analiza esta imagen de una tabla de clasificación deportiva y extrae TODOS los datos posibles con MÁXIMA PRECISIÓN.

      CRÍTICO - Lee con MUCHO CUIDADO:
      1. Lee TODA la tabla completa, desde el primer equipo hasta el último
      2. Extrae TODOS los campos que aparezcan en las columnas: PJ (partidos jugados), G (ganados), E (empatados), P (perdidos), GF (goles favor), GC (goles contra), Pts (puntos)
      3. Los números deben ser EXACTOS - verifica cada cifra cuidadosamente
      4. NO inventes datos - si un campo no está visible, omítelo
      5. IMPORTANTE: Presta especial atención a la posición y puntos de cada equipo

      Devuelve un array de objetos con esta estructura:
      {
      "standings": [
      {
      "posicion": 1,
      "nombre_equipo": "Nombre del Equipo",
      "puntos": 18,
      "partidos_jugados": 10,
      "ganados": 6,
      "empatados": 0,
      "perdidos": 4,
      "goles_favor": 20,
      "goles_contra": 12
      }
      ]
      }

      Lee TODOS los equipos visibles en la tabla, sin omitir ninguno.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            standings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  posicion: { type: "number" },
                  nombre_equipo: { type: "string" },
                  puntos: { type: "number" },
                  partidos_jugados: { type: "number" },
                  ganados: { type: "number" },
                  empatados: { type: "number" },
                  perdidos: { type: "number" },
                  goles_favor: { type: "number" },
                  goles_contra: { type: "number" }
                },
                required: ["posicion", "nombre_equipo", "puntos"]
              }
            }
          }
        }
      });

      if (!result.standings || result.standings.length === 0) {
        toast.error("No se pudieron extraer datos de la imagen");
        setIsProcessing(false);
        return;
      }

      // Ordenar por posición
      const sortedStandings = result.standings.sort((a, b) => a.posicion - b.posicion);

      onDataExtracted({
        temporada,
        categoria,
        standings: sortedStandings
      });

      toast.success(`✅ Datos extraídos: ${sortedStandings.length} equipos`);
    } catch (error) {
      console.error("Error processing image:", error);
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
          Subir Clasificación
        </CardTitle>

      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Temporada</Label>
              <Input
                value={temporada}
                onChange={(e) => setTemporada(e.target.value)}
                placeholder="2025/2026"
                required
                disabled={!!prefillData}
                className={prefillData ? "bg-slate-100" : ""}
              />
            </div>
            <div>
              <Label>Categoría / Equipo</Label>
              <Input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Fútbol Juvenil"
                required
                disabled={!!prefillData}
                className={prefillData ? "bg-slate-100" : ""}
              />
            </div>
          </div>

          <div>
            <Label>URL de la Imagen</Label>
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Pega aquí la URL de la imagen"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => imageUrl && window.open(imageUrl, "_blank")}
                disabled={!imageUrl}
              >
                Abrir
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-slate-300"></div>
            <span className="text-xs text-slate-500">O</span>
            <div className="flex-1 border-t border-slate-300"></div>
          </div>

          <div>
            <Label>Subir Imagen</Label>
            <div 
              className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-orange-500 transition-colors"
              onPaste={handlePaste}
              tabIndex={0}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>💡 Consejos:</strong> Asegúrate de que la imagen sea nítida, solo contenga la tabla de clasificación, 
              y los números sean legibles.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={(!imageFile && !imageUrl) || isProcessing || !categoria}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
                  Procesando imagen...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Extraer Datos
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}