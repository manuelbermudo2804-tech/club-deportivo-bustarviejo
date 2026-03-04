import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";
import { validators } from "@/components/utils/validators";

export default function EmailInputWithTypoCheck({ value, onChange, className, placeholder, ...props }) {
  const [typoSuggestion, setTypoSuggestion] = useState(null);

  useEffect(() => {
    if (!value || !value.includes("@")) {
      setTypoSuggestion(null);
      return;
    }
    const check = validators.emailDomainTypo(value);
    setTypoSuggestion(check.suggestion ? check : null);
  }, [value]);

  return (
    <div>
      <Input
        type="email"
        placeholder={placeholder || "email@ejemplo.com"}
        value={value}
        onChange={onChange}
        className={`${className || ""} ${typoSuggestion ? "border-2 border-amber-500 bg-amber-50" : ""}`}
        {...props}
      />
      {typoSuggestion && (
        <div className="mt-1.5 bg-amber-50 border-2 border-amber-300 rounded-lg p-2.5 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-800 font-medium">
              ¿Quisiste decir <strong>{typoSuggestion.suggestion}</strong>?
            </p>
            <button
              type="button"
              onClick={() => {
                onChange({ target: { value: typoSuggestion.suggestion } });
                setTypoSuggestion(null);
              }}
              className="mt-1 text-xs font-bold text-amber-700 underline hover:text-amber-900"
            >
              Sí, corregir automáticamente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}