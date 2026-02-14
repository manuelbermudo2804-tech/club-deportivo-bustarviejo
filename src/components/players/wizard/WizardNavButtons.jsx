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
    <div className="flex justify-between gap-3 pt-5 mt-2 border-t border-slate-200">
      {currentStep > 0 ? (
        <Button type="button" variant="outline" onClick={onBack} className="gap-1 min-h-[48px] px-5 text-base">
          <ChevronLeft className="w-5 h-5" /> Anterior
        </Button>
      ) : (
        <div />
      )}

      {isLastStep ? (
        <Button
          type="button"
          className="bg-orange-600 hover:bg-orange-700 active:bg-orange-800 gap-1 min-h-[48px] px-6 text-base font-bold shadow-lg"
          disabled={!canAdvance || isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
          ) : (
            submitLabel
          )}
        </Button>
      ) : (
        <Button
          type="button"
          className="bg-orange-600 hover:bg-orange-700 active:bg-orange-800 gap-1 min-h-[48px] px-6 text-base font-bold shadow-lg"
          disabled={!canAdvance}
          onClick={onNext}
        >
          Siguiente <ChevronRight className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}