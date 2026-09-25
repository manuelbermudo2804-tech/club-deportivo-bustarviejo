import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";

// Apunta una ayuda cobrada (se guarda como ingreso «Subvenciones» en el Panel Financiero).
export default function OtraSubvencionForm({ temporada, onSaved }) {
  const [f, setF] = useState({ entidad: "", concepto: "", importe: "", fecha: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const guardar = async () => {
    setSaving(true);
    await base44.entities.FinancialTransaction.create({
      tipo: "Ingreso", categoria: "Subvenciones", estado: "Cobrado", temporada,
      proveedor_cliente: f.entidad, concepto: f.concepto, cantidad: Number(f.importe), fecha: f.fecha,
    });
    setF({ ...f, entidad: "", concepto: "", importe: "" });
    setSaving(false);
    onSaved();
  };

  const valido = f.entidad && f.concepto && Number(f.importe) > 0 && f.fecha;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      <Input className="h-8 text-xs md:col-span-2" placeholder="Entidad (ej: Real Federación de Fútbol de Madrid)" value={f.entidad} onChange={set("entidad")} />
      <Input className="h-8 text-xs md:col-span-2" placeholder="Concepto (ej: Ayuda por arbitrajes)" value={f.concepto} onChange={set("concepto")} />
      <Input className="h-8 text-xs" type="number" step="0.01" placeholder="Importe €" value={f.importe} onChange={set("importe")} />
      <Input className="h-8 text-xs" type="date" value={f.fecha} onChange={set("fecha")} />
      <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" disabled={!valido || saving} onClick={guardar}>
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />} Añadir
      </Button>
    </div>
  );
}