import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { TEXTO_PROMOCIONES, TEXTO_PATROCINADORES, TEXTO_LEGAL } from "./consentTexts";

/**
 * Bloque de consentimiento comercial reutilizable.
 * Uso: <ConsentimientoComercial value={consent} onChange={setConsent} />
 * value = { acepta_promociones: bool, acepta_patrocinadores: bool }
 */
export default function ConsentimientoComercial({ value = {}, onChange }) {
  const set = (campo, v) => onChange({ ...value, [campo]: v });

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox
          checked={!!value.acepta_promociones}
          onCheckedChange={(v) => set("acepta_promociones", !!v)}
          className="mt-0.5"
        />
        <span className="text-sm text-slate-700 leading-snug">{TEXTO_PROMOCIONES}</span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox
          checked={!!value.acepta_patrocinadores}
          onCheckedChange={(v) => set("acepta_patrocinadores", !!v)}
          className="mt-0.5"
        />
        <span className="text-sm text-slate-700 leading-snug">{TEXTO_PATROCINADORES}</span>
      </label>

      <p className="text-xs text-slate-500 leading-relaxed pt-1 border-t border-slate-200">
        {TEXTO_LEGAL}
      </p>
    </div>
  );
}