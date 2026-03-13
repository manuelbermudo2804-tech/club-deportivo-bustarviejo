import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Dumbbell, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function StepCategory({
  currentPlayer,
  setCurrentPlayer,
  categories,
  playerAge,
  suggestCategoryByAge,
  onUserChangeCategory
}) {
  const [categoryConfigs, setCategoryConfigs] = useState([]);

  // Cargar configs de categorías para detectar prep. física y complementaria
  useEffect(() => {
    (async () => {
      try {
        const configs = await base44.entities.CategoryConfig.filter({ activa: true });
        setCategoryConfigs(configs);
      } catch {}
    })();
  }, []);

  // Buscar config de la categoría seleccionada
  const selectedConfig = categoryConfigs.find(c => c.nombre === currentPlayer.deporte);
  const isComplementaria = selectedConfig?.es_actividad_complementaria === true;
  const incluyePrepFisica = selectedConfig?.incluye_preparacion_fisica === true;
  const suplemento = selectedConfig?.suplemento_prep_fisica || 0;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        ⚽ Categoría y Deporte
      </h3>

      {/* Checkbox Fútbol Femenino */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border-2 border-pink-200">
        <Checkbox
          id="wiz-femenino"
          checked={currentPlayer.deporte === "Fútbol Femenino"}
          onCheckedChange={(checked) => {
            if (checked) {
              setCurrentPlayer({ ...currentPlayer, deporte: "Fútbol Femenino" });
            } else {
              const suggested = suggestCategoryByAge(currentPlayer.fecha_nacimiento);
              setCurrentPlayer({ ...currentPlayer, deporte: suggested || "Fútbol Pre-Benjamín (Mixto)" });
            }
          }}
          className="w-5 h-5"
        />
        <Label htmlFor="wiz-femenino" className="cursor-pointer flex-1">
          <span className="font-bold text-pink-900">⚽👧 ¿Es jugadora de Fútbol Femenino?</span>
          <p className="text-xs text-pink-700 mt-1">Marca si participará en el equipo femenino</p>
        </Label>
      </div>

      {/* Auto-sugerencia */}
      {playerAge !== null && currentPlayer.deporte !== "Fútbol Femenino" && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm">
            <strong>✅ Categoría auto-seleccionada:</strong> Según la edad ({playerAge} años) → <strong>{currentPlayer.deporte}</strong>
            <br /><span className="text-xs">Puedes cambiarla manualmente si no es correcta</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Selector de categoría */}
      <div className="space-y-2">
        <Label>Categoría y Deporte *</Label>
        <Select value={currentPlayer.deporte} onValueChange={(v) => { if (onUserChangeCategory) onUserChangeCategory(); setCurrentPlayer({ ...currentPlayer, deporte: v }); }}>
          <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
          <SelectContent position="popper" sideOffset={4} className="z-[9999] max-h-[60vh]">
            {categories.map(cat => <SelectItem key={cat.value} value={cat.value} className="py-3 text-sm cursor-pointer">{cat.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500">ℹ️ Categoría auto-seleccionada por edad - puedes cambiarla</p>
      </div>

      {/* Banner: Actividad Complementaria */}
      {isComplementaria && (
        <Alert className="bg-purple-50 border-purple-200">
          <Info className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-800 text-sm">
            <strong>🏓 Actividad Complementaria</strong>
            <br />
            <span className="text-xs">Esta actividad no incluye competición federada, convocatorias ni clasificación. Incluye: entrenamientos, horarios y comunicación con el club.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Banner: Preparación Física incluida */}
      {incluyePrepFisica && (
        <Alert className="bg-orange-50 border-orange-200">
          <Dumbbell className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 text-sm">
            <strong>🏋️ Incluye Preparación Física</strong>
            {suplemento > 0 ? (
              <span> ({suplemento}€ incluidos en la cuota)</span>
            ) : null}
            <br />
            <span className="text-xs">La cuota de esta categoría ya incluye las sesiones de preparación física obligatoria.</span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}