import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function UploadStandingsForm({ onDataExtracted, onCancel, preselectedCategory, prefillData }) {
  const temporada = "2025/2026"; // Fija
  const categoria = preselectedCategory || prefillData?.categoria || "";
  
  // Calcular jornada automáticamente
  const [jornadaActual, setJornadaActual] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(() => {
    return localStorage.getItem('standings_image_url') || "";
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Calcular jornada actual automáticamente al cargar
  useEffect(() => {
    const calcularJornada = async () => {
      try {
        const allStandings = await base44.entities.Clasificacion.list('-jornada');
        const categoriasStandings = allStandings.filter(s => 
          s.categoria === categoria && 
          s.temporada === temporada
        );
        
        if (categoriasStandings.length > 0) {
          const maxJornada = Math.max(...categoriasStandings.map(s => s.jornada));
          setJornadaActual(maxJornada + 1);
        } else {
          setJornadaActual(1);
        }
      } catch (error) {
        console.error("Error calculando jornada:", error);
        setJornadaActual(1);
      }
    };
    
    if (categoria) {
      calcularJornada();
    }
  }, [categoria, temporada]);

  // Guardar URL cuando cambie (GLOBAL para todas las categorías)
  useEffect(() => {
    if (imageUrl) {
      localStorage.setItem('standings_image_url', imageUrl);
    }
  }, [imageUrl]);

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

    if (!categoria) {
      toast.error("Selecciona una categoría");
      return;
    }

    if (jornadaActual === null) {
      toast.error("Calculando jornada...");
      return;
    }

    if (!imageFile) {
      toast.error("Por favor sube una imagen");
      return;
    }

    setIsProcessing(true);

    try {
      const upload = await base44.integrations.Core.UploadFile({ file: imageFile });
      const file_url = upload.file_url;

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
        jornada: jornadaActual,
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
          {/* Info automática de temporada y jornada */}
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-green-900">{categoria || "Categoría no seleccionada"}</p>
                <p className="text-xs text-green-700 mt-1">
                  📅 Temporada: <strong>2025/2026</strong> • 
                  Jornada: <strong>{jornadaActual !== null ? jornadaActual : '...'}</strong>
                </p>
              </div>
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
              disabled={isProcessing || !categoria || jornadaActual === null || !imageFile}
              className="bg-orange-600 hover:bg-orange-700 flex-1"
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