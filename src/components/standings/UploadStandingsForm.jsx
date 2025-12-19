import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function UploadStandingsForm({ onDataExtracted, onCancel }) {
  const [temporada, setTemporada] = useState("2024/2025");
  const [categoria, setCategoria] = useState("");
  const [jornada, setJornada] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageFile || !categoria || !jornada) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Subir imagen
      const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });

      // 2. Extraer datos usando InvokeLLM con visión
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analiza esta imagen de una tabla de clasificación deportiva y extrae TODOS los datos en formato JSON.

IMPORTANTE: Lee TODA la tabla completa, todas las filas, sin omitir ningún equipo.

Devuelve un array de objetos con esta estructura exacta:
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

Si algún campo no está visible en la imagen, omítelo (no pongas null ni 0, simplemente no lo incluyas).
Lee TODOS los equipos de la tabla, desde el primero hasta el último.`,
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
        jornada: parseInt(jornada),
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Temporada</Label>
              <Input
                value={temporada}
                onChange={(e) => setTemporada(e.target.value)}
                placeholder="2024/2025"
                required
              />
            </div>
            <div>
              <Label>Categoría / Equipo</Label>
              <Input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Fútbol Juvenil"
                required
              />
            </div>
            <div>
              <Label>Jornada</Label>
              <Input
                type="number"
                value={jornada}
                onChange={(e) => setJornada(e.target.value)}
                placeholder="15"
                required
              />
            </div>
          </div>

          <div>
            <Label>Imagen de Clasificación</Label>
            <div className="mt-2 border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-orange-500 transition-colors">
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
                    <p className="text-sm text-slate-600">Clic para cambiar imagen</p>
                  </div>
                ) : (
                  <div>
                    <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-600 font-medium">Clic para subir imagen</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Foto o captura de la clasificación
                    </p>
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
              disabled={!imageFile || isProcessing}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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