import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TemplateForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(
    initial || {
      nombre: "",
      estilo: "resumen_general",
      tono: "cercano",
      titulo_base: "Boletín mensual — {{mes}} {{anio}}",
      cuerpo_base:
        "Hola familia del club,\n\nAquí tenéis el resumen de {{mes}} {{anio}}:\n\nTareas completadas:\n{{tareas}}\n\nEventos destacados:\n{{eventos}}\n\nAnuncios importantes:\n{{anuncios}}\n\nGalería de fotos:\n{{galeria}}\n\n¡Gracias por estar ahí!",
      activa: true,
    }
  );

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  const handleChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-4">
      <div>
        <Label>Nombre</Label>
        <Input value={form.nombre} onChange={(e) => handleChange("nombre", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <div>
          <Label>Estilo</Label>
          <Select value={form.estilo} onValueChange={(v) => handleChange("estilo", v)}>
            <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="resumen_general">Resumen general</SelectItem>
              <SelectItem value="logros_y_cifras">Logros y cifras</SelectItem>
              <SelectItem value="carta_del_presidente">Carta del presidente</SelectItem>
              <SelectItem value="personalizada">Personalizada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tono</Label>
          <Select value={form.tono} onValueChange={(v) => handleChange("tono", v)}>
            <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cercano">Cercano</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Título base</Label>
        <Input value={form.titulo_base || ""} onChange={(e) => handleChange("titulo_base", e.target.value)} />
      </div>
      <div>
        <Label>Cuerpo base</Label>
        <Textarea rows={8} value={form.cuerpo_base} onChange={(e) => handleChange("cuerpo_base", e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSubmit(form)}>Guardar</Button>
      </div>
    </div>
  );
}