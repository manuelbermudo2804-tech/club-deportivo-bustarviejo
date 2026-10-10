import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Campo de número con el siguiente número libre sugerido automáticamente
export default function NumeroDocumentoInput({ label, value, onChange, sugerido }) {
  useEffect(() => {
    if (sugerido && !value) onChange(sugerido);
  }, [sugerido]);

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={sugerido} />
      {sugerido && value !== sugerido && (
        <button type="button" onClick={() => onChange(sugerido)} className="text-[11px] text-orange-600 hover:underline mt-0.5">
          Usar siguiente libre: {sugerido}
        </button>
      )}
    </div>
  );
}