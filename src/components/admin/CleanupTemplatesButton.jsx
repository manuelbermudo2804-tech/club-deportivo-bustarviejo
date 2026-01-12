import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Trash2, Loader2, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CleanupTemplatesButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCleanup = async () => {
    if (!confirm("¿Estás seguro? Esto eliminará todas las plantillas duplicadas.")) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // Obtener todas las plantillas
      const allTemplates = await base44.entities.EventTemplate.list();
      
      // Agrupar por nombre_plantilla
      const grouped = {};
      for (const template of allTemplates) {
        const key = template.nombre_plantilla;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(template);
      }

      // Eliminar duplicados (dejar solo el más antiguo de cada grupo)
      let deletedCount = 0;
      for (const [nombre, templates] of Object.entries(grouped)) {
        if (templates.length > 1) {
          // Ordenar por fecha de creación (más antiguo primero)
          templates.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
          
          // Eliminar todos excepto el primero (más antiguo)
          for (let i = 1; i < templates.length; i++) {
            await base44.entities.EventTemplate.delete(templates[i].id);
            deletedCount++;
          }
        }
      }

      setResult({
        success: true,
        total_original: allTemplates.length,
        plantillas_unicas: Object.keys(grouped).length,
        duplicados_eliminados: deletedCount
      });
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleCleanup}
        disabled={isLoading}
        className="bg-red-600 hover:bg-red-700"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Limpiando...
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4 mr-2" />
            🧹 Limpiar Plantillas Duplicadas
          </>
        )}
      </Button>

      {result && (
        <Alert className={result.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
          <AlertDescription>
            {result.success ? (
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">✅ Limpieza completada</p>
                  <p className="text-sm text-green-800 mt-1">
                    Total original: {result.total_original} plantillas<br />
                    Plantillas únicas: {result.plantillas_unicas}<br />
                    Duplicados eliminados: {result.duplicados_eliminados}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-red-900">❌ Error: {result.error}</p>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}