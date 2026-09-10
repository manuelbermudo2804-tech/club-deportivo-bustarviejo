import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Estado de la plantilla de la categoría:
// - mientras carga, avisa de que está cargando (no dice que no haya jugadores)
// - si ya cargó y no hay nadie, avisa y ofrece volver a intentarlo
export default function PlantillaVaciaAlert({ categoria, total, cargando, onReintentar }) {
  if (!categoria || categoria === "all" || categoria === "admin") return null;

  if (cargando) {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
        <AlertDescription className="text-blue-800 text-sm">
          Cargando la plantilla de {categoria}...
        </AlertDescription>
      </Alert>
    );
  }

  if (total > 0) return null;

  return (
    <Alert className="bg-amber-50 border-amber-300">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800 text-sm">
        <strong>No aparece ningún jugador en {categoria}.</strong> Revisa que los jugadores estén
        inscritos, activos y asignados a esta categoría, o vuelve a intentarlo.
        {onReintentar && (
          <Button
            onClick={onReintentar}
            size="sm"
            variant="outline"
            className="ml-3 border-amber-400 text-amber-800 hover:bg-amber-100"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Volver a cargar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}