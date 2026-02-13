import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function VolunteerSignupDialog({ open, onOpenChange, opp, user, myProfile, onSubmit }) {
  const [form, setForm] = useState({
    nombre: myProfile?.nombre || user?.full_name || "",
    telefono: myProfile?.telefono || "",
    por_quien: "yo",
    mensaje: ""
  });
  const [error, setError] = useState("");

  const handle = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = () => {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    if (!form.telefono.trim()) { setError("El teléfono es obligatorio"); return; }
    setError("");
    onSubmit({
      opp,
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      por_quien: form.por_quien,
      mensaje: form.mensaje.trim()
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apuntarse: {opp?.titulo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-2">{error}</div>}
          
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">¿Para quién?</label>
            <Select value={form.por_quien} onValueChange={(v) => handle("por_quien", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yo">Para mí</SelectItem>
                <SelectItem value="familiar">Para un familiar</SelectItem>
                <SelectItem value="otro">Para otra persona</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Nombre completo</label>
            <Input
              value={form.nombre}
              onChange={(e) => handle("nombre", e.target.value)}
              placeholder="Nombre y apellidos"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Teléfono de contacto</label>
            <Input
              value={form.telefono}
              onChange={(e) => handle("telefono", e.target.value)}
              placeholder="612345678"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Mensaje (opcional)</label>
            <Textarea
              value={form.mensaje}
              onChange={(e) => handle("mensaje", e.target.value)}
              placeholder="Ej: Puedo llevar mesa y sillas..."
              rows={2}
            />
          </div>

          <Button onClick={submit} className="w-full bg-green-600 hover:bg-green-700">
            ✅ Confirmar inscripción
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}