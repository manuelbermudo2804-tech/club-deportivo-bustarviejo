import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function OpportunityForm({ onSubmit }) {
  const [form, setForm] = useState({ categoria: 'evento', necesitados: 1, estado: 'abierta' });
  return (
    <div className="space-y-3">
      <Input placeholder="Título" value={form.titulo||''} onChange={(e)=>setForm({...form,titulo:e.target.value})} />
      <Textarea placeholder="Descripción" value={form.descripcion||''} onChange={(e)=>setForm({...form,descripcion:e.target.value})} />
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" value={form.fecha||''} onChange={(e)=>setForm({...form,fecha:e.target.value})} />
        <Input placeholder="Hora (ej: 10:00)" value={form.hora||''} onChange={(e)=>setForm({...form,hora:e.target.value})} />
      </div>
      <Input placeholder="Ubicación" value={form.ubicacion||''} onChange={(e)=>setForm({...form,ubicacion:e.target.value})} />
      <div className="grid grid-cols-2 gap-2">
        <Select value={form.categoria} onValueChange={(v)=>setForm({...form,categoria:v})}>
          <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="evento">Evento</SelectItem>
            <SelectItem value="dia_a_dia">Día a día</SelectItem>
            <SelectItem value="logistica">Logística</SelectItem>
            <SelectItem value="comunicacion">Comunicación</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>
        <Input type="number" min={1} value={form.necesitados} onChange={(e)=>setForm({...form,necesitados:Number(e.target.value||1)})} />
      </div>
      <Button onClick={()=>onSubmit(form)} className="w-full">Crear oportunidad</Button>
    </div>
  );
}