import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

// Aviso cuando la plantilla de la categoría no tiene jugadores cargados:
// así el entrenador no crea convocatorias vacías sin darse cuenta.
export default function PlantillaVaciaAlert({ categoria, total }) {
  if (!categoria || categoria === "all" || categoria === "admin" || total > 0) return null;

  return (
    <Alert className="bg-amber-50 border-amber-300">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800 text-sm">
        <strong>No aparece ningún jugador en {categoria}.</strong> Aún no puedes convocar a nadie.
        Revisa que los jugadores estén inscritos, activos y asignados a esta categoría en la temporada actual,
        o avisa a la administración del club.
      </AlertDescription>
    </Alert>
  );
}