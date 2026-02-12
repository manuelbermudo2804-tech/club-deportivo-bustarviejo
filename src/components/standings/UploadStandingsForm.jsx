import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DropzoneWithPreview from "../upload/DropzoneWithPreview";
import { toast } from "sonner";

export default function UploadStandingsForm({ onDataExtracted, onCancel, preselectedCategory, prefillData, rfefUrl }) {
  const [temporada, setTemporada] = React.useState(prefillData?.temporada || "2025/2026");
  const categoria = preselectedCategory || prefillData?.categoria || "";
  
  // Calcular jornada automáticamente
  const [jornadaActual, setJornadaActual] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [rfefUrlState, setRfefUrlState] = useState(rfefUrl || "");
  const [grupoText, setGrupoText] = useState("");
  const [configId, setConfigId] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Cargar configuración RFEF guardada para la categoría
  useEffect(() => {
    if (!categoria) return;
    (async () => {
      try {
        const list = await base44.entities.StandingsConfig.filter({ categoria });
        const cfg = list?.[0];
        if (cfg) {
          setRfefUrlState(cfg.rfef_url || "");
          setGrupoText(cfg.grupo || "");
          setConfigId(cfg.id);
        } else {
          // Si no hay config para esta categoría, limpiar estados para NO reutilizar de otra categoría
          setRfefUrlState("");
          setGrupoText("");
          setConfigId(null);
        }
      } catch (e) {
        setRfefUrlState("");
        setGrupoText("");
        setConfigId(null);
      }
    })();
  }, [categoria]);

  // Si hay URL RFEF guardada, usar su jornada (Actual) y temporada
  useEffect(() => {
    const run = async () => {
      if (!rfefUrlState) return;
      try {
        const res = await base44.functions.invoke('fetchRfefStandings', { url: rfefUrlState });
        if (res?.data?.jornada_actual) setJornadaActual(res.data.jornada_actual);
        if (res?.data?.temporada) setTemporada(res.data.temporada);
      } catch (e) {
        // silencioso
      }
    };
    run();
  }, [rfefUrlState]);

  // Calcular jornada actual automáticamente al cargar (fallback BD)
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

      Devuelve un objeto con esta estructura:
      {
        "metadata": {
          "temporada": "2024/2025",
          "competicion": "Texto de la competición",
          "grupo": "Grupo 72",
          "jornada": 14
        },
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
            metadata: {
              type: "object",
              properties: {
                temporada: { type: "string" },
                competicion: { type: "string" },
                grupo: { type: "string" },
                jornada: { anyOf: [{ type: "number" }, { type: "string" }] }
              }
            },
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

      const meta = result.metadata || {};
      let jornadaFromImage = meta.jornada;
      if (typeof jornadaFromImage === 'string') {
        const m = jornadaFromImage.match(/\d+/);
        jornadaFromImage = m ? parseInt(m[0], 10) : null;
      }
      const finalTemporada = meta.temporada || temporada;
      const finalJornada = jornadaFromImage || jornadaActual;

      // Ordenar por posición
      const sortedStandings = result.standings.sort((a, b) => a.posicion - b.posicion);

      onDataExtracted({
        temporada: finalTemporada,
        categoria,
        jornada: finalJornada,
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
                  📅 Temporada: <strong>{temporada}</strong> • 
                  Jornada: <strong>{jornadaActual !== null ? jornadaActual : '...'}</strong>
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label>Subir Imagen</Label>
            <DropzoneWithPreview
              id="standings-image-upload"
              accept="image/*"
              preview={imagePreview}
              onFile={(file) => processFile(file)}
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