import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";

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

  if (!opp) return null;

  const plazas = opp.plazas || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Apuntarse: {opp?.titulo}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-2">{error}</div>}

          {/* Info del evento */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm space-y-1">
            {opp.fecha && <div>📅 <strong>{opp.fecha}</strong></div>}
            {opp.hora && <div>⏰ <strong>{opp.hora}</strong></div>}
            {opp.ubicacion && <div>📍 <strong>{opp.ubicacion}</strong></div>}
            {plazas > 0 && <div className="text-orange-700 font-medium mt-1">🎯 Plazas: {plazas}</div>}
          </div>
          
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
            <label className="text-sm font-medium text-slate-700 mb-1 block">Teléfono (opcional)</label>
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

          <Button onClick={submit} className="w-full bg-green-600 hover:bg-green-700 py-5 text-base font-bold">
            ✅ ¡Me apunto!
          </Button>

          <p className="text-xs text-slate-500 text-center">
            El organizador recibirá una notificación al instante
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}