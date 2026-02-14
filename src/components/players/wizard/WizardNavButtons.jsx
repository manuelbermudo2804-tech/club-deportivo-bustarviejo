import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export default function WizardNavButtons({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSubmit,
  isSubmitting,
  canAdvance = true,
  isLastStep = false,
  submitLabel = "Registrar"
}) {
  return (
    <div className="flex justify-between gap-3 pt-4 border-t border-slate-200">
      {currentStep > 0 ? (
        <Button type="button" variant="outline" onClick={onBack} className="gap-1">
          <ChevronLeft className="w-4 h-4" /> Anterior
        </Button>
      ) : (
        <div />
      )}

      {isLastStep ? (
        <Button
          type="button"
          className="bg-orange-600 hover:bg-orange-700 gap-1"
          disabled={!canAdvance || isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
          ) : (
            submitLabel
          )}
        </Button>
      ) : (
        <Button
          type="button"
          className="bg-orange-600 hover:bg-orange-700 gap-1"
          disabled={!canAdvance}
          onClick={onNext}
        >
          Siguiente <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}