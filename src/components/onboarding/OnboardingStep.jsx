import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export default function OnboardingStep({
  step,
  totalSteps,
  icon,
  title,
  description,
  children,
  onNext,
  nextLabel = "Siguiente",
  canProceed = true,
  isLoading = false,
}) {
  return (
    <div className="h-full flex flex-col justify-between p-6 max-w-lg mx-auto">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-600">
            Paso {step} de {totalSteps}
          </span>
          <span className="text-xs text-slate-500">{Math.round((step / totalSteps) * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-600 to-green-600 transition-all duration-500"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6 py-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-green-100 rounded-full flex items-center justify-center text-5xl">
            {icon}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
        </div>

        {/* Custom Content */}
        {children}
      </div>

      {/* Button */}
      <Button
        onClick={onNext}
        disabled={!canProceed || isLoading}
        className="w-full bg-gradient-to-r from-orange-600 to-green-600 hover:from-orange-700 hover:to-green-700 text-white font-bold py-3 text-lg rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
            Cargando...
          </>
        ) : (
          <>
            {nextLabel}
            <ChevronRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}