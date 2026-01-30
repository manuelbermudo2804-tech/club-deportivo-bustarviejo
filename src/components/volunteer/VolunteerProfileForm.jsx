import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function VolunteerProfileForm({ initial, onSubmit }) {
  const [form, setForm] = useState(initial || { relacion: "padre/madre", puede_whatsapp: true, intereses: [], disponibilidad: [] });
  useEffect(() => { setForm(initial || { relacion: "padre/madre", puede_whatsapp: true, intereses: [], disponibilidad: [] }); }, [initial]);

  const toggleArr = (key, val) => setForm((f) => ({ ...f, [key]: (f[key] || []).includes(val) ? f[key].filter((v) => v !== val) : [...(f[key] || []), val] }));

  return (
    <div className="space-y-3">
      <Input placeholder="Nombre y apellidos" value={form.nombre || ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
      <Input placeholder="Email" value={form.user_email || ""} onChange={(e) => setForm({ ...form, user_email: e.target.value })} />
      <Input placeholder="Teléfono" value={form.telefono || ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />

      <Select value={form.relacion} onValueChange={(v) => setForm({ ...form, relacion: v })}>
        <SelectTrigger><SelectValue placeholder="Relación" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="padre/madre">Padre/Madre</SelectItem>
          <SelectItem value="jugador">Jugador</SelectItem>
          <SelectItem value="familiar">Familiar</SelectItem>
          <SelectItem value="otro">Otro</SelectItem>
        </SelectContent>
      </Select>

      <div>
        <p className="text-sm font-medium mb-1">Intereses</p>
        {['eventos','logistica','comunicacion','dia_a_dia'].map((opt) => (
          <label key={opt} className="mr-3 text-sm"><input type="checkbox" className="mr-1" checked={(form.intereses||[]).includes(opt)} onChange={() => toggleArr('intereses', opt)} /> {opt}</label>
        ))}
      </div>
      <div>
        <p className="text-sm font-medium mb-1">Disponibilidad</p>
        {['mananas','tardes','fines_de_semana','eventos','diario'].map((opt) => (
          <label key={opt} className="mr-3 text-sm"><input type="checkbox" className="mr-1" checked={(form.disponibilidad||[]).includes(opt)} onChange={() => toggleArr('disponibilidad', opt)} /> {opt}</label>
        ))}
      </div>

      <Textarea placeholder="Notas (opcional)" value={form.notas || ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} />

      <Button onClick={() => onSubmit(form)} className="w-full">Guardar perfil</Button>
    </div>
  );
}