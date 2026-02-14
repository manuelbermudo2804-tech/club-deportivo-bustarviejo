import React from "react";
import { CheckCircle2 } from "lucide-react";

const STEP_LABELS = [
  "Jugador",
  "Categoría",
  "Documentos",
  "Tutor",
  "2º Progenitor",
  "Médica",
  "Autorizaciones",
  "Resumen"
];

export default function WizardProgress({ currentStep, totalSteps, stepLabels }) {
  const labels = stepLabels || STEP_LABELS.slice(0, totalSteps);

  return (
    <div className="w-full">
      {/* Barra de progreso */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-orange-700">
          Paso {currentStep + 1} de {totalSteps}
        </span>
        <span className="text-xs text-slate-500">
          {labels[currentStep]}
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5">
        <div
          className="bg-gradient-to-r from-orange-500 to-green-500 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>
      {/* Puntos de paso (solo desktop) */}
      <div className="hidden md:flex items-center justify-between mt-3">
        {labels.map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < currentStep
                  ? "bg-green-500 text-white"
                  : i === currentStep
                  ? "bg-orange-600 text-white ring-2 ring-orange-300"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {i < currentStep ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[10px] text-center leading-tight ${
              i === currentStep ? "text-orange-700 font-bold" : "text-slate-400"
            }`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}