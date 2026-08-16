import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { INTERESES } from "./conectaIntereses";
import OtroInteresInput from "./OtroInteresInput";

export default function ConectaProfileForm({ initial, onSubmit, isSaving }) {
  const [form, setForm] = useState({
    nombre: initial?.nombre || "",
    telefono: initial?.telefono || "",
    equipo_hijo: initial?.equipo_hijo || "",
    intereses: initial?.intereses || [],
    descripcion: initial?.descripcion || "",
    activo: initial?.activo !== false,
  });

  const toggle = (id) => setForm(f => ({
    ...f,
    intereses: f.intereses.includes(id) ? f.intereses.filter(i => i !== id) : [...f.intereses, id]
  }));

  const valid = form.nombre.trim() && form.intereses.length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Tu nombre *</Label>
        <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Manuel (papá de Lucía)" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Teléfono (WhatsApp)</Label>
          <Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="600 000 000" />
        </div>
        <div className="space-y-1.5">
          <Label>Equipo de tu hijo/a</Label>
          <Input value={form.equipo_hijo} onChange={e => setForm({ ...form, equipo_hijo: e.target.value })} placeholder="Ej: Alevín Mixto" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>¿Qué te interesa? * <span className="text-xs text-slate-500 font-normal">(marca todo lo que quieras)</span></Label>
        <div className="flex flex-wrap gap-2">
          {INTERESES.map(i => (
            <button
              key={i.id}
              type="button"
              onClick={() => toggle(i.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                form.intereses.includes(i.id)
                  ? "bg-green-600 border-green-600 text-white"
                  : "bg-white border-slate-200 text-slate-700 hover:border-green-300"
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
        <OtroInteresInput
          intereses={form.intereses}
          onAdd={(id) => setForm(f => ({ ...f, intereses: [...f.intereses, id] }))}
          onRemove={(id) => setForm(f => ({ ...f, intereses: f.intereses.filter(i => i !== id) }))}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Cuéntalo en dos líneas (opcional)</Label>
        <Textarea
          rows={3}
          value={form.descripcion}
          onChange={e => setForm({ ...form, descripcion: e.target.value })}
          placeholder="Ej: salgo a correr martes y jueves por la mañana, nivel tranquilo. Encantado de sumar gente del club."
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} className="w-4 h-4" />
        Mostrar mi perfil al resto de familias del club
      </label>

      <p className="text-xs text-slate-500 bg-slate-50 border rounded-lg p-2.5">
        🔒 Solo verán lo que escribas aquí las familias del club. Si dejas el teléfono, podrán escribirte por WhatsApp.
      </p>

      <Button className="w-full bg-green-600 hover:bg-green-700" disabled={!valid || isSaving} onClick={() => onSubmit(form)}>
        {isSaving ? "Guardando..." : "Guardar mi perfil"}
      </Button>
    </div>
  );
}