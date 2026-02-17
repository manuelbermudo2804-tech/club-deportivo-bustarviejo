import React from "react";
import { CheckCircle2 } from "lucide-react";

const STEPS = [
  { id: 1, label: "Tipo", shortLabel: "Tipo" },
  { id: 2, label: "Datos Personales", shortLabel: "Datos" },
  { id: 3, label: "Pago", shortLabel: "Pago" },
];

export default function MembershipWizard({ currentStep, onStepClick }) {
  return (
    <div className="flex items-center justify-between w-full max-w-md mx-auto mb-6">
      {STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;

        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => isCompleted && onStepClick?.(step.id)}
              disabled={!isCompleted}
              className={`flex flex-col items-center gap-1 transition-all ${isCompleted ? "cursor-pointer" : "cursor-default"}`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  isCompleted
                    ? "bg-green-600 border-green-600 text-white"
                    : isCurrent
                    ? "bg-orange-600 border-orange-600 text-white scale-110 shadow-lg"
                    : "bg-slate-200 border-slate-300 text-slate-500"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step.id}
              </div>
              <span
                className={`text-[10px] font-semibold ${
                  isCurrent ? "text-orange-700" : isCompleted ? "text-green-700" : "text-slate-400"
                }`}
              >
                {step.shortLabel}
              </span>
            </button>
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 rounded ${
                  currentStep > step.id ? "bg-green-500" : "bg-slate-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export { STEPS };