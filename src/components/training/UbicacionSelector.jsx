import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

export const UBICACIONES = ["Campo Municipal de Bustarviejo", "Polideportivo Municipal de Bustarviejo"];

export default function UbicacionSelector({ value, onChange }) {
  const [otro, setOtro] = useState(!!value && !UBICACIONES.includes(value));

  const opciones = [...UBICACIONES.map((u) => ({ label: u.replace(" de Bustarviejo", ""), val: u })), { label: "Otro lugar", val: "__otro" }];

  return (
    <div className="space-y-2 md:col-span-2">
      <Label>Ubicación *</Label>
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => {
          const active = o.val === "__otro" ? otro : !otro && value === o.val;
          return (
            <button
              type="button"
              key={o.val}
              onClick={() => { if (o.val === "__otro") { setOtro(true); onChange(""); } else { setOtro(false); onChange(o.val); } }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium ${active ? "bg-orange-600 text-white border-orange-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
            >
              <MapPin className="w-4 h-4" /> {o.label}
            </button>
          );
        })}
      </div>
      {otro && (
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Escribe el lugar (ej: Pista del colegio)" required />
      )}
    </div>
  );
}