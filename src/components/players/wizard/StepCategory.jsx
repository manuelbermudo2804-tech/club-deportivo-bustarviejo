import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Dumbbell, Info, AlertTriangle } from "lucide-react";
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

  // Detectar si el jugador nace en el último trimestre (oct/nov/dic) → caso típico de error de categoría
  const birthMonth = currentPlayer.fecha_nacimiento ? new Date(currentPlayer.fecha_nacimiento).getMonth() + 1 : null;
  const esNacidoFinalAnio = birthMonth !== null && birthMonth >= 10;

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

      {/* AVISO IMPORTANTE: Revisar bien la categoría */}
      {playerAge !== null && currentPlayer.deporte !== "Fútbol Femenino" && (
        <Alert className={`border-2 ${esNacidoFinalAnio ? 'bg-amber-50 border-amber-400' : 'bg-blue-50 border-blue-300'}`}>
          <AlertTriangle className={`h-5 w-5 ${esNacidoFinalAnio ? 'text-amber-600' : 'text-blue-600'}`} />
          <AlertDescription className={`${esNacidoFinalAnio ? 'text-amber-900' : 'text-blue-900'} text-sm`}>
            <strong>⚠️ Revisa bien la categoría antes de continuar</strong>
            <p className="mt-1 text-xs leading-relaxed">
              El sistema sugiere una categoría automáticamente según la edad actual, pero las categorías deportivas se rigen por el <strong>año de nacimiento</strong>, no por la edad exacta.
            </p>
            {esNacidoFinalAnio && (
              <p className="mt-2 text-xs leading-relaxed bg-amber-100 p-2 rounded border border-amber-300">
                📅 <strong>Este jugador cumple años a final de año</strong> ({['','enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][birthMonth]}). Es muy probable que le corresponda <strong>una categoría distinta</strong> a la sugerida. Consulta con el coordinador si tienes dudas.
              </p>
            )}
            <p className="mt-2 text-xs">
              ✅ Si no estás seguro/a, déjala como está — el club revisará todas las inscripciones y te avisará si hay que cambiarla.
            </p>
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