import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function VolunteerSignupForm({ onSubmit, defaultEmail, defaultPhone }) {
  const [form, setForm] = useState({
    nombre: "",
    email: defaultEmail || "",
    telefono: defaultPhone || "",
    relacion: "yo",
    mensaje: ""
  });

  const handle = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input placeholder="Nombre y apellidos" value={form.nombre} onChange={e => handle('nombre', e.target.value)} required />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Input placeholder="Email" type="email" value={form.email} onChange={e => handle('email', e.target.value)} required />
        <Input placeholder="Teléfono" value={form.telefono} onChange={e => handle('telefono', e.target.value)} required />
      </div>
      <Select value={form.relacion} onValueChange={(v) => handle('relacion', v)}>
        <SelectTrigger>
          <SelectValue placeholder="Para quién" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="yo">Yo</SelectItem>
          <SelectItem value="hijo">Mi hijo/a</SelectItem>
          <SelectItem value="familiar">Familiar</SelectItem>
          <SelectItem value="otro">Otro</SelectItem>
        </SelectContent>
      </Select>
      <Textarea placeholder="Mensaje (opcional)" value={form.mensaje} onChange={e => handle('mensaje', e.target.value)} />
      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">Apuntarme</Button>
    </form>
  );
}